import type {PortableTextBlock} from '@sanity/types'
import {isEqual, uniq} from 'lodash'
import {Editor, Transforms, type Descendant, type Node} from 'slate'
import {converters} from '../../converters/converters'
import {debugWithName} from '../../internal-utils/debug'
import {validateValue} from '../../internal-utils/validateValue'
import {isEqualToEmptyEditor, toSlateValue} from '../../internal-utils/values'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import type {EditorActor} from '../editor-machine'
import {createEditorSnapshot} from '../editor-snapshot'

const debug = debugWithName('plugin:withInsertData')

/**
 * This plugin handles copy/paste in the editor
 *
 */
export function createWithInsertData(
  editorActor: EditorActor,
  schemaTypes: PortableTextMemberSchemaTypes,
) {
  return function withInsertData(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    editor.insertPortableTextData = (data: DataTransfer): boolean => {
      if (!editor.selection) {
        return false
      }

      const snapshot = createEditorSnapshot({
        converters: [...editorActor.getSnapshot().context.converters],
        editor,
        keyGenerator: editorActor.getSnapshot().context.keyGenerator,
        schema: editorActor.getSnapshot().context.schema,
      })

      const serializedPortableText = data.getData(
        converters['application/x-portable-text'].mimeType,
      )

      if (!serializedPortableText) {
        return false
      }

      const deserializedPortableTextEvent = converters[
        'application/x-portable-text'
      ].deserialize({
        context: snapshot.context,
        event: {
          type: 'deserialize',
          data: serializedPortableText,
        },
      })

      if (deserializedPortableTextEvent.type === 'deserialization.success') {
        const slateValue = toSlateValue(deserializedPortableTextEvent.data, {
          schemaTypes,
        })

        // Validate the result
        const validation = validateValue(
          deserializedPortableTextEvent.data,
          schemaTypes,
          editorActor.getSnapshot().context.keyGenerator,
        )

        // Bail out if it's not valid
        if (!validation.valid && !validation.resolution?.autoResolve) {
          const errorDescription = `${validation.resolution?.description}`
          editorActor.send({
            type: 'error',
            name: 'pasteError',
            description: errorDescription,
            data: validation,
          })
          debug('Invalid insert result', validation)
          return false
        }

        _insertFragment(editor, slateValue, schemaTypes)

        return true
      }

      return false
    }

    editor.insertTextOrHTMLData = (data: DataTransfer): boolean => {
      if (!editor.selection) {
        debug('No selection, not inserting')
        return false
      }
      const snapshot = createEditorSnapshot({
        converters: [...editorActor.getSnapshot().context.converters],
        editor,
        keyGenerator: editorActor.getSnapshot().context.keyGenerator,
        schema: editorActor.getSnapshot().context.schema,
      })
      const html = data.getData('text/html')
      const text = data.getData('text/plain')

      if (html || text) {
        debug('Inserting data', data)
        let portableText: PortableTextBlock[]
        let fragment: Node[]
        let insertedType: string | undefined

        if (html) {
          const deserializedHtmlEvent = converters['text/html'].deserialize({
            context: snapshot.context,
            event: {
              type: 'deserialize',
              data: html,
            },
          })

          portableText =
            deserializedHtmlEvent.type === 'deserialization.success'
              ? deserializedHtmlEvent.data
              : []

          fragment = toSlateValue(portableText, {schemaTypes})

          insertedType = 'HTML'

          if (portableText.length === 0) {
            return false
          }
        } else {
          const deserializedTextEvent = converters['text/plain'].deserialize({
            context: snapshot.context,
            event: {
              type: 'deserialize',
              data: text,
            },
          })

          portableText =
            deserializedTextEvent.type === 'deserialization.success'
              ? deserializedTextEvent.data
              : []

          fragment = toSlateValue(portableText, {
            schemaTypes,
          })

          insertedType = 'text'
        }

        // Validate the result
        const validation = validateValue(
          portableText,
          schemaTypes,
          editorActor.getSnapshot().context.keyGenerator,
        )

        // Bail out if it's not valid
        if (!validation.valid) {
          const errorDescription = `Could not validate the resulting portable text to insert.\n${validation.resolution?.description}\nTry to insert as plain text (shift-paste) instead.`
          editorActor.send({
            type: 'error',
            name: 'pasteError',
            description: errorDescription,
            data: validation,
          })
          debug('Invalid insert result', validation)
          return false
        }
        debug(
          `Inserting ${insertedType} fragment at ${JSON.stringify(editor.selection)}`,
        )
        _insertFragment(editor, fragment, schemaTypes)
        return true
      }
      return false
    }

    editor.insertData = (data: DataTransfer) => {
      if (!editor.insertPortableTextData(data)) {
        editor.insertTextOrHTMLData(data)
      }
    }

    return editor
  }
}

/**
 * Shared helper function to insert the final fragment into the editor
 *
 * @internal
 */
function _insertFragment(
  editor: PortableTextSlateEditor,
  fragment: Descendant[],
  schemaTypes: PortableTextMemberSchemaTypes,
) {
  editor.withoutNormalizing(() => {
    if (!editor.selection) {
      return
    }
    // Ensure that markDefs for any annotations inside this fragment are copied over to the focused text block.
    const [focusBlock, focusPath] = Editor.node(editor, editor.selection, {
      depth: 1,
    })
    if (editor.isTextBlock(focusBlock) && editor.isTextBlock(fragment[0])) {
      const {markDefs} = focusBlock
      debug(
        'Mixing markDefs of focusBlock and fragments[0] block',
        markDefs,
        fragment[0].markDefs,
      )
      if (!isEqual(markDefs, fragment[0].markDefs)) {
        Transforms.setNodes(
          editor,
          {
            markDefs: uniq([
              ...(fragment[0].markDefs || []),
              ...(markDefs || []),
            ]),
          },
          {at: focusPath, mode: 'lowest', voids: false},
        )
      }
    }

    const isPasteToEmptyEditor = isEqualToEmptyEditor(
      editor.children,
      schemaTypes,
    )

    if (isPasteToEmptyEditor) {
      // Special case for pasting directly into an empty editor (a placeholder block).
      // When pasting content starting with multiple empty blocks,
      // `editor.insertFragment` can potentially duplicate the keys of
      // the placeholder block because of operations that happen
      // inside `editor.insertFragment` (involves an `insert_node` operation).
      // However by splitting the placeholder block first in this situation we are good.
      Transforms.splitNodes(editor, {at: [0, 0]})
      editor.insertFragment(fragment)
      Transforms.removeNodes(editor, {at: [0]})
    } else {
      // All other inserts
      editor.insertFragment(fragment)
    }
  })

  editor.onChange()
}

import {htmlToBlocks, normalizeBlock} from '@sanity/block-tools'
import type {PortableTextBlock, PortableTextChild} from '@sanity/types'
import {isEqual, uniq} from 'lodash'
import {Editor, Range, Transforms, type Descendant, type Node} from 'slate'
import {ReactEditor} from 'slate-react'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
import {validateValue} from '../../utils/validateValue'
import {
  fromSlateValue,
  isEqualToEmptyEditor,
  toSlateValue,
} from '../../utils/values'
import type {EditorActor} from '../editor-machine'

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
    const blockTypeName = schemaTypes.block.name
    const spanTypeName = schemaTypes.span.name
    const whitespaceOnPasteMode =
      schemaTypes.block.options.unstable_whitespaceOnPasteMode

    const toPlainText = (blocks: PortableTextBlock[]) => {
      return blocks
        .map((block) => {
          if (editor.isTextBlock(block)) {
            return block.children
              .map((child: PortableTextChild) => {
                if (child._type === spanTypeName) {
                  return child.text
                }
                return `[${
                  schemaTypes.inlineObjects.find((t) => t.name === child._type)
                    ?.title || 'Object'
                }]`
              })
              .join('')
          }
          return `[${
            schemaTypes.blockObjects.find((t) => t.name === block._type)
              ?.title || 'Object'
          }]`
        })
        .join('\n\n')
    }

    editor.setFragmentData = (data: DataTransfer, originEvent) => {
      const {selection} = editor

      if (!selection) {
        return
      }

      const [start, end] = Range.edges(selection)
      const startVoid = Editor.void(editor, {at: start.path})
      const endVoid = Editor.void(editor, {at: end.path})

      if (Range.isCollapsed(selection) && !startVoid) {
        return
      }

      // Create a fake selection so that we can add a Base64-encoded copy of the
      // fragment to the HTML, to decode on future pastes.
      const domRange = ReactEditor.toDOMRange(editor, selection)
      let contents = domRange.cloneContents()
      // COMPAT: If the end node is a void node, we need to move the end of the
      // range from the void node's spacer span, to the end of the void node's
      // content, since the spacer is before void's content in the DOM.
      if (endVoid) {
        const [voidNode] = endVoid
        const r = domRange.cloneRange()
        const domNode = ReactEditor.toDOMNode(editor, voidNode)
        r.setEndAfter(domNode)
        contents = r.cloneContents()
      }
      // Remove any zero-width space spans from the cloned DOM so that they don't
      // show up elsewhere when pasted.
      Array.from(contents.querySelectorAll('[data-slate-zero-width]')).forEach(
        (zw) => {
          const isNewline = zw.getAttribute('data-slate-zero-width') === 'n'
          zw.textContent = isNewline ? '\n' : ''
        },
      )
      // Clean up the clipboard HTML for editor spesific attributes
      Array.from(contents.querySelectorAll('*')).forEach((elm) => {
        elm.removeAttribute('contentEditable')
        elm.removeAttribute('data-slate-inline')
        elm.removeAttribute('data-slate-leaf')
        elm.removeAttribute('data-slate-node')
        elm.removeAttribute('data-slate-spacer')
        elm.removeAttribute('data-slate-string')
        elm.removeAttribute('data-slate-zero-width')
        elm.removeAttribute('draggable')
        for (const key in elm.attributes) {
          if (elm.hasAttribute(key)) {
            elm.removeAttribute(key)
          }
        }
      })
      const div = contents.ownerDocument.createElement('div')
      div.appendChild(contents)
      div.setAttribute('hidden', 'true')
      contents.ownerDocument.body.appendChild(div)
      const asHTML = div.innerHTML
      contents.ownerDocument.body.removeChild(div)
      const fragment = editor.getFragment()
      const portableText = fromSlateValue(fragment, blockTypeName)

      const asJSON = JSON.stringify(portableText)
      const asPlainText = toPlainText(portableText)
      data.clearData()
      data.setData('text/plain', asPlainText)
      data.setData('text/html', asHTML)
      data.setData('application/json', asJSON)
      data.setData('application/x-portable-text', asJSON)
      debug('text', asPlainText)
      data.setData(
        'application/x-portable-text-event-origin',
        originEvent || 'external',
      )
      debug('Set fragment data', asJSON, asHTML)
    }

    editor.insertPortableTextData = (data: DataTransfer): boolean => {
      if (!editor.selection) {
        return false
      }
      const pText = data.getData('application/x-portable-text')
      const origin = data.getData('application/x-portable-text-event-origin')
      debug(`Inserting portable text from ${origin} event`, pText)
      if (pText) {
        const parsed = JSON.parse(pText) as PortableTextBlock[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          const slateValue = _regenerateKeys(
            editor,
            toSlateValue(parsed, {schemaTypes}),
            editorActor.getSnapshot().context.keyGenerator,
            spanTypeName,
            schemaTypes,
          )
          // Validate the result
          const validation = validateValue(
            parsed,
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
      }
      return false
    }

    editor.insertTextOrHTMLData = (data: DataTransfer): boolean => {
      if (!editor.selection) {
        debug('No selection, not inserting')
        return false
      }
      const html = data.getData('text/html')
      const text = data.getData('text/plain')

      if (html || text) {
        debug('Inserting data', data)
        let portableText: PortableTextBlock[]
        let fragment: Node[]
        let insertedType: string | undefined

        if (html) {
          portableText = htmlToBlocks(html, schemaTypes.portableText, {
            unstable_whitespaceOnPasteMode: whitespaceOnPasteMode,
          }).map((block) =>
            normalizeBlock(block, {blockTypeName}),
          ) as PortableTextBlock[]
          fragment = toSlateValue(portableText, {schemaTypes})
          insertedType = 'HTML'

          if (portableText.length === 0) {
            return false
          }
        } else {
          // plain text
          const blocks = escapeHtml(text)
            .split(/\n{2,}/)
            .map((line) =>
              line
                ? `<p>${line.replace(/(?:\r\n|\r|\n)/g, '<br/>')}</p>`
                : '<p></p>',
            )
            .join('')
          const textToHtml = `<html><body>${blocks}</body></html>`
          portableText = htmlToBlocks(textToHtml, schemaTypes.portableText).map(
            (block) => normalizeBlock(block, {blockTypeName}),
          ) as PortableTextBlock[]
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

    editor.insertFragmentData = (data: DataTransfer): boolean => {
      const fragment = data.getData('application/x-portable-text')
      if (fragment) {
        const parsed = JSON.parse(fragment)
        editor.insertFragment(parsed)
        return true
      }
      return false
    }

    return editor
  }
}

const entityMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}
function escapeHtml(str: string) {
  return String(str).replace(/[&<>"'`=/]/g, (s: string) => entityMap[s])
}

/**
 * Shared helper function to regenerate the keys on a fragment.
 *
 * @internal
 */
function _regenerateKeys(
  editor: Pick<PortableTextSlateEditor, 'isTextBlock' | 'isTextSpan'>,
  fragment: Descendant[],
  keyGenerator: () => string,
  spanTypeName: string,
  editorTypes: Pick<PortableTextMemberSchemaTypes, 'annotations'>,
): Descendant[] {
  return fragment.map((node) => {
    const newNode: Descendant = {...node}
    // Ensure the copy has new keys
    if (editor.isTextBlock(newNode)) {
      const annotations = editorTypes.annotations.map((t) => t.name)

      // Ensure that if there are no annotations, we remove the markDefs
      if (annotations.length === 0) {
        const {markDefs, ...NewNodeNoDefs} = newNode

        return {...NewNodeNoDefs, _key: keyGenerator()}
      }

      // Ensure that all annotations are allowed
      const hasForbiddenAnnotations = (newNode.markDefs || []).some((def) => {
        return !annotations.includes(def._type)
      })

      // if they have forbidden annotations, we remove them and keep the rest
      if (hasForbiddenAnnotations) {
        const allowedAnnotations = (newNode.markDefs || []).filter((def) => {
          return annotations.includes(def._type)
        })

        return {...newNode, markDefs: allowedAnnotations, _key: keyGenerator()}
      }

      newNode.markDefs = (newNode.markDefs || []).map((def) => {
        const oldKey = def._key
        const newKey = keyGenerator()
        newNode.children = newNode.children.map((child) =>
          child._type === spanTypeName && editor.isTextSpan(child)
            ? {
                ...child,
                marks:
                  child.marks && child.marks.includes(oldKey)
                    ? [...child.marks]
                        .filter((mark) => mark !== oldKey)
                        .concat(newKey)
                    : child.marks,
              }
            : child,
        )
        return {...def, _key: newKey}
      })
    }
    const nodeWithNewKeys = {...newNode, _key: keyGenerator()}
    if (editor.isTextBlock(nodeWithNewKeys)) {
      nodeWithNewKeys.children = nodeWithNewKeys.children.map((child) => ({
        ...child,
        _key: keyGenerator(),
      }))
    }
    return nodeWithNewKeys as Descendant
  })
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

/**
 * functions we don't want to export but want to test
 * @internal
 */
export const exportedForTesting = {
  _regenerateKeys,
}

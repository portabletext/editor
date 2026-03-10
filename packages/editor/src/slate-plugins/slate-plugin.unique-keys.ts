import type {PortableTextBlock} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {getIndexForKey} from '@sanity/json-match'
import type {EditorActor} from '../editor/editor-machine'
import type {EditorContext} from '../editor/editor-snapshot'
import {applySetNode} from '../internal-utils/apply-set-node'
import {Editor, Element, Node, type Path} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {withNormalizeNode} from './slate-plugin.normalize-node'

/**
 * This plugin makes sure that every new node in the editor get a new _key prop when created
 *
 */
export function createUniqueKeysPlugin(editorActor: EditorActor) {
  const context = editorActor.getSnapshot().context

  return function uniqueKeysPlugin(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    const {apply, normalizeNode} = editor

    // The default behavior is to always generate a new key here.
    // For example, when undoing and redoing we want to retain the keys, but
    // when we create a new bold span by splitting a non-bold-span we want the produced node to get a new key.
    editor.apply = (operation) => {
      /**
       * We don't want to run any side effects when the editor is processing
       * remote changes.
       */
      if (editor.isProcessingRemoteChanges) {
        apply(operation)
        return
      }

      /**
       * We don't want to run any side effects when the editor is undoing or
       * redoing operations.
       */
      if (editor.isUndoing || editor.isRedoing) {
        apply(operation)
        return
      }

      if (operation.type === 'insert_node') {
        if (!Editor.isEditor(operation.node)) {
          const _key =
            operation.node._key &&
            keyExistsAtPath(
              {
                context: {
                  schema: context.schema,
                  value: editor.children as Array<PortableTextBlock>,
                },
              },
              operation.path,
              operation.node._key,
            )
              ? undefined
              : operation.node._key

          apply({
            ...operation,
            node: {
              ...operation.node,
              _key:
                _key === undefined
                  ? editorActor.getSnapshot().context.keyGenerator()
                  : _key,
            },
          })

          return
        }
      }

      apply(operation)
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry

      if (Element.isElement(node, editor.schema) || editor.isObjectNode(node)) {
        const [parent] = Editor.parent(editor, path)

        if (parent && Editor.isEditor(parent)) {
          const blockKeys = new Set<string>()

          for (const sibling of parent.children) {
            if (sibling._key && blockKeys.has(sibling._key)) {
              const _key = editorActor.getSnapshot().context.keyGenerator()

              blockKeys.add(_key)

              withNormalizeNode(editor, () => {
                applySetNode(editor, {_key}, path)
              })

              return
            }

            if (!sibling._key) {
              const _key = editorActor.getSnapshot().context.keyGenerator()

              blockKeys.add(_key)

              withNormalizeNode(editor, () => {
                applySetNode(editor, {_key}, path)
              })

              return
            }

            blockKeys.add(sibling._key)
          }
        }
      }

      if (
        Element.isElement(node, editor.schema) &&
        node._type === editorActor.getSnapshot().context.schema.block.name
      ) {
        // Set key on block itself
        if (!node._key) {
          withNormalizeNode(editor, () => {
            applySetNode(
              editor,
              {_key: editorActor.getSnapshot().context.keyGenerator()},
              path,
            )
          })
          return
        }

        // Set unique keys on it's children
        const childKeys = new Set<string>()

        for (const [child, childPath] of Node.children(
          editor,
          path,
          editor.schema,
        )) {
          if (child._key && childKeys.has(child._key)) {
            const _key = editorActor.getSnapshot().context.keyGenerator()

            childKeys.add(_key)

            withNormalizeNode(editor, () => {
              applySetNode(editor, {_key}, childPath)
            })

            return
          }

          if (!child._key) {
            const _key = editorActor.getSnapshot().context.keyGenerator()

            childKeys.add(_key)

            withNormalizeNode(editor, () => {
              applySetNode(editor, {_key}, childPath)
            })

            return
          }

          childKeys.add(child._key)
        }
      }

      withNormalizeNode(editor, () => {
        normalizeNode(entry)
      })
    }

    return editor
  }
}

function keyExistsAtPath(
  snapshot: {
    context: Pick<EditorContext, 'schema' | 'value'>
  },
  path: Path,
  key: string,
): boolean {
  if (path.length === 1) {
    return getIndexForKey(snapshot.context.value, key) !== undefined
  }

  if (path.length > 2) {
    return false
  }

  const parentBlockIndex = path.at(0)
  const parentBlock =
    parentBlockIndex !== undefined
      ? snapshot.context.value.at(parentBlockIndex)
      : undefined

  if (!parentBlock) {
    return false
  }

  if (!isTextBlock(snapshot.context, parentBlock)) {
    return false
  }

  return parentBlock.children.some((child) => child._key === key)
}

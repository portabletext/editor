import {isTextBlock} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import {applySetNode} from '../internal-utils/apply-set-node'
import {getChildren} from '../node-traversal/get-children'
import {getParent} from '../node-traversal/get-parent'
import {isEditor} from '../slate/editor/is-editor'
import type {Path} from '../slate/interfaces/path'
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
        if (!isEditor(operation.node)) {
          const existingKey = operation.node._key

          if (
            existingKey &&
            !keyExistsAtPath(
              {
                blockIndexMap: editor.blockIndexMap,
                context: {
                  schema: context.schema,
                  value: editor.children,
                },
              },
              operation.path,
              existingKey,
            )
          ) {
            // Key is valid — pass through without allocation
            apply(operation)
          } else {
            // Key collision or missing — generate a new one
            apply({
              ...operation,
              node: {
                ...operation.node,
                _key: editorActor.getSnapshot().context.keyGenerator(),
              },
            })
          }

          return
        }
      }

      apply(operation)
    }

    const {keyGenerator} = context

    editor.normalizeNode = (entry) => {
      const [_node, path] = entry

      const parent = getParent(editor, path)
      const siblings = parent
        ? getChildren(editor, parent.path)
        : editor.children.map((child, index) => ({
            node: child,
            path: [index],
          }))

      const siblingKeys = new Set<string>()

      for (const sibling of siblings) {
        if (sibling.node._key && siblingKeys.has(sibling.node._key)) {
          const _key = keyGenerator()

          siblingKeys.add(_key)

          withNormalizeNode(editor, () => {
            applySetNode(editor, {_key}, path)
          })

          return
        }

        if (!sibling.node._key) {
          const _key = keyGenerator()

          siblingKeys.add(_key)

          withNormalizeNode(editor, () => {
            applySetNode(editor, {_key}, path)
          })

          return
        }

        siblingKeys.add(sibling.node._key)
      }

      withNormalizeNode(editor, () => {
        normalizeNode(entry)
      })
    }

    return editor
  }
}

function keyExistsAtPath(
  snapshot: Pick<EditorSnapshot, 'blockIndexMap'> & {
    context: Pick<EditorContext, 'schema' | 'value'>
  },
  path: Path,
  key: string,
): boolean {
  if (path.length === 1) {
    return snapshot.blockIndexMap.has(key)
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

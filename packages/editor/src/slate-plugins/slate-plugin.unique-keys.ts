import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import {isEqualMarks} from '../internal-utils/equality'
import {Editor, Node, Path, Transforms} from '../slate'
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

      if (operation.type === 'split_node') {
        const _key =
          operation.properties._key &&
          keyExistsAtPath(
            {
              blockIndexMap: editor.blockIndexMap,
              context: {
                schema: context.schema,
                value: editor.value,
              },
            },
            operation.path,
            operation.properties._key,
          )
            ? undefined
            : operation.properties._key

        apply({
          ...operation,
          properties: {
            ...operation.properties,
            _key:
              _key === undefined
                ? editorActor.getSnapshot().context.keyGenerator()
                : _key,
          },
        })

        return
      }

      if (operation.type === 'insert_node') {
        if (!Editor.isEditor(operation.node)) {
          const _key =
            operation.node._key &&
            keyExistsAtPath(
              {
                blockIndexMap: editor.blockIndexMap,
                context: {
                  schema: context.schema,
                  value: editor.value,
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

      if (operation.type === 'merge_node') {
        const index = operation.path[operation.path.length - 1]!
        const prevPath = Path.previous(operation.path)
        const prevIndex = prevPath[prevPath.length - 1]!

        if (operation.path.length !== 1 || prevPath.length !== 1) {
          apply(operation)
          return
        }

        const block = editor.value.at(index)
        const previousBlock = editor.value.at(prevIndex)

        if (!block || !previousBlock) {
          apply(operation)
          return
        }

        if (
          !isTextBlock(editorActor.getSnapshot().context, block) ||
          !isTextBlock(editorActor.getSnapshot().context, previousBlock)
        ) {
          apply(operation)
          return
        }

        // If we are merging two text blocks, then we need to make sure there
        // are no duplicate keys in the blocks. Therefore, we assign new keys
        // to any child or markDef that shares key with other children or
        // markDefs in the previous block.
        const previousBlockChildKeys = previousBlock.children.map(
          (child) => child._key,
        )
        const previousBlockMarkDefKeys =
          previousBlock.markDefs?.map((markDef) => markDef._key) ?? []

        // Assign new keys to markDefs with duplicate keys and keep track of
        // the mapping between the old and new keys
        const markDefKeyMap = new Map<string, string>()
        const adjustedMarkDefs = block.markDefs?.map((markDef) => {
          if (previousBlockMarkDefKeys.includes(markDef._key)) {
            const newKey = editorActor.getSnapshot().context.keyGenerator()
            markDefKeyMap.set(markDef._key, newKey)
            return {
              ...markDef,
              _key: newKey,
            }
          }

          return markDef
        })

        // Assign new keys to spans with duplicate keys and update any markDef
        // key if needed
        let childIndex = 0
        for (const child of block.children) {
          if (isSpan(editorActor.getSnapshot().context, child)) {
            const marks =
              child.marks?.map((mark) => {
                const markDefKey = markDefKeyMap.get(mark)

                if (markDefKey) {
                  return markDefKey
                }

                return mark
              }) ?? []

            if (!isEqualMarks(child.marks, marks)) {
              Transforms.setNodes(
                editor,
                {
                  marks,
                },
                {
                  at: [index, childIndex],
                },
              )
            }
          }

          if (previousBlockChildKeys.includes(child._key)) {
            Transforms.setNodes(
              editor,
              {
                _key: editorActor.getSnapshot().context.keyGenerator(),
              },
              {
                at: [index, childIndex],
              },
            )
          }
          childIndex++
        }

        apply({
          ...operation,
          properties: {
            ...operation.properties,
            // Make sure the adjusted markDefs are carried along for the merge
            // operation
            markDefs: adjustedMarkDefs,
          },
        })
        return
      }

      apply(operation)
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry

      if (editor.isElement(node)) {
        const [parent] = Editor.parent(editor, path)

        if (parent && Editor.isEditor(parent)) {
          const blockKeys = new Set<string>()

          for (const sibling of parent.children) {
            if (sibling._key && blockKeys.has(sibling._key)) {
              const _key = editorActor.getSnapshot().context.keyGenerator()

              blockKeys.add(_key)

              withNormalizeNode(editor, () => {
                Transforms.setNodes(editor, {_key}, {at: path})
              })

              return
            }

            if (!sibling._key) {
              const _key = editorActor.getSnapshot().context.keyGenerator()

              blockKeys.add(_key)

              withNormalizeNode(editor, () => {
                Transforms.setNodes(editor, {_key}, {at: path})
              })

              return
            }

            blockKeys.add(sibling._key)
          }
        }
      }

      if (
        editor.isElement(node) &&
        node._type === editorActor.getSnapshot().context.schema.block.name
      ) {
        // Set key on block itself
        if (!node._key) {
          withNormalizeNode(editor, () => {
            Transforms.setNodes(
              editor,
              {_key: editorActor.getSnapshot().context.keyGenerator()},
              {at: path},
            )
          })
          return
        }

        // Set unique keys on it's children
        const childKeys = new Set<string>()

        for (const [child, childPath] of Node.children(editor, path)) {
          if (child._key && childKeys.has(child._key)) {
            const _key = editorActor.getSnapshot().context.keyGenerator()

            childKeys.add(_key)

            withNormalizeNode(editor, () => {
              Transforms.setNodes(editor, {_key}, {at: childPath})
            })

            return
          }

          if (!child._key) {
            const _key = editorActor.getSnapshot().context.keyGenerator()

            childKeys.add(_key)

            withNormalizeNode(editor, () => {
              Transforms.setNodes(editor, {_key}, {at: childPath})
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

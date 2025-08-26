import {isSpan, isTextBlock} from '@portabletext/schema'
import {isEqual} from 'lodash'
import {Editor, Element, Node, Path, Transforms} from 'slate'
import {isChangingRemotely} from '../../internal-utils/withChanges'
import {isRedoing, isUndoing} from '../../internal-utils/withUndoRedo'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorActor} from '../editor-machine'

/**
 * This plugin makes sure that every new node in the editor get a new _key prop when created
 *
 */
export function createWithObjectKeys(editorActor: EditorActor) {
  return function withKeys(
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
      if (isChangingRemotely(editor)) {
        apply(operation)
        return
      }

      /**
       * We don't want to run any side effects when the editor is undoing or
       * redoing operations.
       */
      if (isUndoing(editor) || isRedoing(editor)) {
        apply(operation)
        return
      }

      if (operation.type === 'split_node') {
        const existingKeys = [...Node.descendants(editor)].map(
          ([node]) => node._key,
        )

        apply({
          ...operation,
          properties: {
            ...operation.properties,
            _key:
              operation.properties._key === undefined ||
              existingKeys.includes(operation.properties._key)
                ? editorActor.getSnapshot().context.keyGenerator()
                : operation.properties._key,
          },
        })

        return
      }

      if (operation.type === 'insert_node') {
        if (!Editor.isEditor(operation.node)) {
          const existingKeys = [...Node.descendants(editor)].map(
            ([node]) => node._key,
          )

          apply({
            ...operation,
            node: {
              ...operation.node,
              _key:
                operation.node._key === undefined ||
                existingKeys.includes(operation.node._key)
                  ? editorActor.getSnapshot().context.keyGenerator()
                  : operation.node._key,
            },
          })

          return
        }
      }

      if (operation.type === 'merge_node') {
        const index = operation.path[operation.path.length - 1]
        const prevPath = Path.previous(operation.path)
        const prevIndex = prevPath[prevPath.length - 1]

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

            if (!isEqual(child.marks, marks)) {
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
      if (
        Element.isElement(node) &&
        node._type === editorActor.getSnapshot().context.schema.block.name
      ) {
        // Set key on block itself
        if (!node._key) {
          editorActor.send({type: 'normalizing'})
          Transforms.setNodes(
            editor,
            {_key: editorActor.getSnapshot().context.keyGenerator()},
            {at: path},
          )
          editorActor.send({type: 'done normalizing'})
          return
        }
        // Set keys on it's children
        for (const [child, childPath] of Node.children(editor, path)) {
          if (!child._key) {
            editorActor.send({type: 'normalizing'})
            Transforms.setNodes(
              editor,
              {_key: editorActor.getSnapshot().context.keyGenerator()},
              {at: childPath},
            )
            editorActor.send({type: 'done normalizing'})
            return
          }
        }
      }
      normalizeNode(entry)
    }

    return editor
  }
}

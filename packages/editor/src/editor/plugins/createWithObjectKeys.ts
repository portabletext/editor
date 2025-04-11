import {Editor, Element, Node, Transforms} from 'slate'
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

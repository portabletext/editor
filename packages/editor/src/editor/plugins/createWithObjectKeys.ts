import {Editor, Element, Node, Transforms} from 'slate'

import {type PortableTextMemberSchemaTypes, type PortableTextSlateEditor} from '../../types/editor'
import {isChangingRemotely} from '../../utils/withChanges'
import {isPreservingKeys, PRESERVE_KEYS} from '../../utils/withPreserveKeys'

/**
 * This plugin makes sure that every new node in the editor get a new _key prop when created
 *
 */
export function createWithObjectKeys(
  schemaTypes: PortableTextMemberSchemaTypes,
  keyGenerator: () => string,
) {
  return function withKeys(editor: PortableTextSlateEditor): PortableTextSlateEditor {
    PRESERVE_KEYS.set(editor, false)
    const {apply, normalizeNode} = editor

    // The apply function can be called with a scope (withPreserveKeys) that will
    // preserve keys for the produced nodes if they have a _key property set already.
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

      if (operation.type === 'split_node') {
        const withNewKey = !isPreservingKeys(editor) || !('_key' in operation.properties)

        apply({
          ...operation,
          properties: {
            ...operation.properties,
            ...(withNewKey ? {_key: keyGenerator()} : {}),
          },
        })

        return
      }

      if (operation.type === 'insert_node') {
        // Must be given a new key or adding/removing marks while typing gets in trouble (duped keys)!
        const withNewKey = !isPreservingKeys(editor) || !('_key' in operation.node)

        if (!Editor.isEditor(operation.node)) {
          apply({
            ...operation,
            node: {
              ...operation.node,
              ...(withNewKey ? {_key: keyGenerator()} : {}),
            },
          })

          return
        }
      }

      apply(operation)
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (Element.isElement(node) && node._type === schemaTypes.block.name) {
        // Set key on block itself
        if (!node._key) {
          Transforms.setNodes(editor, {_key: keyGenerator()}, {at: path})
        }
        // Set keys on it's children
        for (const [child, childPath] of Node.children(editor, path)) {
          if (!child._key) {
            Transforms.setNodes(editor, {_key: keyGenerator()}, {at: childPath})
            return
          }
        }
      }
      normalizeNode(entry)
    }

    return editor
  }
}

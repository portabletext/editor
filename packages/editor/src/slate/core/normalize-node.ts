import type {PortableTextTextBlock} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {debug} from '../../internal-utils/debug'
import {getNode} from '../../node-traversal/get-node'
import {getTextBlockNode} from '../../node-traversal/get-text-block-node'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import {createSpanNode} from '../node/create-span-node'
import {isObjectNode} from '../node/is-object-node'
import {isSpanNode} from '../node/is-span-node'
import {parentPath} from '../path/parent-path'
import {textEquals} from '../text/text-equals'
import type {WithEditorFirstArg} from '../utils/types'
import {removeNodes} from './remove-nodes'

export const normalizeNode: WithEditorFirstArg<Editor['normalizeNode']> = (
  editor,
  entry,
) => {
  const [node, path] = entry
  const nodeRecord = node as Record<string, unknown>

  // If a child of a text block is missing _type, set it to the span type
  if (nodeRecord['_type'] === undefined && path.length > 0) {
    const parent = getNode(editor, parentPath(path))

    if (parent && isTextBlock({schema: editor.schema}, parent.node)) {
      debug.normalization('Setting span type on node without a type')
      editor.apply({
        type: 'set_node',
        path,
        properties: {},
        newProperties: {_type: editor.schema.span.name},
      })
      return
    }
  }

  // Set missing _key on any non-editor node
  if (nodeRecord['_key'] === undefined && path.length > 0) {
    debug.normalization('Setting missing key on node')
    editor.apply({
      type: 'set_node',
      path,
      properties: {},
      newProperties: {_key: editor.keyGenerator()},
    })
    return
  }

  if (isSpanNode({schema: editor.schema}, node)) {
    /**
     * Add missing .text to span nodes
     */
    if (typeof node.text !== 'string') {
      debug.normalization('Adding .text to span node')
      editor.apply({
        type: 'set_node',
        path,
        properties: {},
        newProperties: {text: ''},
      })
      return
    }

    return
  }

  if (isObjectNode({schema: editor.schema}, node)) {
    return
  }

  // Both Editor and PortableTextTextBlock always have `children` per their
  // types, but runtime data can be malformed.
  ;(node as any).children ??= []

  // We will have to refetch the element any time we modify its children
  // since it clones to a new immutable reference when we do.
  let element: Editor | PortableTextTextBlock = node

  // Ensure that elements have at least one child.
  if (element !== editor && element.children.length === 0) {
    const child = createSpanNode(editor)
    editor.apply({type: 'insert_node', path: path.concat(0), node: child})
    const refetched = getTextBlockNode(editor, path)?.node
    if (!refetched) {
      return
    }
    element = refetched
  }

  if (isTextBlock({schema: editor.schema}, element)) {
    // Since we'll be applying operations while iterating, we also modify
    // `n` when adding/removing nodes.
    for (let n = 0; n < element.children.length; n++) {
      const child = element.children[n]
      const prev: Node | undefined = element.children[n - 1]

      if (isSpan({schema: editor.schema}, child)) {
        if (prev != null && isSpan({schema: editor.schema}, prev)) {
          // Merge adjacent text nodes that are empty or match.
          if (child.text === '') {
            removeNodes(editor, {
              at: path.concat(n),
              includeObjectNodes: true,
            })
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (prev.text === '') {
            removeNodes(editor, {
              at: path.concat(n - 1),
              includeObjectNodes: true,
            })
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (textEquals(child, prev, {loose: true})) {
            const mergePath = path.concat(n)
            applyMergeNode(editor, mergePath, prev.text.length)
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          }
        }
      } else if (isObjectNode({schema: editor.schema}, child)) {
        if (prev == null || !isSpan({schema: editor.schema}, prev)) {
          const newChild = createSpanNode(editor)
          editor.apply({
            type: 'insert_node',
            path: path.concat(n),
            node: newChild,
          })
          const refetched = getTextBlockNode(editor, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
        }
        if (n === element.children.length - 1) {
          const newChild = createSpanNode(editor)
          editor.apply({
            type: 'insert_node',
            path: path.concat(n + 1),
            node: newChild,
          })
          const refetched = getTextBlockNode(editor, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
        }
      }
    }
  } else {
    // Since we'll be applying operations while iterating, we also modify
    // `n` when adding/removing nodes.
    for (let n = 0; n < element.children.length; n++) {
      const child = element.children[n]

      // Allow only block nodes in the top-level children and parent blocks
      // that only contain block nodes.
      if (isSpan({schema: editor.schema}, child)) {
        removeNodes(editor, {at: path.concat(n), includeObjectNodes: true})
        if (path.length === 0) {
          element = editor
        } else {
          const refetched = getTextBlockNode(editor, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
        }
        n--
      }
    }
  }
}

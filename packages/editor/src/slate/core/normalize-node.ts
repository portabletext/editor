import type {PortableTextTextBlock} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {debug} from '../../internal-utils/debug'
import {getTextBlockNode} from '../../node-traversal/get-text-block-node'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import {createSpanNode} from '../node/create-span-node'
import {isObjectNode} from '../node/is-object-node'
import {isSpanNode} from '../node/is-span-node'
import {textEquals} from '../text/text-equals'
import type {WithEditorFirstArg} from '../utils/types'
import {insertNodes} from './insert-nodes'
import {removeNodes} from './remove-nodes'

export const normalizeNode: WithEditorFirstArg<Editor['normalizeNode']> = (
  editor,
  entry,
) => {
  const [node, path] = entry

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
    insertNodes(editor, [child], {at: path.concat(0), includeObjectNodes: true})
    const refetched = getTextBlockNode(editor, path)?.node
    if (!refetched) {
      return
    }
    element = refetched
  }

  // Determine whether the node should have only block or only inline children.
  // - The editor should have only block children.
  // - Inline elements should have only inline children.
  // - Elements that begin with a text child or an inline element child
  //   should have only inline children.
  // - All other elements should have only block children.
  const firstChild = element.children[0]!
  const shouldHaveInlines =
    !isEditor(element) &&
    (editor.isInline(element) ||
      isSpan({schema: editor.schema}, firstChild) ||
      isObjectNode({schema: editor.schema}, firstChild) ||
      (isTextBlock({schema: editor.schema}, firstChild) &&
        editor.isInline(firstChild)))

  if (shouldHaveInlines) {
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
      } else if (isTextBlock({schema: editor.schema}, child)) {
        if (editor.isInline(child)) {
          // Ensure that inline nodes are surrounded by text nodes.
          if (prev == null || !isSpan({schema: editor.schema}, prev)) {
            const newChild = createSpanNode(editor)
            insertNodes(editor, [newChild], {
              at: path.concat(n),
              includeObjectNodes: true,
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
            insertNodes(editor, [newChild], {
              at: path.concat(n + 1),
              includeObjectNodes: true,
            })
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n++
          }
        } else {
          // An Element cannot appear inline in another Element
          removeNodes(editor, {at: path.concat(n), includeObjectNodes: true})
          const refetched = getTextBlockNode(editor, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n--
        }
      } else if (isObjectNode({schema: editor.schema}, child)) {
        if (prev == null || !isSpan({schema: editor.schema}, prev)) {
          const newChild = createSpanNode(editor)
          insertNodes(editor, [newChild], {
            at: path.concat(n),
            includeObjectNodes: true,
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
          insertNodes(editor, [newChild], {
            at: path.concat(n + 1),
            includeObjectNodes: true,
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
      if (
        isSpan({schema: editor.schema}, child) ||
        (isTextBlock({schema: editor.schema}, child) && editor.isInline(child))
      ) {
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

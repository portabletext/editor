import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {applyInsertNodeAtPath} from '../../internal-utils/apply-insert-node'
import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {applySetNode} from '../../internal-utils/apply-set-node'
import {createPlaceholderBlock} from '../../internal-utils/create-placeholder-block'
import {debug} from '../../internal-utils/debug'
import {isEqualMarkDefs} from '../../internal-utils/equality'
import {getChildren} from '../../node-traversal/get-children'
import {getNode} from '../../node-traversal/get-node'
import {getParent} from '../../node-traversal/get-parent'
import {getTextBlockNode} from '../../node-traversal/get-text-block-node'
import {withoutPatching} from '../../slate-plugins/slate-plugin.without-patching'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import {createSpanNode} from '../node/create-span-node'
import {isObjectNode} from '../node/is-object-node'
import {isSpanNode} from '../node/is-span-node'
import {isTextBlockNode} from '../node/is-text-block-node'
import {parentPath} from '../path/parent-path'
import {pathEquals} from '../path/path-equals'
import {textEquals} from '../text/text-equals'
import type {WithEditorFirstArg} from '../utils/types'
import {removeNodes} from './remove-nodes'

export const normalizeNode: WithEditorFirstArg<Editor['normalizeNode']> = (
  editor,
  entry,
) => {
  const [node, path] = entry
  const nodeRecord = node as Record<string, unknown>

  /**
   * Add a placeholder block when the editor is empty
   */
  if (isEditor(node) && node.children.length === 0) {
    withoutPatching(editor, () => {
      applyInsertNodeAtPath(editor, createPlaceholderBlock(editor), [0])
    })
    return
  }

  /**
   * Merge spans with same set of .marks
   */
  if (isTextBlock({schema: editor.schema}, node)) {
    const children = getChildren(editor, path)

    for (const {node: child, path: childPath} of children) {
      const childIndex = childPath[childPath.length - 1]!
      const nextNode = node.children[childIndex + 1]

      if (
        isSpanNode({schema: editor.schema}, child) &&
        isSpanNode({schema: editor.schema}, nextNode)
      ) {
        const childMarks = child.marks ?? []
        const nextMarks = nextNode.marks ?? []

        if (
          childMarks.every((mark) => nextMarks.includes(mark)) &&
          nextMarks.every((mark) => childMarks.includes(mark))
        ) {
          debug.normalization('merging spans with same marks')
          const mergePath = [...path, childIndex + 1]
          applyMergeNode(editor, mergePath, child.text?.length ?? 0)
          return
        }
      }
    }
  }

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

  // Fix duplicate _key among siblings
  if (path.length > 0 && nodeRecord['_key'] !== undefined) {
    const parent = getParent(editor, path)
    const siblings = parent
      ? getChildren(editor, parent.path)
      : editor.children.map((child, index) => ({
          node: child,
          path: [index],
        }))

    for (const sibling of siblings) {
      // Stop when we reach the current node
      if (pathEquals(sibling.path, path)) {
        break
      }
      if (sibling.node._key === nodeRecord['_key']) {
        debug.normalization('Fixing duplicate key on node')
        editor.apply({
          type: 'set_node',
          path,
          properties: {},
          newProperties: {_key: editor.keyGenerator()},
        })
        return
      }
    }
  }

  /**
   * Add missing .markDefs to text block nodes
   */
  if (
    isTextBlockNode({schema: editor.schema}, node) &&
    !Array.isArray(node.markDefs)
  ) {
    debug.normalization('adding .markDefs to block node')
    applySetNode(editor, {markDefs: []}, path)
    return
  }

  /**
   * Add missing .style to text block nodes
   */
  {
    const defaultStyle = editor.schema.styles.at(0)?.name
    if (
      defaultStyle &&
      isTextBlockNode({schema: editor.schema}, node) &&
      typeof node.style === 'undefined'
    ) {
      debug.normalization('adding .style to block node')
      applySetNode(editor, {style: defaultStyle}, path)
      return
    }
  }

  /**
   * Add missing .marks to span nodes
   */
  if (isSpanNode({schema: editor.schema}, node) && !Array.isArray(node.marks)) {
    debug.normalization('Adding .marks to span node')
    applySetNode(editor, {marks: []}, path)
    return
  }

  /**
   * Remove annotations from empty spans
   */
  if (isSpan({schema: editor.schema}, node)) {
    const blockPath = parentPath(path)
    const blockEntry = getTextBlockNode(editor, blockPath)
    if (!blockEntry) {
      return
    }
    const decorators = editor.schema.decorators.map(
      (decorator) => decorator.name,
    )
    const annotations = node.marks?.filter((mark) => !decorators.includes(mark))

    if (node.text === '' && annotations && annotations.length > 0) {
      debug.normalization('removing annotations from empty span node')
      applySetNode(
        editor,
        {marks: node.marks?.filter((mark) => decorators.includes(mark))},
        path,
      )
      return
    }
  }

  /**
   * Remove orphaned annotations from child spans of block nodes
   */
  if (isTextBlock({schema: editor.schema}, node)) {
    const decorators = editor.schema.decorators.map(
      (decorator) => decorator.name,
    )

    for (const {node: child, path: childPath} of getChildren(editor, path)) {
      if (isSpan({schema: editor.schema}, child)) {
        const marks = child.marks ?? []
        const orphanedAnnotations = marks.filter((mark) => {
          return (
            !decorators.includes(mark) &&
            !node.markDefs?.find((def) => def._key === mark)
          )
        })

        if (orphanedAnnotations.length > 0) {
          debug.normalization('removing orphaned annotations from span node')
          applySetNode(
            editor,
            {
              marks: marks.filter(
                (mark) => !orphanedAnnotations.includes(mark),
              ),
            },
            childPath,
          )
          return
        }
      }
    }
  }

  /**
   * Remove orphaned annotations from span nodes
   */
  if (isSpan({schema: editor.schema}, node)) {
    const blockPath = parentPath(path)
    const blockEntry2 = getTextBlockNode(editor, blockPath)

    if (blockEntry2) {
      const block = blockEntry2.node
      const decorators = editor.schema.decorators.map(
        (decorator) => decorator.name,
      )
      const marks = node.marks ?? []
      const orphanedAnnotations = marks.filter((mark) => {
        return (
          !decorators.includes(mark) &&
          !block.markDefs?.find((def) => def._key === mark)
        )
      })

      if (orphanedAnnotations.length > 0) {
        debug.normalization('removing orphaned annotations from span node')
        applySetNode(
          editor,
          {
            marks: marks.filter((mark) => !orphanedAnnotations.includes(mark)),
          },
          path,
        )
        return
      }
    }
  }

  /**
   * Remove duplicate markDefs
   */
  if (isTextBlock({schema: editor.schema}, node)) {
    const markDefs = node.markDefs ?? []
    const markDefKeys = new Set<string>()
    const newMarkDefs: Array<PortableTextObject> = []

    for (const markDef of markDefs) {
      if (!markDefKeys.has(markDef._key)) {
        markDefKeys.add(markDef._key)
        newMarkDefs.push(markDef)
      }
    }

    if (markDefs.length !== newMarkDefs.length) {
      debug.normalization('removing duplicate markDefs')
      applySetNode(editor, {markDefs: newMarkDefs}, path)
      return
    }
  }

  /**
   * Remove markDefs not in use
   */
  if (isTextBlock({schema: editor.schema}, node)) {
    const newMarkDefs = (node.markDefs || []).filter((def) => {
      return node.children.find((child) => {
        return (
          isSpan({schema: editor.schema}, child) &&
          Array.isArray(child.marks) &&
          child.marks.includes(def._key)
        )
      })
    })

    if (node.markDefs && !isEqualMarkDefs(newMarkDefs, node.markDefs)) {
      debug.normalization('removing markDef not in use')
      applySetNode(editor, {markDefs: newMarkDefs}, path)
      return
    }
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

  // Text blocks must always have at least one child span.
  if (isTextBlockNode({schema: editor.schema}, node)) {
    // Runtime data can arrive without children (e.g. after an unset patch).
    if (!Array.isArray(node.children)) {
      editor.apply({
        type: 'set_node',
        path,
        properties: {},
        newProperties: {children: []},
      })
      return
    }

    // We will have to refetch the element any time we modify its children
    // since it clones to a new immutable reference when we do.
    let element: PortableTextTextBlock = node

    // Ensure that text blocks have at least one child.
    if (element.children.length === 0) {
      const child = createSpanNode(editor)
      editor.apply({type: 'insert_node', path: path.concat(0), node: child})
      const refetched = getTextBlockNode(editor, path)?.node
      if (!refetched) {
        return
      }
      element = refetched
    }

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

    return
  }
}

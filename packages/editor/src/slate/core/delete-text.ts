import {isSpan, isTextBlock} from '@portabletext/schema'
import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {applySetNode} from '../../internal-utils/apply-set-node'
import {safeStringify} from '../../internal-utils/safe-json'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import {above} from '../editor/above'
import {after} from '../editor/after'
import {before} from '../editor/before'
import {elementReadOnly} from '../editor/element-read-only'
import {end as editorEnd} from '../editor/end'
import {getObjectNode} from '../editor/get-object-node'
import {isEditor} from '../editor/is-editor'
import {levels} from '../editor/levels'
import {nodes} from '../editor/nodes'
import {pathRef} from '../editor/path-ref'
import {pointRef} from '../editor/point-ref'
import {previous as editorPrevious} from '../editor/previous'
import {shouldMergeNodesRemovePrevNode} from '../editor/should-merge-nodes-remove-prev-node'
import {start as editorStart} from '../editor/start'
import {unhangRange} from '../editor/unhang-range'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import type {Point} from '../interfaces/point'
import {getNode} from '../node/get-node'
import {isObjectNode} from '../node/is-object-node'
import {commonPath} from '../path/common-path'
import {comparePaths} from '../path/compare-paths'
import {isAncestorPath} from '../path/is-ancestor-path'
import {isCommonPath} from '../path/is-common-path'
import {isPath} from '../path/is-path'
import {isSiblingPath} from '../path/is-sibling-path'
import {nextPath} from '../path/next-path'
import {pathEquals} from '../path/path-equals'
import {previousPath} from '../path/previous-path'
import {isPoint} from '../point/is-point'
import {pointEquals} from '../point/point-equals'
import {isCollapsedRange} from '../range/is-collapsed-range'
import {isRange} from '../range/is-range'
import {rangeEdges} from '../range/range-edges'
import type {TextUnit} from '../types/types'
import {insertText} from './insert-text'
import {removeNodes} from './remove-nodes'

interface TextDeleteOptions {
  at?: Location
  distance?: number
  unit?: TextUnit
  reverse?: boolean
  hanging?: boolean
  includeObjectNodes?: boolean
}

export function deleteText(editor: Editor, options: TextDeleteOptions = {}) {
  withoutNormalizing(editor, () => {
    const {
      reverse = false,
      unit = 'character',
      distance = 1,
      includeObjectNodes = false,
    } = options
    let {at = editor.selection, hanging = false} = options

    if (!at) {
      return
    }

    let isCollapsed = false
    if (isRange(at) && isCollapsedRange(at)) {
      isCollapsed = true
      at = at.anchor
    }

    if (isPoint(at)) {
      const furthestObjectNode = getObjectNode(editor, {at, mode: 'highest'})

      if (!includeObjectNodes && furthestObjectNode) {
        const [, voidPath] = furthestObjectNode
        at = voidPath
      } else {
        const opts = {unit, distance}
        const target = reverse
          ? before(editor, at, opts) || editorStart(editor, [])
          : after(editor, at, opts) || editorEnd(editor, [])
        at = {anchor: at, focus: target}
        hanging = true
      }
    }

    if (isPath(at)) {
      removeNodes(editor, {at, includeObjectNodes})
      return
    }

    if (isCollapsedRange(at)) {
      return
    }

    if (!hanging) {
      const [, end] = rangeEdges(at)
      const endOfDoc = editorEnd(editor, [])

      if (!pointEquals(end, endOfDoc)) {
        at = unhangRange(editor, at, {includeObjectNodes})
      }
    }

    let [start, end] = rangeEdges(at)
    const startBlock = above(editor, {
      match: (n) => isTextBlock({schema: editor.schema}, n),
      at: start,
      includeObjectNodes,
    })
    const endBlock = above(editor, {
      match: (n) => isTextBlock({schema: editor.schema}, n),
      at: end,
      includeObjectNodes,
    })
    const isAcrossBlocks =
      startBlock && endBlock && !pathEquals(startBlock[1], endBlock[1])
    const isSingleText = pathEquals(start.path, end.path)
    const startNonEditable = includeObjectNodes
      ? null
      : (getObjectNode(editor, {at: start, mode: 'highest'}) ??
        elementReadOnly(editor, {at: start, mode: 'highest'}))
    const endNonEditable = includeObjectNodes
      ? null
      : (getObjectNode(editor, {at: end, mode: 'highest'}) ??
        elementReadOnly(editor, {at: end, mode: 'highest'}))

    // If the start or end points are inside an inline void, nudge them out.
    if (startNonEditable) {
      const beforePoint = before(editor, start)

      if (
        beforePoint &&
        startBlock &&
        isAncestorPath(startBlock[1], beforePoint.path)
      ) {
        start = beforePoint
      }
    }

    if (endNonEditable) {
      const afterPoint = after(editor, end)

      if (
        afterPoint &&
        endBlock &&
        isAncestorPath(endBlock[1], afterPoint.path)
      ) {
        end = afterPoint
      }
    }

    // Get the highest nodes that are completely inside the range, as well as
    // the start and end nodes.
    const matches: NodeEntry[] = []
    let lastPath: Path | undefined

    for (const entry of nodes(editor, {at, includeObjectNodes})) {
      const [node, path] = entry

      if (lastPath && comparePaths(path, lastPath) === 0) {
        continue
      }

      if (
        (!includeObjectNodes &&
          (isObjectNode({schema: editor.schema}, node) ||
            (isTextBlock({schema: editor.schema}, node) &&
              editor.isElementReadOnly(node)))) ||
        (!isCommonPath(path, start.path) && !isCommonPath(path, end.path))
      ) {
        matches.push(entry)
        lastPath = path
      }
    }

    const pathRefs = Array.from(matches, ([, p]) => pathRef(editor, p))
    const startRef = pointRef(editor, start)
    const endRef = pointRef(editor, end)

    let removedText = ''

    if (!isSingleText && !startNonEditable) {
      const point = startRef.current!
      const node = getNode(editor, point.path, editor.schema)
      if (isSpan({schema: editor.schema}, node)) {
        const {path} = point
        const {offset} = start
        const text = node.text.slice(offset)
        if (text.length > 0) {
          editor.apply({type: 'remove_text', path, offset, text})
          removedText = text
        }
      }
    }

    pathRefs
      .reverse()
      .map((r) => r.unref())
      .filter((r): r is Path => r !== null)
      .forEach((p) => {
        removeNodes(editor, {at: p, includeObjectNodes})
      })

    if (!endNonEditable) {
      const point = endRef.current!
      const node = getNode(editor, point.path, editor.schema)
      if (isSpan({schema: editor.schema}, node)) {
        const {path} = point
        const offset = isSingleText ? start.offset : 0
        const text = node.text.slice(offset, end.offset)
        if (text.length > 0) {
          editor.apply({type: 'remove_text', path, offset, text})
          removedText = text
        }
      }
    }

    if (!isSingleText && isAcrossBlocks && endRef.current && startRef.current) {
      const mergeAt: Point = endRef.current
      const mergeMatch = (n: Node) => isTextBlock({schema: editor.schema}, n)

      const [current] = nodes(editor, {
        at: mergeAt,
        match: mergeMatch,
        includeObjectNodes,
        mode: 'lowest',
      })
      const prev = editorPrevious(editor, {
        at: mergeAt,
        match: mergeMatch,
        includeObjectNodes,
        mode: 'lowest',
      })

      if (current && prev) {
        const [mergeNode, mergePath] = current
        const [prevNode, prevPath] = prev

        if (mergePath.length !== 0 && prevPath.length !== 0) {
          const newPath = nextPath(prevPath)
          const common = commonPath(mergePath, prevPath)
          const isPreviousSibling = isSiblingPath(mergePath, prevPath)
          const editorLevels = Array.from(
            levels(editor, {at: mergePath}),
            ([n]) => n,
          )
            .slice(common.length)
            .slice(0, -1)

          // Determine if the merge will leave an ancestor of the path empty
          const hasSingleChildNest = (node: Node): boolean => {
            if (isTextBlock({schema: editor.schema}, node)) {
              const element = node
              const elementChildren = element.children
              if (elementChildren.length === 1) {
                return hasSingleChildNest(elementChildren[0]!)
              } else {
                return false
              }
            } else if (isEditor(node)) {
              return false
            } else {
              return true
            }
          }

          const emptyAncestor = above(editor, {
            at: mergePath,
            mode: 'highest',
            match: (n) => editorLevels.includes(n) && hasSingleChildNest(n),
          })

          const emptyRef = emptyAncestor && pathRef(editor, emptyAncestor[1])

          let position: number

          if (
            isSpan({schema: editor.schema}, mergeNode) &&
            isSpan({schema: editor.schema}, prevNode)
          ) {
            position = prevNode.text.length
          } else if (
            isTextBlock({schema: editor.schema}, mergeNode) &&
            isTextBlock({schema: editor.schema}, prevNode)
          ) {
            position = prevNode.children.length
          } else {
            throw new Error(
              `Cannot merge the node at path [${mergePath}] with the previous sibling because it is not the same kind: ${safeStringify(
                mergeNode,
              )} ${safeStringify(prevNode)}`,
            )
          }

          if (!isPreviousSibling) {
            const moveNode = getNode(editor, mergePath, editor.schema)
            editor.apply({type: 'remove_node', path: mergePath, node: moveNode})
            editor.apply({type: 'insert_node', path: newPath, node: moveNode})
          }

          if (emptyRef) {
            removeNodes(editor, {
              at: emptyRef.current!,
              includeObjectNodes,
            })
          }

          if (shouldMergeNodesRemovePrevNode(editor, prev, current)) {
            removeNodes(editor, {at: prevPath, includeObjectNodes})
          } else {
            // Copy markDefs from the merging block to the target before merging
            const pteEditor = editor as unknown as PortableTextSlateEditor
            if (
              isTextBlock({schema: editor.schema}, mergeNode) &&
              isTextBlock({schema: editor.schema}, prevNode) &&
              Array.isArray(mergeNode.markDefs) &&
              mergeNode.markDefs.length > 0
            ) {
              const targetPath = isPreviousSibling
                ? prevPath
                : previousPath(newPath)
              const oldDefs =
                (Array.isArray(prevNode.markDefs) && prevNode.markDefs) || []
              const newMarkDefs = [
                ...new Map(
                  [...oldDefs, ...mergeNode.markDefs].map((def) => [
                    def._key,
                    def,
                  ]),
                ).values(),
              ]
              applySetNode(pteEditor, {markDefs: newMarkDefs}, targetPath)
            }
            applyMergeNode(pteEditor, newPath, position)
          }

          if (emptyRef) {
            emptyRef.unref()
          }
        }
      }
    }

    // For certain scripts, deleting N character(s) backward should delete
    // N code point(s) instead of an entire grapheme cluster.
    // Therefore, the remaining code points should be inserted back.
    // Bengali: \u0980-\u09FF
    // Thai: \u0E00-\u0E7F
    // Burmese (Myanmar): \u1000-\u109F
    // Hindi (Devanagari): \u0900-\u097F
    // Khmer: \u1780-\u17FF
    // Malayalam: \u0D00-\u0D7F
    // Oriya: \u0B00-\u0B7F
    // Punjabi (Gurmukhi): \u0A00-\u0A7F
    // Tamil: \u0B80-\u0BFF
    // Telugu: \u0C00-\u0C7F
    if (
      isCollapsed &&
      reverse &&
      unit === 'character' &&
      removedText.length > 1 &&
      removedText.match(
        /[\u0980-\u09FF\u0E00-\u0E7F\u1000-\u109F\u0900-\u097F\u1780-\u17FF\u0D00-\u0D7F\u0B00-\u0B7F\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F]+/,
      )
    ) {
      insertText(editor, removedText.slice(0, removedText.length - distance))
    }

    const startUnref = startRef.unref()
    const endUnref = endRef.unref()
    const point = reverse ? startUnref || endUnref : endUnref || startUnref

    if (options.at == null && point) {
      editor.select(point)
    }
  })
}

import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {applySetNode} from '../../internal-utils/apply-set-node'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import {above} from '../editor/above'
import {after} from '../editor/after'
import {before} from '../editor/before'
import {elementReadOnly} from '../editor/element-read-only'
import {end as editorEnd} from '../editor/end'
import {getVoid} from '../editor/get-void'
import {isBlock} from '../editor/is-block'
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
import type {Location} from '../index'
import {Editor} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import type {Node, NodeEntry} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Point} from '../interfaces/point'
import {Range} from '../interfaces/range'
import {Scrubber} from '../interfaces/scrubber'
import {Text} from '../interfaces/text'
import {getNode} from '../node/get-node'
import type {TextUnit} from '../types/types'
import {insertText} from './insert-text'
import {removeNodes} from './remove-nodes'

export interface TextDeleteOptions {
  at?: Location
  distance?: number
  unit?: TextUnit
  reverse?: boolean
  hanging?: boolean
  voids?: boolean
}

export function deleteText(editor: Editor, options: TextDeleteOptions = {}) {
  withoutNormalizing(editor, () => {
    const {
      reverse = false,
      unit = 'character',
      distance = 1,
      voids = false,
    } = options
    let {at = editor.selection, hanging = false} = options

    if (!at) {
      return
    }

    let isCollapsed = false
    if (Range.isRange(at) && Range.isCollapsed(at)) {
      isCollapsed = true
      at = at.anchor
    }

    if (Point.isPoint(at)) {
      const furthestVoid = getVoid(editor, {at, mode: 'highest'})

      if (!voids && furthestVoid) {
        const [, voidPath] = furthestVoid
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

    if (Path.isPath(at)) {
      removeNodes(editor, {at, voids})
      return
    }

    if (Range.isCollapsed(at)) {
      return
    }

    if (!hanging) {
      const [, end] = Range.edges(at)
      const endOfDoc = editorEnd(editor, [])

      if (!Point.equals(end, endOfDoc)) {
        at = unhangRange(editor, at, {voids})
      }
    }

    let [start, end] = Range.edges(at)
    const startBlock = above(editor, {
      match: (n) => Element.isElement(n, editor.schema) && isBlock(editor, n),
      at: start,
      voids,
    })
    const endBlock = above(editor, {
      match: (n) => Element.isElement(n, editor.schema) && isBlock(editor, n),
      at: end,
      voids,
    })
    const isAcrossBlocks =
      startBlock && endBlock && !Path.equals(startBlock[1], endBlock[1])
    const isSingleText = Path.equals(start.path, end.path)
    const startNonEditable = voids
      ? null
      : (getVoid(editor, {at: start, mode: 'highest'}) ??
        elementReadOnly(editor, {at: start, mode: 'highest'}))
    const endNonEditable = voids
      ? null
      : (getVoid(editor, {at: end, mode: 'highest'}) ??
        elementReadOnly(editor, {at: end, mode: 'highest'}))

    // If the start or end points are inside an inline void, nudge them out.
    if (startNonEditable) {
      const beforePoint = before(editor, start)

      if (
        beforePoint &&
        startBlock &&
        Path.isAncestor(startBlock[1], beforePoint.path)
      ) {
        start = beforePoint
      }
    }

    if (endNonEditable) {
      const afterPoint = after(editor, end)

      if (
        afterPoint &&
        endBlock &&
        Path.isAncestor(endBlock[1], afterPoint.path)
      ) {
        end = afterPoint
      }
    }

    // Get the highest nodes that are completely inside the range, as well as
    // the start and end nodes.
    const matches: NodeEntry[] = []
    let lastPath: Path | undefined

    for (const entry of nodes(editor, {at, voids})) {
      const [node, path] = entry

      if (lastPath && Path.compare(path, lastPath) === 0) {
        continue
      }

      if (
        (!voids &&
          (editor.isObjectNode(node) ||
            (Element.isElement(node, editor.schema) &&
              Editor.isElementReadOnly(editor, node)))) ||
        (!Path.isCommon(path, start.path) && !Path.isCommon(path, end.path))
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
      if (Text.isText(node, editor.schema)) {
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
        removeNodes(editor, {at: p, voids})
      })

    if (!endNonEditable) {
      const point = endRef.current!
      const node = getNode(editor, point.path, editor.schema)
      if (Text.isText(node, editor.schema)) {
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
      const mergeMatch = (n: Node) =>
        Element.isElement(n, editor.schema) && isBlock(editor, n)

      const [current] = nodes(editor, {
        at: mergeAt,
        match: mergeMatch,
        voids,
        mode: 'lowest',
      })
      const prev = editorPrevious(editor, {
        at: mergeAt,
        match: mergeMatch,
        voids,
        mode: 'lowest',
      })

      if (current && prev) {
        const [mergeNode, mergePath] = current
        const [prevNode, prevPath] = prev

        if (mergePath.length !== 0 && prevPath.length !== 0) {
          const newPath = Path.next(prevPath)
          const commonPath = Path.common(mergePath, prevPath)
          const isPreviousSibling = Path.isSibling(mergePath, prevPath)
          const editorLevels = Array.from(
            levels(editor, {at: mergePath}),
            ([n]) => n,
          )
            .slice(commonPath.length)
            .slice(0, -1)

          // Determine if the merge will leave an ancestor of the path empty
          const hasSingleChildNest = (node: Node): boolean => {
            if (Element.isElement(node, editor.schema)) {
              const element = node as Element
              if (element.children.length === 1) {
                return hasSingleChildNest(element.children[0]!)
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
            Text.isText(mergeNode, editor.schema) &&
            Text.isText(prevNode, editor.schema)
          ) {
            position = prevNode.text.length
          } else if (
            Element.isElement(mergeNode, editor.schema) &&
            Element.isElement(prevNode, editor.schema)
          ) {
            position = prevNode.children.length
          } else {
            throw new Error(
              `Cannot merge the node at path [${mergePath}] with the previous sibling because it is not the same kind: ${Scrubber.stringify(
                mergeNode,
              )} ${Scrubber.stringify(prevNode)}`,
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
              voids,
            })
          }

          if (shouldMergeNodesRemovePrevNode(editor, prev, current)) {
            removeNodes(editor, {at: prevPath, voids})
          } else {
            // Copy markDefs from the merging block to the target before merging
            const pteEditor = editor as unknown as PortableTextSlateEditor
            if (
              pteEditor.isTextBlock(mergeNode) &&
              pteEditor.isTextBlock(prevNode) &&
              Array.isArray(mergeNode.markDefs) &&
              mergeNode.markDefs.length > 0
            ) {
              const targetPath = isPreviousSibling
                ? prevPath
                : Path.previous(newPath)
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

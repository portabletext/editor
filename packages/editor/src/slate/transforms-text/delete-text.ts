import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {applyMoveNode} from '../../internal-utils/apply-move-node'
import {applySetNode} from '../../internal-utils/apply-set-node'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import {Editor} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import {Node} from '../interfaces/node'
import type {NodeEntry} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Point} from '../interfaces/point'
import {Range} from '../interfaces/range'
import {Scrubber} from '../interfaces/scrubber'
import {Text} from '../interfaces/text'
import {Transforms} from '../interfaces/transforms'
import type {TextTransforms} from '../interfaces/transforms/text'

export const deleteText: TextTransforms['delete'] = (editor, options = {}) => {
  Editor.withoutNormalizing(editor, () => {
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
      const furthestVoid = Editor.void(editor, {at, mode: 'highest'})

      if (!voids && furthestVoid) {
        const [, voidPath] = furthestVoid
        at = voidPath
      } else {
        const opts = {unit, distance}
        const target = reverse
          ? Editor.before(editor, at, opts) || Editor.start(editor, [])
          : Editor.after(editor, at, opts) || Editor.end(editor, [])
        at = {anchor: at, focus: target}
        hanging = true
      }
    }

    if (Path.isPath(at)) {
      Transforms.removeNodes(editor, {at, voids})
      return
    }

    if (Range.isCollapsed(at)) {
      return
    }

    if (!hanging) {
      const [, end] = Range.edges(at)
      const endOfDoc = Editor.end(editor, [])

      if (!Point.equals(end, endOfDoc)) {
        at = Editor.unhangRange(editor, at, {voids})
      }
    }

    let [start, end] = Range.edges(at)
    const startBlock = Editor.above(editor, {
      match: (n) =>
        Element.isElement(n, editor.schema) && Editor.isBlock(editor, n),
      at: start,
      voids,
    })
    const endBlock = Editor.above(editor, {
      match: (n) =>
        Element.isElement(n, editor.schema) && Editor.isBlock(editor, n),
      at: end,
      voids,
    })
    const isAcrossBlocks =
      startBlock && endBlock && !Path.equals(startBlock[1], endBlock[1])
    const isSingleText = Path.equals(start.path, end.path)
    const startNonEditable = voids
      ? null
      : (Editor.void(editor, {at: start, mode: 'highest'}) ??
        Editor.elementReadOnly(editor, {at: start, mode: 'highest'}))
    const endNonEditable = voids
      ? null
      : (Editor.void(editor, {at: end, mode: 'highest'}) ??
        Editor.elementReadOnly(editor, {at: end, mode: 'highest'}))

    // If the start or end points are inside an inline void, nudge them out.
    if (startNonEditable) {
      const before = Editor.before(editor, start)

      if (before && startBlock && Path.isAncestor(startBlock[1], before.path)) {
        start = before
      }
    }

    if (endNonEditable) {
      const after = Editor.after(editor, end)

      if (after && endBlock && Path.isAncestor(endBlock[1], after.path)) {
        end = after
      }
    }

    // Get the highest nodes that are completely inside the range, as well as
    // the start and end nodes.
    const matches: NodeEntry[] = []
    let lastPath: Path | undefined

    for (const entry of Editor.nodes(editor, {at, voids})) {
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

    const pathRefs = Array.from(matches, ([, p]) => Editor.pathRef(editor, p))
    const startRef = Editor.pointRef(editor, start)
    const endRef = Editor.pointRef(editor, end)

    let removedText = ''

    if (!isSingleText && !startNonEditable) {
      const point = startRef.current!
      const node = Node.get(editor, point.path, editor.schema)
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
        Transforms.removeNodes(editor, {at: p, voids})
      })

    if (!endNonEditable) {
      const point = endRef.current!
      const node = Node.get(editor, point.path, editor.schema)
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
      // Inline merge logic (equivalent to Transforms.mergeNodes with {at: endRef.current, hanging: true, voids})
      const mergeAt: Point = endRef.current
      const mergeMatch = (n: Node) =>
        Element.isElement(n, editor.schema) && Editor.isBlock(editor, n)

      const [current] = Editor.nodes(editor, {
        at: mergeAt,
        match: mergeMatch,
        voids,
        mode: 'lowest',
      })
      const prev = Editor.previous(editor, {
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
          const levels = Array.from(
            Editor.levels(editor, {at: mergePath}),
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
            } else if (Editor.isEditor(node)) {
              return false
            } else {
              return true
            }
          }

          const emptyAncestor = Editor.above(editor, {
            at: mergePath,
            mode: 'highest',
            match: (n) => levels.includes(n) && hasSingleChildNest(n),
          })

          const emptyRef =
            emptyAncestor && Editor.pathRef(editor, emptyAncestor[1])

          let properties: Partial<Node>
          let position: number

          if (
            Text.isText(mergeNode, editor.schema) &&
            Text.isText(prevNode, editor.schema)
          ) {
            const {text: _text, ...rest} = mergeNode
            position = prevNode.text.length
            properties = rest
          } else if (
            Element.isElement(mergeNode, editor.schema) &&
            Element.isElement(prevNode, editor.schema)
          ) {
            const {children: _children, ...rest} = mergeNode
            position = prevNode.children.length
            properties = rest
          } else {
            throw new Error(
              `Cannot merge the node at path [${mergePath}] with the previous sibling because it is not the same kind: ${Scrubber.stringify(
                mergeNode,
              )} ${Scrubber.stringify(prevNode)}`,
            )
          }

          if (!isPreviousSibling) {
            applyMoveNode(editor, mergePath, newPath)
          }

          if (emptyRef) {
            Transforms.removeNodes(editor, {
              at: emptyRef.current!,
              voids,
            })
          }

          if (Editor.shouldMergeNodesRemovePrevNode(editor, prev, current)) {
            Transforms.removeNodes(editor, {at: prevPath, voids})
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
            applyMergeNode(
              pteEditor,
              newPath,
              position,
              properties as Record<string, unknown>,
            )
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
      Transforms.insertText(
        editor,
        removedText.slice(0, removedText.length - distance),
      )
    }

    const startUnref = startRef.unref()
    const endUnref = endRef.unref()
    const point = reverse ? startUnref || endUnref : endUnref || startUnref

    if (options.at == null && point) {
      Transforms.select(editor, point)
    }
  })
}

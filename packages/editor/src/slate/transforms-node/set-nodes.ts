import {Editor} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import type {Node} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import {Text} from '../interfaces/text'
import {Transforms} from '../interfaces/transforms'
import type {NodeTransforms} from '../interfaces/transforms/node'
import {matchPath} from '../utils/match-path'

export const setNodes: NodeTransforms['setNodes'] = (
  editor,
  props: Partial<Node>,
  options = {},
) => {
  Editor.withoutNormalizing(editor, () => {
    let {match, at = editor.selection, compare, merge} = options
    const {
      hanging = false,
      mode = 'lowest',
      split = false,
      voids = false,
    } = options

    if (!at) {
      return
    }

    if (match == null) {
      match = Path.isPath(at)
        ? matchPath(editor, at)
        : (n) => Element.isElement(n) && Editor.isBlock(editor, n)
    }

    if (!hanging && Range.isRange(at)) {
      at = Editor.unhangRange(editor, at, {voids})
    }

    if (split && Range.isRange(at)) {
      const anchorNode = Editor.node(editor, at.anchor)[0]
      if (
        Range.isCollapsed(at) &&
        Text.isText(anchorNode) &&
        anchorNode.text.length > 0
      ) {
        // If the range is collapsed in a non-empty node and 'split' is true, there's nothing to
        // set that won't get normalized away
        return
      }
      const rangeRef = Editor.rangeRef(editor, at, {affinity: 'inward'})
      const [start, end] = Range.edges(at)
      const splitMode = mode === 'lowest' ? 'lowest' : 'highest'
      const endAtEndOfNode = Editor.isEnd(editor, end, end.path)
      Transforms.splitNodes(editor, {
        at: end,
        match,
        mode: splitMode,
        voids,
        always: !endAtEndOfNode,
      })
      const startAtStartOfNode = Editor.isStart(editor, start, start.path)
      Transforms.splitNodes(editor, {
        at: start,
        match,
        mode: splitMode,
        voids,
        always: !startAtStartOfNode,
      })
      at = rangeRef.unref()!

      if (options.at == null) {
        Transforms.select(editor, at)
      }
    }

    if (!compare) {
      compare = (prop, nodeProp) => prop !== nodeProp
    }

    for (const [node, path] of Editor.nodes(editor, {
      at,
      match,
      mode,
      voids,
    })) {
      const properties: Partial<Node> = {}
      // FIXME: is this correct?
      const newProperties: Partial<Node> & {[key: string]: unknown} = {}

      // You can't set properties on the editor node.
      if (path.length === 0) {
        continue
      }

      let hasChanges = false

      for (const k in props) {
        if (k === 'children' || k === 'text') {
          continue
        }

        if (compare((props as any)[k], (node as any)[k])) {
          hasChanges = true
          // Omit new properties from the old properties list
          if (node.hasOwnProperty(k)) {
            ;(properties as any)[k] = (node as any)[k]
          }
          // Omit properties that have been removed from the new properties list
          if (merge) {
            if ((props as any)[k] != null) {
              ;(newProperties as any)[k] = merge(
                (node as any)[k],
                (props as any)[k],
              )
            }
          } else {
            if ((props as any)[k] != null) {
              ;(newProperties as any)[k] = (props as any)[k]
            }
          }
        }
      }

      if (hasChanges) {
        editor.apply({
          type: 'set_node',
          path,
          properties,
          newProperties,
        })
      }
    }
  })
}

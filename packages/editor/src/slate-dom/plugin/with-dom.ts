import {applySplitNode} from '../../internal-utils/apply-split-node'
import {
  Element,
  Node,
  Path,
  Point,
  Range,
  type Editor,
  type Operation,
  type PointRef,
} from '../../slate'
import {end as editorEnd} from '../../slate/editor/end'
import {isBlock} from '../../slate/editor/is-block'
import {isEnd} from '../../slate/editor/is-end'
import {levels} from '../../slate/editor/levels'
import {node as editorNode} from '../../slate/editor/node'
import {nodes} from '../../slate/editor/nodes'
import {pointRef} from '../../slate/editor/point-ref'
import {withoutNormalizing} from '../../slate/editor/without-normalizing'
import {
  transformPendingPoint,
  transformPendingRange,
  transformTextDiff,
  type TextDiff,
} from '../utils/diff-text'
import type {Key} from '../utils/key'
import {DOMEditor} from './dom-editor'

/**
 * `withDOM` adds DOM specific behaviors to the editor.
 *
 * If you are using TypeScript, you must extend Slate's CustomTypes to use
 * this plugin.
 *
 * See https://docs.slatejs.org/concepts/11-typescript to learn how.
 */

export const withDOM = <T extends Editor>(editor: T): T & DOMEditor => {
  const e = editor as T & DOMEditor
  const {apply, onChange} = e

  // Initialize DOMEditor state properties
  e.isNodeMapDirty = false
  e.domWindow = null
  e.domElement = null
  e.domPlaceholder = ''
  e.domPlaceholderElement = null
  e.keyToElement = new WeakMap()
  e.nodeToIndex = new WeakMap()
  e.nodeToParent = new WeakMap()
  e.elementToNode = new WeakMap()
  e.nodeToElement = new WeakMap()
  e.nodeToKey = new WeakMap()
  e.readOnly = false
  e.focused = false
  e.composing = false
  e.userSelection = null
  e.onContextChange = null
  e.scheduleFlush = null
  e.pendingInsertionMarks = null
  e.userMarks = null
  e.pendingDiffs = []
  e.pendingAction = null
  e.pendingSelection = null
  e.forceRender = null

  // This attempts to reset the nodeToKey entry to the correct value
  // as apply() changes the object reference and hence invalidates the nodeToKey entry
  e.apply = (op: Operation) => {
    const matches: [Path, Key][] = []

    const pendingDiffs = e.pendingDiffs
    if (pendingDiffs?.length) {
      const transformed = pendingDiffs
        .map((textDiff) => transformTextDiff(textDiff, op))
        .filter(Boolean) as TextDiff[]

      e.pendingDiffs = transformed
    }

    const pendingSelection = e.pendingSelection
    if (pendingSelection) {
      e.pendingSelection = transformPendingRange(e, pendingSelection, op)
    }

    const pendingAction = e.pendingAction
    if (pendingAction?.at) {
      const at = Point.isPoint(pendingAction?.at)
        ? transformPendingPoint(e, pendingAction.at, op)
        : transformPendingRange(e, pendingAction.at, op)

      e.pendingAction = at ? {...pendingAction, at} : null
    }

    switch (op.type) {
      case 'insert_text':
      case 'remove_text':
      case 'set_node': {
        matches.push(...getMatches(e, op.path))
        break
      }

      case 'set_selection': {
        // Selection was manually set, don't restore the user selection after the change.
        e.userSelection?.unref()
        e.userSelection = null
        break
      }

      case 'insert_node':
      case 'remove_node': {
        matches.push(...getMatches(e, Path.parent(op.path)))
        break
      }
    }

    apply(op)

    switch (op.type) {
      case 'insert_node':
      case 'remove_node':
      case 'insert_text':
      case 'remove_text':
      case 'set_selection': {
        // FIXME: Rename to something like IS_DOM_EDITOR_DESYNCED
        // to better reflect reality, see #5792
        e.isNodeMapDirty = true
      }
    }

    for (const [path, key] of matches) {
      const [node] = editorNode(e, path)
      e.nodeToKey.set(node, key)
    }
  }

  e.insertData = (data: DataTransfer) => {
    e.insertTextData(data)
  }

  e.insertTextData = (data: DataTransfer): boolean => {
    const text = data.getData('text/plain')

    if (text) {
      const lines = text.split(/\r\n|\r|\n/)
      let split = false

      for (const line of lines) {
        if (split) {
          withoutNormalizing(e, () => {
            let splitAt: Point | null = null

            if (e.selection) {
              if (Range.isCollapsed(e.selection)) {
                splitAt = e.selection.anchor
              } else {
                const [, end] = Range.edges(e.selection)
                const endPointRef = pointRef(e, end)
                e.delete({at: e.selection})
                splitAt = endPointRef.unref()
              }
            }

            if (!splitAt) {
              return
            }

            const splitMatch = (n: Node) =>
              Element.isElement(n, e.schema) && isBlock(e, n)

            const beforeRef = pointRef(e, splitAt, {
              affinity: 'backward',
            })
            let afterRef: PointRef | undefined
            try {
              const [highest] = nodes(e, {
                at: splitAt,
                match: splitMatch,
                mode: 'lowest',
                voids: false,
              })

              if (!highest) {
                return
              }

              afterRef = pointRef(e, splitAt)
              const depth = splitAt.path.length
              const [, highestPath] = highest
              const lowestPath = splitAt.path.slice(0, depth)
              let position = splitAt.offset

              for (const [node, nodePath] of levels(e, {
                at: lowestPath,
                reverse: true,
                voids: false,
              })) {
                let didSplit = false

                if (
                  nodePath.length < highestPath.length ||
                  nodePath.length === 0
                ) {
                  break
                }

                const point = beforeRef.current!
                const isEndOfNode = isEnd(e, point, nodePath)

                // always = true, so always split
                didSplit = true
                const properties = Node.extractProps(node, e.schema)
                applySplitNode(e, nodePath, position, properties)

                position =
                  nodePath[nodePath.length - 1]! +
                  (didSplit || isEndOfNode ? 1 : 0)
              }

              const point = afterRef.current || editorEnd(e, [])
              e.select(point)
            } finally {
              beforeRef.unref()
              afterRef?.unref()
            }
          })
        }

        e.insertText(line)
        split = true
      }
      return true
    }
    return false
  }

  e.onChange = (options) => {
    const onContextChange = e.onContextChange

    if (onContextChange) {
      onContextChange(options)
    }

    onChange(options)
  }

  return e
}

const getMatches = (e: Editor, path: Path) => {
  const matches: [Path, Key][] = []
  for (const [n, p] of levels(e, {at: path})) {
    const key = DOMEditor.findKey(e, n)
    matches.push([p, key])
  }
  return matches
}

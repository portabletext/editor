import {applySplitNode} from '../../internal-utils/apply-split-node'
import {safeStringify} from '../../internal-utils/safe-json'
import {
  Editor,
  Element,
  Node,
  Path,
  Point,
  Range,
  Transforms,
  type Operation,
  type PointRef,
} from '../../slate'
import {
  transformPendingPoint,
  transformPendingRange,
  transformTextDiff,
  type TextDiff,
} from '../utils/diff-text'
import {getPlainText, isDOMText} from '../utils/dom'
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
      const [node] = Editor.node(e, path)
      e.nodeToKey.set(node, key)
    }
  }

  e.setFragmentData = (data: Pick<DataTransfer, 'getData' | 'setData'>) => {
    const {selection} = e

    if (!selection) {
      return
    }

    const [start, end] = Range.edges(selection)
    const startVoid = Editor.void(e, {at: start.path})
    const endVoid = Editor.void(e, {at: end.path})

    if (Range.isCollapsed(selection) && !startVoid) {
      return
    }

    // Create a fake selection so that we can add a Base64-encoded copy of the
    // fragment to the HTML, to decode on future pastes.
    const domRange = DOMEditor.toDOMRange(e, selection)
    let contents = domRange.cloneContents()
    let attach = contents.childNodes[0] as HTMLElement

    // Make sure attach is non-empty, since empty nodes will not get copied.
    contents.childNodes.forEach((node) => {
      if (node.textContent && node.textContent.trim() !== '') {
        attach = node as HTMLElement
      }
    })

    // COMPAT: If the end node is a void node, we need to move the end of the
    // range from the void node's spacer span, to the end of the void node's
    // content, since the spacer is before void's content in the DOM.
    if (endVoid) {
      const [voidNode] = endVoid
      const r = domRange.cloneRange()
      const domNode = DOMEditor.toDOMNode(e, voidNode)
      r.setEndAfter(domNode)
      contents = r.cloneContents()
    }

    // COMPAT: If the start node is a void node, we need to attach the encoded
    // fragment to the void node's content node instead of the spacer, because
    // attaching it to empty `<div>/<span>` nodes will end up having it erased by
    // most browsers. (2018/04/27)
    if (startVoid) {
      attach = contents.querySelector('[data-slate-spacer]')! as HTMLElement
    }

    // Remove any zero-width space spans from the cloned DOM so that they don't
    // show up elsewhere when pasted.
    Array.from(contents.querySelectorAll('[data-slate-zero-width]')).forEach(
      (zw) => {
        const isNewline = zw.getAttribute('data-slate-zero-width') === 'n'
        zw.textContent = isNewline ? '\n' : ''
      },
    )

    // Set a `data-slate-fragment` attribute on a non-empty node, so it shows up
    // in the HTML, and can be used for intra-Slate pasting. If it's a text
    // node, wrap it in a `<span>` so we have something to set an attribute on.
    if (isDOMText(attach)) {
      const span = attach.ownerDocument.createElement('span')
      // COMPAT: In Chrome and Safari, if we don't add the `white-space` style
      // then leading and trailing spaces will be ignored. (2017/09/21)
      span.style.whiteSpace = 'pre'
      span.appendChild(attach)
      contents.appendChild(span)
      attach = span
    }

    const fragment = e.getFragment()
    const string = safeStringify(fragment)
    const encoded = window.btoa(encodeURIComponent(string))
    attach.setAttribute('data-slate-fragment', encoded)
    data.setData('application/x-slate-fragment', encoded)

    // Add the content to a <div> so that we can get its inner HTML.
    const div = contents.ownerDocument.createElement('div')
    div.appendChild(contents)
    div.setAttribute('hidden', 'true')
    contents.ownerDocument.body.appendChild(div)
    data.setData('text/html', div.innerHTML)
    data.setData('text/plain', getPlainText(div))
    contents.ownerDocument.body.removeChild(div)
    return data
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
          // Inline split logic (equivalent to Transforms.splitNodes(e, {always: true}))
          Editor.withoutNormalizing(e, () => {
            let splitAt: Point | null = null

            if (e.selection) {
              if (Range.isCollapsed(e.selection)) {
                splitAt = e.selection.anchor
              } else {
                const [, end] = Range.edges(e.selection)
                const pointRef = Editor.pointRef(e, end)
                Transforms.delete(e, {at: e.selection})
                splitAt = pointRef.unref()
              }
            }

            if (!splitAt) {
              return
            }

            const splitMatch = (n: Node) =>
              Element.isElement(n, e.schema) && Editor.isBlock(e, n)

            const beforeRef = Editor.pointRef(e, splitAt, {
              affinity: 'backward',
            })
            let afterRef: PointRef | undefined
            try {
              const [highest] = Editor.nodes(e, {
                at: splitAt,
                match: splitMatch,
                mode: 'lowest',
                voids: false,
              })

              if (!highest) {
                return
              }

              afterRef = Editor.pointRef(e, splitAt)
              const depth = splitAt.path.length
              const [, highestPath] = highest
              const lowestPath = splitAt.path.slice(0, depth)
              let position = splitAt.offset

              for (const [node, nodePath] of Editor.levels(e, {
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
                const isEndOfNode = Editor.isEnd(e, point, nodePath)

                // always = true, so always split
                didSplit = true
                const properties = Node.extractProps(node, e.schema)
                applySplitNode(e, nodePath, position, properties)

                position =
                  nodePath[nodePath.length - 1]! +
                  (didSplit || isEndOfNode ? 1 : 0)
              }

              const point = afterRef.current || Editor.end(e, [])
              Transforms.select(e, point)
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
  for (const [n, p] of Editor.levels(e, {at: path})) {
    const key = DOMEditor.findKey(e, n)
    matches.push([p, key])
  }
  return matches
}

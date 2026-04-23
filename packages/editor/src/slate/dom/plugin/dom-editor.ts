import {getDomNode} from '../../../dom-traversal/get-dom-node'
import {getDomNodePath} from '../../../dom-traversal/get-dom-node-path'
import {safeStringify} from '../../../internal-utils/safe-json'
import {getAncestorObjectNode} from '../../../node-traversal/get-ancestor-object-node'
import {getHighestObjectNode} from '../../../node-traversal/get-highest-object-node'
import {getNode} from '../../../node-traversal/get-node'
import {hasNode} from '../../../node-traversal/has-node'
import {path as editorPath} from '../../editor/path'
import {start as editorStart} from '../../editor/start'
import {unhangRange} from '../../editor/unhang-range'
import type {BaseEditor, Editor, EditorMarks} from '../../interfaces/editor'
import type {Operation} from '../../interfaces/operation'
import type {Point} from '../../interfaces/point'
import type {Range} from '../../interfaces/range'
import type {RangeRef} from '../../interfaces/range-ref'
import {isVoidNode} from '../../node/is-void-node'
import {isBackwardRange} from '../../range/is-backward-range'
import {isCollapsedRange} from '../../range/is-collapsed-range'
import {isExpandedRange} from '../../range/is-expanded-range'
import {isForwardRange} from '../../range/is-forward-range'
import type {TextDiff} from '../utils/diff-text'
import {
  closestShadowAware,
  containsShadowAware,
  DOMText,
  getSelection,
  hasShadowRoot,
  isAfter,
  isBefore,
  isDOMElement,
  isDOMNode,
  isDOMSelection,
  normalizeDOMPoint,
  type DOMElement,
  type DOMNode,
  type DOMPoint,
  type DOMRange,
  type DOMSelection,
  type DOMStaticRange,
} from '../utils/dom'
import {IS_ANDROID, IS_CHROME, IS_FIREFOX} from '../utils/environment'

export type Action = {at?: Point | Range; run: () => void}

/**
 * A DOM-specific version of the `Editor` interface.
 */

export interface DOMEditor extends BaseEditor {
  hasEditableTarget: (
    editor: Editor,
    target: EventTarget | null,
  ) => target is DOMNode
  hasRange: (editor: Editor, range: Range) => boolean
  hasSelectableTarget: (editor: Editor, target: EventTarget | null) => boolean
  hasTarget: (editor: Editor, target: EventTarget | null) => target is DOMNode
  isTargetInsideNonReadonlyVoid: (
    editor: Editor,
    target: EventTarget | null,
  ) => boolean

  isNodeMapDirty: boolean
  domWindow: Window | null
  domElement: HTMLElement | null

  readOnly: boolean
  focused: boolean
  composing: boolean
  userSelection: RangeRef | null
  onContextChange: ((options?: {operation?: Operation}) => void) | null
  scheduleFlush: (() => void) | null
  pendingInsertionMarks: EditorMarks | null
  userMarks: EditorMarks | null
  pendingDiffs: TextDiff[]
  pendingAction: Action | null
  pendingSelection: Range | null
  forceRender: (() => void) | null
}

interface DOMEditorInterface {
  /**
   * Blur the editor.
   */
  blur: (editor: Editor) => void
  /**
   * Find the DOM node that implements DocumentOrShadowRoot for the editor.
   */
  findDocumentOrShadowRoot: (editor: Editor) => Document | ShadowRoot

  /**
   * Focus the editor.
   */
  focus: (editor: Editor, options?: {retries: number}) => void

  /**
   * Return the host window of the current editor.
   */
  getWindow: (editor: Editor) => Window

  /**
   * Check if a DOM node is within the editor.
   */
  hasDOMNode: (
    editor: Editor,
    target: DOMNode,
    options?: {editable?: boolean},
  ) => boolean

  /**
   * Check if the target is editable and in the editor.
   */
  hasEditableTarget: (
    editor: Editor,
    target: EventTarget | null,
  ) => target is DOMNode

  /**
   *
   */
  hasRange: (editor: Editor, range: Range) => boolean

  /**
   * Check if the target can be selectable
   */
  hasSelectableTarget: (editor: Editor, target: EventTarget | null) => boolean

  /**
   * Check if the target is in the editor.
   */
  hasTarget: (editor: Editor, target: EventTarget | null) => target is DOMNode

  /**
   * Check if the target is inside void and in an non-readonly editor.
   */
  isTargetInsideNonReadonlyVoid: (
    editor: Editor,
    target: EventTarget | null,
  ) => boolean

  /**
   * Find a native DOM selection point from a Slate point.
   */
  toDOMPoint: (editor: Editor, point: Point) => DOMPoint

  /**
   * Find a native DOM range from a Slate `range`.
   *
   * Notice: the returned range will always be ordinal regardless of the direction of Slate `range` due to DOM API limit.
   *
   * there is no way to create a reverse DOM Range using Range.setStart/setEnd
   * according to https://dom.spec.whatwg.org/#concept-range-bp-set.
   */
  toDOMRange: (editor: Editor, range: Range) => DOMRange

  /**
   * Find a Slate point from a DOM selection's `domNode` and `domOffset`.
   */
  toSlatePoint: <T extends boolean>(
    editor: Editor,
    domPoint: DOMPoint,
    options: {
      exactMatch: boolean
      suppressThrow: T
      /**
       * The direction to search for Slate leaf nodes if `domPoint` is
       * non-editable and non-void.
       */
      searchDirection?: 'forward' | 'backward'
    },
  ) => T extends true ? Point | null : Point

  /**
   * Find a Slate range from a DOM range or selection.
   */
  toSlateRange: <T extends boolean>(
    editor: Editor,
    domRange: DOMRange | DOMStaticRange | DOMSelection,
    options: {
      exactMatch: boolean
      suppressThrow: T
    },
  ) => T extends true ? Range | null : Range
}

// eslint-disable-next-line no-redeclare
export const DOMEditor: DOMEditorInterface = {
  blur: (editor) => {
    const el = getDomNode(editor, [])
    const root = DOMEditor.findDocumentOrShadowRoot(editor)
    editor.focused = false

    if (root.activeElement === el) {
      el.blur()
    }
  },

  findDocumentOrShadowRoot: (editor) => {
    const el = getDomNode(editor, [])

    if (!el) {
      throw new Error('Cannot resolve a DOM node: editor is not mounted')
    }

    const root = el.getRootNode()

    if (root instanceof Document || root instanceof ShadowRoot) {
      return root
    }

    return el.ownerDocument
  },

  focus: (editor, options = {retries: 5}) => {
    // Return if already focused
    if (editor.focused) {
      return
    }

    // Return if no dom node is associated with the editor, which means the editor is not yet mounted
    // or has been unmounted. This can happen especially, while retrying to focus the editor.
    if (!editor.domElement) {
      return
    }

    // Retry setting focus if the editor has pending operations.
    // The DOM (selection) is unstable while changes are applied.
    // Retry until retries are exhausted or editor is focused.
    if (options.retries <= 0) {
      throw new Error(
        'Could not set focus, editor seems stuck with pending operations',
      )
    }
    if (editor.operations.length > 0) {
      setTimeout(() => {
        DOMEditor.focus(editor, {retries: options.retries - 1})
      }, 10)
      return
    }

    const el = getDomNode(editor, [])

    if (!el) {
      throw new Error('Cannot resolve a DOM node: editor is not mounted')
    }

    const root = DOMEditor.findDocumentOrShadowRoot(editor)
    if (root.activeElement !== el) {
      // Ensure that the DOM selection state is set to the editor's selection
      if (editor.selection && root instanceof Document) {
        const domSelection = getSelection(root)
        const domRange = DOMEditor.toDOMRange(editor, editor.selection)
        domSelection?.removeAllRanges()
        domSelection?.addRange(domRange)
      }
      // Create a new selection in the top of the document if missing
      if (!editor.selection) {
        editor.select(editorStart(editor, []))
      }
      // IS_FOCUSED should be set before calling el.focus() to ensure that
      // FocusedContext is updated to the correct value
      editor.focused = true
      el.focus({preventScroll: true})

      // Re-apply the DOM selection after focus. Some browsers (notably WebKit)
      // reset the selection when el.focus() is called, which can cause the
      // selection to shift away from the intended position (e.g., away from
      // an inline object to an adjacent empty span).
      if (editor.selection && root instanceof Document) {
        const domSelection = getSelection(root)
        const domRange = DOMEditor.toDOMRange(editor, editor.selection)
        domSelection?.removeAllRanges()
        domSelection?.addRange(domRange)
      }
    }
  },

  getWindow: (editor) => {
    const window = editor.domWindow
    if (!window) {
      throw new Error('Unable to find a host window element for this editor')
    }
    return window
  },

  hasDOMNode: (editor, target, options = {}) => {
    const {editable = false} = options
    const editorEl = getDomNode(editor, [])

    if (!editorEl) {
      return false
    }

    let targetEl: HTMLElement | null = null

    // COMPAT: In Firefox, reading `target.nodeType` will throw an error if
    // target is originating from an internal "restricted" element (e.g. a
    // stepper arrow on a number input). (2018/05/04)
    // https://github.com/ianstormtaylor/slate/issues/1819
    try {
      targetEl = (
        isDOMElement(target) ? target : target.parentElement
      ) as HTMLElement
    } catch (err) {
      if (
        err instanceof Error &&
        !err.message.includes('Permission denied to access property "nodeType"')
      ) {
        throw err
      }
    }

    if (!targetEl) {
      return false
    }

    return (
      closestShadowAware(targetEl, `[data-slate-editor]`) === editorEl &&
      (!editable || targetEl.isContentEditable
        ? true
        : (typeof targetEl.isContentEditable === 'boolean' && // isContentEditable exists only on HTMLElement, and on other nodes it will be undefined
            // this is the core logic that lets you know you got the right editor.selection instead of null when editor is contenteditable="false"(readOnly)
            closestShadowAware(targetEl, '[contenteditable="false"]') ===
              editorEl) ||
          !!targetEl.getAttribute('data-slate-zero-width'))
    )
  },

  hasEditableTarget: (editor, target): target is DOMNode =>
    isDOMNode(target) && DOMEditor.hasDOMNode(editor, target, {editable: true}),

  hasRange: (editor, range) => {
    const {anchor, focus} = range
    return hasNode(editor, anchor.path) && hasNode(editor, focus.path)
  },

  hasSelectableTarget: (editor, target) =>
    DOMEditor.hasEditableTarget(editor, target) ||
    DOMEditor.isTargetInsideNonReadonlyVoid(editor, target),

  hasTarget: (editor, target): target is DOMNode =>
    isDOMNode(target) && DOMEditor.hasDOMNode(editor, target),

  isTargetInsideNonReadonlyVoid: (editor, target) => {
    if (editor.readOnly) {
      return false
    }

    if (!DOMEditor.hasTarget(editor, target)) {
      return false
    }

    const el = isDOMElement(target) ? target : target.parentElement
    return !!el?.closest(
      '[data-slate-void], [data-block-type="object"], [data-child-type="object"]',
    )
  },

  toDOMPoint: (editor, point) => {
    const nodeEntry = getNode(editor, point.path)
    const el = getDomNode(editor, point.path)

    if (!el) {
      throw new Error(`Cannot resolve a DOM node from path: ${point.path}`)
    }

    let domPoint: DOMPoint | undefined

    if (nodeEntry && isVoidNode(editor, nodeEntry.node, point.path)) {
      const spacer = el.querySelector('[data-slate-zero-width]')
      if (spacer) {
        const domText = spacer.childNodes[0]
        if (domText) {
          return [domText, 0]
        }
      }

      const parentEl = el.parentNode
      if (parentEl) {
        const index = Array.from(parentEl.childNodes).indexOf(el)
        if (index !== -1) {
          return [parentEl, index]
        }
      }
      return [el, 0]
    }

    // If we're inside an object node, force the offset to 0, otherwise the zero
    // width spacing character will result in an incorrect offset of 1
    const pointPath = editorPath(editor, point)
    const pointEntry = getNode(editor, pointPath)
    const pointObjectNode =
      pointEntry && isVoidNode(editor, pointEntry.node, pointPath)
        ? pointEntry
        : getAncestorObjectNode(editor, point.path)
    if (
      pointObjectNode &&
      isVoidNode(editor, pointObjectNode.node, pointObjectNode.path)
    ) {
      point = {path: point.path, offset: 0}
    }

    // For each leaf, we need to isolate its content, which means filtering
    // to its direct text and zero-width spans. (We have to filter out any
    // other siblings that may have been rendered alongside them.)
    const selector = `[data-slate-string], [data-slate-zero-width]`
    const texts = Array.from(el.querySelectorAll(selector))
    let start = 0

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i]!
      const domNode = text.childNodes[0] as HTMLElement

      if (domNode == null || domNode.textContent == null) {
        continue
      }

      const {length} = domNode.textContent
      const attr = text.getAttribute('data-slate-length')
      const trueLength = attr == null ? length : parseInt(attr, 10)
      const end = start + trueLength

      // Prefer putting the selection inside the mark placeholder to ensure
      // composed text is displayed with the correct marks.
      const nextText = texts[i + 1]
      if (
        point.offset === end &&
        nextText?.hasAttribute('data-slate-mark-placeholder')
      ) {
        const domText = nextText.childNodes[0]

        domPoint = [
          // COMPAT: If we don't explicity set the dom point to be on the actual
          // dom text element, chrome will put the selection behind the actual dom
          // text element, causing domRange.getBoundingClientRect() calls on a collapsed
          // selection to return incorrect zero values (https://bugs.chromium.org/p/chromium/issues/detail?id=435438)
          // which will cause issues when scrolling to it.
          domText instanceof DOMText ? domText : nextText,
          nextText.textContent?.startsWith('\uFEFF') ? 1 : 0,
        ]
        break
      }

      if (point.offset <= end) {
        const offset = Math.min(length, Math.max(0, point.offset - start))
        domPoint = [domNode, offset]
        break
      }

      start = end
    }

    if (!domPoint) {
      throw new Error(
        `Cannot resolve a DOM point from Slate point: ${safeStringify(point)}`,
      )
    }

    return domPoint
  },

  toDOMRange: (editor, range) => {
    const {anchor, focus} = range
    const isBackward = isBackwardRange(range, editor)
    const domAnchor = DOMEditor.toDOMPoint(editor, anchor)
    const domFocus = isCollapsedRange(range)
      ? domAnchor
      : DOMEditor.toDOMPoint(editor, focus)

    const window = DOMEditor.getWindow(editor)
    const domRange = window.document.createRange()
    const [startNode, startOffset] = isBackward ? domFocus : domAnchor
    const [endNode, endOffset] = isBackward ? domAnchor : domFocus

    // A slate Point at zero-width Leaf always has an offset of 0 but a native DOM selection at
    // zero-width node has an offset of 1 so we have to check if we are in a zero-width node and
    // adjust the offset accordingly.
    const startEl = (
      isDOMElement(startNode) ? startNode : startNode.parentElement
    ) as HTMLElement
    const isStartAtZeroWidth = !!startEl.getAttribute('data-slate-zero-width')
    const endEl = (
      isDOMElement(endNode) ? endNode : endNode.parentElement
    ) as HTMLElement
    const isEndAtZeroWidth = !!endEl.getAttribute('data-slate-zero-width')

    domRange.setStart(startNode, isStartAtZeroWidth ? 1 : startOffset)
    domRange.setEnd(endNode, isEndAtZeroWidth ? 1 : endOffset)
    return domRange
  },

  toSlatePoint: <T extends boolean>(
    editor: Editor,
    domPoint: DOMPoint,
    options: {
      exactMatch: boolean
      suppressThrow: T
      searchDirection?: 'forward' | 'backward'
    },
  ): T extends true ? Point | null : Point => {
    const {exactMatch, suppressThrow, searchDirection} = options
    const [nearestNode, nearestOffset] = exactMatch
      ? domPoint
      : normalizeDOMPoint(domPoint)
    const parentNode = nearestNode.parentNode as DOMElement
    let textNode: DOMElement | null = null
    let offset = 0

    if (parentNode) {
      const editorEl = getDomNode(editor, [])

      if (!editorEl) {
        throw new Error('Cannot resolve a DOM node: editor is not mounted')
      }

      const potentialVoidNode = parentNode.closest(
        '[data-slate-void="true"], [data-block-type="object"], [data-child-type="object"]',
      )
      // Need to ensure that the closest void node is actually a void node
      // within this editor, and not a void node within some parent editor. This can happen
      // if this editor is within a void node of another editor ("nested editors", like in
      // the "Editable Voids" example on the docs site).
      const voidNode =
        potentialVoidNode && containsShadowAware(editorEl, potentialVoidNode)
          ? potentialVoidNode
          : null
      const potentialNonEditableNode = parentNode.closest(
        '[contenteditable="false"]',
      )
      const nonEditableNode =
        potentialNonEditableNode &&
        containsShadowAware(editorEl, potentialNonEditableNode)
          ? potentialNonEditableNode
          : null
      let leafNode = parentNode.closest('[data-slate-leaf]')
      let domNode: DOMElement | null = null

      // Calculate how far into the text node the `nearestNode` is, so that we
      // can determine what the offset relative to the text node is.
      if (leafNode) {
        textNode = leafNode.closest(
          '[data-slate-node="text"], [data-child-type="span"]',
        )

        if (textNode) {
          const window = DOMEditor.getWindow(editor)
          const range = window.document.createRange()
          range.setStart(textNode, 0)
          range.setEnd(nearestNode, nearestOffset)

          const contents = range.cloneContents()
          const removals = [
            ...Array.prototype.slice.call(
              contents.querySelectorAll('[data-slate-zero-width]'),
            ),
            ...Array.prototype.slice.call(
              contents.querySelectorAll('[contenteditable=false]'),
            ),
          ]

          removals.forEach((el) => {
            // COMPAT: While composing at the start of a text node, some keyboards put
            // the text content inside the zero width space.
            if (
              IS_ANDROID &&
              !exactMatch &&
              el.hasAttribute('data-slate-zero-width') &&
              el.textContent.length > 0 &&
              el.textContext !== '\uFEFF'
            ) {
              if (el.textContent.startsWith('\uFEFF')) {
                el.textContent = el.textContent.slice(1)
              }

              return
            }

            el!.parentNode!.removeChild(el)
          })

          // COMPAT: Edge has a bug where Range.prototype.toString() will
          // convert \n into \r\n. The bug causes a loop when slate-dom
          // attempts to reposition its cursor to match the native position. Use
          // textContent.length instead.
          // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10291116/
          offset = contents.textContent!.length
          domNode = textNode
        }
      } else if (voidNode) {
        // For void nodes, the element with the offset key will be a cousin, not an
        // ancestor, so find it by going down from the nearest void parent and taking the
        // first one that isn't inside a nested editor.
        const leafNodes = voidNode.querySelectorAll('[data-slate-leaf]')
        for (let index = 0; index < leafNodes.length; index++) {
          const current = leafNodes[index]!
          if (DOMEditor.hasDOMNode(editor, current)) {
            leafNode = current
            break
          }
        }

        // COMPAT: In read-only editors the leaf is not rendered.
        if (!leafNode) {
          offset = 1
        } else {
          textNode = leafNode.closest(
            '[data-slate-node="text"], [data-child-type="span"]',
          )!
          domNode = leafNode
          offset = domNode.textContent!.length
          domNode.querySelectorAll('[data-slate-zero-width]').forEach((el) => {
            offset -= el.textContent!.length
          })
        }
      } else if (nonEditableNode) {
        // Find the edge of the nearest leaf in `searchDirection`
        const getLeafNodes = (node: DOMElement | null | undefined) =>
          node
            ? node.querySelectorAll(
                // Exclude leaf nodes in nested editors
                '[data-slate-leaf]:not(:scope [data-slate-editor] [data-slate-leaf])',
              )
            : []
        const elementNode = nonEditableNode.closest(
          '[data-slate-node="element"], [data-block-type="text"], [data-block-type="object"], [data-block-type="container"]',
        )

        if (searchDirection === 'backward' || !searchDirection) {
          const leafNodes = [
            ...getLeafNodes(elementNode?.previousElementSibling),
            ...getLeafNodes(elementNode),
          ]

          leafNode =
            leafNodes.findLast((leaf) => isBefore(nonEditableNode, leaf)) ??
            null

          if (leafNode) {
            searchDirection === 'backward'
          }
        }

        if (searchDirection === 'forward' || !searchDirection) {
          const leafNodes = [
            ...getLeafNodes(elementNode),
            ...getLeafNodes(elementNode?.nextElementSibling),
          ]

          leafNode =
            leafNodes.find((leaf) => isAfter(nonEditableNode, leaf)) ?? null

          if (leafNode) {
            searchDirection === 'forward'
          }
        }

        if (leafNode) {
          textNode = leafNode.closest(
            '[data-slate-node="text"], [data-child-type="span"]',
          )!
          domNode = leafNode
          if (searchDirection === 'forward') {
            offset = 0
          } else {
            offset = domNode.textContent!.length
            domNode
              .querySelectorAll('[data-slate-zero-width]')
              .forEach((el) => {
                offset -= el.textContent!.length
              })
          }
        }
      }

      if (
        domNode &&
        offset === domNode.textContent!.length &&
        // COMPAT: Android IMEs might remove the zero width space while composing,
        // and we don't add it for line-breaks.
        IS_ANDROID &&
        domNode.getAttribute('data-slate-zero-width') === 'z' &&
        domNode.textContent?.startsWith('\uFEFF') &&
        // COMPAT: If the parent node is a Slate zero-width space, editor is
        // because the text node should have no characters. However, during IME
        // composition the ASCII characters will be prepended to the zero-width
        // space, so subtract 1 from the offset to account for the zero-width
        // space character.
        (parentNode.hasAttribute('data-slate-zero-width') ||
          // COMPAT: In Firefox, `range.cloneContents()` returns an extra trailing '\n'
          // when the document ends with a new-line character. This results in the offset
          // length being off by one, so we need to subtract one to account for this.
          (IS_FIREFOX && domNode.textContent?.endsWith('\n\n')))
      ) {
        offset--
      }
    }

    if (IS_ANDROID && !textNode && !exactMatch) {
      const node =
        parentNode.hasAttribute('data-slate-node') ||
        parentNode.getAttribute('data-block-type') === 'text' ||
        parentNode.getAttribute('data-block-type') === 'object' ||
        parentNode.getAttribute('data-block-type') === 'container' ||
        parentNode.getAttribute('data-child-type') === 'span'
          ? parentNode
          : parentNode.closest(
              '[data-slate-node], [data-block-type="text"], [data-block-type="object"], [data-block-type="container"], [data-child-type="span"]',
            )

      if (node && DOMEditor.hasDOMNode(editor, node, {editable: true})) {
        const nodePath = getDomNodePath(node)

        if (!nodePath) {
          if (suppressThrow) {
            return null as T extends true ? Point | null : Point
          }
          throw new Error(
            `Cannot resolve a Slate point from DOM point: ${domPoint}`,
          )
        }

        let {path, offset} = editorStart(editor, nodePath)

        if (!node.querySelector('[data-slate-leaf]')) {
          offset = nearestOffset
        }

        return {path, offset} as T extends true ? Point | null : Point
      }
    }

    if (!textNode && parentNode) {
      if (
        nearestNode instanceof HTMLElement &&
        (nearestNode.hasAttribute('data-slate-node') ||
          nearestNode.getAttribute('data-block-type') === 'container')
      ) {
        const childEl = nearestNode.childNodes[nearestOffset]
        if (
          childEl instanceof HTMLElement &&
          DOMEditor.hasDOMNode(editor, childEl)
        ) {
          const voidEl = childEl.closest(
            '[data-slate-void], [data-block-type="object"], [data-child-type="object"]',
          )

          if (voidEl) {
            const path = getDomNodePath(voidEl)

            if (path) {
              return {path, offset: 0}
            }
          }
        }
      }

      const elementNode =
        parentNode.closest(
          '[data-slate-node="element"], [data-block-type="text"], [data-block-type="object"], [data-block-type="container"]',
        ) ??
        (parentNode.hasAttribute('data-slate-node') ||
        parentNode.getAttribute('data-block-type') === 'text' ||
        parentNode.getAttribute('data-block-type') === 'object' ||
        parentNode.getAttribute('data-block-type') === 'container'
          ? parentNode
          : null)

      if (elementNode && DOMEditor.hasDOMNode(editor, elementNode)) {
        const voidEl = elementNode.closest(
          '[data-slate-void], [data-block-type="object"], [data-child-type="object"]',
        )

        if (voidEl) {
          const path = getDomNodePath(voidEl)

          if (path) {
            return {path, offset: 0}
          }
        }
      }
    }

    if (!textNode) {
      if (suppressThrow) {
        return null as T extends true ? Point | null : Point
      }
      throw new Error(
        `Cannot resolve a Slate point from DOM point: ${domPoint}`,
      )
    }

    // COMPAT: If someone is clicking from one Slate editor into another,
    // the select event fires twice, once for the old editor's `element`
    // first, and then afterwards for the correct `element`. (2017/03/03)
    const path = getDomNodePath(textNode!)

    if (!path) {
      if (suppressThrow) {
        return null as T extends true ? Point | null : Point
      }
      throw new Error(
        `Cannot resolve a Slate point from DOM point: ${domPoint}`,
      )
    }

    // Truncate paths that resolve to the spacer's virtual text node.
    if (path.length > 1) {
      const parentPath = path.slice(0, -1)
      const parentEntry = getNode(editor, parentPath)

      if (parentEntry && isVoidNode(editor, parentEntry.node, parentPath)) {
        return {path: parentPath, offset: 0}
      }
    }

    return {path, offset}
  },

  toSlateRange: <T extends boolean>(
    editor: Editor,
    domRange: DOMRange | DOMStaticRange | DOMSelection,
    options: {
      exactMatch: boolean
      suppressThrow: T
    },
  ): T extends true ? Range | null : Range => {
    const {exactMatch, suppressThrow} = options
    const el = isDOMSelection(domRange)
      ? domRange.anchorNode
      : domRange.startContainer
    let anchorNode: globalThis.Node | null = null
    let anchorOffset: number = 0
    let focusNode: globalThis.Node | null = null
    let focusOffset: number = 0
    let isCollapsed: boolean = false

    if (el) {
      if (isDOMSelection(domRange)) {
        // COMPAT: In firefox the normal seletion way does not work
        // (https://github.com/ianstormtaylor/slate/pull/5486#issue-1820720223)
        if (IS_FIREFOX && domRange.rangeCount > 1) {
          focusNode = domRange.focusNode // Focus node works fine
          const firstRange = domRange.getRangeAt(0)
          const lastRange = domRange.getRangeAt(domRange.rangeCount - 1)

          // Here we are in the contenteditable mode of a table in firefox
          if (
            focusNode instanceof HTMLTableRowElement &&
            firstRange.startContainer instanceof HTMLTableRowElement &&
            lastRange.startContainer instanceof HTMLTableRowElement
          ) {
            // HTMLElement, becouse Element is a slate element
            function getLastChildren(element: HTMLElement): HTMLElement {
              if (element.childElementCount > 0) {
                return getLastChildren(element.children[0] as HTMLElement)
              } else {
                return element
              }
            }

            const firstNodeRow =
              firstRange.startContainer as HTMLTableRowElement
            const lastNodeRow = lastRange.startContainer as HTMLTableRowElement

            // This should never fail as "The HTMLElement interface represents any HTML element."
            const firstNode = getLastChildren(
              firstNodeRow.children[firstRange.startOffset] as HTMLElement,
            )
            const lastNode = getLastChildren(
              lastNodeRow.children[lastRange.startOffset] as HTMLElement,
            )

            // Zero, as we allways take the right one as the anchor point
            focusOffset = 0

            if (lastNode.childNodes.length > 0) {
              anchorNode = lastNode.childNodes[0] ?? null
            } else {
              anchorNode = lastNode
            }

            if (firstNode.childNodes.length > 0) {
              focusNode = firstNode.childNodes[0] ?? null
            } else {
              focusNode = firstNode
            }

            if (lastNode instanceof HTMLElement) {
              anchorOffset = (lastNode as HTMLElement).innerHTML.length
            } else {
              // Fallback option
              anchorOffset = 0
            }
          } else {
            // This is the read only mode of a firefox table
            // Right to left
            if (firstRange.startContainer === focusNode) {
              anchorNode = lastRange.endContainer
              anchorOffset = lastRange.endOffset
              focusOffset = firstRange.startOffset
            } else {
              // Left to right
              anchorNode = firstRange.startContainer
              anchorOffset = firstRange.endOffset
              focusOffset = lastRange.startOffset
            }
          }
        } else {
          anchorNode = domRange.anchorNode
          anchorOffset = domRange.anchorOffset
          focusNode = domRange.focusNode
          focusOffset = domRange.focusOffset
        }

        // COMPAT: There's a bug in chrome that always returns `true` for
        // `isCollapsed` for a Selection that comes from a ShadowRoot.
        // (2020/08/08)
        // https://bugs.chromium.org/p/chromium/issues/detail?id=447523
        // IsCollapsed might not work in firefox, but this will
        if ((IS_CHROME && hasShadowRoot(anchorNode)) || IS_FIREFOX) {
          isCollapsed =
            domRange.anchorNode === domRange.focusNode &&
            domRange.anchorOffset === domRange.focusOffset
        } else {
          isCollapsed = domRange.isCollapsed
        }
      } else {
        anchorNode = domRange.startContainer
        anchorOffset = domRange.startOffset
        focusNode = domRange.endContainer
        focusOffset = domRange.endOffset
        isCollapsed = domRange.collapsed
      }
    }

    if (
      anchorNode == null ||
      focusNode == null ||
      anchorOffset == null ||
      focusOffset == null
    ) {
      if (suppressThrow) {
        return null as T extends true ? Range | null : Range
      }
      throw new Error(
        `Cannot resolve a Slate range from DOM range: ${domRange}`,
      )
    }

    // COMPAT: Firefox sometimes includes an extra \n (rendered by TextString
    // when isTrailing is true) in the focusOffset, resulting in an invalid
    // Slate point. (2023/11/01)
    if (
      IS_FIREFOX &&
      focusNode.textContent?.endsWith('\n\n') &&
      focusOffset === focusNode.textContent.length
    ) {
      focusOffset--
    }

    const anchor = DOMEditor.toSlatePoint(editor, [anchorNode, anchorOffset], {
      exactMatch,
      suppressThrow,
    })
    if (!anchor) {
      return null as T extends true ? Range | null : Range
    }

    const focusBeforeAnchor =
      isBefore(anchorNode, focusNode) ||
      (anchorNode === focusNode && focusOffset < anchorOffset)
    const focus = isCollapsed
      ? anchor
      : DOMEditor.toSlatePoint(editor, [focusNode, focusOffset], {
          exactMatch,
          suppressThrow,
          searchDirection: focusBeforeAnchor ? 'forward' : 'backward',
        })
    if (!focus) {
      return null as T extends true ? Range | null : Range
    }

    let range: Range = {anchor: anchor as Point, focus: focus as Point}
    // if the selection is a hanging range that ends in a void
    // and the DOM focus is an Element
    // (meaning that the selection ends before the element)
    // unhang the range to avoid mistakenly including the void
    if (
      isExpandedRange(range) &&
      isForwardRange(range) &&
      isDOMElement(focusNode) &&
      getHighestObjectNode(editor, range.focus.path)
    ) {
      range = unhangRange(editor, range)
    }

    return range as unknown as T extends true ? Range | null : Range
  },
}

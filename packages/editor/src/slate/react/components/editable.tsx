import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan} from '@portabletext/schema'
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ForwardedRef,
  type JSX,
} from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import {getDomNode} from '../../../dom-traversal/get-dom-node'
import {getDomNodePath} from '../../../dom-traversal/get-dom-node-path'
import type {EditorActor} from '../../../editor/editor-machine'
import {getAncestorObjectNode} from '../../../node-traversal/get-ancestor-object-node'
import {getAncestorTextBlock} from '../../../node-traversal/get-ancestor-text-block'
import {getNode} from '../../../node-traversal/get-node'
import {getNodes} from '../../../node-traversal/get-nodes'
import {getText} from '../../../node-traversal/get-text'
import {keyedPathToIndexedPath} from '../../../paths/keyed-path-to-indexed-path'
import {collapse} from '../../core/collapse'
import {deselect} from '../../core/deselect'
import {move} from '../../core/move'
import {DOMEditor} from '../../dom/plugin/dom-editor'
import {TRIPLE_CLICK} from '../../dom/utils/constants'
import {
  containsShadowAware,
  getActiveElement,
  getDefaultView,
  getSelection,
  isDOMElement,
  isDOMNode,
  isPlainTextOnlyPaste,
  type DOMElement,
  type DOMRange,
  type DOMText,
} from '../../dom/utils/dom'
import {
  CAN_USE_DOM,
  HAS_BEFORE_INPUT_SUPPORT,
  IS_ANDROID,
  IS_CHROME,
  IS_FIREFOX,
  IS_FIREFOX_LEGACY,
  IS_IOS,
  IS_UC_MOBILE,
  IS_WEBKIT,
  IS_WECHATBROWSER,
} from '../../dom/utils/environment'
import Hotkeys from '../../dom/utils/hotkeys'
import {
  MARK_PLACEHOLDER_SYMBOL,
  PLACEHOLDER_SYMBOL,
} from '../../dom/utils/symbols'
import {end as editorEnd} from '../../editor/end'
import {range as editorRange} from '../../editor/range'
import {rangeRef} from '../../editor/range-ref'
import {start as editorStart} from '../../editor/start'
import type {Editor} from '../../interfaces/editor'
import type {NodeEntry} from '../../interfaces/node'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange, LeafPosition} from '../../interfaces/text'
import {isObjectNode} from '../../node/is-object-node'
import {isTextBlockNode} from '../../node/is-text-block-node'
import {pathEquals} from '../../path/path-equals'
import {isBackwardRange} from '../../range/is-backward-range'
import {isCollapsedRange} from '../../range/is-collapsed-range'
import {isExpandedRange} from '../../range/is-expanded-range'
import {rangeEquals} from '../../range/range-equals'
import {textEquals} from '../../text/text-equals'
import type {AndroidInputManager} from '../hooks/android-input-manager/android-input-manager'
import {useAndroidInputManager} from '../hooks/android-input-manager/use-android-input-manager'
import useChildren from '../hooks/use-children'
import {ComposingContext} from '../hooks/use-composing'
import {DecorateContext, useDecorateContext} from '../hooks/use-decorations'
import {useIsomorphicLayoutEffect} from '../hooks/use-isomorphic-layout-effect'
import {ReadOnlyContext} from '../hooks/use-read-only'
import {useSlate} from '../hooks/use-slate'
import {useFlushDeferredSelectorsOnRender} from '../hooks/use-slate-selector'
import {useTrackUserInput} from '../hooks/use-track-user-input'
import {ReactEditor} from '../plugin/react-editor'
import {debounce, throttle} from '../utils/debounce'
import getDirection from '../utils/direction'
import {RestoreDOM} from './restore-dom/restore-dom'

type DeferredOperation = () => void

const Children = (props: Parameters<typeof useChildren>[0]) => (
  <React.Fragment>{useChildren(props)}</React.Fragment>
)

/**
 * `RenderElementProps` are passed to the `renderElement` handler.
 */

export interface RenderElementProps {
  children: any
  element: PortableTextTextBlock | PortableTextObject
  indexedPath: Path
  attributes: {
    'data-slate-node': 'element'
    'data-slate-inline'?: true
    'data-slate-void'?: true
    'data-pt-path': string
    'contentEditable'?: false
    'dir'?: 'rtl'
  }
}

/**
 * `RenderLeafProps` are passed to the `renderLeaf` handler.
 */

export interface RenderLeafProps {
  children: any
  /**
   * The leaf node with any applied decorations.
   * If no decorations are applied, it will be identical to the `text` property.
   */
  leaf: PortableTextSpan
  text: PortableTextSpan
  attributes: {
    'data-slate-leaf': true
  }
  /**
   * The position of the leaf within the Text node, only present when the text node is split by decorations.
   */
  leafPosition?: LeafPosition
}

/**
 * `RenderTextProps` are passed to the `renderText` handler.
 */
export interface RenderTextProps {
  text: PortableTextSpan
  children: any
  attributes: {
    'data-slate-node': 'text'
    'data-pt-path': string
  }
}

/**
 * `EditableProps` are passed to the `<Editable>` component.
 */

type EditableProps = {
  decorate?: (entry: NodeEntry) => DecoratedRange[]
  editorActor: EditorActor
  onDOMBeforeInput?: (event: InputEvent) => void
  placeholder?: string
  readOnly?: boolean
  role?: string
  style?: React.CSSProperties
  renderElement?: (props: RenderElementProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderPlaceholder?: (props: RenderPlaceholderProps) => JSX.Element
  scrollSelectionIntoView?: (editor: ReactEditor, domRange: DOMRange) => void
  as?: React.ElementType
  disableDefaultStyles?: boolean
} & React.TextareaHTMLAttributes<HTMLDivElement>

/**
 * Editable.
 */

export const Editable = forwardRef(
  (props: EditableProps, forwardedRef: ForwardedRef<HTMLDivElement>) => {
    const defaultRenderPlaceholder = useCallback(
      (props: RenderPlaceholderProps) => <DefaultPlaceholder {...props} />,
      [],
    )
    const {
      autoFocus,
      decorate = defaultDecorate,
      editorActor,
      onDOMBeforeInput: propsOnDOMBeforeInput,
      placeholder,
      readOnly = false,
      renderElement,
      renderLeaf,
      renderText,
      renderPlaceholder = defaultRenderPlaceholder,
      scrollSelectionIntoView = defaultScrollSelectionIntoView,
      style: userStyle = {},
      as: Component = 'div',
      disableDefaultStyles = false,
      ...attributes
    } = props
    const editor = useSlate()
    // Rerender editor when composition status changed
    const [isComposing, setIsComposing] = useState(false)
    const ref = useRef<HTMLDivElement | null>(null)
    const deferredOperations = useRef<DeferredOperation[]>([])
    const [placeholderHeight, setPlaceholderHeight] = useState<
      number | undefined
    >()
    const processing = useRef(false)

    const {onUserInput, receivedUserInput} = useTrackUserInput()

    const [, forceRender] = useReducer((s) => s + 1, 0)
    editor.forceRender = forceRender

    // Update internal state on each render.
    editor.readOnly = readOnly

    // Keep track of some state for the event handler logic.
    const state = useMemo(
      () => ({
        isUpdatingSelection: false,
        latestElement: null as DOMElement | null,
        hasMarkPlaceholder: false,
      }),
      [],
    )

    // The autoFocus TextareaHTMLAttribute doesn't do anything on a div, so it
    // needs to be manually focused.
    //
    // If this stops working in Firefox, make sure nothing is causing this
    // component to re-render during the initial mount. If the DOM selection is
    // set by `useIsomorphicLayoutEffect` before `onDOMSelectionChange` updates
    // `editor.selection`, the DOM selection can be removed accidentally.
    useEffect(() => {
      if (ref.current && autoFocus) {
        ref.current.focus()
      }
    }, [autoFocus])

    /**
     * The AndroidInputManager object has a cyclical dependency on onDOMSelectionChange
     *
     * It is defined as a reference to simplify hook dependencies and clarify that
     * it needs to be initialized.
     */
    const androidInputManagerRef = useRef<
      AndroidInputManager | null | undefined
    >(undefined)

    // Listen on the native `selectionchange` event to be able to update any time
    // the selection changes. This is required because React's `onSelect` is leaky
    // and non-standard so it doesn't fire until after a selection has been
    // released. This causes issues in situations where another change happens
    // while a selection is being dragged.
    const onDOMSelectionChange = useMemo(
      () =>
        throttle(() => {
          if (editor.isNodeMapDirty) {
            onDOMSelectionChange()
            return
          }

          const el = getDomNode(editor, [])

          if (!el) {
            return
          }

          const root = el.getRootNode()

          if (!processing.current && IS_WEBKIT && root instanceof ShadowRoot) {
            processing.current = true

            const active = getActiveElement()

            if (active) {
              document.execCommand('indent')
            } else {
              deselect(editor)
            }

            processing.current = false
            return
          }

          const androidInputManager = androidInputManagerRef.current
          if (
            (IS_ANDROID || !ReactEditor.isComposing(editor)) &&
            (!state.isUpdatingSelection || androidInputManager?.isFlushing())
          ) {
            const root = ReactEditor.findDocumentOrShadowRoot(editor)
            const {activeElement} = root
            const el = getDomNode(editor, [])

            if (!el) {
              return
            }

            const domSelection = getSelection(root)

            if (activeElement === el) {
              state.latestElement = activeElement
              editor.focused = true
            } else {
              editor.focused = false

              // Don't sync DOM selection to Slate when focus is completely
              // outside the editor. On Firefox, after blur + DOM mutation
              // (e.g., React re-render from a decorator toggle), the
              // browser may collapse the DOM selection to an incorrect
              // position because the nodes it was anchored to were
              // replaced. Syncing this corrupted selection would overwrite
              // the correct Slate selection that `handle focus` needs to
              // restore.
              //
              // We still allow sync when `activeElement` is inside the
              // editor element (e.g., an input inside a void node),
              // because those selections reflect intentional user
              // interaction within the editor's tree.
              if (!el.contains(activeElement)) {
                return
              }
            }

            if (!domSelection) {
              return deselect(editor)
            }

            const {anchorNode, focusNode} = domSelection

            const anchorNodeSelectable =
              ReactEditor.hasEditableTarget(editor, anchorNode) ||
              ReactEditor.isTargetInsideNonReadonlyVoid(editor, anchorNode)

            const focusNodeInEditor = ReactEditor.hasTarget(editor, focusNode)

            if (anchorNodeSelectable && focusNodeInEditor) {
              const range = ReactEditor.toSlateRange(editor, domSelection, {
                exactMatch: false,
                suppressThrow: true,
              })

              if (range) {
                if (
                  !ReactEditor.isComposing(editor) &&
                  !androidInputManager?.hasPendingChanges() &&
                  !androidInputManager?.isFlushing()
                ) {
                  // Suppress browser selection normalization that would
                  // overwrite a block object selection.
                  editor.select(range)
                } else {
                  androidInputManager?.handleUserSelect(range)
                }
              }
            }

            // Deselect the editor if the dom selection is not selectable in readonly mode
            if (readOnly && (!anchorNodeSelectable || !focusNodeInEditor)) {
              deselect(editor)
            }
          }
        }, 100),
      [editor, readOnly, state],
    )

    const scheduleOnDOMSelectionChange = useMemo(
      () => debounce(onDOMSelectionChange, 0),
      [onDOMSelectionChange],
    )

    androidInputManagerRef.current = useAndroidInputManager({
      editorActor,
      node: ref as React.RefObject<HTMLElement>,
      onDOMSelectionChange,
      scheduleOnDOMSelectionChange,
    })

    useIsomorphicLayoutEffect(() => {
      // Update element-related editor maps with the DOM element ref.
      let window: Window | null = null
      // biome-ignore lint/suspicious/noAssignInExpressions: Slate upstream pattern — assignment in condition
      if (ref.current && (window = getDefaultView(ref.current))) {
        editor.domWindow = window
        editor.domElement = ref.current
      }

      // Make sure the DOM selection state is in sync.
      const {selection} = editor
      const root = ReactEditor.findDocumentOrShadowRoot(editor)
      const domSelection = getSelection(root)

      if (
        !domSelection ||
        !ReactEditor.isFocused(editor) ||
        androidInputManagerRef.current?.hasPendingAction()
      ) {
        return
      }

      const setDomSelection = (forceChange?: boolean) => {
        const hasDomSelection = domSelection.type !== 'None'

        // If the DOM selection is properly unset, we're done.
        if (!selection && !hasDomSelection) {
          return
        }

        // Get anchorNode and focusNode
        const focusNode = domSelection.focusNode
        let anchorNode: globalThis.Node | null = null

        // COMPAT: In firefox the normal selection way does not work
        // (https://github.com/ianstormtaylor/slate/pull/5486#issue-1820720223)
        if (IS_FIREFOX && domSelection.rangeCount > 1) {
          const firstRange = domSelection.getRangeAt(0)
          const lastRange = domSelection.getRangeAt(domSelection.rangeCount - 1)

          // Right to left
          if (firstRange.startContainer === focusNode) {
            anchorNode = lastRange.endContainer
          } else {
            // Left to right
            anchorNode = firstRange.startContainer
          }
        } else {
          anchorNode = domSelection.anchorNode
        }

        // verify that the dom selection is in the editor
        const editorElement = editor.domElement!
        let hasDomSelectionInEditor = false
        if (
          containsShadowAware(editorElement, anchorNode) &&
          containsShadowAware(editorElement, focusNode)
        ) {
          hasDomSelectionInEditor = true
        }

        // If the DOM selection is in the editor and the editor selection is already correct, we're done.
        if (
          hasDomSelection &&
          hasDomSelectionInEditor &&
          selection &&
          !forceChange
        ) {
          const slateRange = ReactEditor.toSlateRange(editor, domSelection, {
            exactMatch: true,

            // domSelection is not necessarily a valid Slate range
            // (e.g. when clicking on contentEditable:false element)
            suppressThrow: true,
          })

          if (slateRange && rangeEquals(slateRange, selection)) {
            if (!state.hasMarkPlaceholder) {
              return
            }

            // Ensure selection is inside the mark placeholder
            if (
              anchorNode?.parentElement?.hasAttribute(
                'data-slate-mark-placeholder',
              )
            ) {
              return
            }
          }
        }

        // when <Editable/> is being controlled through external value
        // then its children might just change - DOM responds to it on its own
        // but Slate's value is not being updated through any operation
        // and thus it doesn't transform selection on its own
        if (selection && !ReactEditor.hasRange(editor, selection)) {
          editor.selection = ReactEditor.toSlateRange(editor, domSelection, {
            exactMatch: false,
            suppressThrow: true,
          })
          return
        }

        // Otherwise the DOM selection is out of sync, so update it.
        state.isUpdatingSelection = true

        let newDomRange: DOMRange | null = null

        try {
          newDomRange = selection && ReactEditor.toDOMRange(editor, selection)
        } catch (_e) {
          // Ignore, dom and state might be out of sync
        }

        if (newDomRange) {
          if (ReactEditor.isComposing(editor) && !IS_ANDROID) {
            domSelection.collapseToEnd()
          } else if (isBackwardRange(selection!)) {
            domSelection.setBaseAndExtent(
              newDomRange.endContainer,
              newDomRange.endOffset,
              newDomRange.startContainer,
              newDomRange.startOffset,
            )
          } else {
            domSelection.setBaseAndExtent(
              newDomRange.startContainer,
              newDomRange.startOffset,
              newDomRange.endContainer,
              newDomRange.endOffset,
            )
          }
          scrollSelectionIntoView(editor, newDomRange)
        } else {
          domSelection.removeAllRanges()
        }

        return newDomRange
      }

      // In firefox if there is more then 1 range and we call setDomSelection we remove the ability to select more cells in a table
      if (domSelection.rangeCount <= 1) {
        setDomSelection()
      }

      const ensureSelection =
        androidInputManagerRef.current?.isFlushing() === 'action'

      if (!IS_ANDROID || !ensureSelection) {
        setTimeout(() => {
          state.isUpdatingSelection = false
        })
        return
      }

      let timeoutId: ReturnType<typeof setTimeout> | null = null
      const animationFrameId = requestAnimationFrame(() => {
        if (ensureSelection) {
          const ensureDomSelection = (forceChange?: boolean) => {
            try {
              const el = getDomNode(editor, [])

              if (!el) {
                return
              }

              el.focus()

              setDomSelection(forceChange)
            } catch (_e) {
              // Ignore, dom and state might be out of sync
            }
          }

          // Compat: Android IMEs try to force their selection by manually re-applying it even after we set it.
          // This essentially would make setting the slate selection during an update meaningless, so we force it
          // again here. We can't only do it in the setTimeout after the animation frame since that would cause a
          // visible flicker.
          ensureDomSelection()

          timeoutId = setTimeout(() => {
            // COMPAT: While setting the selection in an animation frame visually correctly sets the selection,
            // it doesn't update GBoards spellchecker state. We have to manually trigger a selection change after
            // the animation frame to ensure it displays the correct state.
            ensureDomSelection(true)
            state.isUpdatingSelection = false
          })
        }
      })

      return () => {
        cancelAnimationFrame(animationFrameId)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    })

    // Listen on the native `beforeinput` event to get real "Level 2" events. This
    // is required because React's `beforeinput` is fake and never really attaches
    // to the real event sadly. (2019/11/01)
    // https://github.com/facebook/react/issues/11211
    const onDOMBeforeInput = useCallback(
      (event: InputEvent) => {
        handleNativeHistoryEvents(editor, editorActor, event)
        const el = getDomNode(editor, [])

        if (!el) {
          return
        }

        const root = el.getRootNode()

        if (processing?.current && IS_WEBKIT && root instanceof ShadowRoot) {
          const ranges = event.getTargetRanges()
          const range = ranges[0]!

          const newRange = new window.Range()

          newRange.setStart(range.startContainer, range.startOffset)
          newRange.setEnd(range.endContainer, range.endOffset)

          // Translate the DOM Range into a Slate Range
          const slateRange = ReactEditor.toSlateRange(editor, newRange, {
            exactMatch: false,
            suppressThrow: false,
          })

          editor.select(slateRange)

          event.preventDefault()
          event.stopImmediatePropagation()
          return
        }
        onUserInput()

        if (
          !readOnly &&
          ReactEditor.hasEditableTarget(editor, event.target) &&
          !isDOMEventHandled(event, propsOnDOMBeforeInput)
        ) {
          // COMPAT: BeforeInput events aren't cancelable on android, so we have to handle them differently using the android input manager.
          if (androidInputManagerRef.current) {
            return androidInputManagerRef.current.handleDOMBeforeInput(event)
          }

          // Some IMEs/Chrome extensions like e.g. Grammarly set the selection immediately before
          // triggering a `beforeinput` expecting the change to be applied to the immediately before
          // set selection.
          scheduleOnDOMSelectionChange.flush()
          onDOMSelectionChange.flush()

          const {selection} = editor
          const {inputType: type} = event
          const data = (event as any).dataTransfer || event.data || undefined

          const isCompositionChange =
            type === 'insertCompositionText' || type === 'deleteCompositionText'

          // COMPAT: use composition change events as a hint to where we should insert
          // composition text if we aren't composing to work around https://github.com/ianstormtaylor/slate/issues/5038
          if (isCompositionChange && ReactEditor.isComposing(editor)) {
            return
          }

          let native = false
          if (
            type === 'insertText' &&
            selection &&
            isCollapsedRange(selection) &&
            // Only use native character insertion for single characters a-z or space for now.
            // Long-press events (hold a + press 4 = ä) to choose a special character otherwise
            // causes duplicate inserts.
            event.data &&
            event.data.length === 1 &&
            /[a-z ]/i.test(event.data) &&
            // Chrome has issues correctly editing the start of nodes: https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
            // When there is an inline element, e.g. a link, and you select
            // right after it (the start of the next node).
            selection.anchor.offset !== 0
          ) {
            native = true

            // Skip native if there are marks, as
            // `insertText` will insert a node, not just text.
            if (editor.marks) {
              native = false
            }

            // If the NODE_MAP is dirty, we can't trust the selection anchor (eg ReactEditor.toDOMPoint)
            if (!editor.isNodeMapDirty) {
              // Chrome also has issues correctly editing the end of anchor elements: https://bugs.chromium.org/p/chromium/issues/detail?id=1259100
              // Therefore we don't allow native events to insert text at the end of anchor nodes.
              const {anchor} = selection

              const [node, offset] = ReactEditor.toDOMPoint(editor, anchor)
              const anchorNode = node.parentElement?.closest('a')

              const window = ReactEditor.getWindow(editor)

              if (
                native &&
                anchorNode &&
                ReactEditor.hasDOMNode(editor, anchorNode)
              ) {
                // Find the last text node inside the anchor.
                const lastText = window?.document
                  .createTreeWalker(anchorNode, NodeFilter.SHOW_TEXT)
                  .lastChild() as DOMText | null

                if (
                  lastText === node &&
                  lastText.textContent?.length === offset
                ) {
                  native = false
                }
              }

              // Chrome has issues with the presence of tab characters inside elements with whiteSpace = 'pre'
              // causing abnormal insert behavior: https://bugs.chromium.org/p/chromium/issues/detail?id=1219139
              if (
                native &&
                node.parentElement &&
                window?.getComputedStyle(node.parentElement)?.whiteSpace ===
                  'pre'
              ) {
                const block = getAncestorTextBlock(editor, anchor.path)

                if (block) {
                  const blockText = getText(editor, block.path)

                  if (blockText?.includes('\t')) {
                    native = false
                  }
                }
              }
            }
          }
          // COMPAT: For the deleting forward/backward input types we don't want
          // to change the selection because it is the range that will be deleted,
          // and those commands determine that for themselves.
          // If the NODE_MAP is dirty, we can't trust the selection anchor (eg ReactEditor.toDOMPoint via ReactEditor.toSlateRange)
          if (
            (!type.startsWith('delete') || type.startsWith('deleteBy')) &&
            !editor.isNodeMapDirty
          ) {
            const [targetRange] = (event as any).getTargetRanges()

            if (targetRange) {
              const range = ReactEditor.toSlateRange(editor, targetRange, {
                exactMatch: false,
                suppressThrow: false,
              })

              if (!selection || !rangeEquals(selection, range)) {
                native = false

                const selectionRef =
                  !isCompositionChange &&
                  editor.selection &&
                  rangeRef(editor, editor.selection)

                editor.select(range)

                if (selectionRef) {
                  editor.userSelection = selectionRef
                }
              }
            }
          }

          // Composition change types occur while a user is composing text and can't be
          // cancelled. Let them through and wait for the composition to end.
          if (isCompositionChange) {
            return
          }

          if (!native) {
            event.preventDefault()
          }

          // COMPAT: If the selection is expanded, even if the command seems like
          // a delete forward/backward command it should delete the selection.
          if (
            selection &&
            isExpandedRange(selection) &&
            type.startsWith('delete')
          ) {
            const direction = type.endsWith('Backward') ? 'backward' : 'forward'
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete', direction},
              editor,
            })
            return
          }

          switch (type) {
            case 'deleteByComposition':
            case 'deleteByCut':
            case 'deleteByDrag': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete', direction: 'forward'},
                editor,
              })
              break
            }

            case 'deleteContent':
            case 'deleteContentForward': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.forward', unit: 'character'},
                editor,
              })
              break
            }

            case 'deleteContentBackward': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.backward', unit: 'character'},
                editor,
              })
              break
            }

            case 'deleteEntireSoftLine': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.backward', unit: 'line'},
                editor,
              })
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.forward', unit: 'line'},
                editor,
              })
              break
            }

            case 'deleteHardLineBackward': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.backward', unit: 'block'},
                editor,
              })
              break
            }

            case 'deleteSoftLineBackward': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.backward', unit: 'line'},
                editor,
              })
              break
            }

            case 'deleteHardLineForward': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.forward', unit: 'block'},
                editor,
              })
              break
            }

            case 'deleteSoftLineForward': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.forward', unit: 'line'},
                editor,
              })
              break
            }

            case 'deleteWordBackward': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.backward', unit: 'word'},
                editor,
              })
              break
            }

            case 'deleteWordForward': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.forward', unit: 'word'},
                editor,
              })
              break
            }

            case 'insertLineBreak':
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'insert.soft break'},
                editor,
              })
              break

            case 'insertParagraph': {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'insert.break'},
                editor,
              })
              break
            }

            case 'insertFromComposition':
            case 'insertFromDrop':
            case 'insertFromPaste':
            case 'insertFromYank':
            case 'insertReplacementText':
            case 'insertText': {
              if (type === 'insertFromComposition') {
                // COMPAT: in Safari, `compositionend` is dispatched after the
                // `beforeinput` for "insertFromComposition". But if we wait for it
                // then we will abort because we're still composing and the selection
                // won't be updated properly.
                // https://www.w3.org/TR/input-events-2/
                if (ReactEditor.isComposing(editor)) {
                  setIsComposing(false)
                  editor.composing = false
                }
              }

              // use a weak comparison instead of 'instanceof' to allow
              // programmatic access of paste events coming from external windows
              // like cypress where cy.window does not work realibly
              if (data?.constructor.name === 'DataTransfer') {
                editorActor.send({
                  type: 'behavior event',
                  behaviorEvent: {
                    type: 'input.*',
                    originEvent: {dataTransfer: data},
                  },
                  editor,
                })
              } else if (typeof data === 'string') {
                // Only insertText operations use the native functionality, for now.
                // Potentially expand to single character deletes, as well.
                if (native) {
                  deferredOperations.current.push(() =>
                    editorActor.send({
                      type: 'behavior event',
                      behaviorEvent: {type: 'insert.text', text: data},
                      editor,
                    }),
                  )
                } else {
                  editorActor.send({
                    type: 'behavior event',
                    behaviorEvent: {type: 'insert.text', text: data},
                    editor,
                  })
                }
              }

              break
            }
          }

          // Restore the actual user section if nothing manually set it.
          const toRestore = editor.userSelection?.unref()
          editor.userSelection = null

          if (
            toRestore &&
            (!editor.selection || !rangeEquals(editor.selection, toRestore))
          ) {
            editor.select(toRestore)
          }
        }
      },
      [
        editor,
        editorActor,
        onDOMSelectionChange,
        onUserInput,
        propsOnDOMBeforeInput,
        readOnly,
        scheduleOnDOMSelectionChange,
      ],
    )

    const callbackRef = useCallback(
      (node: HTMLDivElement | null) => {
        if (node == null) {
          onDOMSelectionChange.cancel()
          scheduleOnDOMSelectionChange.cancel()
          editor.domElement = null

          if (ref.current && HAS_BEFORE_INPUT_SUPPORT) {
            ref.current.removeEventListener('beforeinput', onDOMBeforeInput)
          }
        } else {
          // Attach a native DOM event handler for `beforeinput` events, because React's
          // built-in `onBeforeInput` is actually a leaky polyfill that doesn't expose
          // real `beforeinput` events sadly... (2019/11/04)
          // https://github.com/facebook/react/issues/11211
          if (HAS_BEFORE_INPUT_SUPPORT) {
            node.addEventListener('beforeinput', onDOMBeforeInput)
          }
        }

        ref.current = node
        if (typeof forwardedRef === 'function') {
          forwardedRef(node)
        } else if (forwardedRef) {
          forwardedRef.current = node
        }
      },
      [
        onDOMSelectionChange,
        scheduleOnDOMSelectionChange,
        editor,
        onDOMBeforeInput,
        forwardedRef,
      ],
    )

    useIsomorphicLayoutEffect(() => {
      const window = ReactEditor.getWindow(editor)

      // COMPAT: In Chrome, `selectionchange` events can fire when <input> and
      // <textarea> elements are appended to the DOM, causing
      // `editor.selection` to be overwritten in some circumstances.
      // (2025/01/16) https://issues.chromium.org/issues/389368412
      const onSelectionChange = ({target}: Event) => {
        const targetElement = target instanceof HTMLElement ? target : null
        const targetTagName = targetElement?.tagName
        if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA') {
          return
        }
        scheduleOnDOMSelectionChange()
      }

      // Attach a native DOM event handler for `selectionchange`, because React's
      // built-in `onSelect` handler doesn't fire for all selection changes. It's
      // a leaky polyfill that only fires on keypresses or clicks. Instead, we
      // want to fire for any change to the selection inside the editor.
      // (2019/11/04) https://github.com/facebook/react/issues/5785
      window.document.addEventListener('selectionchange', onSelectionChange)

      return () => {
        window.document.removeEventListener(
          'selectionchange',
          onSelectionChange,
        )
      }
    }, [scheduleOnDOMSelectionChange])

    const decorations = decorate([editor as any, []])
    const decorateContext = useDecorateContext(decorate)

    const showPlaceholder =
      placeholder &&
      editor.children.length === 1 &&
      (() => {
        let spanCount = 0

        for (const entry of getNodes(editor)) {
          if (isSpan({schema: editor.schema}, entry.node)) {
            spanCount++

            if (spanCount > 1 || entry.node.text !== '') {
              return false
            }
          }
        }

        return spanCount === 1
      })() &&
      !isComposing

    const placeHolderResizeHandler = useCallback(
      (placeholderEl: HTMLElement | null) => {
        if (placeholderEl && showPlaceholder) {
          setPlaceholderHeight(placeholderEl.getBoundingClientRect()?.height)
        } else {
          setPlaceholderHeight(undefined)
        }
      },
      [showPlaceholder],
    )

    if (showPlaceholder) {
      const placeholderStart = editorStart(editor, [])
      decorations.push({
        [PLACEHOLDER_SYMBOL]: true,
        placeholder,
        onPlaceholderResize: placeHolderResizeHandler,
        anchor: placeholderStart,
        focus: placeholderStart,
      } as any)
    }

    const {marks} = editor
    state.hasMarkPlaceholder = false

    if (editor.selection && isCollapsedRange(editor.selection) && marks) {
      const {anchor} = editor.selection
      const leafEntry = getNode(editor, anchor.path)
      const leaf = leafEntry ? leafEntry.node : undefined

      if (leaf && isSpan({schema: editor.schema}, leaf)) {
        const {text: _text, ...rest} = leaf

        if (!textEquals(leaf, marks, {loose: true})) {
          state.hasMarkPlaceholder = true

          const unset = Object.fromEntries(
            Object.keys(rest).map((mark) => [mark, null]),
          )

          decorations.push({
            [MARK_PLACEHOLDER_SYMBOL]: true,
            ...unset,
            ...marks,

            anchor,
            focus: anchor,
          })
        }
      }
    }

    // Update EDITOR_TO_MARK_PLACEHOLDER_MARKS in setTimeout useEffect to ensure we don't set it
    // before we receive the composition end event.
    useEffect(() => {
      setTimeout(() => {
        const {selection} = editor
        if (selection) {
          const {anchor} = selection
          const textEntry = getNode(editor, anchor.path)

          if (!textEntry || !isSpan({schema: editor.schema}, textEntry.node)) {
            return
          }

          const text = textEntry.node
          if (marks && !textEquals(text, marks, {loose: true})) {
            editor.pendingInsertionMarks = marks
            return
          }
        }

        editor.pendingInsertionMarks = null
      })
    })

    useFlushDeferredSelectorsOnRender()

    return (
      <ReadOnlyContext.Provider value={readOnly}>
        <ComposingContext.Provider value={isComposing}>
          <DecorateContext.Provider value={decorateContext}>
            <RestoreDOM node={ref} receivedUserInput={receivedUserInput}>
              <Component
                role={readOnly ? undefined : 'textbox'}
                aria-multiline={readOnly ? undefined : true}
                translate="no"
                {...attributes}
                // COMPAT: Certain browsers don't support the `beforeinput` event, so we'd
                // have to use hacks to make these replacement-based features work.
                // For SSR situations HAS_BEFORE_INPUT_SUPPORT is false and results in prop
                // mismatch warning app moves to browser. Pass-through consumer props when
                // not CAN_USE_DOM (SSR) and default to falsy value
                spellCheck={
                  HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM
                    ? attributes.spellCheck
                    : false
                }
                autoCorrect={
                  HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM
                    ? attributes.autoCorrect
                    : 'false'
                }
                autoCapitalize={
                  HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM
                    ? attributes.autoCapitalize
                    : 'false'
                }
                data-slate-editor
                data-slate-node="value"
                data-pt-path=""
                // explicitly set this
                contentEditable={!readOnly}
                // in some cases, a decoration needs access to the range / selection to decorate a text node,
                // then you will select the whole text node when you select part the of text
                // this magic zIndex="-1" will fix it
                zindex={-1}
                suppressContentEditableWarning
                ref={callbackRef}
                style={{
                  ...(disableDefaultStyles
                    ? {}
                    : {
                        // Allow positioning relative to the editable element.
                        position: 'relative',
                        // Preserve adjacent whitespace and new lines.
                        whiteSpace: 'pre-wrap',
                        // Allow words to break if they are too long.
                        wordWrap: 'break-word',
                        // Make the minimum height that of the placeholder.
                        ...(placeholderHeight
                          ? {minHeight: placeholderHeight}
                          : {}),
                      }),
                  // Allow for passed-in styles to override anything.
                  ...userStyle,
                }}
                onBeforeInput={useCallback(
                  (event: React.FormEvent<HTMLDivElement>) => {
                    // COMPAT: Certain browsers don't support the `beforeinput` event, so we
                    // fall back to React's leaky polyfill instead just for it. It
                    // only works for the `insertText` input type.
                    if (
                      !HAS_BEFORE_INPUT_SUPPORT &&
                      !readOnly &&
                      !isEventHandled(event as any, attributes.onBeforeInput) &&
                      ReactEditor.hasSelectableTarget(editor, event.target)
                    ) {
                      event.preventDefault()
                      if (!ReactEditor.isComposing(editor)) {
                        const text = (event as any).data as string
                        editorActor.send({
                          type: 'behavior event',
                          behaviorEvent: {type: 'insert.text', text},
                          editor,
                        })
                      }
                    }
                  },
                  [attributes.onBeforeInput, editor, editorActor, readOnly],
                )}
                onInput={useCallback(
                  (event: React.FormEvent<HTMLDivElement>) => {
                    if (isEventHandled(event as any, attributes.onInput)) {
                      return
                    }

                    if (androidInputManagerRef.current) {
                      androidInputManagerRef.current.handleInput()
                      return
                    }

                    // Flush native operations, as native events will have propogated
                    // and we can correctly compare DOM text values in components
                    // to stop rendering, so that browser functions like autocorrect
                    // and spellcheck work as expected.
                    for (const op of deferredOperations.current) {
                      op()
                    }
                    deferredOperations.current = []

                    // COMPAT: Since `beforeinput` doesn't fully `preventDefault`,
                    // there's a chance that content might be placed in the browser's undo stack.
                    // This means undo can be triggered even when the div is not focused,
                    // and it only triggers the input event for the node. (2024/10/09)
                    if (
                      !ReactEditor.isFocused(editor) &&
                      isDOMNode(event.target) &&
                      DOMEditor.hasEditableTarget(editor, event.target)
                    ) {
                      handleNativeHistoryEvents(
                        editor,
                        editorActor,
                        event.nativeEvent as InputEvent,
                      )
                    }
                  },
                  [attributes.onInput, editor, editorActor],
                )}
                onBlur={useCallback(
                  (event: React.FocusEvent<HTMLDivElement>) => {
                    if (
                      readOnly ||
                      state.isUpdatingSelection ||
                      !ReactEditor.hasSelectableTarget(editor, event.target) ||
                      isEventHandled(event, attributes.onBlur)
                    ) {
                      return
                    }

                    // COMPAT: If the current `activeElement` is still the previous
                    // one, this is due to the window being blurred when the tab
                    // itself becomes unfocused, so we want to abort early to allow to
                    // editor to stay focused when the tab becomes focused again.
                    const root = ReactEditor.findDocumentOrShadowRoot(editor)
                    if (state.latestElement === root.activeElement) {
                      return
                    }

                    const {relatedTarget} = event
                    const el = getDomNode(editor, [])

                    if (!el) {
                      return
                    }

                    // COMPAT: The event should be ignored if the focus is returning
                    // to the editor from an embedded editable element (eg. an <input>
                    // element inside a void node).
                    if (relatedTarget === el) {
                      return
                    }

                    // COMPAT: The event should be ignored if the focus is moving from
                    // the editor to inside a void node's spacer element.
                    if (
                      isDOMElement(relatedTarget) &&
                      relatedTarget.hasAttribute('data-slate-spacer')
                    ) {
                      return
                    }

                    // COMPAT: The event should be ignored if the focus is moving to a
                    // non- editable section of an element that isn't a void node (eg.
                    // a list item of the check list example).
                    if (
                      relatedTarget != null &&
                      isDOMNode(relatedTarget) &&
                      ReactEditor.hasDOMNode(editor, relatedTarget)
                    ) {
                      const relatedPath = getDomNodePath(relatedTarget)
                      const indexedPath = relatedPath
                        ? keyedPathToIndexedPath(
                            editor,
                            relatedPath,
                            editor.blockIndexMap,
                          )
                        : undefined

                      if (indexedPath) {
                        const relatedNodeEntry = getNode(editor, indexedPath)
                        const relatedNode = relatedNodeEntry
                          ? relatedNodeEntry.node
                          : undefined
                        if (
                          relatedNode &&
                          (isTextBlockNode(
                            {schema: editor.schema},
                            relatedNode,
                          ) ||
                            isObjectNode({schema: editor.schema}, relatedNode))
                        ) {
                          return
                        }
                      }
                    }

                    // COMPAT: Safari doesn't always remove the selection even if the content-
                    // editable element no longer has focus. Refer to:
                    // https://stackoverflow.com/questions/12353247/force-contenteditable-div-to-stop-accepting-input-after-it-loses-focus-under-web
                    if (IS_WEBKIT) {
                      const domSelection = getSelection(root)
                      domSelection?.removeAllRanges()
                    }

                    editor.focused = false
                  },
                  [
                    readOnly,
                    state.isUpdatingSelection,
                    state.latestElement,
                    editor,
                    attributes.onBlur,
                  ],
                )}
                onClick={useCallback(
                  (event: React.MouseEvent<HTMLDivElement>) => {
                    if (
                      ReactEditor.hasTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onClick) &&
                      isDOMNode(event.target)
                    ) {
                      const path = getDomNodePath(event.target)
                      const indexedPath = path
                        ? keyedPathToIndexedPath(
                            editor,
                            path,
                            editor.blockIndexMap,
                          )
                        : undefined

                      if (!indexedPath) {
                        return
                      }

                      // At this time, the Slate document may be arbitrarily different,
                      // because onClick handlers can change the document before we get here.
                      // Therefore we must check that this path actually exists.
                      const nodeClickEntry = getNode(editor, indexedPath)

                      if (!nodeClickEntry) {
                        return
                      }
                      const node = nodeClickEntry.node

                      if (
                        event.detail === TRIPLE_CLICK &&
                        indexedPath.length >= 1
                      ) {
                        let blockPath = indexedPath

                        if (!isTextBlockNode({schema: editor.schema}, node)) {
                          const block = getAncestorTextBlock(
                            editor,
                            indexedPath,
                          )

                          blockPath = block?.path ?? indexedPath.slice(0, 1)
                        }

                        const range = editorRange(editor, blockPath)
                        editor.select(range)
                        return
                      }

                      if (readOnly) {
                        return
                      }

                      const start = editorStart(editor, indexedPath)
                      const end = editorEnd(editor, indexedPath)
                      const startEntry = getNode(editor, start.path)
                      const startObjectNode =
                        startEntry &&
                        isObjectNode({schema: editor.schema}, startEntry.node)
                          ? startEntry
                          : getAncestorObjectNode(editor, start.path)
                      const endEntry = getNode(editor, end.path)
                      const endObjectNode =
                        endEntry &&
                        isObjectNode({schema: editor.schema}, endEntry.node)
                          ? endEntry
                          : getAncestorObjectNode(editor, end.path)

                      if (
                        startObjectNode &&
                        endObjectNode &&
                        pathEquals(startObjectNode.path, endObjectNode.path)
                      ) {
                        const range = editorRange(editor, start)
                        editor.select(range)
                      }
                    }
                  },
                  [editor, attributes.onClick, readOnly],
                )}
                onCompositionEnd={useCallback(
                  (event: React.CompositionEvent<HTMLDivElement>) => {
                    if (isDOMEventTargetInput(event)) {
                      return
                    }
                    if (ReactEditor.hasSelectableTarget(editor, event.target)) {
                      if (ReactEditor.isComposing(editor)) {
                        Promise.resolve().then(() => {
                          setIsComposing(false)
                          editor.composing = false
                        })
                      }

                      androidInputManagerRef.current?.handleCompositionEnd(
                        event,
                      )

                      if (
                        isEventHandled(event, attributes.onCompositionEnd) ||
                        IS_ANDROID
                      ) {
                        return
                      }

                      // COMPAT: In Chrome, `beforeinput` events for compositions
                      // aren't correct and never fire the "insertFromComposition"
                      // type that we need. So instead, insert whenever a composition
                      // ends since it will already have been committed to the DOM.
                      if (
                        !IS_WEBKIT &&
                        !IS_FIREFOX_LEGACY &&
                        !IS_IOS &&
                        !IS_WECHATBROWSER &&
                        !IS_UC_MOBILE &&
                        event.data
                      ) {
                        const placeholderMarks = editor.pendingInsertionMarks
                        editor.pendingInsertionMarks = null

                        // Ensure we insert text with the marks the user was actually seeing
                        if (placeholderMarks !== undefined) {
                          editor.userMarks = editor.marks
                          editor.marks = placeholderMarks
                        }

                        editorActor.send({
                          type: 'behavior event',
                          behaviorEvent: {
                            type: 'insert.text',
                            text: event.data,
                          },
                          editor,
                        })

                        const userMarks = editor.userMarks
                        editor.userMarks = null
                        if (userMarks !== undefined) {
                          editor.marks = userMarks
                        }
                      }
                    }
                  },
                  [attributes.onCompositionEnd, editor, editorActor],
                )}
                onCompositionUpdate={useCallback(
                  (event: React.CompositionEvent<HTMLDivElement>) => {
                    if (
                      ReactEditor.hasSelectableTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onCompositionUpdate) &&
                      !isDOMEventTargetInput(event)
                    ) {
                      if (!ReactEditor.isComposing(editor)) {
                        setIsComposing(true)
                        editor.composing = true
                      }
                    }
                  },
                  [attributes.onCompositionUpdate, editor],
                )}
                onCompositionStart={useCallback(
                  (event: React.CompositionEvent<HTMLDivElement>) => {
                    if (isDOMEventTargetInput(event)) {
                      return
                    }
                    if (ReactEditor.hasSelectableTarget(editor, event.target)) {
                      androidInputManagerRef.current?.handleCompositionStart(
                        event,
                      )

                      if (
                        isEventHandled(event, attributes.onCompositionStart) ||
                        IS_ANDROID
                      ) {
                        return
                      }

                      setIsComposing(true)

                      const {selection} = editor
                      if (selection && isExpandedRange(selection)) {
                        editorActor.send({
                          type: 'behavior event',
                          behaviorEvent: {type: 'delete', direction: 'forward'},
                          editor,
                        })
                        return
                      }
                    }
                  },
                  [attributes.onCompositionStart, editor, editorActor],
                )}
                onCopy={attributes.onCopy}
                onCut={attributes.onCut}
                onDragOver={attributes.onDragOver}
                onDragStart={attributes.onDragStart}
                onDrop={attributes.onDrop}
                onDragEnd={attributes.onDragEnd}
                onFocus={useCallback(
                  (event: React.FocusEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      !state.isUpdatingSelection &&
                      ReactEditor.hasEditableTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onFocus)
                    ) {
                      const el = getDomNode(editor, [])

                      if (!el) {
                        return
                      }

                      const root = ReactEditor.findDocumentOrShadowRoot(editor)
                      state.latestElement = root.activeElement

                      // COMPAT: If the editor has nested editable elements, the focus
                      // can go to them. In Firefox, this must be prevented because it
                      // results in issues with keyboard navigation. (2017/03/30)
                      if (IS_FIREFOX && event.target !== el) {
                        el.focus()
                        return
                      }

                      editor.focused = true
                    }
                  },
                  [readOnly, state, editor, attributes.onFocus],
                )}
                onKeyDown={useCallback(
                  (event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      ReactEditor.hasEditableTarget(editor, event.target)
                    ) {
                      androidInputManagerRef.current?.handleKeyDown(event)

                      const {nativeEvent} = event

                      // COMPAT: The composition end event isn't fired reliably in all browsers,
                      // so we sometimes might end up stuck in a composition state even though we
                      // aren't composing any more.
                      if (
                        ReactEditor.isComposing(editor) &&
                        nativeEvent.isComposing === false
                      ) {
                        editor.composing = false
                        setIsComposing(false)
                      }

                      if (
                        isEventHandled(event, attributes.onKeyDown) ||
                        ReactEditor.isComposing(editor)
                      ) {
                        return
                      }

                      const {selection} = editor
                      const blockIndex =
                        selection !== null ? selection.focus.path[0]! : 0
                      const elementText = getText(editor, [blockIndex])
                      const isRTL =
                        elementText !== undefined &&
                        getDirection(elementText) === 'rtl'

                      // COMPAT: Certain browsers don't handle the selection updates
                      // properly. In Chrome, the selection isn't properly extended.
                      // And in Firefox, the selection isn't properly collapsed.
                      // (2017/10/17)
                      if (Hotkeys.isMoveLineBackward(nativeEvent)) {
                        event.preventDefault()
                        move(editor, {unit: 'line', reverse: true})
                        return
                      }

                      if (Hotkeys.isMoveLineForward(nativeEvent)) {
                        event.preventDefault()
                        move(editor, {unit: 'line'})
                        return
                      }

                      if (Hotkeys.isExtendLineBackward(nativeEvent)) {
                        event.preventDefault()
                        move(editor, {
                          unit: 'line',
                          edge: 'focus',
                          reverse: true,
                        })
                        return
                      }

                      if (Hotkeys.isExtendLineForward(nativeEvent)) {
                        event.preventDefault()
                        move(editor, {unit: 'line', edge: 'focus'})
                        return
                      }

                      // COMPAT: If a void node is selected, or a zero-width text node
                      // adjacent to an inline is selected, we need to handle these
                      // hotkeys manually because browsers won't be able to skip over
                      // the void node with the zero-width space not being an empty
                      // string.
                      if (Hotkeys.isMoveBackward(nativeEvent)) {
                        event.preventDefault()

                        if (selection && isCollapsedRange(selection)) {
                          move(editor, {reverse: !isRTL})
                        } else {
                          collapse(editor, {
                            edge: isRTL ? 'end' : 'start',
                          })
                        }

                        return
                      }

                      if (Hotkeys.isMoveForward(nativeEvent)) {
                        event.preventDefault()

                        if (selection && isCollapsedRange(selection)) {
                          move(editor, {reverse: isRTL})
                        } else {
                          collapse(editor, {
                            edge: isRTL ? 'start' : 'end',
                          })
                        }

                        return
                      }

                      if (Hotkeys.isMoveWordBackward(nativeEvent)) {
                        event.preventDefault()

                        if (selection && isExpandedRange(selection)) {
                          collapse(editor, {edge: 'focus'})
                        }

                        move(editor, {
                          unit: 'word',
                          reverse: !isRTL,
                        })
                        return
                      }

                      if (Hotkeys.isMoveWordForward(nativeEvent)) {
                        event.preventDefault()

                        if (selection && isExpandedRange(selection)) {
                          collapse(editor, {edge: 'focus'})
                        }

                        move(editor, {
                          unit: 'word',
                          reverse: isRTL,
                        })
                        return
                      }

                      // COMPAT: Certain browsers don't support the `beforeinput` event, so we
                      // fall back to guessing at the input intention for hotkeys.
                      // COMPAT: In iOS, some of these hotkeys are handled in the
                      if (!HAS_BEFORE_INPUT_SUPPORT) {
                        // We don't have a core behavior for these, but they change the
                        // DOM if we don't prevent them, so we have to.
                        if (
                          Hotkeys.isBold(nativeEvent) ||
                          Hotkeys.isItalic(nativeEvent) ||
                          Hotkeys.isTransposeCharacter(nativeEvent)
                        ) {
                          event.preventDefault()
                          return
                        }

                        if (Hotkeys.isSoftBreak(nativeEvent)) {
                          event.preventDefault()
                          editorActor.send({
                            type: 'behavior event',
                            behaviorEvent: {type: 'insert.soft break'},
                            editor,
                          })
                          return
                        }

                        if (Hotkeys.isSplitBlock(nativeEvent)) {
                          event.preventDefault()
                          editorActor.send({
                            type: 'behavior event',
                            behaviorEvent: {type: 'insert.break'},
                            editor,
                          })
                          return
                        }

                        if (Hotkeys.isDeleteBackward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && isExpandedRange(selection)) {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete',
                                direction: 'backward',
                              },
                              editor,
                            })
                          } else {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete.backward',
                                unit: 'character',
                              },
                              editor,
                            })
                          }

                          return
                        }

                        if (Hotkeys.isDeleteForward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && isExpandedRange(selection)) {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete',
                                direction: 'forward',
                              },
                              editor,
                            })
                          } else {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete.forward',
                                unit: 'character',
                              },
                              editor,
                            })
                          }

                          return
                        }

                        if (Hotkeys.isDeleteLineBackward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && isExpandedRange(selection)) {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete',
                                direction: 'backward',
                              },
                              editor,
                            })
                          } else {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete.backward',
                                unit: 'line',
                              },
                              editor,
                            })
                          }

                          return
                        }

                        if (Hotkeys.isDeleteLineForward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && isExpandedRange(selection)) {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete',
                                direction: 'forward',
                              },
                              editor,
                            })
                          } else {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete.forward',
                                unit: 'line',
                              },
                              editor,
                            })
                          }

                          return
                        }

                        if (Hotkeys.isDeleteWordBackward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && isExpandedRange(selection)) {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete',
                                direction: 'backward',
                              },
                              editor,
                            })
                          } else {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete.backward',
                                unit: 'word',
                              },
                              editor,
                            })
                          }

                          return
                        }

                        if (Hotkeys.isDeleteWordForward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && isExpandedRange(selection)) {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete',
                                direction: 'forward',
                              },
                              editor,
                            })
                          } else {
                            editorActor.send({
                              type: 'behavior event',
                              behaviorEvent: {
                                type: 'delete.forward',
                                unit: 'word',
                              },
                              editor,
                            })
                          }

                          return
                        }
                      } else {
                        if (IS_CHROME || IS_WEBKIT) {
                          // COMPAT: Chrome and Safari support `beforeinput` event but do not fire
                          // an event when deleting backwards in a selected void inline node
                          if (
                            selection &&
                            (Hotkeys.isDeleteBackward(nativeEvent) ||
                              Hotkeys.isDeleteForward(nativeEvent)) &&
                            isCollapsedRange(selection)
                          ) {
                            const currentNodeEntry = getNode(
                              editor,
                              selection.anchor.path,
                            )

                            if (
                              currentNodeEntry &&
                              isObjectNode(
                                {schema: editor.schema},
                                currentNodeEntry.node,
                              )
                            ) {
                              event.preventDefault()
                              editorActor.send({
                                type: 'behavior event',
                                behaviorEvent: {
                                  type: 'delete.backward',
                                  unit: 'block',
                                },
                                editor,
                              })

                              return
                            }
                          }
                        }
                      }
                    }
                  },
                  [readOnly, editor, editorActor, attributes.onKeyDown],
                )}
                onPaste={useCallback(
                  (event: React.ClipboardEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      ReactEditor.hasEditableTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onPaste)
                    ) {
                      // COMPAT: Certain browsers don't support the `beforeinput` event, so we
                      // fall back to React's `onPaste` here instead.
                      // COMPAT: Firefox, Chrome and Safari don't emit `beforeinput` events
                      // when "paste without formatting" is used, so fallback. (2020/02/20)
                      // COMPAT: Safari InputEvents generated by pasting won't include
                      // application/x-slate-fragment items, so use the
                      // ClipboardEvent here. (2023/03/15)
                      if (
                        !HAS_BEFORE_INPUT_SUPPORT ||
                        isPlainTextOnlyPaste(event.nativeEvent) ||
                        IS_WEBKIT
                      ) {
                        event.preventDefault()
                        editorActor.send({
                          type: 'behavior event',
                          behaviorEvent: {
                            type: 'input.*',
                            originEvent: {dataTransfer: event.clipboardData},
                          },
                          editor,
                        })
                      }
                    }
                  },
                  [readOnly, editor, editorActor, attributes.onPaste],
                )}
              >
                <Children
                  parentDataPath=""
                  decorations={decorations}
                  node={editor}
                  indexedPath={[]}
                  renderElement={renderElement}
                  renderPlaceholder={renderPlaceholder}
                  renderLeaf={renderLeaf}
                  renderText={renderText}
                />
              </Component>
            </RestoreDOM>
          </DecorateContext.Provider>
        </ComposingContext.Provider>
      </ReadOnlyContext.Provider>
    )
  },
)

/**
 * The props that get passed to renderPlaceholder
 */
export type RenderPlaceholderProps = {
  children: any
  attributes: {
    'data-slate-placeholder': boolean
    'dir'?: 'rtl'
    'contentEditable': boolean
    'ref': React.RefCallback<any>
    'style': React.CSSProperties
  }
}

/**
 * The default placeholder element
 */

const DefaultPlaceholder = ({attributes, children}: RenderPlaceholderProps) => (
  // COMPAT: Artificially add a line-break to the end on the placeholder element
  // to prevent Android IMEs to pick up its content in autocorrect and to auto-capitalize the first letter
  <span {...attributes}>
    {children}
    {IS_ANDROID && <br />}
  </span>
)

/**
 * A default memoized decorate function.
 */

const defaultDecorate: (entry: NodeEntry) => DecoratedRange[] = () => []

/**
 * A default implement to scroll dom range into view.
 */

const defaultScrollSelectionIntoView = (
  editor: ReactEditor,
  domRange: DOMRange,
) => {
  // Scroll to the focus point of the selection, in case the selection is expanded
  const isBackward = !!editor.selection && isBackwardRange(editor.selection)
  const domFocusPoint = domRange.cloneRange()
  domFocusPoint.collapse(isBackward)

  if (domFocusPoint.getBoundingClientRect) {
    const leafEl = domFocusPoint.startContainer.parentElement!

    // COMPAT: In Chrome, domFocusPoint.getBoundingClientRect() can return zero dimensions for valid ranges (e.g. line breaks).
    // When this happens, do not scroll like most editors do.
    const domRect = domFocusPoint.getBoundingClientRect()
    const isZeroDimensionRect =
      domRect.width === 0 &&
      domRect.height === 0 &&
      domRect.x === 0 &&
      domRect.y === 0

    if (isZeroDimensionRect) {
      const leafRect = leafEl.getBoundingClientRect()
      const leafHasDimensions = leafRect.width > 0 || leafRect.height > 0

      if (leafHasDimensions) {
        return
      }
    }

    // Default behavior: use domFocusPoint's getBoundingClientRect
    leafEl.getBoundingClientRect =
      domFocusPoint.getBoundingClientRect.bind(domFocusPoint)
    scrollIntoView(leafEl, {
      scrollMode: 'if-needed',
    })

    // @ts-expect-error an unorthodox delete D:
    delete leafEl.getBoundingClientRect
  }
}

/**
 * Check if an event is overrided by a handler.
 */

const isEventHandled = <
  EventType extends React.SyntheticEvent<unknown, unknown>,
>(
  event: EventType,
  handler?: (event: EventType) => void | boolean,
) => {
  if (!handler) {
    return false
  }
  // The custom event handler may return a boolean to specify whether the event
  // shall be treated as being handled or not.
  const shouldTreatEventAsHandled = handler(event)

  if (shouldTreatEventAsHandled != null) {
    return shouldTreatEventAsHandled
  }

  return event.isDefaultPrevented() || event.isPropagationStopped()
}

/**
 * Check if the event's target is an input element
 */
const isDOMEventTargetInput = <
  EventType extends React.SyntheticEvent<unknown, unknown>,
>(
  event: EventType,
) => {
  return (
    isDOMNode(event.target) &&
    (event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement)
  )
}

/**
 * Check if a DOM event is overrided by a handler.
 */

const isDOMEventHandled = <E extends Event>(
  event: E,
  handler?: (event: E) => void | boolean,
) => {
  if (!handler) {
    return false
  }

  // The custom event handler may return a boolean to specify whether the event
  // shall be treated as being handled or not.
  const shouldTreatEventAsHandled = handler(event)

  if (shouldTreatEventAsHandled != null) {
    return shouldTreatEventAsHandled
  }

  return event.defaultPrevented
}

const handleNativeHistoryEvents = (
  editor: Editor,
  editorActor: EditorActor,
  event: InputEvent,
) => {
  if (event.inputType === 'historyUndo') {
    editorActor.send({
      type: 'behavior event',
      behaviorEvent: {type: 'history.undo'},
      editor,
    })
    return
  }
  if (event.inputType === 'historyRedo') {
    editorActor.send({
      type: 'behavior event',
      behaviorEvent: {type: 'history.redo'},
      editor,
    })
    return
  }
}

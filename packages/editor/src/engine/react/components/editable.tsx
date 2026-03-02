import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ForwardedRef,
  type JSX,
} from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import {getDomNode} from '../../../dom-traversal/get-dom-node'
import {getDomNodePath} from '../../../dom-traversal/get-dom-node-path'
import type {InputManager} from '../../../dom/input-manager'
import {useInputManager} from '../../../dom/use-input-manager'
import type {EditorActor} from '../../../editor/editor-machine'
import {getAncestor} from '../../../traversal/get-ancestor'
import {getNode} from '../../../traversal/get-node'
import {getParent} from '../../../traversal/get-parent'
import {getText} from '../../../traversal/get-text'
import {isLeafObject} from '../../../traversal/is-leaf-object'
import type {PortableTextEditorEngine} from '../../../types/editor-engine'
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
} from '../../dom/utils/dom'
import {
  CAN_USE_DOM,
  HAS_BEFORE_INPUT_SUPPORT,
  IS_CHROME,
  IS_FIREFOX,
  IS_WEBKIT,
} from '../../dom/utils/environment'
import Hotkeys from '../../dom/utils/hotkeys'
import {end as editorEnd} from '../../editor/end'
import {range as editorRange} from '../../editor/range'
import {start as editorStart} from '../../editor/start'
import type {Editor} from '../../interfaces/editor'
import type {NodeEntry} from '../../interfaces/node'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange, LeafPosition} from '../../interfaces/text'
import {isTextBlockNode} from '../../node/is-text-block-node'
import {pathEquals} from '../../path/path-equals'
import {isBackwardRange} from '../../range/is-backward-range'
import {isCollapsedRange} from '../../range/is-collapsed-range'
import {isExpandedRange} from '../../range/is-expanded-range'
import {rangeEquals} from '../../range/range-equals'
import useChildren from '../hooks/use-children'
import {DecorateContext, useDecorateContext} from '../hooks/use-decorations'
import {useEngine} from '../hooks/use-engine'
import {useFlushDeferredSelectorsOnRender} from '../hooks/use-engine-selector'
import {useIsomorphicLayoutEffect} from '../hooks/use-isomorphic-layout-effect'
import {ReadOnlyContext} from '../hooks/use-read-only'
import {useTrackUserInput} from '../hooks/use-track-user-input'
import {debounce, throttle} from '../utils/debounce'
import getDirection from '../utils/direction'
import {RestoreDOM} from './restore-dom/restore-dom'

const Children = (props: Parameters<typeof useChildren>[0]) => {
  const children = useChildren(props)
  return <React.Fragment>{children}</React.Fragment>
}

/**
 * `RenderElementProps` are passed to the `renderElement` handler.
 */

export interface RenderElementProps {
  children: any
  element: PortableTextTextBlock | PortableTextObject
  path: Path
  attributes: {
    'data-slate-node'?: 'element'
    'data-pt-block'?: 'container'
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
  path: Path
  attributes: {
    'data-slate-leaf'?: true
    'data-pt-marks': true
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
    'data-slate-node'?: 'text'
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
  readOnly?: boolean
  style?: React.CSSProperties
  renderElement: (props: RenderElementProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  scrollSelectionIntoView?: (
    editor: PortableTextEditorEngine,
    domRange: DOMRange,
  ) => void
} & React.TextareaHTMLAttributes<HTMLDivElement>

/**
 * Editable.
 */

export const Editable = forwardRef(
  (props: EditableProps, forwardedRef: ForwardedRef<HTMLDivElement>) => {
    const {
      autoFocus,
      decorate = defaultDecorate,
      editorActor,
      onDOMBeforeInput: propsOnDOMBeforeInput,
      readOnly = false,
      renderElement,
      renderLeaf,
      renderText,
      scrollSelectionIntoView = defaultScrollSelectionIntoView,
      style: userStyle = {},
      ...attributes
    } = props
    const editor = useEngine()
    // Rerender editor when composition status changed

    const ref = useRef<HTMLDivElement | null>(null)
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
     * The `InputManager` has a cyclical dependency on `onDOMSelectionChange`
     *
     * It is defined as a reference to simplify hook dependencies and clarify that
     * it needs to be initialized.
     */
    const inputManagerRef = useRef<InputManager | null>(null)

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

          const inputManager = inputManagerRef.current
          if (
            (!editor.composing || inputManager?.isFlushing()) &&
            (!state.isUpdatingSelection || inputManager?.isFlushing())
          ) {
            const root = DOMEditor.findDocumentOrShadowRoot(editor)
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
              return
            }

            if (!domSelection) {
              return deselect(editor)
            }

            const {anchorNode, focusNode} = domSelection

            const anchorNodeSelectable =
              DOMEditor.hasEditableTarget(editor, anchorNode) ||
              DOMEditor.isTargetInsideNonReadonlyVoid(editor, anchorNode)

            const focusNodeInEditor = DOMEditor.hasTarget(editor, focusNode)

            if (anchorNodeSelectable && focusNodeInEditor) {
              const range = DOMEditor.toEditorSelection(editor, domSelection, {
                exactMatch: false,
                suppressThrow: true,
              })

              if (range) {
                if (
                  !editor.composing &&
                  !inputManager?.hasPendingChanges() &&
                  !inputManager?.isFlushing()
                ) {
                  // Suppress browser selection normalization that would
                  // overwrite a block object selection.
                  editor.select(range)
                } else {
                  inputManager?.handleUserSelect(range)
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

    inputManagerRef.current = useInputManager({
      editorActor,
      node: ref as React.RefObject<HTMLElement>,
      editorRef: ref as React.RefObject<HTMLElement>,
      onDOMSelectionChange,
      scheduleOnDOMSelectionChange,
    })

    useIsomorphicLayoutEffect(() => {
      // Update element-related editor maps with the DOM element ref.
      let window: Window | null = null
      // biome-ignore lint/suspicious/noAssignInExpressions: engine upstream pattern — assignment in condition
      if (ref.current && (window = getDefaultView(ref.current))) {
        editor.domWindow = window
        editor.domElement = ref.current
      }

      // Make sure the DOM selection state is in sync.
      const {selection} = editor.snapshot.context
      const root = DOMEditor.findDocumentOrShadowRoot(editor)
      const domSelection = getSelection(root)

      if (
        !domSelection ||
        !editor.focused ||
        inputManagerRef.current?.hasPendingAction()
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
        // (https://github.com/ianstormtaylor/engine/pull/5486#issue-1820720223)
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
          const editorSelection = DOMEditor.toEditorSelection(
            editor,
            domSelection,
            {
              exactMatch: true,

              // domSelection is not necessarily a valid range
              // (e.g. when clicking on contentEditable:false element)
              suppressThrow: true,
            },
          )

          if (editorSelection && rangeEquals(editorSelection, selection)) {
            return
          }
        }

        // when <Editable/> is being controlled through external value
        // then its children might just change - DOM responds to it on its own
        // but the engine's value is not being updated through any operation
        // and thus it doesn't transform selection on its own
        if (selection && !DOMEditor.hasRange(editor, selection)) {
          const fallbackRange = DOMEditor.toEditorSelection(
            editor,
            domSelection,
            {
              exactMatch: false,
              suppressThrow: true,
            },
          )
          editor.snapshot.context.selection = fallbackRange
            ? {
                ...fallbackRange,
                backward: isBackwardRange(
                  fallbackRange,
                  editor.snapshot.context,
                ),
              }
            : null
          return
        }

        // Otherwise the DOM selection is out of sync, so update it.
        state.isUpdatingSelection = true

        let newDomRange: DOMRange | null = null

        try {
          newDomRange = selection && DOMEditor.toDOMRange(editor, selection)
        } catch (_e) {
          // Ignore, dom and state might be out of sync
        }

        if (newDomRange) {
          if (editor.composing && !inputManagerRef.current?.isFlushing()) {
            domSelection.collapseToEnd()
          } else if (isBackwardRange(selection!, editor.snapshot.context)) {
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

      const ensureSelection = inputManagerRef.current?.isFlushing() === 'action'

      if (!ensureSelection) {
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
          // This essentially would make setting the engine's selection during an update meaningless, so we force it
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

          // Translate the DOM Range into a Range
          const editorSelection = DOMEditor.toEditorSelection(
            editor,
            newRange,
            {
              exactMatch: false,
              suppressThrow: false,
            },
          )

          editor.select(editorSelection)

          event.preventDefault()
          event.stopImmediatePropagation()
          return
        }
        onUserInput()

        if (
          !readOnly &&
          DOMEditor.hasEditableTarget(editor, event.target) &&
          !isDOMEventHandled(event, propsOnDOMBeforeInput)
        ) {
          // Delegate all beforeinput handling to the input manager.
          // The manager handles both the fast path (preventDefault + direct
          // behavior event on desktop) and the slow path (parse-and-diff
          // fallback for composition, spellcheck, Android IME, etc.)
          inputManagerRef.current?.handleDOMBeforeInput(event)
        }
      },
      [editor, editorActor, onUserInput, propsOnDOMBeforeInput, readOnly],
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
      const window = DOMEditor.getWindow(editor)

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

    useFlushDeferredSelectorsOnRender()

    return (
      <ReadOnlyContext.Provider value={readOnly}>
        <DecorateContext.Provider value={decorateContext}>
          <RestoreDOM node={ref} receivedUserInput={receivedUserInput}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: role is conditionally set to textbox when editable */}
            {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-multiline is conditionally set alongside textbox role */}
            <div
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
              data-pt-editor
              data-slate-node="value"
              data-pt-path=""
              // explicitly set this
              contentEditable={!readOnly}
              // in some cases, a decoration needs access to the range / selection to decorate a text node,
              // then you will select the whole text node when you select part the of text
              // this magic zIndex="-1" will fix it
              {...{zindex: -1}}
              suppressContentEditableWarning
              ref={callbackRef}
              style={{
                // Allow positioning relative to the editable element.
                position: 'relative',
                // Preserve adjacent whitespace and new lines.
                whiteSpace: 'pre-wrap',
                // Allow words to break if they are too long.
                wordWrap: 'break-word',
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
                    DOMEditor.hasSelectableTarget(editor, event.target)
                  ) {
                    event.preventDefault()
                    if (!editor.composing) {
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

                  inputManagerRef.current?.handleInput()
                },
                [attributes.onInput],
              )}
              onBlur={useCallback(
                (event: React.FocusEvent<HTMLDivElement>) => {
                  if (
                    readOnly ||
                    state.isUpdatingSelection ||
                    !DOMEditor.hasSelectableTarget(editor, event.target) ||
                    isEventHandled(event, attributes.onBlur)
                  ) {
                    return
                  }

                  // COMPAT: If the current `activeElement` is still the previous
                  // one, this is due to the window being blurred when the tab
                  // itself becomes unfocused, so we want to abort early to allow to
                  // editor to stay focused when the tab becomes focused again.
                  const root = DOMEditor.findDocumentOrShadowRoot(editor)
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
                    relatedTarget.hasAttribute('data-pt-spacer')
                  ) {
                    return
                  }

                  // COMPAT: The event should be ignored if the focus is moving to a
                  // non- editable section of an element that isn't a void node (eg.
                  // a list item of the check list example).
                  if (
                    relatedTarget != null &&
                    isDOMNode(relatedTarget) &&
                    DOMEditor.hasDOMNode(editor, relatedTarget)
                  ) {
                    const relatedPath = getDomNodePath(relatedTarget)

                    if (relatedPath) {
                      const relatedNodeEntry = getNode(
                        editor.snapshot,
                        relatedPath,
                      )
                      const relatedNode = relatedNodeEntry
                        ? relatedNodeEntry.node
                        : undefined
                      if (
                        relatedNode &&
                        (isTextBlockNode(
                          {schema: editor.snapshot.context.schema},
                          relatedNode,
                        ) ||
                          isLeafObject(
                            editor.snapshot,
                            relatedNode,
                            relatedPath,
                          ))
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
                    DOMEditor.hasTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onClick) &&
                    isDOMNode(event.target)
                  ) {
                    const path = getDomNodePath(event.target)

                    if (!path) {
                      return
                    }

                    // At this time, the engine document may be arbitrarily different,
                    // because onClick handlers can change the document before we get here.
                    // Therefore we must check that this path actually exists.
                    const nodeClickEntry = getNode(editor.snapshot, path)

                    if (!nodeClickEntry) {
                      return
                    }
                    const node = nodeClickEntry.node

                    if (event.detail === TRIPLE_CLICK && path.length >= 1) {
                      let blockPath = path

                      if (
                        !isTextBlockNode(
                          {schema: editor.snapshot.context.schema},
                          node,
                        )
                      ) {
                        const block = getParent(editor.snapshot, path, {
                          match: (node) =>
                            isTextBlock(
                              {schema: editor.snapshot.context.schema},
                              node,
                            ),
                        })

                        blockPath = block?.path ?? path.slice(0, 1)
                      }

                      const range = editorRange(editor, blockPath)
                      editor.select(range)
                      return
                    }

                    if (readOnly) {
                      return
                    }

                    const start = editorStart(editor, path)
                    const end = editorEnd(editor, path)
                    const startEntry = getNode(editor.snapshot, start.path)
                    const startVoidNode =
                      startEntry &&
                      isLeafObject(editor.snapshot, startEntry.node, start.path)
                        ? startEntry
                        : getAncestor(editor.snapshot, start.path, {
                            match: (node, ancestorPath) =>
                              isLeafObject(editor.snapshot, node, ancestorPath),
                          })
                    const endEntry = getNode(editor.snapshot, end.path)
                    const endVoidNode =
                      endEntry &&
                      isLeafObject(editor.snapshot, endEntry.node, end.path)
                        ? endEntry
                        : getAncestor(editor.snapshot, end.path, {
                            match: (node, ancestorPath) =>
                              isLeafObject(editor.snapshot, node, ancestorPath),
                          })

                    if (
                      startVoidNode &&
                      endVoidNode &&
                      pathEquals(startVoidNode.path, endVoidNode.path)
                    ) {
                      const range = editorRange(editor, start)
                      editor.select(range)
                      return
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
                  if (DOMEditor.hasSelectableTarget(editor, event.target)) {
                    if (editor.composing) {
                      Promise.resolve().then(() => {
                        editor.composing = false
                      })
                    }

                    inputManagerRef.current?.handleCompositionEnd(
                      event.nativeEvent,
                    )

                    if (isEventHandled(event, attributes.onCompositionEnd)) {
                      return
                    }
                  }
                },
                [attributes.onCompositionEnd, editor],
              )}
              onCompositionUpdate={useCallback(
                (event: React.CompositionEvent<HTMLDivElement>) => {
                  if (
                    DOMEditor.hasSelectableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onCompositionUpdate) &&
                    !isDOMEventTargetInput(event)
                  ) {
                    if (!editor.composing) {
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
                  if (DOMEditor.hasSelectableTarget(editor, event.target)) {
                    inputManagerRef.current?.handleCompositionStart(
                      event.nativeEvent,
                    )

                    if (isEventHandled(event, attributes.onCompositionStart)) {
                      return
                    }
                  }
                },
                [attributes.onCompositionStart, editor],
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
                    DOMEditor.hasEditableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onFocus)
                  ) {
                    const el = getDomNode(editor, [])

                    if (!el) {
                      return
                    }

                    const root = DOMEditor.findDocumentOrShadowRoot(editor)
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
                    DOMEditor.hasEditableTarget(editor, event.target)
                  ) {
                    inputManagerRef.current?.handleKeyDown(event.nativeEvent)

                    const {nativeEvent} = event

                    // COMPAT: The composition end event isn't fired reliably in all browsers,
                    // so we sometimes might end up stuck in a composition state even though we
                    // aren't composing any more.
                    if (editor.composing && nativeEvent.isComposing === false) {
                      editor.composing = false
                    }

                    if (
                      isEventHandled(event, attributes.onKeyDown) ||
                      editor.composing
                    ) {
                      return
                    }

                    const {selection} = editor.snapshot.context
                    const blockSegment =
                      selection !== null ? selection.focus.path[0]! : 0
                    const elementText = getText(editor.snapshot, [blockSegment])
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
                            editor.snapshot,
                            selection.anchor.path,
                          )

                          if (
                            currentNodeEntry &&
                            isLeafObject(
                              editor.snapshot,
                              currentNodeEntry.node,
                              selection.anchor.path,
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
                    DOMEditor.hasEditableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onPaste)
                  ) {
                    // COMPAT: Certain browsers don't support the `beforeinput` event, so we
                    // fall back to React's `onPaste` here instead.
                    // COMPAT: Firefox, Chrome and Safari don't emit `beforeinput` events
                    // when "paste without formatting" is used, so fallback. (2020/02/20)
                    // COMPAT: Safari InputEvents generated by pasting won't include
                    // fragment MIME items, so use the
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
                decorations={decorations}
                node={editor}
                path={[]}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                renderText={renderText}
              />
            </div>
          </RestoreDOM>
        </DecorateContext.Provider>
      </ReadOnlyContext.Provider>
    )
  },
)

/**
 * A default memoized decorate function.
 */

const defaultDecorate: (entry: NodeEntry) => DecoratedRange[] = () => []

/**
 * A default implement to scroll dom range into view.
 */

const defaultScrollSelectionIntoView = (
  editor: PortableTextEditorEngine,
  domRange: DOMRange,
) => {
  // Scroll to the focus point of the selection, in case the selection is expanded
  const isBackward =
    !!editor.snapshot.context.selection &&
    isBackwardRange(editor.snapshot.context.selection, editor.snapshot.context)
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

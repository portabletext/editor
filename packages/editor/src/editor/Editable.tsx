import type {PortableTextSpan} from '@portabletext/schema'
import {useActorRef, useSelector} from '@xstate/react'
import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEventHandler,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import {getDomNode} from '../dom-traversal/get-dom-node'
import {getDomNodePath} from '../dom-traversal/get-dom-node-path'
import {collapse} from '../engine/core/collapse'
import {deselect} from '../engine/core/deselect'
import {move} from '../engine/core/move'
import {DOMEditor} from '../engine/dom/plugin/dom-editor'
import {TRIPLE_CLICK} from '../engine/dom/utils/constants'
import {
  containsShadowAware,
  getActiveElement,
  getDefaultView,
  getSelection,
  isDOMElement,
  isDOMNode,
  type DOMElement,
  type DOMRange,
  type DOMText,
} from '../engine/dom/utils/dom'
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
} from '../engine/dom/utils/environment'
import Hotkeys from '../engine/dom/utils/hotkeys'
import {end as editorEnd} from '../engine/editor/end'
import {range as editorRange} from '../engine/editor/range'
import {rangeRef} from '../engine/editor/range-ref'
import {start as editorStart, start} from '../engine/editor/start'
import type {Editor} from '../engine/interfaces/editor'
import type {NodeEntry} from '../engine/interfaces/node'
import type {DecoratedRange} from '../engine/interfaces/text'
import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {isVoidNode} from '../engine/node/is-void-node'
import {pathEquals} from '../engine/path/path-equals'
import {isBackwardRange} from '../engine/range/is-backward-range'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {isExpandedRange} from '../engine/range/is-expanded-range'
import {rangeEquals} from '../engine/range/range-equals'
import {RestoreDOM} from '../engine/react/components/restore-dom/restore-dom'
import type {AndroidInputManager} from '../engine/react/hooks/android-input-manager/android-input-manager'
import {useAndroidInputManager} from '../engine/react/hooks/android-input-manager/use-android-input-manager'
import useChildren from '../engine/react/hooks/use-children'
import {
  DecorateContext,
  useDecorateContext,
} from '../engine/react/hooks/use-decorations'
import {useEngine} from '../engine/react/hooks/use-engine'
import {useFlushDeferredSelectorsOnRender} from '../engine/react/hooks/use-engine-selector'
import {useIsomorphicLayoutEffect} from '../engine/react/hooks/use-isomorphic-layout-effect'
import {ReadOnlyContext} from '../engine/react/hooks/use-read-only'
import {useTrackUserInput} from '../engine/react/hooks/use-track-user-input'
import {debounce, throttle} from '../engine/react/utils/debounce'
import getDirection from '../engine/react/utils/direction'
import {resolveSelection} from '../internal-utils/apply-selection'
import {debug} from '../internal-utils/debug'
import {getEventPosition} from '../internal-utils/event-position'
import {safeStringify} from '../internal-utils/safe-json'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getNode} from '../node-traversal/get-node'
import {getText} from '../node-traversal/get-text'
import {getVoidAncestor} from '../node-traversal/get-void-ancestor'
import type {
  EditorSelection,
  OnCopyFn,
  OnPasteFn,
  RangeDecoration,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderListItemFunction,
  RenderPlaceholderFunction,
  RenderStyleFunction,
  ScrollSelectionIntoViewFunction,
} from '../types/editor'
import type {HotkeyOptions} from '../types/options'
import {isEmptyTextBlock} from '../utils'
import {parseBlocks} from '../utils/parse-blocks'
import {EditorActorContext} from './editor-actor-context'
import type {EditorActor} from './editor-machine'
import {performHotkey} from './perform-hotkey'
import {rangeDecorationsMachine} from './range-decorations-machine'
import {RelayActorContext} from './relay-actor-context'
import type {
  RenderElementProps,
  RenderLeafProps,
  RenderTextProps,
} from './render-props-types'
import {RenderElement} from './render.element'
import {RenderLeaf} from './render.leaf'
import {RenderText} from './render.text'
import {SelectionStateProvider} from './selection-state-context'
import {useDropPosition} from './use-drop-position'
import {usePortableTextEditor} from './usePortableTextEditor'
import {validateSelectionMachine} from './validate-selection-machine'

/**
 * @public
 */
export type PortableTextEditableProps = Omit<
  TextareaHTMLAttributes<HTMLDivElement>,
  'onPaste' | 'onCopy' | 'onBeforeInput'
> & {
  ref?: React.Ref<HTMLDivElement>
  hotkeys?: HotkeyOptions
  onBeforeInput?: (event: InputEvent) => void
  onPaste?: OnPasteFn
  onCopy?: OnCopyFn
  rangeDecorations?: RangeDecoration[]
  renderAnnotation?: RenderAnnotationFunction
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderDecorator?: RenderDecoratorFunction
  renderListItem?: RenderListItemFunction
  renderPlaceholder?: RenderPlaceholderFunction
  renderStyle?: RenderStyleFunction
  scrollSelectionIntoView?: ScrollSelectionIntoViewFunction
  selection?: EditorSelection
  spellCheck?: boolean
}

/**
 * @public
 *
 *
 * The core component that renders the editor. Must be placed within the {@link EditorProvider} component.
 *
 * @example
 * ```tsx
 * import { PortableTextEditable, EditorProvider } from '@portabletext/editor'
 *
 * function MyComponent() {
 *  return (
 *   <EditorProvider>
 *    <PortableTextEditable />
 *  </EditorProvider>
 *  )
 * }
 * ```
 * @group Components
 */
export const PortableTextEditable = forwardRef<
  Omit<HTMLDivElement, 'as' | 'onPaste' | 'onBeforeInput'>,
  PortableTextEditableProps
>(function PortableTextEditable(props, forwardedRef) {
  const {
    hotkeys,
    onBlur,
    onFocus,
    onBeforeInput,
    onPaste,
    onCopy,
    onCut,
    onClick,
    onDragStart,
    onDrag,
    onDragEnd,
    onDragEnter,
    onDragOver,
    onDrop,
    onDragLeave,
    rangeDecorations,
    renderAnnotation,
    renderBlock,
    renderChild,
    renderDecorator,
    renderListItem,
    renderPlaceholder,
    renderStyle,
    selection: propsSelection,
    scrollSelectionIntoView,
    style: userStyle = {},
    // Consumed and ignored. `autoFocus` is a no-op on a div, and we keep it
    // out of `restProps` so consumer-provided values don't end up on the
    // editable element.
    autoFocus,
    spellCheck,
    autoCorrect,
    autoCapitalize,
    className,
    ...restProps
  } = props

  const portableTextEditor = usePortableTextEditor()
  const [hasInvalidValue, setHasInvalidValue] = useState(false)

  const editorActor = useContext(EditorActorContext)
  const relayActor = useContext(RelayActorContext)
  const schema = editorActor.getSnapshot().context.schema
  const readOnly = useSelector(editorActor, (s) =>
    s.matches({'edit mode': 'read only'}),
  )
  const editorEngine = useEngine()
  const validateSelectionActor = useActorRef(validateSelectionMachine, {
    input: {
      editorEngine,
    },
  })

  const rangeDecorationsActor = useActorRef(rangeDecorationsMachine, {
    input: {
      rangeDecorations: rangeDecorations ?? [],
      readOnly,
      schema,
      editorEngine,
      skipSetup: !editorActor.getSnapshot().matches({setup: 'setting up'}),
    },
  })
  const decorate =
    useSelector(rangeDecorationsActor, (s) => s.context.decorate?.fn) ??
    defaultDecorate
  const dropPosition = useDropPosition()

  useEffect(() => {
    rangeDecorationsActor.send({
      type: 'update read only',
      readOnly,
    })
  }, [rangeDecorationsActor, readOnly])

  useEffect(() => {
    rangeDecorationsActor.send({
      type: 'range decorations updated',
      rangeDecorations: rangeDecorations ?? [],
    })
  }, [rangeDecorationsActor, rangeDecorations])

  const legacy = useMemo(
    () => ({
      renderBlock,
      renderChild,
      renderListItem,
      renderStyle,
    }),
    [renderBlock, renderChild, renderListItem, renderStyle],
  )

  const renderElement = useCallback(
    (eProps: RenderElementProps) => (
      <RenderElement
        {...eProps}
        dropPosition={dropPosition}
        legacy={legacy}
        readOnly={readOnly}
        schema={schema}
      />
    ),
    [dropPosition, schema, readOnly, legacy],
  )

  const renderLeaf = useCallback(
    (
      leafProps: RenderLeafProps & {
        leaf: PortableTextSpan & {
          placeholder?: boolean
          rangeDecoration?: RangeDecoration
        }
      },
    ) => (
      <RenderLeaf
        {...leafProps}
        readOnly={readOnly}
        renderAnnotation={renderAnnotation}
        renderChild={renderChild}
        renderDecorator={renderDecorator}
        renderPlaceholder={renderPlaceholder}
        schema={schema}
      />
    ),
    [
      readOnly,
      renderAnnotation,
      renderChild,
      renderDecorator,
      renderPlaceholder,
      schema,
    ],
  )

  const renderText = useCallback(
    (renderTextProps: RenderTextProps) => <RenderText {...renderTextProps} />,
    [],
  )

  const restoreSelectionFromProps = useCallback(() => {
    if (propsSelection) {
      if (debug.selection.enabled) {
        debug.selection(`Selection from props ${safeStringify(propsSelection)}`)
      }
      const resolvedSelection = resolveSelection(editorEngine, propsSelection)
      if (resolvedSelection) {
        if (debug.selection.enabled) {
          debug.selection(
            `Resolved selection from props ${safeStringify(resolvedSelection)}`,
          )
        }
        editorEngine.select(resolvedSelection)
        // Output selection here in those cases where the editor selection was the same, and there are no set_selection operations made.
        // The selection is usually automatically emitted by the withPortableTextSelections plugin whenever there is a set_selection operation applied.
        if (!editorEngine.operations.some((o) => o.type === 'set_selection')) {
          editorActor.send({
            type: 'update selection',
            selection: resolvedSelection,
          })
        }
        editorEngine.onChange()
      }
    }
  }, [editorActor, propsSelection, editorEngine])

  // Restore selection from props when the editor has been initialized properly with it's value
  useEffect(() => {
    const onReady = editorActor.on('ready', () => {
      rangeDecorationsActor.send({
        type: 'ready',
      })

      restoreSelectionFromProps()
    })

    const onInvalidValue = editorActor.on('invalid value', () => {
      setHasInvalidValue(true)
    })

    const onValueChanged = editorActor.on('value changed', () => {
      setHasInvalidValue(false)
    })

    return () => {
      onReady.unsubscribe()
      onInvalidValue.unsubscribe()
      onValueChanged.unsubscribe()
    }
  }, [rangeDecorationsActor, editorActor, restoreSelectionFromProps])

  // Restore selection from props when it changes
  useEffect(() => {
    if (propsSelection && !hasInvalidValue) {
      restoreSelectionFromProps()
    }
  }, [hasInvalidValue, propsSelection, restoreSelectionFromProps])

  useEffect(() => {
    const window = DOMEditor.getWindow(editorEngine)

    const onDragEnd = () => {
      editorActor.send({type: 'dragend'})
    }
    const onDrop = () => {
      editorActor.send({type: 'drop'})
    }

    window.document.addEventListener('dragend', onDragEnd)
    window.document.addEventListener('drop', onDrop)

    return () => {
      window.document.removeEventListener('dragend', onDragEnd)
      window.document.removeEventListener('drop', onDrop)
    }
  }, [editorEngine, editorActor])

  // ---- Engine setup ----

  const ref = useRef<HTMLDivElement | null>(null)
  const deferredOperations = useRef<DeferredOperation[]>([])
  const processing = useRef(false)

  const {onUserInput, receivedUserInput} = useTrackUserInput()

  const [, forceRender] = useReducer((s) => s + 1, 0)
  editorEngine.forceRender = forceRender

  // Update internal state on each render.
  editorEngine.readOnly = readOnly

  // Keep track of some state for the event handler logic. `useRef` is the
  // documented escape hatch for ad-hoc mutable state: writes to
  // `state.X = Y` are explicitly allowed on `ref.current` and don't trip
  // the React Compiler's immutability rules.
  const state = useRef({
    isUpdatingSelection: false,
    latestElement: null as DOMElement | null,
  }).current

  /**
   * The AndroidInputManager object has a cyclical dependency on onDOMSelectionChange
   *
   * It is defined as a reference to simplify hook dependencies and clarify that
   * it needs to be initialized.
   */
  const androidInputManagerRef = useRef<AndroidInputManager | null | undefined>(
    undefined,
  )

  const onDOMSelectionChange = useMemo(
    () =>
      throttle(() => {
        if (editorEngine.isNodeMapDirty) {
          onDOMSelectionChange()
          return
        }

        const el = getDomNode(editorEngine, [])

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
            deselect(editorEngine)
          }

          processing.current = false
          return
        }

        const androidInputManager = androidInputManagerRef.current
        if (
          (IS_ANDROID || !editorEngine.composing) &&
          (!state.isUpdatingSelection || androidInputManager?.isFlushing())
        ) {
          const root = DOMEditor.findDocumentOrShadowRoot(editorEngine)
          const {activeElement} = root
          const el = getDomNode(editorEngine, [])

          if (!el) {
            return
          }

          const domSelection = getSelection(root)

          if (activeElement === el) {
            state.latestElement = activeElement
            editorEngine.focused = true
          } else {
            editorEngine.focused = false
            return
          }

          if (!domSelection) {
            return deselect(editorEngine)
          }

          const {anchorNode, focusNode} = domSelection

          const anchorNodeSelectable =
            DOMEditor.hasEditableTarget(editorEngine, anchorNode) ||
            DOMEditor.isTargetInsideNonReadonlyVoid(editorEngine, anchorNode)

          const focusNodeInEditor = DOMEditor.hasTarget(editorEngine, focusNode)

          if (anchorNodeSelectable && focusNodeInEditor) {
            const range = DOMEditor.toEditorSelection(
              editorEngine,
              domSelection,
              {
                exactMatch: false,
                suppressThrow: true,
              },
            )

            if (range) {
              if (
                !editorEngine.composing &&
                !androidInputManager?.hasPendingChanges() &&
                !androidInputManager?.isFlushing()
              ) {
                // Suppress browser selection normalization that would
                // overwrite a block object selection.
                editorEngine.select(range)
              } else {
                androidInputManager?.handleUserSelect(range)
              }
            }
          }

          // Deselect the editor if the dom selection is not selectable in readonly mode
          if (readOnly && (!anchorNodeSelectable || !focusNodeInEditor)) {
            deselect(editorEngine)
          }
        }
      }, 100),
    [editorEngine, readOnly, state],
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
    let domWindow: Window | null = null
    // biome-ignore lint/suspicious/noAssignInExpressions: engine upstream pattern - assignment in condition
    if (ref.current && (domWindow = getDefaultView(ref.current))) {
      editorEngine.domWindow = domWindow
      editorEngine.domElement = ref.current
    }

    // Make sure the DOM selection state is in sync.
    const {selection} = editorEngine
    const root = DOMEditor.findDocumentOrShadowRoot(editorEngine)
    const domSelection = getSelection(root)

    if (
      !domSelection ||
      !editorEngine.focused ||
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
      const editorElement = editorEngine.domElement!
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
          editorEngine,
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
      if (selection && !DOMEditor.hasRange(editorEngine, selection)) {
        const fallbackRange = DOMEditor.toEditorSelection(
          editorEngine,
          domSelection,
          {
            exactMatch: false,
            suppressThrow: true,
          },
        )
        editorEngine.selection = fallbackRange
          ? {
              ...fallbackRange,
              backward: isBackwardRange(fallbackRange, editorEngine),
            }
          : null
        return
      }

      // Otherwise the DOM selection is out of sync, so update it.
      state.isUpdatingSelection = true

      let newDomRange: DOMRange | null = null

      try {
        newDomRange = selection && DOMEditor.toDOMRange(editorEngine, selection)
      } catch (_e) {
        // Ignore, dom and state might be out of sync
      }

      if (newDomRange) {
        if (editorEngine.composing && !IS_ANDROID) {
          domSelection.collapseToEnd()
        } else if (isBackwardRange(selection!, editorEngine)) {
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
        engineScrollSelectionIntoView(editorEngine, newDomRange)
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
            const el = getDomNode(editorEngine, [])

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

  // ---- Helpers used by both layers ----

  // Compute the engine-shaped scroll-into-view callback. If consumer passed
  // null, no scroll happens. If undefined, the engine default is used.
  function engineScrollSelectionIntoView(
    editorArg: DOMEditor,
    domRange: DOMRange,
  ) {
    if (scrollSelectionIntoView === null) {
      return
    }
    if (scrollSelectionIntoView === undefined) {
      defaultScrollSelectionIntoView(editorArg, domRange)
      return
    }
    scrollSelectionIntoView(portableTextEditor, domRange)
  }

  // Listen on the native `beforeinput` event to get real "Level 2" events. This
  // is required because React's `beforeinput` is fake and never really attaches
  // to the real event sadly. (2019/11/01)
  // https://github.com/facebook/react/issues/11211
  const onDOMBeforeInput = useCallback(
    (event: InputEvent) => {
      handleNativeHistoryEvents(editorEngine, editorActor, event)
      const el = getDomNode(editorEngine, [])

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
          editorEngine,
          newRange,
          {
            exactMatch: false,
            suppressThrow: false,
          },
        )

        editorEngine.select(editorSelection)

        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      onUserInput()

      // Outer's onBeforeInput consumer prop runs first; bail if it cancelled.
      if (onBeforeInput) {
        onBeforeInput(event)
      }
      if (event.defaultPrevented) {
        return
      }

      if (
        !readOnly &&
        DOMEditor.hasEditableTarget(editorEngine, event.target)
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

        const {selection} = editorEngine
        const {inputType: type} = event
        const data = (event as any).dataTransfer || event.data || undefined

        const isCompositionChange =
          type === 'insertCompositionText' || type === 'deleteCompositionText'

        // COMPAT: use composition change events as a hint to where we should insert
        // composition text if we aren't composing to work around https://github.com/ianstormtaylor/engine/issues/5038
        if (isCompositionChange && editorEngine.composing) {
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

          // If the NODE_MAP is dirty, we can't trust the selection anchor (eg DOMEditor.toDOMPoint)
          if (!editorEngine.isNodeMapDirty) {
            // Chrome also has issues correctly editing the end of anchor elements: https://bugs.chromium.org/p/chromium/issues/detail?id=1259100
            // Therefore we don't allow native events to insert text at the end of anchor nodes.
            const {anchor} = selection

            const [node, offset] = DOMEditor.toDOMPoint(editorEngine, anchor)
            const anchorNode = node.parentElement?.closest('a')

            const win = DOMEditor.getWindow(editorEngine)

            if (
              native &&
              anchorNode &&
              DOMEditor.hasDOMNode(editorEngine, anchorNode)
            ) {
              // Find the last text node inside the anchor.
              const lastText = win?.document
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
              win?.getComputedStyle(node.parentElement)?.whiteSpace === 'pre'
            ) {
              const block = getAncestorTextBlock(editorEngine, anchor.path)

              if (block) {
                const blockText = getText(editorEngine, block.path)

                if (blockText?.includes('	')) {
                  native = false
                }
              }
            }
          }
        }
        // COMPAT: For the deleting forward/backward input types we don't want
        // to change the selection because it is the range that will be deleted,
        // and those commands determine that for themselves.
        // If the NODE_MAP is dirty, we can't trust the selection anchor (eg DOMEditor.toDOMPoint via DOMEditor.toEditorSelection)
        if (
          (!type.startsWith('delete') || type.startsWith('deleteBy')) &&
          !editorEngine.isNodeMapDirty
        ) {
          const [targetRange] = (event as any).getTargetRanges()

          if (targetRange) {
            const range = DOMEditor.toEditorSelection(
              editorEngine,
              targetRange,
              {
                exactMatch: false,
                suppressThrow: false,
              },
            )

            if (!selection || !rangeEquals(selection, range)) {
              native = false

              const selectionRef =
                !isCompositionChange &&
                editorEngine.selection &&
                rangeRef(editorEngine, editorEngine.selection)

              editorEngine.select(range)

              if (selectionRef) {
                editorEngine.userSelection = selectionRef
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
            editor: editorEngine,
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
              editor: editorEngine,
            })
            break
          }

          case 'deleteContent':
          case 'deleteContentForward': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'character'},
              editor: editorEngine,
            })
            break
          }

          case 'deleteContentBackward': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'character'},
              editor: editorEngine,
            })
            break
          }

          case 'deleteEntireSoftLine': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'line'},
              editor: editorEngine,
            })
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'line'},
              editor: editorEngine,
            })
            break
          }

          case 'deleteHardLineBackward': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'block'},
              editor: editorEngine,
            })
            break
          }

          case 'deleteSoftLineBackward': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'line'},
              editor: editorEngine,
            })
            break
          }

          case 'deleteHardLineForward': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'block'},
              editor: editorEngine,
            })
            break
          }

          case 'deleteSoftLineForward': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'line'},
              editor: editorEngine,
            })
            break
          }

          case 'deleteWordBackward': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'word'},
              editor: editorEngine,
            })
            break
          }

          case 'deleteWordForward': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'word'},
              editor: editorEngine,
            })
            break
          }

          case 'insertLineBreak':
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'insert.soft break'},
              editor: editorEngine,
            })
            break

          case 'insertParagraph': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'insert.break'},
              editor: editorEngine,
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
              if (editorEngine.composing) {
                editorEngine.composing = false
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
                editor: editorEngine,
              })
            } else if (typeof data === 'string') {
              // Only insertText operations use the native functionality, for now.
              // Potentially expand to single character deletes, as well.
              if (native) {
                deferredOperations.current.push(() =>
                  editorActor.send({
                    type: 'behavior event',
                    behaviorEvent: {type: 'insert.text', text: data},
                    editor: editorEngine,
                  }),
                )
              } else {
                editorActor.send({
                  type: 'behavior event',
                  behaviorEvent: {type: 'insert.text', text: data},
                  editor: editorEngine,
                })
              }
            }

            break
          }
        }

        // Restore the actual user section if nothing manually set it.
        const toRestore = editorEngine.userSelection?.unref()
        editorEngine.userSelection = null

        if (
          toRestore &&
          (!editorEngine.selection ||
            !rangeEquals(editorEngine.selection, toRestore))
        ) {
          editorEngine.select(toRestore)
        }
      }
    },
    [
      editorEngine,
      editorActor,
      onDOMSelectionChange,
      onUserInput,
      onBeforeInput,
      readOnly,
      scheduleOnDOMSelectionChange,
    ],
  )

  // Ref callback for the editable div: attaches the native `beforeinput`
  // listener (React's synthetic event is a lossy polyfill), forwards the
  // ref, and starts a MutationObserver that revalidates the editor
  // selection whenever the DOM subtree changes.
  const callbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node == null) {
        onDOMSelectionChange.cancel()
        scheduleOnDOMSelectionChange.cancel()
        editorEngine.domElement = null

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

      if (node) {
        // Observe mutations (child list and subtree) to this component's DOM,
        // and make sure the editor selection is valid when that happens.
        const mutationObserver = new MutationObserver(() => {
          validateSelectionActor.send({
            type: 'validate selection',
            editorElement: node,
          })
        })

        mutationObserver.observe(node, {
          attributeOldValue: false,
          attributes: false,
          characterData: false,
          childList: true,
          subtree: true,
        })

        return () => {
          mutationObserver.disconnect()
        }
      }

      return undefined
    },
    [
      onDOMSelectionChange,
      scheduleOnDOMSelectionChange,
      editorEngine,
      onDOMBeforeInput,
      forwardedRef,
      validateSelectionActor,
    ],
  )

  useIsomorphicLayoutEffect(() => {
    const window = DOMEditor.getWindow(editorEngine)

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
      window.document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [scheduleOnDOMSelectionChange])

  const decorations = decorate([editorEngine as any, []])
  const decorateContext = useDecorateContext(decorate)

  useFlushDeferredSelectorsOnRender()

  // ---- Event handler callbacks ----

  const handleCopy = useCallback(
    (event: ClipboardEvent<HTMLDivElement>): void | DOMEditor => {
      if (!DOMEditor.hasSelectableTarget(editorEngine, event.target)) {
        return
      }

      if (onCopy) {
        const result = onCopy(event)
        // CopyFn may return something to avoid doing default stuff
        if (result !== undefined) {
          event.preventDefault()
        }
      } else if (event.nativeEvent.clipboardData) {
        // Prevent the engine from handling the event
        event.stopPropagation()
        event.preventDefault()

        const selection = editorEngine.selection ?? undefined
        const position = selection ? {selection} : undefined

        if (!position) {
          console.warn('Could not find position for copy event')
          return
        }

        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'clipboard.copy',
            originEvent: {
              dataTransfer: event.nativeEvent.clipboardData,
            },
            position,
          },
          editor: editorEngine,
          nativeEvent: event,
        })
      }
    },
    [onCopy, editorActor, editorEngine],
  )

  const handleCut = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (!DOMEditor.hasSelectableTarget(editorEngine, event.target)) {
        return
      }

      if (onCut) {
        const result = onCut(event)
        // CutFn may return something to avoid doing default stuff
        if (result !== undefined) {
          event.preventDefault()
        }
      } else if (event.nativeEvent.clipboardData) {
        // Prevent the engine from handling the event
        event.stopPropagation()
        event.preventDefault()

        const selection = editorActor.getSnapshot().context.selection
        const position = selection ? {selection} : undefined

        if (!position) {
          console.warn('Could not find position for cut event')
          return
        }

        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'clipboard.cut',
            originEvent: {
              dataTransfer: event.nativeEvent.clipboardData,
            },
            position,
          },
          editor: editorEngine,
          nativeEvent: event,
        })
      }
    },
    [onCut, editorActor, editorEngine],
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>): Promise<void> | void => {
      const value = editorEngine.children
      const ptRange = editorEngine.selection
      const path = ptRange?.focus.path || []
      const onPasteResult = onPaste?.({
        event,
        value,
        path,
        schemaTypes: portableTextEditor.schemaTypes,
      })

      if (onPasteResult || !editorEngine.selection) {
        event.preventDefault()

        // Resolve it as promise (can be either async promise or sync return value)
        relayActor.send({type: 'loading'})

        Promise.resolve(onPasteResult)
          .then((result) => {
            debug.behaviors(
              'Custom paste function from client resolved',
              result,
            )

            if (!result || !result.insert) {
              debug.behaviors(
                'No result from custom paste handler, pasting normally',
              )

              const selection = editorActor.getSnapshot().context.selection
              const position = selection ? {selection} : undefined

              if (!position) {
                console.warn('Could not find position for paste event')
                return
              }

              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {
                  type: 'clipboard.paste',
                  originEvent: {
                    dataTransfer: event.clipboardData,
                  },
                  position,
                },
                editor: editorEngine,
                nativeEvent: event,
              })
            } else if (result.insert) {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {
                  type: 'insert.blocks',
                  blocks: parseBlocks({
                    keyGenerator:
                      editorActor.getSnapshot().context.keyGenerator,
                    schema: editorActor.getSnapshot().context.schema,
                    blocks: result.insert,
                    options: {
                      normalize: false,
                      removeUnusedMarkDefs: true,
                      validateFields: false,
                    },
                  }),
                  placement: 'auto',
                },
                editor: editorEngine,
              })
            } else {
              console.warn(
                'Your onPaste function returned something unexpected:',
                result,
              )
            }
          })
          .catch((error) => {
            console.warn(error)

            return error
          })
          .finally(() => {
            relayActor.send({type: 'done loading'})
          })

        return
      }

      // Engine fallback. Runs unconditionally when the consumer `onPaste`
      // is absent or returned `undefined`, so React's `onPaste` event still
      // dispatches to the engine's clipboard pipeline on modern browsers.
      if (event.nativeEvent.clipboardData) {
        event.preventDefault()
        event.stopPropagation()

        const selection = editorActor.getSnapshot().context.selection
        const position = selection ? {selection} : undefined

        if (!position) {
          console.warn('Could not find position for paste event')
          return
        }

        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'clipboard.paste',
            originEvent: {
              dataTransfer: event.nativeEvent.clipboardData,
            },
            position,
          },
          editor: editorEngine,
          nativeEvent: event,
        })
      }
    },
    [editorActor, onPaste, portableTextEditor, relayActor, editorEngine],
  )

  const handleFocus: FocusEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      // Invoke consumer onFocus + relay focused event + restore caret into
      // a single empty text block.
      if (onFocus) {
        onFocus(event)
      }

      if (!event.isDefaultPrevented()) {
        relayActor.send({type: 'focused', event})

        if (
          !editorEngine.selection &&
          editorEngine.children.length === 1 &&
          isEmptyTextBlock(
            editorActor.getSnapshot().context,
            editorEngine.children.at(0),
          )
        ) {
          editorEngine.select(start(editorEngine, []))
          editorEngine.onChange()
        }
      }

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      // Track latest activeElement so onBlur can recover.
      if (
        !readOnly &&
        !state.isUpdatingSelection &&
        DOMEditor.hasEditableTarget(editorEngine, event.target)
      ) {
        const el = getDomNode(editorEngine, [])

        if (!el) {
          return
        }

        const root = DOMEditor.findDocumentOrShadowRoot(editorEngine)
        state.latestElement = root.activeElement

        // COMPAT: If the editor has nested editable elements, the focus
        // can go to them. In Firefox, this must be prevented because it
        // results in issues with keyboard navigation. (2017/03/30)
        if (IS_FIREFOX && event.target !== el) {
          el.focus()
          return
        }

        editorEngine.focused = true
      }
    },
    [readOnly, state, editorEngine, onFocus, editorActor, relayActor],
  )

  const handleBlur: FocusEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (onBlur) {
        onBlur(event)
      }
      if (!event.isPropagationStopped()) {
        relayActor.send({type: 'blurred', event})
      }

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      // Relay blur to the engine: clear selection, suppress focus retention.
      if (
        readOnly ||
        state.isUpdatingSelection ||
        !DOMEditor.hasSelectableTarget(editorEngine, event.target)
      ) {
        return
      }

      // COMPAT: If the current `activeElement` is still the previous
      // one, this is due to the window being blurred when the tab
      // itself becomes unfocused, so we want to abort early to allow to
      // editor to stay focused when the tab becomes focused again.
      const root = DOMEditor.findDocumentOrShadowRoot(editorEngine)
      if (state.latestElement === root.activeElement) {
        return
      }

      const {relatedTarget} = event
      const el = getDomNode(editorEngine, [])

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
        DOMEditor.hasDOMNode(editorEngine, relatedTarget)
      ) {
        const relatedPath = getDomNodePath(relatedTarget)

        if (relatedPath) {
          const relatedNodeEntry = getNode(editorEngine, relatedPath)
          const relatedNode = relatedNodeEntry
            ? relatedNodeEntry.node
            : undefined
          if (
            relatedNode &&
            (isTextBlockNode({schema: editorEngine.schema}, relatedNode) ||
              isVoidNode(editorEngine, relatedNode, relatedPath))
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

      editorEngine.focused = false
    },
    [readOnly, state, editorEngine, onBlur, relayActor],
  )

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (onClick) {
        onClick(event)
      }

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        editorActor,
        editorEngine,
        event: event.nativeEvent,
      })

      if (position) {
        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'mouse.click',
            position,
          },
          editor: editorEngine,
          nativeEvent: event,
        })
      }

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      // Triple-click block selection and void-node click handling.
      if (
        DOMEditor.hasTarget(editorEngine, event.target) &&
        isDOMNode(event.target)
      ) {
        const path = getDomNodePath(event.target)

        if (!path) {
          return
        }

        // At this time, the engine document may be arbitrarily different,
        // because onClick handlers can change the document before we get here.
        // Therefore we must check that this path actually exists.
        const nodeClickEntry = getNode(editorEngine, path)

        if (!nodeClickEntry) {
          return
        }
        const node = nodeClickEntry.node

        if (event.detail === TRIPLE_CLICK && path.length >= 1) {
          let blockPath = path

          if (!isTextBlockNode({schema: editorEngine.schema}, node)) {
            const block = getAncestorTextBlock(editorEngine, path)

            blockPath = block?.path ?? path.slice(0, 1)
          }

          const range = editorRange(editorEngine, blockPath)
          editorEngine.select(range)
          return
        }

        if (readOnly) {
          return
        }

        const startPoint = editorStart(editorEngine, path)
        const endPoint = editorEnd(editorEngine, path)
        const startEntry = getNode(editorEngine, startPoint.path)
        const startVoidNode =
          startEntry &&
          isVoidNode(editorEngine, startEntry.node, startPoint.path)
            ? startEntry
            : getVoidAncestor(editorEngine, startPoint.path)
        const endEntry = getNode(editorEngine, endPoint.path)
        const endVoidNode =
          endEntry && isVoidNode(editorEngine, endEntry.node, endPoint.path)
            ? endEntry
            : getVoidAncestor(editorEngine, endPoint.path)

        if (
          startVoidNode &&
          endVoidNode &&
          pathEquals(startVoidNode.path, endVoidNode.path)
        ) {
          const range = editorRange(editorEngine, startPoint)
          editorEngine.select(range)
          return
        }
      }
    },
    [onClick, editorActor, editorEngine, readOnly],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // Consumer onKeyDown, hotkey routing, keyboard.keydown behavior event.
      if (props.onKeyDown) {
        props.onKeyDown(event)
      }

      if (!event.isDefaultPrevented()) {
        performHotkey({
          editorActor,
          editor: editorEngine,
          portableTextEditor,
          hotkeys: hotkeys ?? {},
          event,
        })
      }

      if (!event.isDefaultPrevented()) {
        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'keyboard.keydown',
            originEvent: {
              key: event.key,
              code: event.code,
              altKey: event.altKey,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              shiftKey: event.shiftKey,
            },
          },
          editor: editorEngine,
          nativeEvent: event,
        })
      }

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      // Native navigation hotkeys, IME composition tracking, and
      // Chrome/Safari void-node delete fallback.
      if (
        readOnly ||
        !DOMEditor.hasEditableTarget(editorEngine, event.target)
      ) {
        return
      }

      androidInputManagerRef.current?.handleKeyDown(event)

      const {nativeEvent} = event

      // COMPAT: The composition end event isn't fired reliably in all browsers,
      // so we sometimes might end up stuck in a composition state even though we
      // aren't composing any more.
      if (editorEngine.composing && nativeEvent.isComposing === false) {
        editorEngine.composing = false
      }

      if (editorEngine.composing) {
        return
      }

      const {selection} = editorEngine
      const blockSegment = selection !== null ? selection.focus.path[0]! : 0
      const elementText = getText(editorEngine, [blockSegment])
      const isRTL =
        elementText !== undefined && getDirection(elementText) === 'rtl'

      // COMPAT: Certain browsers don't handle the selection updates
      // properly. In Chrome, the selection isn't properly extended.
      // And in Firefox, the selection isn't properly collapsed.
      // (2017/10/17)
      if (Hotkeys.isMoveLineBackward(nativeEvent)) {
        event.preventDefault()
        move(editorEngine, {unit: 'line', reverse: true})
        return
      }

      if (Hotkeys.isMoveLineForward(nativeEvent)) {
        event.preventDefault()
        move(editorEngine, {unit: 'line'})
        return
      }

      if (Hotkeys.isExtendLineBackward(nativeEvent)) {
        event.preventDefault()
        move(editorEngine, {
          unit: 'line',
          edge: 'focus',
          reverse: true,
        })
        return
      }

      if (Hotkeys.isExtendLineForward(nativeEvent)) {
        event.preventDefault()
        move(editorEngine, {unit: 'line', edge: 'focus'})
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
          move(editorEngine, {reverse: !isRTL})
        } else {
          collapse(editorEngine, {
            edge: isRTL ? 'end' : 'start',
          })
        }

        return
      }

      if (Hotkeys.isMoveForward(nativeEvent)) {
        event.preventDefault()

        if (selection && isCollapsedRange(selection)) {
          move(editorEngine, {reverse: isRTL})
        } else {
          collapse(editorEngine, {
            edge: isRTL ? 'start' : 'end',
          })
        }

        return
      }

      if (Hotkeys.isMoveWordBackward(nativeEvent)) {
        event.preventDefault()

        if (selection && isExpandedRange(selection)) {
          collapse(editorEngine, {edge: 'focus'})
        }

        move(editorEngine, {
          unit: 'word',
          reverse: !isRTL,
        })
        return
      }

      if (Hotkeys.isMoveWordForward(nativeEvent)) {
        event.preventDefault()

        if (selection && isExpandedRange(selection)) {
          collapse(editorEngine, {edge: 'focus'})
        }

        move(editorEngine, {
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
            editor: editorEngine,
          })
          return
        }

        if (Hotkeys.isSplitBlock(nativeEvent)) {
          event.preventDefault()
          editorActor.send({
            type: 'behavior event',
            behaviorEvent: {type: 'insert.break'},
            editor: editorEngine,
          })
          return
        }

        if (Hotkeys.isDeleteBackward(nativeEvent)) {
          event.preventDefault()

          if (selection && isExpandedRange(selection)) {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete', direction: 'backward'},
              editor: editorEngine,
            })
          } else {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'character'},
              editor: editorEngine,
            })
          }

          return
        }

        if (Hotkeys.isDeleteForward(nativeEvent)) {
          event.preventDefault()

          if (selection && isExpandedRange(selection)) {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete', direction: 'forward'},
              editor: editorEngine,
            })
          } else {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'character'},
              editor: editorEngine,
            })
          }

          return
        }

        if (Hotkeys.isDeleteLineBackward(nativeEvent)) {
          event.preventDefault()

          if (selection && isExpandedRange(selection)) {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete', direction: 'backward'},
              editor: editorEngine,
            })
          } else {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'line'},
              editor: editorEngine,
            })
          }

          return
        }

        if (Hotkeys.isDeleteLineForward(nativeEvent)) {
          event.preventDefault()

          if (selection && isExpandedRange(selection)) {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete', direction: 'forward'},
              editor: editorEngine,
            })
          } else {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'line'},
              editor: editorEngine,
            })
          }

          return
        }

        if (Hotkeys.isDeleteWordBackward(nativeEvent)) {
          event.preventDefault()

          if (selection && isExpandedRange(selection)) {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete', direction: 'backward'},
              editor: editorEngine,
            })
          } else {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'word'},
              editor: editorEngine,
            })
          }

          return
        }

        if (Hotkeys.isDeleteWordForward(nativeEvent)) {
          event.preventDefault()

          if (selection && isExpandedRange(selection)) {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete', direction: 'forward'},
              editor: editorEngine,
            })
          } else {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'word'},
              editor: editorEngine,
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
              editorEngine,
              selection.anchor.path,
            )

            if (
              currentNodeEntry &&
              isVoidNode(
                editorEngine,
                currentNodeEntry.node,
                selection.anchor.path,
              )
            ) {
              event.preventDefault()
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {type: 'delete.backward', unit: 'block'},
                editor: editorEngine,
              })

              return
            }
          }
        }
      }
    },
    [props, hotkeys, editorActor, portableTextEditor, editorEngine, readOnly],
  )

  const handleKeyUp = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (props.onKeyUp) {
        props.onKeyUp(event)
      }
      if (!event.isDefaultPrevented()) {
        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'keyboard.keyup',
            originEvent: {
              key: event.key,
              code: event.code,
              altKey: event.altKey,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              shiftKey: event.shiftKey,
            },
          },
          editor: editorEngine,
          nativeEvent: event,
        })
      }
    },
    [props, editorActor, editorEngine],
  )

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (readOnly || !DOMEditor.hasTarget(editorEngine, event.target)) {
        return
      }

      onDragStart?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        editorActor,
        editorEngine,
        event: event.nativeEvent,
      })

      if (!position) {
        console.warn('Could not find position for dragstart event')
        return
      }

      editorActor.send({
        type: 'dragstart',
        origin: position,
      })

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'drag.dragstart',
          originEvent: {
            clientX: event.clientX,
            clientY: event.clientY,
            dataTransfer: event.dataTransfer,
          },
          position,
        },
        editor: editorEngine,
      })
    },
    [readOnly, onDragStart, editorActor, editorEngine],
  )

  const handleDrag = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDrag?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        editorActor,
        editorEngine,
        event: event.nativeEvent,
      })

      if (!position) {
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'drag.drag',
          originEvent: {
            dataTransfer: event.dataTransfer,
          },
        },
        editor: editorEngine,
      })
    },
    [onDrag, editorActor, editorEngine],
  )

  const handleDragEnd = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragEnd?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'drag.dragend',
          originEvent: {
            dataTransfer: event.dataTransfer,
          },
        },
        editor: editorEngine,
      })
    },
    [onDragEnd, editorActor, editorEngine],
  )

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragEnter?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        editorActor,
        editorEngine,
        event: event.nativeEvent,
      })

      if (!position) {
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'drag.dragenter',
          originEvent: {
            dataTransfer: event.dataTransfer,
          },
          position,
        },
        editor: editorEngine,
      })
    },
    [onDragEnter, editorActor, editorEngine],
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragOver?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        editorActor,
        editorEngine,
        event: event.nativeEvent,
      })

      if (!position) {
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'drag.dragover',
          originEvent: {
            dataTransfer: event.dataTransfer,
          },
          dragOrigin: editorActor.getSnapshot().context.internalDrag?.origin,
          position,
        },
        editor: editorEngine,
        nativeEvent: event,
      })
    },
    [onDragOver, editorActor, editorEngine],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDrop?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        editorActor,
        editorEngine,
        event: event.nativeEvent,
      })

      if (!position) {
        console.warn('Could not find position for drop event')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'drag.drop',
          originEvent: {
            dataTransfer: event.dataTransfer,
          },
          dragOrigin: editorActor.getSnapshot().context.internalDrag?.origin,
          position,
        },
        editor: editorEngine,
        nativeEvent: event,
      })
    },
    [onDrop, editorActor, editorEngine],
  )

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragLeave?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        editorActor,
        editorEngine,
        event: event.nativeEvent,
      })

      if (!position) {
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'drag.dragleave',
          originEvent: {
            dataTransfer: event.dataTransfer,
          },
        },
        editor: editorEngine,
      })
    },
    [onDragLeave, editorActor, editorEngine],
  )

  // Hoisted from the JSX so all hooks run unconditionally before any early
  // return.
  const handleReactBeforeInput = useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      // COMPAT: Certain browsers don't support the `beforeinput` event, so we
      // fall back to React's leaky polyfill instead just for it. It only
      // works for the `insertText` input type.
      if (
        !HAS_BEFORE_INPUT_SUPPORT &&
        !readOnly &&
        DOMEditor.hasSelectableTarget(editorEngine, event.target)
      ) {
        event.preventDefault()
        if (!editorEngine.composing) {
          const text = (event as any).data as string
          editorActor.send({
            type: 'behavior event',
            behaviorEvent: {type: 'insert.text', text},
            editor: editorEngine,
          })
        }
      }
    },
    [editorEngine, editorActor, readOnly],
  )

  const handleInput = useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
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
        !editorEngine.focused &&
        isDOMNode(event.target) &&
        DOMEditor.hasEditableTarget(editorEngine, event.target)
      ) {
        handleNativeHistoryEvents(
          editorEngine,
          editorActor,
          event.nativeEvent as InputEvent,
        )
      }
    },
    [editorEngine, editorActor],
  )

  const handleCompositionEnd = useCallback(
    (event: React.CompositionEvent<HTMLDivElement>) => {
      props.onCompositionEnd?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      if (isDOMEventTargetInput(event)) {
        return
      }
      if (DOMEditor.hasSelectableTarget(editorEngine, event.target)) {
        if (editorEngine.composing) {
          Promise.resolve().then(() => {
            editorEngine.composing = false
          })
        }

        androidInputManagerRef.current?.handleCompositionEnd(event)

        if (IS_ANDROID) {
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
          editorActor.send({
            type: 'behavior event',
            behaviorEvent: {
              type: 'insert.text',
              text: event.data,
            },
            editor: editorEngine,
          })
        }
      }
    },
    [editorEngine, editorActor, props],
  )

  const handleCompositionUpdate = useCallback(
    (event: React.CompositionEvent<HTMLDivElement>) => {
      props.onCompositionUpdate?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      if (
        DOMEditor.hasSelectableTarget(editorEngine, event.target) &&
        !isDOMEventTargetInput(event)
      ) {
        if (!editorEngine.composing) {
          editorEngine.composing = true
        }
      }
    },
    [editorEngine, props],
  )

  const handleCompositionStart = useCallback(
    (event: React.CompositionEvent<HTMLDivElement>) => {
      props.onCompositionStart?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      if (isDOMEventTargetInput(event)) {
        return
      }
      if (DOMEditor.hasSelectableTarget(editorEngine, event.target)) {
        androidInputManagerRef.current?.handleCompositionStart(event)

        if (IS_ANDROID) {
          return
        }

        const {selection} = editorEngine
        if (selection && isExpandedRange(selection)) {
          editorActor.send({
            type: 'behavior event',
            behaviorEvent: {type: 'delete', direction: 'forward'},
            editor: editorEngine,
          })
          return
        }
      }
    },
    [editorEngine, editorActor, props],
  )

  if (!portableTextEditor) {
    return null
  }

  if (hasInvalidValue) {
    return null
  }

  return (
    <SelectionStateProvider>
      <ReadOnlyContext.Provider value={readOnly}>
        <DecorateContext.Provider value={decorateContext}>
          <RestoreDOM node={ref} receivedUserInput={receivedUserInput}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: role is conditionally set to textbox when editable */}
            {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-multiline is conditionally set alongside textbox role */}
            <div
              role={readOnly ? undefined : 'textbox'}
              aria-multiline={readOnly ? undefined : true}
              translate="no"
              // Consumer-prop spread. Any handler the engine cares about must
              // be destructured at the top of this component AND invoked
              // explicitly inside the corresponding `handleX` callback (with
              // `event.isDefaultPrevented() || event.isPropagationStopped()`
              // controlling whether the engine fallback runs). Adding a
              // handler here without routing it through `handleX` would let
              // consumer props silently override the engine's DOM logic.
              {...restProps}
              data-read-only={readOnly}
              className={className || 'pt-editable'}
              // COMPAT: Certain browsers don't support the `beforeinput` event, so we'd
              // have to use hacks to make these replacement-based features work.
              // For SSR situations HAS_BEFORE_INPUT_SUPPORT is false and results in prop
              // mismatch warning app moves to browser. Pass-through consumer props when
              // not CAN_USE_DOM (SSR) and default to falsy value
              spellCheck={
                HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM ? spellCheck : false
              }
              autoCorrect={
                HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM ? autoCorrect : 'false'
              }
              autoCapitalize={
                HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM
                  ? autoCapitalize
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
              onBeforeInput={handleReactBeforeInput}
              onInput={handleInput}
              onBlur={handleBlur}
              onClick={handleClick}
              onCompositionEnd={handleCompositionEnd}
              onCompositionUpdate={handleCompositionUpdate}
              onCompositionStart={handleCompositionStart}
              onCopy={handleCopy}
              onCut={handleCut}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onPaste={handlePaste}
            >
              <Children
                decorations={decorations}
                node={editorEngine}
                path={[]}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                renderText={renderText}
              />
            </div>
          </RestoreDOM>
        </DecorateContext.Provider>
      </ReadOnlyContext.Provider>
    </SelectionStateProvider>
  )
})

PortableTextEditable.displayName = 'ForwardRef(PortableTextEditable)'

// ---- Module-level helpers ----

type DeferredOperation = () => void

const Children = (props: Parameters<typeof useChildren>[0]) => {
  const children = useChildren(props)
  return <React.Fragment>{children}</React.Fragment>
}

/**
 * A default memoized decorate function.
 */
const defaultDecorate: (entry: NodeEntry) => DecoratedRange[] = () => []

/**
 * A default implement to scroll dom range into view.
 */
const defaultScrollSelectionIntoView = (
  editorEngine: DOMEditor,
  domRange: DOMRange,
) => {
  // Scroll to the focus point of the selection, in case the selection is expanded
  const isBackward =
    !!editorEngine.selection &&
    isBackwardRange(editorEngine.selection, editorEngine)
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

const handleNativeHistoryEvents = (
  editorEngine: Editor,
  editorActor: EditorActor,
  event: InputEvent,
) => {
  if (event.inputType === 'historyUndo') {
    editorActor.send({
      type: 'behavior event',
      behaviorEvent: {type: 'history.undo'},
      editor: editorEngine,
    })
    return
  }
  if (event.inputType === 'historyRedo') {
    editorActor.send({
      type: 'behavior event',
      behaviorEvent: {type: 'history.redo'},
      editor: editorEngine,
    })
    return
  }
}

import {useSelector} from '@xstate/react'
import {isEqual, noop} from 'lodash'
import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type FocusEventHandler,
  type KeyboardEvent,
  type MutableRefObject,
  type TextareaHTMLAttributes,
} from 'react'
import {
  Editor,
  Path,
  Range as SlateRange,
  Transforms,
  type BaseRange,
  type NodeEntry,
  type Operation,
  type Text,
} from 'slate'
import {
  ReactEditor,
  Editable as SlateEditable,
  useSlate,
  type RenderElementProps,
  type RenderLeafProps,
} from 'slate-react'
import {getCompoundClientRect} from '../internal-utils/compound-client-rect'
import {debugWithName} from '../internal-utils/debug'
import {getDragSelection} from '../internal-utils/drag-selection'
import {getEventPosition} from '../internal-utils/event-position'
import {parseBlocks} from '../internal-utils/parse-blocks'
import {
  moveRangeByOperation,
  toPortableTextRange,
  toSlateRange,
} from '../internal-utils/ranges'
import {normalizeSelection} from '../internal-utils/selection'
import {getSelectionDomNodes} from '../internal-utils/selection-elements'
import {fromSlateValue, isEqualToEmptyEditor} from '../internal-utils/values'
import * as selectors from '../selectors'
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
import {isSelectionCollapsed} from '../utils'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {Element} from './components/Element'
import {Leaf} from './components/Leaf'
import {EditorActorContext} from './editor-actor-context'
import {getEditorSnapshot} from './editor-selector'
import {usePortableTextEditor} from './hooks/usePortableTextEditor'
import {createWithHotkeys} from './plugins/createWithHotKeys'
import {PortableTextEditor} from './PortableTextEditor'
import {withSyncRangeDecorations} from './withSyncRangeDecorations'

const debug = debugWithName('component:Editable')

const PLACEHOLDER_STYLE: CSSProperties = {
  position: 'absolute',
  userSelect: 'none',
  pointerEvents: 'none',
  left: 0,
  right: 0,
}

interface BaseRangeWithDecoration extends BaseRange {
  rangeDecoration: RangeDecoration
}

/**
 * @public
 */
export type PortableTextEditableProps = Omit<
  TextareaHTMLAttributes<HTMLDivElement>,
  'onPaste' | 'onCopy' | 'onBeforeInput'
> & {
  hotkeys?: HotkeyOptions
  onBeforeInput?: (event: InputEvent) => void
  onPaste?: OnPasteFn
  onCopy?: OnCopyFn
  ref: MutableRefObject<HTMLDivElement | null>
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
    spellCheck,
    ...restProps
  } = props

  const portableTextEditor = usePortableTextEditor()
  const ref = useRef<HTMLDivElement | null>(null)
  const [editableElement, setEditableElement] = useState<HTMLDivElement | null>(
    null,
  )
  const [hasInvalidValue, setHasInvalidValue] = useState(false)
  const [rangeDecorationState, setRangeDecorationsState] = useState<
    BaseRangeWithDecoration[]
  >([])

  // Forward ref to parent component
  useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
    forwardedRef,
    () => ref.current,
  )

  const rangeDecorationsRef = useRef(rangeDecorations)

  const editorActor = useContext(EditorActorContext)
  const readOnly = useSelector(editorActor, (s) =>
    s.matches({'edit mode': 'read only'}),
  )
  const schemaTypes = useSelector(editorActor, (s) => s.context.schema)
  const slateEditor = useSlate()

  const blockTypeName = schemaTypes.block.name

  // Output a minimal React editor inside Editable when in readOnly mode.
  // NOTE: make sure all the plugins used here can be safely run over again at any point.
  // There will be a problem if they redefine editor methods and then calling the original method within themselves.
  useMemo(() => {
    // React/UI-specific plugins
    if (readOnly) {
      debug('Editable is in read only mode')
      return slateEditor
    }
    const withHotKeys = createWithHotkeys(
      editorActor,
      portableTextEditor,
      hotkeys,
    )

    debug('Editable is in edit mode')
    return withHotKeys(slateEditor)
  }, [editorActor, hotkeys, portableTextEditor, readOnly, slateEditor])

  const renderElement = useCallback(
    (eProps: RenderElementProps) => (
      <Element
        {...eProps}
        readOnly={readOnly}
        renderBlock={renderBlock}
        renderChild={renderChild}
        renderListItem={renderListItem}
        renderStyle={renderStyle}
        schemaTypes={schemaTypes}
        spellCheck={spellCheck}
      />
    ),
    [
      schemaTypes,
      spellCheck,
      readOnly,
      renderBlock,
      renderChild,
      renderListItem,
      renderStyle,
    ],
  )

  const renderLeaf = useCallback(
    (
      lProps: RenderLeafProps & {
        leaf: Text & {placeholder?: boolean; rangeDecoration?: RangeDecoration}
      },
    ) => {
      if (lProps.leaf._type === 'span') {
        let rendered = (
          <Leaf
            {...lProps}
            editorActor={editorActor}
            schemaTypes={schemaTypes}
            renderAnnotation={renderAnnotation}
            renderChild={renderChild}
            renderDecorator={renderDecorator}
            readOnly={readOnly}
          />
        )
        if (
          renderPlaceholder &&
          lProps.leaf.placeholder &&
          lProps.text.text === ''
        ) {
          return (
            <>
              <span style={PLACEHOLDER_STYLE} contentEditable={false}>
                {renderPlaceholder()}
              </span>
              {rendered}
            </>
          )
        }
        const decoration = lProps.leaf.rangeDecoration
        if (decoration) {
          rendered = decoration.component({children: rendered})
        }
        return rendered
      }
      return lProps.children
    },
    [
      editorActor,
      readOnly,
      renderAnnotation,
      renderChild,
      renderDecorator,
      renderPlaceholder,
      schemaTypes,
    ],
  )

  const restoreSelectionFromProps = useCallback(() => {
    if (propsSelection) {
      debug(`Selection from props ${JSON.stringify(propsSelection)}`)
      const normalizedSelection = normalizeSelection(
        propsSelection,
        fromSlateValue(slateEditor.children, blockTypeName),
      )
      if (normalizedSelection !== null) {
        debug(
          `Normalized selection from props ${JSON.stringify(normalizedSelection)}`,
        )
        const slateRange = toSlateRange(normalizedSelection, slateEditor)
        if (slateRange) {
          Transforms.select(slateEditor, slateRange)
          // Output selection here in those cases where the editor selection was the same, and there are no set_selection operations made.
          // The selection is usually automatically emitted to change$ by the withPortableTextSelections plugin whenever there is a set_selection operation applied.
          if (!slateEditor.operations.some((o) => o.type === 'set_selection')) {
            editorActor.send({
              type: 'notify.selection',
              selection: normalizedSelection,
            })
          }
          slateEditor.onChange()
        }
      }
    }
  }, [blockTypeName, editorActor, propsSelection, slateEditor])

  const syncRangeDecorations = useCallback(
    (operation?: Operation) => {
      if (rangeDecorations && rangeDecorations.length > 0) {
        const newSlateRanges: BaseRangeWithDecoration[] = []
        rangeDecorations.forEach((rangeDecorationItem) => {
          const slateRange = toSlateRange(
            rangeDecorationItem.selection,
            slateEditor,
          )
          if (!SlateRange.isRange(slateRange)) {
            if (rangeDecorationItem.onMoved) {
              rangeDecorationItem.onMoved({
                newSelection: null,
                rangeDecoration: rangeDecorationItem,
                origin: 'local',
              })
            }
            return
          }
          let newRange: BaseRange | null | undefined
          if (operation) {
            newRange = moveRangeByOperation(slateRange, operation)
            if (
              (newRange && newRange !== slateRange) ||
              (newRange === null && slateRange)
            ) {
              const value = PortableTextEditor.getValue(portableTextEditor)
              const newRangeSelection = toPortableTextRange(
                value,
                newRange,
                schemaTypes,
              )
              if (rangeDecorationItem.onMoved) {
                rangeDecorationItem.onMoved({
                  newSelection: newRangeSelection,
                  rangeDecoration: rangeDecorationItem,
                  origin: 'local',
                })
              }
            }
          }
          // If the newRange is null, it means that the range is not valid anymore and should be removed
          // If it's undefined, it means that the slateRange is still valid and should be kept
          if (newRange !== null) {
            newSlateRanges.push({
              ...(newRange || slateRange),
              rangeDecoration: rangeDecorationItem,
            })
          }
        })
        if (newSlateRanges.length > 0) {
          setRangeDecorationsState(newSlateRanges)
          return
        }
      }
      setRangeDecorationsState((rangeDecorationState) => {
        // If there's state then we want to reset
        if (rangeDecorationState.length > 0) {
          return []
        }
        // Otherwise we no-op, React will skip a state update if what we return has reference equality to the previous state
        return rangeDecorationState
      })
    },
    [portableTextEditor, rangeDecorations, schemaTypes, slateEditor],
  )

  // Restore selection from props when the editor has been initialized properly with it's value
  useEffect(() => {
    const onReady = editorActor.on('ready', () => {
      syncRangeDecorations()
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
  }, [editorActor, restoreSelectionFromProps, syncRangeDecorations])

  // Restore selection from props when it changes
  useEffect(() => {
    if (propsSelection && !hasInvalidValue) {
      restoreSelectionFromProps()
    }
  }, [hasInvalidValue, propsSelection, restoreSelectionFromProps])

  const [syncedRangeDecorations, setSyncedRangeDecorations] = useState(false)
  useEffect(() => {
    if (!syncedRangeDecorations) {
      // We only want this to run once, on mount
      setSyncedRangeDecorations(true)
      syncRangeDecorations()
    }
  }, [syncRangeDecorations, syncedRangeDecorations])

  useEffect(() => {
    if (!isEqual(rangeDecorations, rangeDecorationsRef.current)) {
      syncRangeDecorations()
    }
    rangeDecorationsRef.current = rangeDecorations
  }, [rangeDecorations, syncRangeDecorations])

  // Sync range decorations after an operation is applied
  useEffect(() => {
    const teardown = withSyncRangeDecorations({
      editorActor,
      slateEditor,
      syncRangeDecorations,
    })
    return () => teardown()
  }, [editorActor, slateEditor, syncRangeDecorations])

  // Handle from props onCopy function
  const handleCopy = useCallback(
    (event: ClipboardEvent<HTMLDivElement>): void | ReactEditor => {
      if (onCopy) {
        const result = onCopy(event)
        // CopyFn may return something to avoid doing default stuff
        if (result !== undefined) {
          event.preventDefault()
        }
      } else if (event.nativeEvent.clipboardData) {
        // Prevent Slate from handling the event
        event.stopPropagation()
        event.preventDefault()

        const selection = editorActor.getSnapshot().context.selection
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
          editor: slateEditor,
          nativeEvent: event,
        })
      }
    },
    [onCopy, editorActor, slateEditor],
  )

  const handleCut = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (onCut) {
        const result = onCut(event)
        // CutFn may return something to avoid doing default stuff
        if (result !== undefined) {
          event.preventDefault()
        }
      } else if (event.nativeEvent.clipboardData) {
        // Prevent Slate from handling the event
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
          editor: slateEditor,
          nativeEvent: event,
        })
      }
    },
    [onCut, editorActor, slateEditor],
  )

  // Handle incoming pasting events in the editor
  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>): Promise<void> | void => {
      const value = PortableTextEditor.getValue(portableTextEditor)
      const ptRange = toPortableTextRange(
        value,
        slateEditor.selection,
        schemaTypes,
      )
      const path = ptRange?.focus.path || []
      const onPasteResult = onPaste?.({event, value, path, schemaTypes})

      if (onPasteResult || !slateEditor.selection) {
        event.preventDefault()

        // Resolve it as promise (can be either async promise or sync return value)
        editorActor.send({type: 'notify.loading'})

        Promise.resolve(onPasteResult)
          .then((result) => {
            debug('Custom paste function from client resolved', result)

            if (!result || !result.insert) {
              debug('No result from custom paste handler, pasting normally')

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
                editor: slateEditor,
                nativeEvent: event,
              })
            } else if (result.insert) {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {
                  type: 'insert.blocks',
                  blocks: parseBlocks({
                    context: {
                      keyGenerator:
                        editorActor.getSnapshot().context.keyGenerator,
                      schema: editorActor.getSnapshot().context.schema,
                    },
                    blocks: result.insert,
                    options: {
                      refreshKeys: true,
                    },
                  }),
                  placement: 'auto',
                },
                editor: slateEditor,
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
            editorActor.send({type: 'notify.done loading'})
          })
      } else if (event.nativeEvent.clipboardData) {
        // Prevent Slate from handling the event
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
          editor: slateEditor,
          nativeEvent: event,
        })
      }

      debug('No result from custom paste handler, pasting normally')
    },
    [editorActor, onPaste, portableTextEditor, schemaTypes, slateEditor],
  )

  const handleOnFocus: FocusEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (onFocus) {
        onFocus(event)
      }
      if (!event.isDefaultPrevented()) {
        const selection = PortableTextEditor.getSelection(portableTextEditor)
        // Create an editor selection if it does'nt exist
        if (selection === null) {
          Transforms.select(slateEditor, Editor.start(slateEditor, []))
          slateEditor.onChange()
        }
        editorActor.send({type: 'notify.focused', event})
        const newSelection = PortableTextEditor.getSelection(portableTextEditor)
        // If the selection is the same, emit it explicitly here as there is no actual onChange event triggered.
        if (selection === newSelection) {
          editorActor.send({
            type: 'notify.selection',
            selection,
          })
        }
      }
    },
    [editorActor, onFocus, portableTextEditor, slateEditor],
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
        schema: editorActor.getSnapshot().context.schema,
        slateEditor,
        event: event.nativeEvent,
      })

      if (!position) {
        console.warn('Could not find EventPosition for MouseEvent')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'mouse.click',
          position,
        },
        editor: slateEditor,
        nativeEvent: event,
      })
    },
    [onClick, editorActor, slateEditor],
  )

  const handleOnBlur: FocusEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (onBlur) {
        onBlur(event)
      }
      if (!event.isPropagationStopped()) {
        editorActor.send({type: 'notify.blurred', event})
      }
    },
    [editorActor, onBlur],
  )

  const handleOnBeforeInput = useCallback(
    (event: InputEvent) => {
      if (onBeforeInput) {
        onBeforeInput(event)
      }
    },
    [onBeforeInput],
  )

  // This function will handle unexpected DOM changes inside the Editable rendering,
  // and make sure that we can maintain a stable slateEditor.selection when that happens.
  //
  // For example, if this Editable is rendered inside something that might re-render
  // this component (hidden contexts) while the user is still actively changing the
  // contentEditable, this could interfere with the intermediate DOM selection,
  // which again could be picked up by ReactEditor's event listeners.
  // If that range is invalid at that point, the slate.editorSelection could be
  // set either wrong, or invalid, to which slateEditor will throw exceptions
  // that are impossible to recover properly from or result in a wrong selection.
  //
  // Also the other way around, when the ReactEditor will try to create a DOM Range
  // from the current slateEditor.selection, it may throw unrecoverable errors
  // if the current editor.selection is invalid according to the DOM.
  // If this is the case, default to selecting the top of the document, if the
  // user already had a selection.
  const validateSelection = useCallback(() => {
    if (!slateEditor.selection) {
      return
    }
    const root = ReactEditor.findDocumentOrShadowRoot(slateEditor)
    const {activeElement} = root
    // Return if the editor isn't the active element
    if (ref.current !== activeElement) {
      return
    }
    const window = ReactEditor.getWindow(slateEditor)
    const domSelection = window.getSelection()
    if (!domSelection || domSelection.rangeCount === 0) {
      return
    }
    const existingDOMRange = domSelection.getRangeAt(0)
    try {
      const newDOMRange = ReactEditor.toDOMRange(
        slateEditor,
        slateEditor.selection,
      )
      if (
        newDOMRange.startOffset !== existingDOMRange.startOffset ||
        newDOMRange.endOffset !== existingDOMRange.endOffset
      ) {
        debug('DOM range out of sync, validating selection')
        // Remove all ranges temporary
        domSelection?.removeAllRanges()
        // Set the correct range
        domSelection.addRange(newDOMRange)
      }
    } catch {
      debug(`Could not resolve selection, selecting top document`)
      // Deselect the editor
      Transforms.deselect(slateEditor)
      // Select top document if there is a top block to select
      if (slateEditor.children.length > 0) {
        Transforms.select(slateEditor, [0, 0])
      }
      slateEditor.onChange()
    }
  }, [ref, slateEditor])

  // Observe mutations (child list and subtree) to this component's DOM,
  // and make sure the editor selection is valid when that happens.
  useEffect(() => {
    if (editableElement) {
      const mutationObserver = new MutationObserver(validateSelection)
      mutationObserver.observe(editableElement, {
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
  }, [validateSelection, editableElement])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (props.onKeyDown) {
        props.onKeyDown(event)
      }
      if (!event.isDefaultPrevented()) {
        slateEditor.pteWithHotKeys(event)
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
          editor: slateEditor,
          nativeEvent: event,
        })
      }
    },
    [props, editorActor, slateEditor],
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
          editor: slateEditor,
          nativeEvent: event,
        })
      }
    },
    [props, editorActor, slateEditor],
  )

  const scrollSelectionIntoViewToSlate = useMemo(() => {
    // Use slate-react default scroll into view
    if (scrollSelectionIntoView === undefined) {
      return undefined
    }
    // Disable scroll into view totally
    if (scrollSelectionIntoView === null) {
      return noop
    }
    // Translate PortableTextEditor prop fn to Slate plugin fn
    return (_editor: ReactEditor, domRange: Range) => {
      scrollSelectionIntoView(portableTextEditor, domRange)
    }
  }, [portableTextEditor, scrollSelectionIntoView])

  const decorate: (entry: NodeEntry) => BaseRange[] = useCallback(
    ([, path]) => {
      if (isEqualToEmptyEditor(slateEditor.children, schemaTypes)) {
        return [
          {
            anchor: {
              path: [0, 0],
              offset: 0,
            },
            focus: {
              path: [0, 0],
              offset: 0,
            },
            placeholder: true,
          },
        ]
      }
      // Editor node has a path length of 0 (should never be decorated)
      if (path.length === 0) {
        return []
      }
      const result = rangeDecorationState.filter((item) => {
        // Special case in order to only return one decoration for collapsed ranges
        if (SlateRange.isCollapsed(item)) {
          // Collapsed ranges should only be decorated if they are on a block child level (length 2)
          if (path.length !== 2) {
            return false
          }
          return (
            Path.equals(item.focus.path, path) &&
            Path.equals(item.anchor.path, path)
          )
        }
        // Include decorations that either include or intersects with this path
        return (
          SlateRange.intersection(item, {
            anchor: {path, offset: 0},
            focus: {path, offset: 0},
          }) || SlateRange.includes(item, path)
        )
      })
      if (result.length > 0) {
        return result
      }
      return []
    },
    [slateEditor, schemaTypes, rangeDecorationState],
  )

  // Set the forwarded ref to be the Slate editable DOM element
  // Also set the editable element in a state so that the MutationObserver
  // is setup when this element is ready.
  useEffect(() => {
    ref.current = ReactEditor.toDOMNode(
      slateEditor,
      slateEditor,
    ) as HTMLDivElement | null
    setEditableElement(ref.current)
  }, [slateEditor, ref])

  useEffect(() => {
    const window = ReactEditor.getWindow(slateEditor)

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
  }, [slateEditor, editorActor])

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragStart?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        schema: editorActor.getSnapshot().context.schema,
        slateEditor,
        event: event.nativeEvent,
      })

      if (!position) {
        console.warn('Could not find position for dragstart event')
        return
      }

      const snapshot = getEditorSnapshot({
        editorActorSnapshot: editorActor.getSnapshot(),
        slateEditorInstance: slateEditor,
      })
      const dragSelection = getDragSelection({
        eventSelection: position.selection,
        snapshot,
      })

      const selectingEntireBlocks = selectors.isSelectingEntireBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection,
        },
      })

      const dragGhost = document.createElement('div')

      const draggedDomNodes = getSelectionDomNodes({
        snapshot: {
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: dragSelection,
          },
        },
        slateEditor,
      })

      if (selectingEntireBlocks) {
        // Clone the DOM Nodes so they won't be visually clipped by scroll-containers etc.
        const clonedBlockNodes = draggedDomNodes.blockNodes.map((node) =>
          node.cloneNode(true),
        )

        for (const block of clonedBlockNodes) {
          if (block instanceof HTMLElement) {
            block.style.position = 'relative'
          }
          dragGhost.appendChild(block)
        }

        // A custom drag ghost element can be configured using this data attribute
        const customGhost = dragGhost.querySelector(
          '[data-pt-drag-ghost-element]',
        )
        if (customGhost) {
          dragGhost.replaceChildren(customGhost)
        }

        // Setting the `data-dragged` attribute so the consumer can style the element while it’s dragged
        dragGhost.setAttribute('data-dragged', '')

        dragGhost.style.position = 'absolute'
        dragGhost.style.left = '-99999px'
        dragGhost.style.boxSizing = 'border-box'
        document.body.appendChild(dragGhost)

        if (customGhost) {
          const customGhostRect = customGhost.getBoundingClientRect()
          const x = event.clientX - customGhostRect.left
          const y = event.clientY - customGhostRect.top
          dragGhost.style.width = `${customGhostRect.width}px`
          dragGhost.style.height = `${customGhostRect.height}px`
          event.dataTransfer.setDragImage(dragGhost, x, y)
        } else {
          const blocksDomRect = getCompoundClientRect(
            draggedDomNodes.blockNodes,
          )
          const x = event.clientX - blocksDomRect.left
          const y = event.clientY - blocksDomRect.top
          dragGhost.style.width = `${blocksDomRect.width}px`
          dragGhost.style.height = `${blocksDomRect.height}px`
          event.dataTransfer.setDragImage(dragGhost, x, y)
        }
      } else {
        const clonedChildNodes = draggedDomNodes.childNodes.map((node) =>
          node.cloneNode(true),
        )

        for (const child of clonedChildNodes) {
          dragGhost.appendChild(child)
        }

        dragGhost.style.position = 'absolute'
        dragGhost.style.left = '-99999px'
        dragGhost.style.boxSizing = 'border-box'
        document.body.appendChild(dragGhost)

        const childrenDomRect = getCompoundClientRect(
          draggedDomNodes.childNodes,
        )
        const x = event.clientX - childrenDomRect.left
        const y = event.clientY - childrenDomRect.top
        dragGhost.style.width = `${childrenDomRect.width}px`
        dragGhost.style.height = `${childrenDomRect.height}px`

        event.dataTransfer.setDragImage(dragGhost, x, y)
      }

      // Select drag selection
      // If the selection is expanded then we just select the end of the
      // selection
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'select',
          selection: isSelectionCollapsed(dragSelection)
            ? dragSelection
            : {
                anchor: getSelectionEndPoint(dragSelection),
                focus: getSelectionEndPoint(dragSelection),
                backward: false,
              },
        },
        editor: slateEditor,
      })

      editorActor.send({
        type: 'dragstart',
        origin: {
          selection: dragSelection,
        },
        ghost: dragGhost,
      })

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'drag.dragstart',
          originEvent: {
            dataTransfer: event.dataTransfer,
          },
          position: {
            selection: dragSelection,
          },
        },
        editor: slateEditor,
      })

      // Prevent Slate from handling the event
      return true
    },
    [onDragStart, editorActor, slateEditor],
  )

  const handleDrag = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDrag?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        schema: editorActor.getSnapshot().context.schema,
        slateEditor,
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
        editor: slateEditor,
      })

      // Prevent Slate from handling the event
      return true
    },
    [onDrag, editorActor, slateEditor],
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
        editor: slateEditor,
      })

      // Prevent Slate from handling the event
      return true
    },
    [onDragEnd, editorActor, slateEditor],
  )

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragEnter?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        schema: editorActor.getSnapshot().context.schema,
        slateEditor,
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
        editor: slateEditor,
      })

      // Prevent Slate from handling the event
      return true
    },
    [onDragEnter, editorActor, slateEditor],
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragOver?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        schema: editorActor.getSnapshot().context.schema,
        slateEditor,
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
          position,
        },
        editor: slateEditor,
        nativeEvent: event,
      })

      // Prevent Slate from handling the event
      return true
    },
    [onDragOver, editorActor, slateEditor],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDrop?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        schema: editorActor.getSnapshot().context.schema,
        slateEditor,
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
          position,
        },
        editor: slateEditor,
        nativeEvent: event,
      })

      // Prevent Slate from handling the event
      return true
    },
    [onDrop, editorActor, slateEditor],
  )

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragLeave?.(event)

      if (event.isDefaultPrevented() || event.isPropagationStopped()) {
        return
      }

      const position = getEventPosition({
        schema: editorActor.getSnapshot().context.schema,
        slateEditor,
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
        editor: slateEditor,
      })

      // Prevent Slate from handling the event
      return true
    },
    [onDragLeave, editorActor, slateEditor],
  )

  if (!portableTextEditor) {
    return null
  }

  return hasInvalidValue ? null : (
    <SlateEditable
      {...restProps}
      autoFocus={false}
      className={restProps.className || 'pt-editable'}
      decorate={decorate}
      onBlur={handleOnBlur}
      onCopy={handleCopy}
      onCut={handleCut}
      onClick={handleClick}
      onDOMBeforeInput={handleOnBeforeInput}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      onFocus={handleOnFocus}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onPaste={handlePaste}
      readOnly={readOnly}
      // We have implemented our own placeholder logic with decorations.
      // This 'renderPlaceholder' should not be used.
      renderPlaceholder={undefined}
      renderElement={renderElement}
      renderLeaf={renderLeaf}
      scrollSelectionIntoView={scrollSelectionIntoViewToSlate}
    />
  )
})

PortableTextEditable.displayName = 'ForwardRef(PortableTextEditable)'

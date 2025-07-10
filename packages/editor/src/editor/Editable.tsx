import {useActorRef, useSelector} from '@xstate/react'
import {noop} from 'lodash'
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
  type FocusEventHandler,
  type KeyboardEvent,
  type MutableRefObject,
  type TextareaHTMLAttributes,
} from 'react'
import {Editor, Transforms, type Text} from 'slate'
import {
  ReactEditor,
  Editable as SlateEditable,
  useSlate,
  type RenderElementProps,
  type RenderLeafProps,
} from 'slate-react'
import {debugWithName} from '../internal-utils/debug'
import {getEventPosition} from '../internal-utils/event-position'
import {parseBlocks} from '../internal-utils/parse-blocks'
import {normalizeSelection} from '../internal-utils/selection'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {fromSlateValue, isEqualToEmptyEditor} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
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
import {RenderElement} from './components/render-element'
import {RenderLeaf} from './components/render-leaf'
import {RenderText, type RenderTextProps} from './components/render-text'
import {EditorActorContext} from './editor-actor-context'
import {usePortableTextEditor} from './hooks/usePortableTextEditor'
import {createWithHotkeys} from './plugins/createWithHotKeys'
import {rangeDecorationsMachine} from './range-decorations-machine'
import {RelayActorContext} from './relay-actor-context'

const debug = debugWithName('component:Editable')

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

  // Forward ref to parent component
  useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
    forwardedRef,
    () => ref.current,
  )

  const editorActor = useContext(EditorActorContext)
  const relayActor = useContext(RelayActorContext)
  const readOnly = useSelector(editorActor, (s) =>
    s.matches({'edit mode': 'read only'}),
  )
  const slateEditor = useSlate()

  const rangeDecorationsActor = useActorRef(rangeDecorationsMachine, {
    input: {
      rangeDecorations: rangeDecorations ?? [],
      readOnly,
      schema: editorActor.getSnapshot().context.schema,
      slateEditor,
      skipSetup: !editorActor.getSnapshot().matches({setup: 'setting up'}),
    },
  })
  const decorate = useSelector(
    rangeDecorationsActor,
    (s) => s.context.decorate?.fn,
  )

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

  // Output a minimal React editor inside Editable when in readOnly mode.
  // NOTE: make sure all the plugins used here can be safely run over again at any point.
  // There will be a problem if they redefine editor methods and then calling the original method within themselves.
  useMemo(() => {
    // React/UI-specific plugins
    if (readOnly) {
      return slateEditor
    }
    const withHotKeys = createWithHotkeys(
      editorActor,
      portableTextEditor,
      hotkeys,
    )

    return withHotKeys(slateEditor)
  }, [editorActor, hotkeys, portableTextEditor, readOnly, slateEditor])

  const renderElement = useCallback(
    (eProps: RenderElementProps) => (
      <RenderElement
        {...eProps}
        readOnly={readOnly}
        renderBlock={renderBlock}
        renderChild={renderChild}
        renderListItem={renderListItem}
        renderStyle={renderStyle}
        spellCheck={spellCheck}
      />
    ),
    [
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
      leafProps: RenderLeafProps & {
        leaf: Text & {placeholder?: boolean; rangeDecoration?: RangeDecoration}
      },
    ) => (
      <RenderLeaf
        {...leafProps}
        readOnly={readOnly}
        renderAnnotation={renderAnnotation}
        renderChild={renderChild}
        renderDecorator={renderDecorator}
        renderPlaceholder={renderPlaceholder}
      />
    ),
    [
      readOnly,
      renderAnnotation,
      renderChild,
      renderDecorator,
      renderPlaceholder,
    ],
  )

  const renderText = useCallback(
    (props: RenderTextProps) => <RenderText {...props} />,
    [],
  )

  const restoreSelectionFromProps = useCallback(() => {
    if (propsSelection) {
      debug(`Selection from props ${JSON.stringify(propsSelection)}`)
      const normalizedSelection = normalizeSelection(
        propsSelection,
        fromSlateValue(
          slateEditor.children,
          editorActor.getSnapshot().context.schema.block.name,
        ),
      )
      if (normalizedSelection !== null) {
        debug(
          `Normalized selection from props ${JSON.stringify(normalizedSelection)}`,
        )
        const slateRange = toSlateRange({
          context: {
            schema: editorActor.getSnapshot().context.schema,
            value: slateEditor.value,
            selection: normalizedSelection,
          },
          blockIndexMap: slateEditor.blockIndexMap,
        })
        if (slateRange) {
          Transforms.select(slateEditor, slateRange)
          // Output selection here in those cases where the editor selection was the same, and there are no set_selection operations made.
          // The selection is usually automatically emitted to change$ by the withPortableTextSelections plugin whenever there is a set_selection operation applied.
          if (!slateEditor.operations.some((o) => o.type === 'set_selection')) {
            editorActor.send({
              type: 'update selection',
              selection: normalizedSelection,
            })
          }
          slateEditor.onChange()
        }
      }
    }
  }, [editorActor, propsSelection, slateEditor])

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

        const selection = slateEditor.selection
          ? slateRangeToSelection({
              schema: editorActor.getSnapshot().context.schema,
              editor: slateEditor,
              range: slateEditor.selection,
            })
          : undefined
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
      const value = fromSlateValue(
        slateEditor.children,
        editorActor.getSnapshot().context.schema.block.name,
        KEY_TO_VALUE_ELEMENT.get(slateEditor),
      )
      const ptRange = slateEditor.selection
        ? slateRangeToSelection({
            schema: editorActor.getSnapshot().context.schema,
            editor: slateEditor,
            range: slateEditor.selection,
          })
        : null
      const path = ptRange?.focus.path || []
      const onPasteResult = onPaste?.({
        event,
        value,
        path,
        schemaTypes: portableTextEditor.schemaTypes,
      })

      if (onPasteResult || !slateEditor.selection) {
        event.preventDefault()

        // Resolve it as promise (can be either async promise or sync return value)
        relayActor.send({type: 'loading'})

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
                      validateFields: true,
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
            relayActor.send({type: 'done loading'})
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
    [editorActor, onPaste, portableTextEditor, relayActor, slateEditor],
  )

  const handleOnFocus: FocusEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (onFocus) {
        onFocus(event)
      }

      if (!event.isDefaultPrevented()) {
        relayActor.send({type: 'focused', event})

        if (
          !slateEditor.selection &&
          isEqualToEmptyEditor(
            slateEditor.children,
            editorActor.getSnapshot().context.schema,
          )
        ) {
          Transforms.select(slateEditor, Editor.start(slateEditor, []))
          slateEditor.onChange()
        }
      }
    },
    [editorActor, onFocus, relayActor, slateEditor],
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
        slateEditor,
        event: event.nativeEvent,
      })

      if (position) {
        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'mouse.click',
            position,
          },
          editor: slateEditor,
          nativeEvent: event,
        })
      }
    },
    [onClick, editorActor, slateEditor],
  )

  const handleOnBlur: FocusEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (onBlur) {
        onBlur(event)
      }
      if (!event.isPropagationStopped()) {
        relayActor.send({type: 'blurred', event})
      }
    },
    [relayActor, onBlur],
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
        editorActor,
        slateEditor,
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
        editorActor,
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
        editorActor,
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
        editorActor,
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
          dragOrigin: editorActor.getSnapshot().context.internalDrag?.origin,
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
        editorActor,
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
          dragOrigin: editorActor.getSnapshot().context.internalDrag?.origin,
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
        editorActor,
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
      data-read-only={readOnly}
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
      renderText={renderText}
      scrollSelectionIntoView={scrollSelectionIntoViewToSlate}
    />
  )
})

PortableTextEditable.displayName = 'ForwardRef(PortableTextEditable)'

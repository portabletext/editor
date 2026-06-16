import type {PortableTextSpan} from '@portabletext/schema'
import {useActorRef, useSelector} from '@xstate/react'
import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ClipboardEvent,
  type FocusEventHandler,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from 'react'
import {DOMEditor} from '../engine/dom/plugin/dom-editor'
import {start} from '../engine/editor/start'
import {
  Editable as EngineEditable,
  type RenderElementProps,
  type RenderLeafProps,
} from '../engine/react/components/editable'
import {useEngine} from '../engine/react/hooks/use-engine'
import {resolveSelection} from '../internal-utils/apply-selection'
import {debug} from '../internal-utils/debug'
import {getEventPosition} from '../internal-utils/event-position'
import {safeStringify} from '../internal-utils/safe-json'
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
import {DropPositionStateProvider} from './drop-position-state-context'
import {EditorActorContext} from './editor-actor-context'
import {performHotkey} from './perform-hotkey'
import {rangeDecorationsMachine} from './range-decorations-machine'
import {RelayContext} from './relay-context'
import {RenderElement} from './render.element'
import {RenderLeaf} from './render.leaf'
import {RenderText, type RenderTextProps} from './render.text'
import {SelectionStateProvider} from './selection-state-context'
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
    ...restProps
  } = props

  const portableTextEditor = usePortableTextEditor()
  const [hasInvalidValue, setHasInvalidValue] = useState(false)

  const editorActor = useContext(EditorActorContext)
  const relay = useContext(RelayContext)
  const editorEngine = useEngine()
  const schema = editorEngine.snapshot.context.schema
  const readOnly = useSelector(editorActor, (s) =>
    s.matches({'edit mode': 'read only'}),
  )
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
        legacy={legacy}
        readOnly={readOnly}
        schema={schema}
      />
    ),
    [schema, readOnly, legacy],
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
    (props: RenderTextProps) => <RenderText {...props} />,
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
        // Output selection here in those cases where the editor selection was the same, and there are no set.selection operations made.
        // The selection is usually automatically emitted by the withPortableTextSelections plugin whenever there is a set.selection operation applied.
        if (!editorEngine.operations.some((o) => o.type === 'set.selection')) {
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

  // Handle from props onCopy function
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

        const selection = editorEngine.snapshot.context.selection ?? undefined
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

        const selection = editorEngine.snapshot.context.selection
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

  // Handle incoming pasting events in the editor
  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>): Promise<void> | void => {
      const value = editorEngine.snapshot.context.value
      const ptRange = editorEngine.snapshot.context.selection
      const path = ptRange?.focus.path || []
      const onPasteResult = onPaste?.({
        event,
        value,
        path,
        schemaTypes: portableTextEditor.schemaTypes,
      })

      if (onPasteResult || !editorEngine.snapshot.context.selection) {
        event.preventDefault()

        // Resolve it as promise (can be either async promise or sync return value)
        relay.send({type: 'loading'})

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

              const selection = editorEngine.snapshot.context.selection
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
                    keyGenerator: editorEngine.snapshot.context.keyGenerator,
                    schema: editorEngine.snapshot.context.schema,
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
            relay.send({type: 'done loading'})
          })
      } else if (event.nativeEvent.clipboardData) {
        // Prevent the engine from handling the event
        event.preventDefault()
        event.stopPropagation()

        const selection = editorEngine.snapshot.context.selection
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

      debug.behaviors('No result from custom paste handler, pasting normally')
    },
    [editorActor, onPaste, portableTextEditor, relay, editorEngine],
  )

  const handleOnFocus: FocusEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (onFocus) {
        onFocus(event)
      }

      if (!event.isDefaultPrevented()) {
        relay.send({type: 'focused', event})

        if (
          !editorEngine.snapshot.context.selection &&
          editorEngine.snapshot.context.value.length === 1 &&
          isEmptyTextBlock(
            editorEngine.snapshot.context,
            editorEngine.snapshot.context.value.at(0),
          )
        ) {
          editorEngine.select(start(editorEngine, []))
          editorEngine.onChange()
        }
      }
    },
    [onFocus, relay, editorEngine],
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
    },
    [onClick, editorActor, editorEngine],
  )

  const handleOnBlur: FocusEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (onBlur) {
        onBlur(event)
      }
      if (!event.isPropagationStopped()) {
        relay.send({type: 'blurred', event})
      }
    },
    [relay, onBlur],
  )

  const handleOnBeforeInput = useCallback(
    (event: InputEvent) => {
      if (onBeforeInput) {
        onBeforeInput(event)
      }
    },
    [onBeforeInput],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
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
    },
    [props, hotkeys, editorActor, portableTextEditor, editorEngine],
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

  const scrollSelectionIntoViewToEngine = useMemo(() => {
    // Use the engine's default scroll-into-view
    if (scrollSelectionIntoView === undefined) {
      return undefined
    }
    // Disable scroll into view totally
    if (scrollSelectionIntoView === null) {
      return noop
    }
    // Translate PortableTextEditor prop fn to an engine plugin fn
    return (_editor: DOMEditor, domRange: Range) => {
      scrollSelectionIntoView(portableTextEditor, domRange)
    }
  }, [portableTextEditor, scrollSelectionIntoView])

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

      // Prevent the engine from handling the event
      return true
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

      // Prevent the engine from handling the event
      return true
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

      // Prevent the engine from handling the event
      return true
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

      // Prevent the engine from handling the event
      return true
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

      // Prevent the engine from handling the event
      return true
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

      // Prevent the engine from handling the event
      return true
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

      // Prevent the engine from handling the event
      return true
    },
    [onDragLeave, editorActor, editorEngine],
  )

  const callbackRef = useCallback(
    (editorElement: HTMLDivElement | null) => {
      if (typeof forwardedRef === 'function') {
        forwardedRef(editorElement)
      } else if (forwardedRef) {
        forwardedRef.current = editorElement
      }

      if (editorElement) {
        // Observe mutations (child list and subtree) to this component's DOM,
        // and make sure the editor selection is valid when that happens.
        const mutationObserver = new MutationObserver(() => {
          validateSelectionActor.send({
            type: 'validate selection',
            editorElement,
          })
        })

        mutationObserver.observe(editorElement, {
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
    [forwardedRef, validateSelectionActor],
  )

  if (!portableTextEditor) {
    return null
  }

  return hasInvalidValue ? null : (
    <SelectionStateProvider>
      <DropPositionStateProvider>
        <EngineEditable
          {...restProps}
          ref={callbackRef}
          editorActor={editorActor}
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
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          renderText={renderText}
          scrollSelectionIntoView={scrollSelectionIntoViewToEngine}
        />
      </DropPositionStateProvider>
    </SelectionStateProvider>
  )
})

PortableTextEditable.displayName = 'ForwardRef(PortableTextEditable)'

function noop() {
  return undefined
}

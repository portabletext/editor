import {Transforms, Node} from 'slate'
import {isEqual} from 'lodash'
import isHotkey from 'is-hotkey'
import {normalizeBlock} from '@sanity/block-tools'
import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  forwardRef,
  useLayoutEffect,
} from 'react'
import {Editable as SlateEditable, Slate, ReactEditor, withReact} from '@sanity/slate-react'
import {
  EditorSelection,
  OnBeforeInputFn,
  OnCopyFn,
  OnPasteFn,
  OnPasteResult,
  OnPasteResultOrPromise,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  ScrollSelectionIntoViewFunction,
} from '../types/editor'
import {PortableTextBlock} from '../types/portableText'
import {HotkeyOptions} from '../types/options'
import {toSlateValue} from '../utils/values'
import {hasEditableTarget, setFragmentData} from '../utils/copyPaste'
import {normalizeSelection} from '../utils/selection'
import {toPortableTextRange, toSlateRange} from '../utils/ranges'
import {debugWithName} from '../utils/debug'
import {KEY_TO_SLATE_ELEMENT} from '../utils/weakMaps'
import {Leaf} from './Leaf'
import {Element} from './Element'
import {usePortableTextEditor} from './hooks/usePortableTextEditor'
import {usePortableTextEditorValue} from './hooks/usePortableTextEditorValue'
import {PortableTextEditor} from './PortableTextEditor'
import {createWithEditableAPI, createWithHotkeys, createWithInsertData} from './plugins'
import {useForwardedRef} from './hooks/useForwardedRef'

const debug = debugWithName('component:Editable')

// Weakmap for testing if we need to update the state value from a new value coming in from props
const VALUE_TO_SLATE_VALUE: WeakMap<PortableTextBlock[], Node[]> = new WeakMap()

const NOOP = () => {
  // Nope
}
type EditableProps = {
  hotkeys?: HotkeyOptions
  onBeforeInput?: OnBeforeInputFn
  onPaste?: OnPasteFn
  onCopy?: OnCopyFn
  placeholderText?: string
  renderAnnotation?: RenderAnnotationFunction
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderDecorator?: RenderDecoratorFunction
  scrollSelectionIntoView?: ScrollSelectionIntoViewFunction
  selection?: EditorSelection
  spellCheck?: boolean
}

export const PortableTextEditable = forwardRef(function PortableTextEditable(
  props: EditableProps & Omit<React.HTMLProps<HTMLDivElement>, 'as' | 'onPaste'>,
  forwardedRef: React.ForwardedRef<HTMLDivElement>
) {
  const {
    hotkeys,
    onBeforeInput,
    onPaste,
    onCopy,
    placeholderText,
    renderAnnotation,
    renderBlock,
    renderChild,
    renderDecorator,
    selection: propsSelection,
    scrollSelectionIntoView,
    spellCheck,
    ...restProps
  } = props

  const portableTextEditor = usePortableTextEditor()
  const value = usePortableTextEditorValue()
  const ref = useForwardedRef(forwardedRef)
  const slateEditor = portableTextEditor.slateInstance

  const {change$, isThrottling, keyGenerator, portableTextFeatures, readOnly} = portableTextEditor

  const placeHolderBlock = useMemo(
    () => ({
      _type: portableTextFeatures.types.block.name,
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: '',
          marks: [],
        },
      ],
    }),
    [portableTextFeatures.types.block.name, keyGenerator]
  )

  const initialValue = useMemo(
    () =>
      toSlateValue(
        getValueOrInitialValue(value, [placeHolderBlock]),
        portableTextFeatures.types.block.name,
        KEY_TO_SLATE_ELEMENT.get(slateEditor)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeHolderBlock, slateEditor, portableTextFeatures.types.block.name] // Note that 'value' is deliberately left out here.
  )

  // React/UI-spesific plugins
  const withInsertData = useMemo(
    () => createWithInsertData(change$, portableTextFeatures, keyGenerator),
    [change$, keyGenerator, portableTextFeatures]
  )
  const withHotKeys = useMemo(
    () => createWithHotkeys(portableTextFeatures, keyGenerator, portableTextEditor, hotkeys),
    [hotkeys, keyGenerator, portableTextEditor, portableTextFeatures]
  )

  // Create the PortableTextEditor API
  const withEditableAPI = useMemo(
    () => createWithEditableAPI(portableTextEditor, portableTextFeatures, keyGenerator),
    [keyGenerator, portableTextEditor, portableTextFeatures]
  )

  // Update the Slate instance's plugins which are dependent on props for Editable
  useMemo(() => withHotKeys(withInsertData(withEditableAPI(withReact(slateEditor)))), [
    slateEditor,
    withEditableAPI,
    withHotKeys,
    withInsertData,
  ])

  // Track selection (action) state
  const [isSelecting, setIsSelecting] = useState(false)

  const renderElement = useCallback(
    (eProps) => (
      <Element
        {...eProps}
        keyGenerator={keyGenerator}
        portableTextFeatures={portableTextFeatures}
        readOnly={readOnly}
        renderBlock={renderBlock}
        renderChild={renderChild}
      />
    ),
    [keyGenerator, portableTextFeatures, readOnly, renderBlock, renderChild]
  )

  const renderLeaf = useCallback(
    (lProps) => {
      return (
        <Leaf
          {...lProps}
          keyGenerator={keyGenerator}
          portableTextFeatures={portableTextFeatures}
          renderAnnotation={renderAnnotation}
          renderChild={renderChild}
          renderDecorator={renderDecorator}
          readOnly={readOnly}
        />
      )
    },
    [portableTextFeatures, keyGenerator, renderAnnotation, renderChild, renderDecorator, readOnly]
  )

  // Restore value from props
  useLayoutEffect(() => {
    if (isThrottling) {
      debug('Not setting value from props (throttling)')
      return
    }
    if (isSelecting) {
      debug('Not setting value from props (is selecting)')
      return
    }
    const fromMap = VALUE_TO_SLATE_VALUE.get(value || [])
    if (fromMap === slateEditor.children) {
      debug('Value in sync, not updating value from props')
    } else {
      debug(`Setting value from props`)
      const slateValueFromProps = toSlateValue(
        getValueOrInitialValue(value, [placeHolderBlock]),
        portableTextFeatures.types.block.name,
        KEY_TO_SLATE_ELEMENT.get(slateEditor)
      )
      slateEditor.children = slateValueFromProps
      VALUE_TO_SLATE_VALUE.set(value || [], slateValueFromProps)
      change$.next({type: 'value', value})
      // Signal changed after this tick (this is really important to let plugins catch up first!)
      setTimeout(() => slateEditor.onChange())
    }
  }, [
    change$,
    isSelecting,
    isThrottling,
    placeHolderBlock,
    slateEditor,
    portableTextFeatures.types.block.name,
    value,
  ])

  // Restore selection from props
  useEffect(() => {
    if (
      propsSelection &&
      !isThrottling &&
      !isEqual(propsSelection, toPortableTextRange(slateEditor))
    ) {
      debug(`Selection from props ${JSON.stringify(propsSelection)}`)
      const normalizedSelection = normalizeSelection(propsSelection, value)
      if (normalizedSelection !== null) {
        debug(`Normalized selection from props ${JSON.stringify(normalizedSelection)}`)
        const slateRange = toSlateRange(normalizedSelection, slateEditor)
        if (slateRange) {
          Transforms.select(slateEditor, slateRange)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slateEditor, propsSelection]) // Note that 'isThrottling' and 'value' is deliberately left out here.

  // Set initial selection from props
  useEffect(() => {
    if (propsSelection) {
      PortableTextEditor.select(portableTextEditor, propsSelection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only initial

  // Handle copy event in the editor
  const handleCopy = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>): void | ReactEditor => {
      if (onCopy) {
        const result = onCopy(event)
        // CopyFn may return something to avoid doing default stuff
        if (result !== undefined) {
          event.preventDefault()
          return
        }
      }
      if (hasEditableTarget(slateEditor, event.target)) {
        // Set Portable Text on the clipboard
        setFragmentData(event.clipboardData, slateEditor, portableTextFeatures)
      }
    },
    [onCopy, slateEditor, portableTextFeatures]
  )

  // Handle pasting in the editor
  const handlePaste = useCallback(
    (event: React.SyntheticEvent): Promise<void> | void => {
      event.persist() // Keep the event through the plugin chain after calling next()
      const _selection = PortableTextEditor.getSelection(portableTextEditor)
      const type = portableTextFeatures.types.portableText
      if (!_selection) {
        return
      }
      if (onPaste) {
        const resolveOnPasteResultOrError = (): OnPasteResultOrPromise | Error => {
          try {
            return onPaste({event, value, path: _selection.focus.path, type})
          } catch (error) {
            return error as Error
          }
        }
        // Resolve it as promise (can be either async promise or sync return value)
        const resolved: OnPasteResultOrPromise | Error = Promise.resolve(
          resolveOnPasteResultOrError()
        )
        resolved
          .then((result: OnPasteResult) => {
            debug('Custom paste function from client resolved', result)
            change$.next({type: 'loading', isLoading: true})
            if (!result) {
              return
            }
            if (result instanceof Error) {
              throw result
            }
            if (result && result.insert) {
              event.preventDefault() // Stop the chain
              const allowedDecorators = portableTextFeatures.decorators.map((item) => item.value)
              const blocksToInsertNormalized = result.insert.map((block) =>
                normalizeBlock(block, {allowedDecorators})
              ) as PortableTextBlock[]
              const dataTransfer = new DataTransfer()
              const stringToEncode = JSON.stringify(
                toSlateValue(blocksToInsertNormalized, portableTextFeatures.types.block.name)
              )
              const encoded = window.btoa(encodeURIComponent(stringToEncode))
              dataTransfer.setData('application/x-slate-fragment', encoded)
              slateEditor.insertData(dataTransfer)
              change$.next({type: 'loading', isLoading: false})
              slateEditor.onChange()
              return
            }
            console.warn('Your onPaste function returned something unexpected:', result)
          })
          .catch((error) => {
            change$.next({type: 'loading', isLoading: false})
            console.error(error) // eslint-disable-line no-console
            return error
          })
      }
    },
    [change$, onPaste, portableTextEditor, portableTextFeatures, slateEditor, value]
  )

  const _isSelecting = useRef(false)
  const onSelectStart = useCallback(
    (event: KeyboardEvent | MouseEvent) => {
      if (hasEditableTarget(slateEditor, event.target)) {
        debug('Start selecting')
        _isSelecting.current = true
        setTimeout(() => setIsSelecting(true))
      }
    },
    [slateEditor]
  )
  const onSelectEnd = useCallback(() => {
    if (_isSelecting.current) {
      debug('Done selecting')
      setTimeout(() => setIsSelecting(false))
    }
  }, [_isSelecting])
  const isSelectKeys = (event: KeyboardEvent) =>
    isHotkey('shift+down', event) ||
    isHotkey('shift+up', event) ||
    isHotkey('shift+left', event) ||
    isHotkey('shift+right', event) ||
    isHotkey('shift+end', event) ||
    isHotkey('shift+home', event) ||
    isHotkey('shift+pageDown', event) ||
    isHotkey('shift+pageUp', event)
  const isSelectingWithKeys = useRef(false)
  const onSelectStartWithKeys = useCallback(
    (event: KeyboardEvent) => {
      if (isSelectKeys(event)) {
        isSelectingWithKeys.current = true
        onSelectStart(event)
      }
    },
    [onSelectStart]
  )
  const onSelectEndWithKeys = useCallback(
    (event: KeyboardEvent) => {
      if (isSelectingWithKeys.current && event.key === 'Shift') {
        onSelectEnd()
        isSelectingWithKeys.current = false
      }
    },
    [onSelectEnd]
  )

  useEffect(() => {
    if (ref.current && !readOnly) {
      const currentRef = ref.current
      currentRef.addEventListener('keydown', onSelectStartWithKeys, false)
      currentRef.addEventListener('keyup', onSelectEndWithKeys, false)
      currentRef.addEventListener('mousedown', onSelectStart, false)
      window.addEventListener('mouseup', onSelectEnd, false) // Must be on window, or we might not catch it if the pointer is another place at the time.
      currentRef.addEventListener('dragend', onSelectEnd, false)
      return () => {
        currentRef.removeEventListener('keydown', onSelectStartWithKeys, false)
        currentRef.removeEventListener('keyup', onSelectEndWithKeys, false)
        currentRef.removeEventListener('mousedown', onSelectStart, false)
        window.removeEventListener('mouseup', onSelectEnd, false)
        currentRef.removeEventListener('dragend', onSelectEnd, false)
      }
    }
    return NOOP
  }, [ref, onSelectEnd, onSelectEndWithKeys, onSelectStart, onSelectStartWithKeys, readOnly])

  const handleOnFocus = useCallback(() => {
    change$.next({type: 'focus'})
  }, [change$])

  const handleOnBlur = useCallback(() => {
    change$.next({type: 'blur'})
  }, [change$])

  const handleOnBeforeInput = useCallback(
    (event: Event) => {
      if (onBeforeInput) {
        onBeforeInput(event)
      }
    },
    [onBeforeInput]
  )

  const handleKeyDown = slateEditor.pteWithHotKeys

  const scrollSelectionIntoViewToSlate = useMemo(() => {
    // Use slate-react default scroll into view
    if (scrollSelectionIntoView === undefined) {
      return undefined
    }
    // Disable scroll into view totally
    if (scrollSelectionIntoView === null) {
      return NOOP
    }
    // Translate PortableTextEditor prop fn to Slate plugin fn
    return (editor: ReactEditor, domRange: Range) => {
      scrollSelectionIntoView(portableTextEditor, domRange)
    }
  }, [portableTextEditor, scrollSelectionIntoView])

  // The editor
  const slateEditable = useMemo(
    () => (
      <Slate onChange={NOOP} editor={slateEditor} value={initialValue}>
        <SlateEditable
          autoFocus={false}
          className="pt-editable"
          onBlur={handleOnBlur}
          onCopy={handleCopy}
          onDOMBeforeInput={handleOnBeforeInput}
          onFocus={handleOnFocus}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholderText}
          readOnly={readOnly}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          scrollSelectionIntoView={scrollSelectionIntoViewToSlate}
          spellCheck={spellCheck}
        />
      </Slate>
    ),
    [
      handleCopy,
      handleKeyDown,
      handleOnBeforeInput,
      handleOnBlur,
      handleOnFocus,
      handlePaste,
      initialValue,
      placeholderText,
      slateEditor,
      readOnly,
      renderElement,
      renderLeaf,
      scrollSelectionIntoViewToSlate,
      spellCheck,
    ]
  )
  if (!portableTextEditor) {
    return null
  }
  return (
    <div ref={ref} {...restProps}>
      {slateEditable}
    </div>
  )
})

function getValueOrInitialValue(value: unknown, initialValue: PortableTextBlock[]) {
  if (value && Array.isArray(value) && value.length > 0) {
    return value
  }
  return initialValue
}

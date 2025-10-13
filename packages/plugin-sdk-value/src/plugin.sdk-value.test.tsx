import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type Editor,
  type PortableTextBlock,
} from '@portabletext/editor'
import {
  createDocumentHandle,
  getDocumentState,
  ResourceProvider,
  useEditDocument,
  type ResourceProviderProps,
  type SanityConfig,
  type SanityInstance,
  type StateSource,
} from '@sanity/sdk-react'
import {render, waitFor} from '@testing-library/react'
import userEvent, {type UserEvent} from '@testing-library/user-event'
import {useEffect} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest'
import {SDKValuePlugin} from './plugin.sdk-value'

vi.mock('@sanity/sdk-react', async () => {
  const {createContext, createRef, Suspense, useContext} = await import('react')
  const Context = createContext<SanityConfig | null>(null)
  const eventTarget = new EventTarget()
  const valueRef = createRef<PortableTextBlock[]>()

  return {
    createDocumentHandle: (value: unknown) => value,
    useEditDocument: () => {
      if (!valueRef.current) {
        // suspend at least once
        throw new Promise((resolve) => {
          valueRef.current = []
          setTimeout(resolve, 0)
        })
      }

      return (value: PortableTextBlock[]) => {
        valueRef.current = value
        eventTarget.dispatchEvent(new CustomEvent('change'))
      }
    },
    getDocumentState: (): StateSource<PortableTextBlock[] | null> => {
      return {
        getCurrent: () => valueRef.current,
        subscribe: (fn) => {
          const listener = () => fn?.()
          eventTarget.addEventListener('change', listener)
          return () => eventTarget.removeEventListener('change', listener)
        },
        get observable(): StateSource<
          PortableTextBlock[] | null
        >['observable'] {
          throw new Error('Not implemented')
        },
      }
    },
    useSanityInstance: () => useContext(Context)!,
    ResourceProvider: ({
      children,
      fallback,
      ...config
    }: ResourceProviderProps) => (
      <Suspense fallback={fallback}>
        <Context.Provider value={config}>{children}</Context.Provider>
      </Suspense>
    ),
  }
})

const schemaDefinition = defineSchema({})

describe(SDKValuePlugin.name, () => {
  let user: UserEvent
  let setSdkValue: (value: PortableTextBlock[] | null | undefined) => void
  let getSdkValue: () => PortableTextBlock[] | null | undefined
  let getEditorValue: () => PortableTextBlock[] | null | undefined
  let portableTextEditable: HTMLElement
  let unmount: () => void
  let errorHandler: Mock

  beforeEach(async () => {
    user = userEvent.setup()
    errorHandler = vi.fn()

    const testId = 'portable-text-editable'
    const {resolve: resolveEditor, promise: editorPromise} =
      Promise.withResolvers<Editor>()

    const doc = createDocumentHandle({
      documentId: 'example-document-id',
      documentType: 'example-document-type',
    })
    const path = 'example-portable-text-field'

    function CaptureEditorPlugin() {
      const editor = useEditor()

      useEffect(() => {
        resolveEditor(editor)
      }, [editor])

      return null
    }

    const result = render(
      <ErrorBoundary fallback={null} onError={errorHandler}>
        <ResourceProvider
          projectId="example-project"
          dataset="example-dataset"
          fallback={<>Loading…</>}
        >
          <EditorProvider initialConfig={{schemaDefinition}}>
            <SDKValuePlugin {...doc} path={path} />
            <CaptureEditorPlugin />
            <PortableTextEditable data-testid={testId} />
          </EditorProvider>
        </ResourceProvider>
      </ErrorBoundary>,
    )
    portableTextEditable = await waitFor(() => result.getByTestId(testId))
    unmount = result.unmount

    const editor = await editorPromise
    setSdkValue = useEditDocument<PortableTextBlock[] | null | undefined>({
      ...doc,
      path,
    })

    getSdkValue = getDocumentState(null as unknown as SanityInstance, {
      ...doc,
      path,
    }).getCurrent

    getEditorValue = () => editor.getSnapshot().context.value
  })

  afterEach(async () => {
    // wait one frame before unmounting in the event of errors
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errorHandler).not.toHaveBeenCalled()
    unmount?.()
  })

  it('syncs editor changes to the SDK', async () => {
    await user.click(portableTextEditable)
    await user.type(portableTextEditable, 'Hello world!')

    expect(getSdkValue()).toEqual(getEditorValue())
    expect(getSdkValue()).toMatchObject([{children: [{text: 'Hello world!'}]}])
  })

  it('syncs SDK changes to the editor', () => {
    const testValue: PortableTextBlock[] = [
      {
        _type: 'block',
        _key: 'test-key',
        children: [
          {_type: 'span', _key: 'span-key', text: 'SDK content', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    setSdkValue(testValue)
    expect(getEditorValue()).toEqual(getSdkValue())
    expect(getEditorValue()).toEqual(testValue)
  })
})

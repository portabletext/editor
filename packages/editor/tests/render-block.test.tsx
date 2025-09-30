import {createTestKeyGenerator} from '@portabletext/test'
import {page, userEvent} from '@vitest/browser/context'
import React, {useCallback, useEffect, useState} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type BlockRenderProps,
  type Editor,
  type MutationEvent,
  type PortableTextBlock,
} from '../src'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('renderBlock', () => {
  test('Receives the updated value for text block changes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlock = {
      _type: 'block',
      _key: keyGenerator(),
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'foo',
          marks: [],
        },
        {
          _type: 'stock-ticker',
          _key: keyGenerator(),
          symbol: 'AAPL',
        },
        {
          _type: 'span',
          _key: keyGenerator(),
          text: '',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'normal',
    }
    const barBlock = {
      _type: 'block',
      _key: keyGenerator(),
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'bar',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'normal',
    }

    const initialValue: PortableTextBlock[] = [fooBlock, barBlock]

    const renderBlockValues: Array<PortableTextBlock> = []
    const renderBlock = (props: BlockRenderProps) => {
      renderBlockValues.push(props.value)
      return props.children
    }

    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      editableProps: {renderBlock},
    })

    const barSpanLocator = locator.getByText('b')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(barSpanLocator).toBeInTheDocument())

    expect(renderBlockValues).toEqual([
      {
        // Placeholder block
        _type: 'block',
        _key: 'k6',
        children: [
          {
            _type: 'span',
            _key: 'k7',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      ...initialValue,
    ])

    await userEvent.click(barSpanLocator)

    await vi.waitFor(() =>
      expect(renderBlockValues.slice(3)).toEqual([barBlock]),
    )

    await userEvent.type(locator, '1')

    await vi.waitFor(() =>
      expect(renderBlockValues.slice(4)).toEqual([
        {
          ...barBlock,
          children: [
            {
              ...barBlock.children[0],
              text: 'b1ar',
            },
          ],
        },
      ]),
    )

    await userEvent.type(locator, '2')

    await vi.waitFor(() =>
      expect(renderBlockValues.slice(5)).toEqual([
        {
          ...barBlock,
          children: [
            {
              ...barBlock.children[0],
              text: 'b12ar',
            },
          ],
        },
      ]),
    )

    await userEvent.type(locator, '3')

    await vi.waitFor(() =>
      expect(renderBlockValues.slice(6)).toEqual([
        {
          ...barBlock,
          children: [
            {
              ...barBlock.children[0],
              text: 'b123ar',
            },
          ],
        },
      ]),
    )
  })

  test('Scenario: Stable across re-renders', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()
    // Keeping track of the mount/unmount events for the `renderBlock` callback
    const renderBlockMountEvents: Array<'mount' | 'unmount'> = []
    // Keeping track of the mutation events emitted by the editor
    const mutationEvents: Array<MutationEvent> = []

    function App(props: {children: React.ReactNode}) {
      const [value, setValue] = useState<Array<PortableTextBlock>>([])

      const renderBlock = useCallback(
        (props: BlockRenderProps) => {
          // biome-ignore lint/correctness/useHookAtTopLevel: This is the only way to keep track of the mount/unmount events
          useEffect(() => {
            renderBlockMountEvents.push('mount')
            return () => {
              renderBlockMountEvents.push('unmount')
            }
          }, [])

          return props.children
        },
        // Making `renderBlock` depend on `value` to provoke a recreation
        // of the callback
        [value],
      )

      return (
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue: value,
          }}
        >
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'mutation') {
                mutationEvents.push(event)
                // Setting the value to trigger a re-render of App and thereby
                // a recreation of the `renderBlock` callback
                setValue(event.value ?? [])
              }
            }}
          />
          <PortableTextEditable renderBlock={renderBlock} />
          {props.children}
        </EditorProvider>
      )
    }

    render(
      <App>
        <EditorRefPlugin ref={editorRef} />
      </App>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    // Waiting for the mutation event to be emitted so we know the value has
    // been set inside `App`
    await vi.waitFor(() => {
      expect(mutationEvents.length).toEqual(1)
    })

    // Asserting that the `renderBlock` callback has been mounted exactly once
    // and never unmounted
    await vi.waitFor(() => {
      expect(renderBlockMountEvents).toEqual(['mount'])
    })
  })
})

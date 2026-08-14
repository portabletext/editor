import {createTestKeyGenerator} from '@portabletext/test'
import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import {
  defineSchema,
  defineTextBlock,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type MutationEvent,
  type PortableTextBlock,
  type TextBlockRenderProps,
} from '../src'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

describe('registered render: blocks', () => {
  test('Receives the updated node for text block changes', async () => {
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
    const textBlock = defineTextBlock({
      type: 'block',
      render: (props) => {
        renderBlockValues.push(props.node)
        return props.renderDefault(props)
      },
    })

    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      children: <NodePlugin nodes={[textBlock]} />,
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

  test('Re-renders when a nested custom prop is patched', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const initialValue: PortableTextBlock[] = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        metadata: {},
      },
    ]

    const renderBlockValues: Array<PortableTextBlock> = []
    const textBlock = defineTextBlock({
      type: 'block',
      render: (props) => {
        renderBlockValues.push(props.node)
        return props.renderDefault(props)
      },
    })

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        block: {fields: [{name: 'metadata', type: 'object'}]},
      }),
      children: <NodePlugin nodes={[textBlock]} />,
    })

    await vi.waitFor(() => {
      expect(renderBlockValues.length).toBeGreaterThan(0)
    })

    const initialCount = renderBlockValues.length

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'metadata', 'title'],
          value: 'Hello',
        },
      ],
      snapshot: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          metadata: {title: 'Hello'},
        },
      ],
    })

    await vi.waitFor(() => {
      expect(renderBlockValues.length).toBeGreaterThan(initialCount)
      expect(renderBlockValues.at(-1)).toEqual({
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        metadata: {title: 'Hello'},
      })
    })

    const countAfterFirstPatch = renderBlockValues.length

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'metadata', 'description'],
          value: 'World',
        },
      ],
      snapshot: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          metadata: {title: 'Hello', description: 'World'},
        },
      ],
    })

    await vi.waitFor(() => {
      expect(renderBlockValues.length).toBeGreaterThan(countAfterFirstPatch)
      expect(renderBlockValues.at(-1)).toEqual({
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        metadata: {title: 'Hello', description: 'World'},
      })
    })
  })

  test('Re-renders when a nested custom prop is unset', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const initialValue: PortableTextBlock[] = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        metadata: {title: 'Hello', description: 'World'},
      },
    ]

    const renderBlockValues: Array<PortableTextBlock> = []
    const textBlock = defineTextBlock({
      type: 'block',
      render: (props) => {
        renderBlockValues.push(props.node)
        return props.renderDefault(props)
      },
    })

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        block: {fields: [{name: 'metadata', type: 'object'}]},
      }),
      children: <NodePlugin nodes={[textBlock]} />,
    })

    await vi.waitFor(() => {
      expect(renderBlockValues.length).toBeGreaterThan(0)
    })

    const initialCount = renderBlockValues.length

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: blockKey}, 'metadata', 'title'],
        },
      ],
      snapshot: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          metadata: {description: 'World'},
        },
      ],
    })

    await vi.waitFor(() => {
      expect(renderBlockValues.length).toBeGreaterThan(initialCount)
      expect(renderBlockValues.at(-1)).toEqual({
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        metadata: {description: 'World'},
      })
    })
  })

  test('Scenario: Stable across re-renders', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()
    // Keeping track of the mount/unmount events for the registered
    // text block's `render`
    const textBlockMountEvents: Array<'mount' | 'unmount'> = []
    // Keeping track of the mutation events emitted by the editor
    const mutationEvents: Array<MutationEvent> = []

    function App(props: {children: React.ReactNode}) {
      const [value, setValue] = useState<Array<PortableTextBlock>>([])

      const textBlockRender = useCallback(
        (props: TextBlockRenderProps) => {
          // biome-ignore lint/correctness/useHookAtTopLevel: This is the only way to keep track of the mount/unmount events
          useEffect(() => {
            textBlockMountEvents.push('mount')
            return () => {
              textBlockMountEvents.push('unmount')
            }
          }, [])

          return props.renderDefault(props)
        },
        // Making `textBlockRender` depend on `value` to provoke a
        // recreation of the callback
        [value],
      )

      const nodes = useMemo(
        () => [defineTextBlock({type: 'block', render: textBlockRender})],
        [textBlockRender],
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
                // a recreation of the `render` callback
                setValue(event.value ?? [])
              }
            }}
          />
          <PortableTextEditable />
          <NodePlugin nodes={nodes} />
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

    // Asserting that the text block's `render` has been mounted exactly once
    // and never unmounted
    await vi.waitFor(() => {
      expect(textBlockMountEvents).toEqual(['mount'])
    })
  })

  test('Keyless block receives a valid `_key` from normalization before render', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const renderBlockValues: Array<PortableTextBlock> = []
    const textBlock = defineTextBlock({
      type: 'block',
      render: (props) => {
        renderBlockValues.push(props.node)
        return props.renderDefault(props)
      },
    })

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[textBlock]} />,
    })

    const countBefore = renderBlockValues.length

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [
            {
              _type: 'block',
              children: [{_type: 'span', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    const normalizedBlock = {
      _type: 'block',
      _key: 'k5',
      children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    await vi.waitFor(() => {
      expect(renderBlockValues.slice(countBefore)).toEqual([normalizedBlock])

      expect(
        locator.element().querySelector('[data-pt-path=\'[_key=="k5"]\']'),
      ).not.toBeNull()
    })
  })
})

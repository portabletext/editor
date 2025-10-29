import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {defineSchema, type EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('focus', () => {
  test('Scenario: Focusing on an empty editor', async (context) => {
    if (navigator.userAgent.includes('Firefox')) {
      context.skip()
      return
    }

    const keyGenerator = createTestKeyGenerator()
    const events: Array<EditorEmittedEvent> = []

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      children: (
        <>
          <div data-testid="toolbar">Toolbar</div>
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
        </>
      ),
    })

    const editorLocator = locator
    const toolbarLocator = page.getByTestId('toolbar')
    await vi.waitFor(() => expect.element(editorLocator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())

    await userEvent.click(editorLocator)

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'ready',
        },
        expect.objectContaining({
          type: 'focused',
        }),
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
      ])
    })

    await userEvent.click(toolbarLocator)

    expect(events.slice(3)).toEqual([
      expect.objectContaining({
        type: 'blurred',
      }),
    ])

    await userEvent.click(editorLocator)

    await vi.waitFor(() => {
      expect(events.slice(4)).toEqual([
        expect.objectContaining({type: 'focused'}),
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
      ])
    })
  })

  test('Scenario: Focusing on a non-empty editor', async (context) => {
    if (navigator.userAgent.includes('Firefox')) {
      context.skip()
      return
    }

    const keyGenerator = createTestKeyGenerator()
    const events: Array<EditorEmittedEvent> = []
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [
          {
            _type: 'span',
            _key: fooSpanKey,
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [
          {
            _type: 'span',
            _key: barSpanKey,
            text: 'b',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <>
          <div data-testid="toolbar">Toolbar</div>
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
        </>
      ),
    })

    const editorLocator = locator
    const barSpanLocator = editorLocator.getByText('b')
    const toolbarLocator = page.getByTestId('toolbar')
    await vi.waitFor(() => expect.element(barSpanLocator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())

    await userEvent.click(barSpanLocator)

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'value changed',
          value: initialValue,
        },
        {
          type: 'ready',
        },
        expect.objectContaining({
          type: 'focused',
        }),
        {
          type: 'selection',
          selection: {
            anchor: {
              path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
              offset: 0,
            },
            backward: false,
          },
        },
      ])
    })

    await userEvent.click(toolbarLocator)

    await vi.waitFor(() => {
      expect(events.slice(4)).toEqual([
        expect.objectContaining({
          type: 'blurred',
        }),
      ])
    })

    await userEvent.click(barSpanLocator)

    await vi.waitFor(() => {
      expect(events.slice(5)).toEqual([
        expect.objectContaining({type: 'focused'}),
        {
          type: 'selection',
          selection: {
            anchor: {
              path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
              offset: 0,
            },
            backward: false,
          },
        },
      ])
    })
  })
})

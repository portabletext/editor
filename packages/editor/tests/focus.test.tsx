import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {type EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('focus', () => {
  test('Scenario: Focusing on an empty editor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const focusEvents: Array<EditorEmittedEvent> = []

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      children: (
        <>
          <button type="button" data-testid="toolbar">
            Toolbar
          </button>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'focused' || event.type === 'blurred') {
                focusEvents.push(event)
              }
            }}
          />
        </>
      ),
    })

    const toolbarLocator = page.getByTestId('toolbar')
    await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(focusEvents).toEqual([
        expect.objectContaining({
          type: 'focused',
        }),
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        backward: false,
      })
    })

    await userEvent.click(toolbarLocator)

    expect(focusEvents.slice(1)).toEqual([
      expect.objectContaining({
        type: 'blurred',
      }),
    ])

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(focusEvents.slice(2)).toEqual([
        expect.objectContaining({type: 'focused'}),
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: Focusing on a non-empty editor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const focusEvents: Array<EditorEmittedEvent> = []
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

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <>
          <button type="button" data-testid="toolbar">
            Toolbar
          </button>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'focused' || event.type === 'blurred') {
                focusEvents.push(event)
              }
            }}
          />
        </>
      ),
    })

    const barSpanLocator = locator.getByText('b')
    const toolbarLocator = page.getByTestId('toolbar')
    await vi.waitFor(() => expect.element(barSpanLocator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())

    await userEvent.click(barSpanLocator)

    await vi.waitFor(() => {
      expect(focusEvents).toEqual([
        expect.objectContaining({
          type: 'focused',
        }),
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 0,
        },
        backward: false,
      })
    })

    await userEvent.click(toolbarLocator)

    await vi.waitFor(() => {
      expect(focusEvents.slice(1)).toEqual([
        expect.objectContaining({
          type: 'blurred',
        }),
      ])
    })

    await userEvent.click(barSpanLocator)

    await vi.waitFor(() => {
      expect(focusEvents.slice(2)).toEqual([
        expect.objectContaining({type: 'focused'}),
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 0,
        },
        backward: false,
      })
    })
  })
})

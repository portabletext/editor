import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import type {EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

// Focusing an empty editor emits `focused` and then programmatically sets the
// selection (`handleOnFocus` -> `editorEngine.select`). On Firefox that
// selection-set on a freshly-focused empty contenteditable transiently blurs
// and re-focuses the element, so the DOM event stream is
// `focused -> blurred -> focused`. The settled last event is `focused`, but
// under CI load it can arrive well after the default 1s `vi.waitFor` window,
// so the wait exhausts on the transient `blurred`. Give the focus waits (and
// the tests themselves) enough headroom to reach the settled state.
const FOCUS_SETTLE = {timeout: 10_000, interval: 100} as const
const TEST_TIMEOUT = 40_000

describe('focus', () => {
  test(
    'Scenario: Focusing on an empty editor',
    {timeout: TEST_TIMEOUT},
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const focusEvents: Array<EditorEmittedEvent['type']> = []

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
                  focusEvents.push(event.type)
                }
              }}
            />
          </>
        ),
      })

      const expectedSelection = {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        backward: false,
      }

      const toolbarLocator = page.getByTestId('toolbar')
      await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())

      await userEvent.click(locator)

      // Wait for both focus and selection to settle.
      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('focused')
        expect(editor.getSnapshot().context.selection).toEqual(
          expectedSelection,
        )
      }, FOCUS_SETTLE)

      await userEvent.click(toolbarLocator)

      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('blurred')
      }, FOCUS_SETTLE)

      await userEvent.click(locator)

      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('focused')
        expect(editor.getSnapshot().context.selection).toEqual(
          expectedSelection,
        )
      }, FOCUS_SETTLE)
    },
  )

  test(
    'Scenario: Focusing on a non-empty editor',
    {timeout: TEST_TIMEOUT},
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const focusEvents: Array<EditorEmittedEvent['type']> = []
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
                  focusEvents.push(event.type)
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
        expect(focusEvents.at(-1)).toEqual('focused')
      }, FOCUS_SETTLE)

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
      }, FOCUS_SETTLE)

      await userEvent.click(toolbarLocator)

      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('blurred')
      }, FOCUS_SETTLE)

      await userEvent.click(barSpanLocator)

      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('focused')
      }, FOCUS_SETTLE)

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
      }, FOCUS_SETTLE)
    },
  )
})

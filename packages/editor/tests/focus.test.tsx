import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import type {EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('focus', () => {
  test('Scenario: Focusing on an empty editor', async () => {
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

    await vi.waitFor(() => {
      expect(focusEvents).toContain('focused')
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })

    await userEvent.click(toolbarLocator)

    await vi.waitFor(() => {
      expect(focusEvents).toContain('blurred')
    })

    const focusCountBeforeReclick = focusEvents.filter(
      (event) => event === 'focused',
    ).length

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(
        focusEvents.filter((event) => event === 'focused').length,
      ).toBeGreaterThan(focusCountBeforeReclick)
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })

  test('Scenario: Focusing on a non-empty editor', async () => {
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

    const expectedSelection = {
      anchor: {
        path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
        offset: 0,
      },
      backward: false,
    }

    await userEvent.click(barSpanLocator)

    // Firefox may fire a transient `blurred` after `focused` when clicking a
    // child span inside contenteditable. Checking the selection together with
    // the focus event avoids the race — a correct selection proves focus.
    await vi.waitFor(() => {
      expect(focusEvents).toContain('focused')
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })

    await userEvent.click(toolbarLocator)

    await vi.waitFor(() => {
      expect(focusEvents.at(-1)).toEqual('blurred')
    })

    const focusCountBeforeReclick = focusEvents.filter(
      (event) => event === 'focused',
    ).length

    await userEvent.click(barSpanLocator)

    await vi.waitFor(() => {
      expect(
        focusEvents.filter((event) => event === 'focused').length,
      ).toBeGreaterThan(focusCountBeforeReclick)
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })
})

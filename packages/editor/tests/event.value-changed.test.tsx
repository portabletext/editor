import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.value changed', () => {
  test('Scenario: An "undefined" initial value does not emit value changed', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      initialValue: undefined,
    })

    expect(onEvent.mock.calls).toEqual([[{type: 'ready'}]])
  })

  test('Scenario: An "[]" initial value emits value changed', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      initialValue: [],
    })

    expect(onEvent.mock.calls).toEqual([
      [{type: 'value changed', value: []}],
      [{type: 'ready'}],
    ])
  })
})

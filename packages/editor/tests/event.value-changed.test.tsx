import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.value changed', () => {
  test('does not emit for "undefined" initial value', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      initialValue: undefined,
    })

    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'value changed'}),
    )
  })

  test('emits for "[]" initial value', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      initialValue: [],
    })

    expect(onEvent).toHaveBeenCalledWith({type: 'value changed', value: []})
  })
})

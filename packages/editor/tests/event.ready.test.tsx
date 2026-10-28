import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.ready', () => {
  test('Scenario: Ready is emitted for an "undefined" initial value', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
    })

    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })

  test('Scenario: Ready is emitted for a "[]" initial value', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
    })

    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })
})

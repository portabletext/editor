import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('initial readiness', () => {
  test('Scenario: An "undefined" initial value emits ready', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      initialValue: undefined,
    })

    expect(onEvent.mock.calls).toEqual([[{type: 'ready'}]])
  })
})

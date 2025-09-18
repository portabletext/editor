import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('event.ready', () => {
  test('emits for "undefined" initial value', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
    })

    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })

  test('emits for "[]" initial value', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
    })

    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })
})

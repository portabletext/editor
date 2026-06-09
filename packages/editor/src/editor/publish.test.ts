import {describe, expect, test, vi} from 'vitest'
import {createPublisher} from './publish'

describe(createPublisher.name, () => {
  test('emits to a typed listener', () => {
    const publisher = createPublisher()
    const listener = vi.fn()

    publisher.on('ready', listener)
    publisher.emit({type: 'ready'})

    expect(listener.mock.calls).toEqual([[{type: 'ready'}]])
  })

  test('emits to a wildcard listener', () => {
    const publisher = createPublisher()
    const listener = vi.fn()

    publisher.on('*', listener)
    publisher.emit({type: 'ready'})
    publisher.emit({type: 'editable'})

    expect(listener.mock.calls).toEqual([
      [{type: 'ready'}],
      [{type: 'editable'}],
    ])
  })

  test('does not emit to listeners on other channels', () => {
    const publisher = createPublisher()
    const ready = vi.fn()
    const editable = vi.fn()

    publisher.on('ready', ready)
    publisher.on('editable', editable)
    publisher.emit({type: 'ready'})

    expect(ready).toHaveBeenCalledTimes(1)
    expect(editable).not.toHaveBeenCalled()
  })

  test('unsubscribe stops further notifications', () => {
    const publisher = createPublisher()
    const listener = vi.fn()

    const subscription = publisher.on('ready', listener)
    publisher.emit({type: 'ready'})
    subscription.unsubscribe()
    publisher.emit({type: 'ready'})

    expect(listener).toHaveBeenCalledTimes(1)
  })

  describe('selection dedup', () => {
    test('first selection is emitted', () => {
      const publisher = createPublisher()
      const listener = vi.fn()
      const selection = {
        anchor: {path: [], offset: 0},
        focus: {path: [], offset: 0},
      }

      publisher.on('selection', listener)
      publisher.emit({type: 'selection', selection})

      expect(listener).toHaveBeenCalledTimes(1)
    })

    test('same selection reference is deduped', () => {
      const publisher = createPublisher()
      const listener = vi.fn()
      const selection = {
        anchor: {path: [], offset: 0},
        focus: {path: [], offset: 0},
      }

      publisher.on('selection', listener)
      publisher.emit({type: 'selection', selection})
      publisher.emit({type: 'selection', selection})

      expect(listener).toHaveBeenCalledTimes(1)
    })

    test('different selection reference is emitted', () => {
      const publisher = createPublisher()
      const listener = vi.fn()
      const first = {
        anchor: {path: [], offset: 0},
        focus: {path: [], offset: 0},
      }
      const second = {
        anchor: {path: [], offset: 1},
        focus: {path: [], offset: 1},
      }

      publisher.on('selection', listener)
      publisher.emit({type: 'selection', selection: first})
      publisher.emit({type: 'selection', selection: second})

      expect(listener).toHaveBeenCalledTimes(2)
    })

    test('selection after focused re-emits even when reference is unchanged', () => {
      const publisher = createPublisher()
      const listener = vi.fn()
      const selection = {
        anchor: {path: [], offset: 0},
        focus: {path: [], offset: 0},
      }

      publisher.on('selection', listener)
      publisher.emit({type: 'selection', selection})
      publisher.emit({
        type: 'focused',
        event: {} as never,
      })
      publisher.emit({type: 'selection', selection})

      expect(listener).toHaveBeenCalledTimes(2)
    })

    test('focused-flag is one-shot: next same-reference selection after the re-emit is deduped', () => {
      const publisher = createPublisher()
      const listener = vi.fn()
      const selection = {
        anchor: {path: [], offset: 0},
        focus: {path: [], offset: 0},
      }

      publisher.on('selection', listener)
      publisher.emit({type: 'selection', selection})
      publisher.emit({type: 'focused', event: {} as never})
      publisher.emit({type: 'selection', selection})
      publisher.emit({type: 'selection', selection})

      expect(listener).toHaveBeenCalledTimes(2)
    })
  })
})

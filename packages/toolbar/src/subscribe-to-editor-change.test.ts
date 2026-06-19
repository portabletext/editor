import type {Editor} from '@portabletext/editor'
import {describe, expect, test} from 'vitest'
import {subscribeToEditorChange} from './subscribe-to-editor-change'

describe('subscribeToEditorChange', () => {
  function createEditorStub() {
    const handlers = new Set<() => void>()
    const editor = {
      on: (_type: '*', handler: () => void) => {
        handlers.add(handler)
        return {unsubscribe: () => handlers.delete(handler)}
      },
    } as unknown as Editor
    return {
      editor,
      emit: () => {
        for (const handler of handlers) {
          handler()
        }
      },
    }
  }

  test('coalesces a synchronous burst into a single trailing call', async () => {
    const {editor, emit} = createEditorStub()
    let calls = 0
    const unsubscribe = subscribeToEditorChange(editor, () => {
      calls++
    })

    for (let i = 0; i < 100; i++) {
      emit()
    }
    expect(calls).toBe(0)

    await Promise.resolve()
    expect(calls).toBe(1)

    for (let i = 0; i < 100; i++) {
      emit()
    }
    await Promise.resolve()
    expect(calls).toBe(2)

    unsubscribe()
    for (let i = 0; i < 100; i++) {
      emit()
    }
    await Promise.resolve()
    expect(calls).toBe(2)
  })
})

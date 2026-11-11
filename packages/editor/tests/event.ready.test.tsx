import {createTestKeyGenerator} from '@portabletext/test'
import {useEffect} from 'react'
import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src'
import {useEditor} from '../src/editor/use-editor'
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
      initialValue: [],
    })

    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })

  test("Scenario: `status` is `loading` in a plugin's first render and `ready` in the `ready` listener", async () => {
    const statusesAtRender: Array<unknown> = []
    const statusesAtReady: Array<unknown> = []

    function StatusProbe() {
      const editor = useEditor()
      statusesAtRender.push(editor.getSnapshot().status)
      useEffect(() => {
        const subscription = editor.on('ready', () => {
          statusesAtReady.push(editor.getSnapshot().status)
        })
        return () => subscription.unsubscribe()
      }, [editor])
      return null
    }

    const {editor} = await createTestEditor({children: <StatusProbe />})

    expect(statusesAtRender[0]).toEqual('loading')
    expect(statusesAtReady).toEqual(['ready'])
    expect(editor.getSnapshot().status).toEqual('ready')
  })

  test('Scenario: `status` never goes back to `loading`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    expect(editor.getSnapshot().status).toEqual('ready')

    editor.send({type: 'update readOnly', readOnly: true})
    editor.send({type: 'update value', value: []})
    editor.send({type: 'update readOnly', readOnly: false})

    expect(editor.getSnapshot().status).toEqual('ready')
  })
})

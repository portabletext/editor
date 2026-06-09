import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('editor.on behavior event', () => {
  test('editor.on fires per behavior event by name', async () => {
    const onInsertText = vi.fn()
    const keyGenerator = createTestKeyGenerator()
    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'hi', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    const subscription = editor.on('insert.text', onInsertText)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        backward: false,
      },
    })

    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(onInsertText).toHaveBeenCalledTimes(1)
    })

    expect(onInsertText).toHaveBeenCalledWith({
      type: 'insert.text',
      text: '!',
    })

    subscription.unsubscribe()
  })

  test('editor.on fires before the behavior chain consumes the event', async () => {
    const observed: Array<string> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'hi', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.on('insert.text', (event) => {
      observed.push(`tap:${event.text}`)
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        backward: false,
      },
    })

    editor.send({type: 'insert.text', text: '?'})

    await vi.waitFor(() => {
      expect(observed).toContain('tap:?')
    })
  })

  test('editor.on(*) sees behavior events alongside relay events', async () => {
    const events: Array<string> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'hi', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event.type)
          }}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        backward: false,
      },
    })

    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(events).toContain('insert.text')
    })
  })

  test('editor.on fires for top-level behavior events that have no dot', async () => {
    const onSelect = vi.fn()
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'hi', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.on('select', onSelect)

    const at = {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      backward: false,
    }

    editor.send({type: 'select', at})

    await vi.waitFor(() => {
      expect(onSelect).toHaveBeenCalledTimes(1)
    })

    expect(onSelect).toHaveBeenCalledWith({type: 'select', at})
  })
})

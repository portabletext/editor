import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('selection emission dedup', () => {
  test('a remote patch that re-spreads the selection range does not emit a duplicate selection', async () => {
    const onSelection = vi.fn()
    const keyGenerator = createTestKeyGenerator()
    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const selectionInsideText = {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      backward: false,
    }
    const updatedValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo BAZ', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'selection') {
              onSelection(event.selection)
            }
          }}
        />
      ),
    })

    editor.send({type: 'select', at: selectionInsideText})

    await vi.waitFor(() => {
      expect(onSelection).toHaveBeenLastCalledWith(selectionInsideText)
    })

    // A remote patch that mutates the span's text triggers Slate's
    // apply-operation selection re-spread, which produces an EditorSelection
    // with a fresh reference but the same semantic value.
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: 'foo BAZ',
          origin: 'remote',
        },
      ],
      snapshot: initialValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(updatedValue)
    })

    expect(onSelection).toHaveBeenCalledTimes(1)
  })

  test('a genuine selection move still emits a selection', async () => {
    const onSelection = vi.fn()
    const keyGenerator = createTestKeyGenerator()
    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const startOfText = {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      backward: false,
    }
    const insideText = {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      backward: false,
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'selection') {
              onSelection(event.selection)
            }
          }}
        />
      ),
    })

    editor.send({type: 'select', at: startOfText})

    await vi.waitFor(() => {
      expect(onSelection).toHaveBeenLastCalledWith(startOfText)
    })

    editor.send({type: 'select', at: insideText})

    await vi.waitFor(() => {
      expect(onSelection).toHaveBeenLastCalledWith(insideText)
    })

    expect(onSelection).toHaveBeenCalledTimes(2)
  })
})

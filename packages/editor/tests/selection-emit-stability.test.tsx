import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins'
import {getActiveDecorators} from '../src/selectors/selector.get-active-decorators'
import {createTestEditor} from '../src/test/vitest'

describe('selection emit stability', () => {
  test('decorator.add on collapsed caret emits a single selection event', async () => {
    const onSelection = vi.fn()
    const keyGenerator = createTestKeyGenerator()
    const foo = {_key: 'k1', _type: 'span', text: 'foo bar', marks: []}
    const block = {
      _key: 'k0',
      _type: 'block',
      children: [foo],
      markDefs: [],
      style: 'normal',
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'selection') {
              onSelection(event)
            }
          }}
        />
      ),
    })

    const caretAt4 = {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
    }

    editor.send({type: 'select', at: caretAt4})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...caretAt4,
        backward: false,
      })
    })

    onSelection.mockClear()

    editor.send({type: 'decorator.add', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(getActiveDecorators(editor.getSnapshot())).toEqual(['strong'])
    })

    expect(onSelection).toHaveBeenCalledTimes(1)
  })

  test('decorator.add on whole-span selection emits a single selection event', async () => {
    const onSelection = vi.fn()
    const keyGenerator = createTestKeyGenerator()
    const foo = {_key: 'k1', _type: 'span', text: 'foo bar', marks: []}
    const block = {
      _key: 'k0',
      _type: 'block',
      children: [foo],
      markDefs: [],
      style: 'normal',
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'selection') {
              onSelection(event)
            }
          }}
        />
      ),
    })

    const wholeSpan = {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
    }

    editor.send({type: 'select', at: wholeSpan})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...wholeSpan,
        backward: false,
      })
    })

    onSelection.mockClear()

    editor.send({type: 'decorator.add', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {...block, children: [{...foo, marks: ['strong']}]},
      ])
    })

    expect(onSelection).toHaveBeenCalledTimes(1)
  })

  test('remote patches that do not move the caret emit no selection event', async () => {
    const onSelection = vi.fn()
    const keyGenerator = createTestKeyGenerator()
    const foo = {_key: 'k1', _type: 'span', text: 'foo bar', marks: []}
    const block = {
      _key: 'k0',
      _type: 'block',
      children: [foo],
      markDefs: [],
      style: 'normal',
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'selection') {
              onSelection(event)
            }
          }}
        />
      ),
    })

    const caretAt3 = {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    }

    editor.send({type: 'select', at: caretAt3})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...caretAt3,
        backward: false,
      })
    })

    onSelection.mockClear()

    // A remote patch that writes the same text must not produce a selection
    // emit, since the caret hasn't moved.
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: 'foo bar',
          origin: 'remote',
        },
      ],
      snapshot: [block],
    })

    const caretAt5 = {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
    }

    editor.send({type: 'select', at: caretAt5})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...caretAt5,
        backward: false,
      })
    })

    expect(onSelection).toHaveBeenCalledTimes(1)
  })
})

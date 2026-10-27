import {defineSchema, type PortableTextTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

describe('event.decorator.remove', () => {
  test('Scenario: Removing a decorator without a selection or `at` is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const foo = {
      _key: keyGenerator(),
      _type: 'span',
      text: 'foo',
      marks: ['strong'],
    }
    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [foo],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([block])
    })

    editor.send({
      type: 'decorator.remove',
      decorator: 'strong',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([block])
    })
  })

  test('Scenario: Removing a decorator without `at` removes it from the selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const foo = {
      _key: keyGenerator(),
      _type: 'span',
      text: 'foo',
      marks: ['strong'],
    }
    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [foo],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([block])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block._key}, 'children', {_key: foo._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block._key}, 'children', {_key: foo._key}],
          offset: 3,
        },
      },
    })

    editor.send({
      type: 'decorator.remove',
      decorator: 'strong',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {...block, children: [{...foo, marks: []}]},
      ])
    })
  })

  test('Scenario: Removing a decorator with `at` and no selection removes it at `at`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const foo = {
      _key: keyGenerator(),
      _type: 'span',
      text: 'foo',
      marks: ['strong'],
    }
    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [foo],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([block])
    })

    editor.send({
      type: 'decorator.remove',
      decorator: 'strong',
      at: {
        anchor: {
          path: [{_key: block._key}, 'children', {_key: foo._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block._key}, 'children', {_key: foo._key}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {...block, children: [{...foo, marks: []}]},
      ])
    })
  })

  test('Scenario: Removing a decorator with both a selection and `at` removes it at `at`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const foo = {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}
    const bar = {
      _key: keyGenerator(),
      _type: 'span',
      text: 'bar',
      marks: ['strong'],
    }
    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [foo, bar],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([block])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block._key}, 'children', {_key: foo._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block._key}, 'children', {_key: foo._key}],
          offset: 3,
        },
      },
    })

    editor.send({
      type: 'decorator.remove',
      decorator: 'strong',
      at: {
        anchor: {
          path: [{_key: block._key}, 'children', {_key: bar._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block._key}, 'children', {_key: bar._key}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {...block, children: [{...foo, text: 'foobar', marks: []}]},
      ])
    })
  })

  test('Scenario: Removing a decorator from part of decorated text splits the span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const span = {
      _key: keyGenerator(),
      _type: 'span',
      text: 'foobar',
      marks: ['strong'],
    }
    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [span],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([block])
    })

    editor.send({
      type: 'decorator.remove',
      decorator: 'strong',
      at: {
        anchor: {
          path: [{_key: block._key}, 'children', {_key: span._key}],
          offset: 1,
        },
        focus: {
          path: [{_key: block._key}, 'children', {_key: span._key}],
          offset: 4,
        },
      },
    })

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value!
      const children = (value[0] as PortableTextTextBlock).children
      expect(children).toHaveLength(3)
      expect(children[0]).toEqual({
        _key: span._key,
        _type: 'span',
        text: 'f',
        marks: ['strong'],
      })
      expect(children[1]).toEqual({
        _key: children[1]!._key,
        _type: 'span',
        text: 'oob',
        marks: [],
      })
      expect(children[2]).toEqual({
        _key: children[2]!._key,
        _type: 'span',
        text: 'ar',
        marks: ['strong'],
      })
    })
  })

  test('Scenario: Removing a decorator at a collapsed selection on an empty decorated span clears its marks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const span = {
      _key: keyGenerator(),
      _type: 'span',
      text: '',
      marks: ['strong'],
    }
    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [span],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([block])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block._key}, 'children', {_key: span._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block._key}, 'children', {_key: span._key}],
          offset: 0,
        },
      },
    })

    editor.send({
      type: 'decorator.remove',
      decorator: 'strong',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {...block, children: [{...span, marks: []}]},
      ])
    })
  })
})

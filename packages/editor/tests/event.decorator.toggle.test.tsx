import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

describe('event.decorator.toggle', () => {
  test('without selection, without `at`', async () => {
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
      type: 'decorator.toggle',
      decorator: 'strong',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([block])
    })
  })

  test('with selection, without `at`', async () => {
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
          path: [{_key: block._key}, 'children', {_key: bar._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block._key}, 'children', {_key: bar._key}],
          offset: 3,
        },
      },
    })

    editor.send({
      type: 'decorator.toggle',
      decorator: 'strong',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {...block, children: [{...foo, text: 'foobar', marks: []}]},
      ])
    })
  })

  test('without selection, with `at`', async () => {
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
      type: 'decorator.toggle',
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

    expect(editor.getSnapshot().context.value).toEqual([
      {...block, children: [{...foo, text: 'foobar', marks: []}]},
    ])
  })

  test('with selection, with `at` (at takes precedence)', async () => {
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
      type: 'decorator.toggle',
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

    expect(editor.getSnapshot().context.value).toEqual([
      {...block, children: [{...foo, text: 'foobar', marks: []}]},
    ])
  })
})

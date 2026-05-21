import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

const keyGenerator = createTestKeyGenerator()
const image = {
  _key: keyGenerator(),
  _type: 'image',
}
const foo = {
  _key: keyGenerator(),
  _type: 'block',
  children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
  markDefs: [],
  style: 'normal',
}
const bar = {
  _key: keyGenerator(),
  _type: 'block',
  children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
  markDefs: [],
  style: 'normal',
}

describe('event.move.block down', () => {
  test('Scenario: Moving block object down', async () => {
    const {editor} = await createTestEditor({
      initialValue: [image, foo, bar],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editor.send({
      type: 'move.block down',
      at: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([foo, image, bar])
    })

    editor.send({
      type: 'move.block down',
      at: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([foo, bar, image])
    })
  })

  test('Scenario: Moving text block down', async () => {
    const {editor} = await createTestEditor({
      initialValue: [foo, bar, image],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editor.send({
      type: 'move.block down',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([bar, foo, image])
    })

    editor.send({
      type: 'move.block down',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([bar, image, foo])
    })
  })
})

describe('event.move.block up', () => {
  test('Scenario: Moving block object up', async () => {
    const {editor} = await createTestEditor({
      initialValue: [foo, bar, image],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editor.send({
      type: 'move.block up',
      at: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([foo, image, bar])
    })

    editor.send({
      type: 'move.block up',
      at: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([image, foo, bar])
    })
  })

  test('Scenario: Moving text block up', async () => {
    const {editor} = await createTestEditor({
      initialValue: [bar, image, foo],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editor.send({
      type: 'move.block up',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([bar, foo, image])
    })

    editor.send({
      type: 'move.block up',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([foo, bar, image])
    })
  })
})

describe('event.move.block', () => {
  test('Scenario: Moving a block to its own position is a no-op', async () => {
    const {editor} = await createTestEditor({
      initialValue: [image, foo, bar],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    // Moving a block onto its own path should leave the value unchanged.
    // Today this silently unsets the source then inserts at a path that
    // no longer resolves, eating the block.
    editor.send({
      type: 'move.block',
      at: [{_key: image._key}],
      to: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([image, foo, bar])
    })
  })
})

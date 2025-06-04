import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'

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
    const {editorRef} = await createTestEditor({
      initialValue: [image, foo, bar],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editorRef.current?.send({
      type: 'move.block down',
      at: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        foo,
        image,
        bar,
      ])
    })

    editorRef.current?.send({
      type: 'move.block down',
      at: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        foo,
        bar,
        image,
      ])
    })
  })

  test('Scenario: Moving text block down', async () => {
    const {editorRef} = await createTestEditor({
      initialValue: [foo, bar, image],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editorRef.current?.send({
      type: 'move.block down',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        bar,
        foo,
        image,
      ])
    })

    editorRef.current?.send({
      type: 'move.block down',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        bar,
        image,
        foo,
      ])
    })
  })
})

describe('event.move.block up', () => {
  test('Scenario: Moving block object up', async () => {
    const {editorRef} = await createTestEditor({
      initialValue: [foo, bar, image],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editorRef.current?.send({
      type: 'move.block up',
      at: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        foo,
        image,
        bar,
      ])
    })

    editorRef.current?.send({
      type: 'move.block up',
      at: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        image,
        foo,
        bar,
      ])
    })
  })

  test('Scenario: Moving text block up', async () => {
    const {editorRef} = await createTestEditor({
      initialValue: [bar, image, foo],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editorRef.current?.send({
      type: 'move.block up',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        bar,
        foo,
        image,
      ])
    })

    editorRef.current?.send({
      type: 'move.block up',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        foo,
        bar,
        image,
      ])
    })
  })
})

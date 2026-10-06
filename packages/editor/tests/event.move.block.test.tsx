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
  test('Scenario: Moving a block onto its own path is a no-op', async () => {
    const {editor} = await createTestEditor({
      initialValue: [image, foo, bar],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editor.send({
      type: 'move.block',
      at: [{_key: image._key}],
      to: [{_key: image._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([image, foo, bar])
    })
  })

  test('Scenario: Moving a block forward past multiple siblings', async () => {
    const {editor} = await createTestEditor({
      initialValue: [image, foo, bar],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    // Move image from index 0 to bar's index 2.
    editor.send({
      type: 'move.block',
      at: [{_key: image._key}],
      to: [{_key: bar._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([foo, bar, image])
    })
  })

  test('Scenario: Moving a block backward past multiple siblings', async () => {
    const {editor} = await createTestEditor({
      initialValue: [foo, bar, image],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    // Move image from index 2 to foo's index 0.
    editor.send({
      type: 'move.block',
      at: [{_key: image._key}],
      to: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([image, foo, bar])
    })
  })

  test('Scenario: Swapping two adjacent blocks via direct move forward', async () => {
    const {editor} = await createTestEditor({
      initialValue: [foo, bar],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editor.send({
      type: 'move.block',
      at: [{_key: foo._key}],
      to: [{_key: bar._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([bar, foo])
    })
  })

  test('Scenario: Swapping two adjacent blocks via direct move backward', async () => {
    const {editor} = await createTestEditor({
      initialValue: [foo, bar],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editor.send({
      type: 'move.block',
      at: [{_key: bar._key}],
      to: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([bar, foo])
    })
  })

  test('Scenario: Moving the block holding the caret keeps the caret in the moved block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const fooBlock = textBlock(fooBlockKey, fooSpanKey, 'foo')
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const barBlock = textBlock(barBlockKey, barSpanKey, 'bar')
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const bazBlock = textBlock(bazBlockKey, bazSpanKey, 'baz')
    const fooSpanPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const {editor} = await createTestEditor({
      initialValue: [fooBlock, barBlock, bazBlock],
      keyGenerator,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: fooSpanPath, offset: 1},
        focus: {path: fooSpanPath, offset: 1},
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: fooSpanPath, offset: 1},
        focus: {path: fooSpanPath, offset: 1},
        backward: false,
      })
    })

    editor.send({
      type: 'move.block',
      at: [{_key: fooBlockKey}],
      to: [{_key: bazBlockKey}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        barBlock,
        bazBlock,
        fooBlock,
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: fooSpanPath, offset: 1},
        focus: {path: fooSpanPath, offset: 1},
        backward: false,
      })
    })
  })

  test('Scenario: Moving the block holding an expanded selection keeps the selection in the moved block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const fooBlock = textBlock(fooBlockKey, fooSpanKey, 'foo')
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const barBlock = textBlock(barBlockKey, barSpanKey, 'bar')
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const bazBlock = textBlock(bazBlockKey, bazSpanKey, 'baz')
    const bazSpanPath = [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}]
    const {editor} = await createTestEditor({
      initialValue: [fooBlock, barBlock, bazBlock],
      keyGenerator,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: bazSpanPath, offset: 1},
        focus: {path: bazSpanPath, offset: 3},
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: bazSpanPath, offset: 1},
        focus: {path: bazSpanPath, offset: 3},
        backward: false,
      })
    })

    editor.send({
      type: 'move.block',
      at: [{_key: bazBlockKey}],
      to: [{_key: fooBlockKey}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        bazBlock,
        fooBlock,
        barBlock,
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: bazSpanPath, offset: 1},
        focus: {path: bazSpanPath, offset: 3},
        backward: false,
      })
    })
  })
})

function textBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _key: blockKey,
    _type: 'block',
    children: [{_key: spanKey, _type: 'span', text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

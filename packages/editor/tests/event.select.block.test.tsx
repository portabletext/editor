import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/internal-utils/test-editor'

const keyGenerator = createTestKeyGenerator()
const fooBlock = keyGenerator()
const fooSpan = keyGenerator()
const imageBlock = keyGenerator()
const barBlock = keyGenerator()
const barSpan = keyGenerator()
const initialValue = [
  {
    _key: fooBlock,
    _type: 'block',
    children: [{_key: fooSpan, _type: 'span', text: 'foo'}],
  },
  {
    _key: imageBlock,
    _type: 'image',
  },
  {
    _key: barBlock,
    _type: 'block',
    children: [{_key: barSpan, _type: 'span', text: 'bar'}],
  },
]

describe('event.select.previous block', () => {
  test('Scenario: No `select` property', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      keyGenerator,
      initialValue,
    })

    editor.send({type: 'select.block', at: [{_key: imageBlock}]})
    editor.send({type: 'select.previous block'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 0,
        },
        focus: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: `select` property is `start`', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      keyGenerator,
      initialValue,
    })

    editor.send({type: 'select.block', at: [{_key: imageBlock}]})
    editor.send({type: 'select.previous block', select: 'start'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 0,
        },
        focus: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: `select` property is `end`', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      keyGenerator,
      initialValue,
    })

    editor.send({type: 'select.block', at: [{_key: imageBlock}]})
    editor.send({type: 'select.previous block', select: 'end'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 3,
        },
        focus: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 3,
        },
        backward: false,
      })
    })
  })
})

describe('event.select.next block', () => {
  test('Scenario: No `select` property', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      keyGenerator,
      initialValue,
    })

    editor.send({type: 'select.block', at: [{_key: imageBlock}]})
    editor.send({type: 'select.next block'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: barBlock}, 'children', {_key: barSpan}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlock}, 'children', {_key: barSpan}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: `select` property is `start`', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      keyGenerator,
      initialValue,
    })

    editor.send({type: 'select.block', at: [{_key: imageBlock}]})
    editor.send({type: 'select.next block', select: 'start'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: barBlock}, 'children', {_key: barSpan}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlock}, 'children', {_key: barSpan}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: `select` property is `end`', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      keyGenerator,
      initialValue,
    })

    editor.send({type: 'select.block', at: [{_key: imageBlock}]})
    editor.send({type: 'select.next block', select: 'end'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: barBlock}, 'children', {_key: barSpan}],
          offset: 3,
        },
        focus: {
          path: [{_key: barBlock}, 'children', {_key: barSpan}],
          offset: 3,
        },
        backward: false,
      })
    })
  })
})

describe('event.select.block', () => {
  test('Scenario: No `select` property', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      keyGenerator,
      initialValue,
    })

    editor.send({
      type: 'select.block',
      at: [{_key: fooBlock}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 0,
        },
        focus: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 0,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'select.block',
      at: [{_key: imageBlock}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: imageBlock}], offset: 0},
        focus: {path: [{_key: imageBlock}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: `select` property is `start`', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      keyGenerator,
      initialValue,
    })

    editor.send({
      type: 'select.block',
      at: [{_key: fooBlock}],
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 0,
        },
        focus: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 0,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'select.block',
      at: [{_key: imageBlock}],
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: imageBlock}], offset: 0},
        focus: {path: [{_key: imageBlock}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: `select` property is `end`', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      keyGenerator,
      initialValue,
    })

    editor.send({
      type: 'select.block',
      at: [{_key: fooBlock}],
      select: 'end',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 3,
        },
        focus: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 3,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'select.block',
      at: [{_key: imageBlock}],
      select: 'end',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: imageBlock}], offset: 0},
        focus: {path: [{_key: imageBlock}], offset: 0},
        backward: false,
      })
    })
  })
})

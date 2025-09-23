import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

describe('event.delete', () => {
  test('Scenario: Deleting collapsed selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'foo',
            },
          ],
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [
            {
              _type: 'span',
              _key: 'k3',
              text: 'bar',
            },
          ],
        },
        {
          _type: 'image',
          _key: 'k4',
        },
      ],
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        'bar',
        '{image}',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foobar',
        '{image}',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
    })
  })

  test('Scenario: Deleting entire editor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: imageKey,
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        '{image}',
        'bar',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: Deleting selection hanging around a block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo'}],
        },
        {
          _key: 'k2',
          _type: 'image',
        },
        {
          _key: 'k3',
          _type: 'block',
          children: [{_key: 'k4', _type: 'span', text: 'bar'}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        '{image}',
        'bar',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['bar'])
    })
  })

  test('Scenario: Deleting selection hanging around a block object #2', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo'}],
        },
        {
          _key: 'k2',
          _type: 'image',
        },
        {
          _key: 'k3',
          _type: 'block',
          children: [{_key: 'k4', _type: 'span', text: 'bar'}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        '{image}',
        'bar',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        backward: true,
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['bar'])
    })
  })

  test('Scenario: Deleting selection hanging around a block object #3', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo'}],
        },
        {
          _key: 'k2',
          _type: 'image',
        },
        {
          _key: 'k3',
          _type: 'block',
          children: [{_key: 'k4', _type: 'span', text: 'bar'}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        '{image}',
        'bar',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })
  })

  test('Scenario: Deleting block offset', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const blockBKey = keyGenerator()
    const fizzKey = keyGenerator()
    const buzzKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo'},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: bazKey, text: 'baz'},
          ],
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [
            {_type: 'span', _key: fizzKey, text: 'fizz'},
            {_type: 'span', _key: buzzKey, text: 'buzz', marks: ['strong']},
          ],
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: blockBKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockBKey}],
          offset: 7,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo,bar,baz',
        'fi,z',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: blockAKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockAKey}],
          offset: 7,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foaz', 'fi,z'])
    })
  })

  test('Scenario: Deleting multiple blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block0Key = keyGenerator()
    const block1Key = keyGenerator()
    const block2Key = keyGenerator()
    const block3Key = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: block0Key,
          children: [{_type: 'span', _key: keyGenerator(), text: 'foo'}],
        },
        {
          _type: 'image',
          _key: block1Key,
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: keyGenerator(), text: 'bar'}],
        },
        {
          _type: 'block',
          _key: block3Key,
          children: [{_type: 'span', _key: keyGenerator(), text: 'baz'}],
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: block0Key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block2Key}],
          offset: 0,
        },
      },
      unit: 'block',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['baz'])
    })
  })
})

import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {getSelectionText} from '../src/internal-utils/selection-text'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'

describe('event.split', () => {
  test('Scenario: Splitting mid-block before inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'foo',
              marks: [],
            },
            {
              _key: keyGenerator(),
              _type: 'stock-ticker',
              value: 'AAPL',
            },
            {
              _key: keyGenerator(),
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    editor.send({
      type: 'split',
    })

    expect(getTersePt(editor.getSnapshot().context)).toEqual([
      'foo',
      ',{stock-ticker},',
    ])
  })

  test('Scenario: Splitting text block with custom properties', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo bar baz'},
          ],
          _foo: 'bar',
          baz: 42,
        },
      ],
    })

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    editor.send({
      type: 'split',
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        _foo: 'bar',
        baz: 42,
      },
      {
        _key: 'k4',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: ' bar baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Scenario: Splitting inline object is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const stockTickerKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: fooKey,
              _type: 'span',
              text: 'foo',
              marks: [],
            },
            {
              _key: stockTickerKey,
              _type: 'stock-ticker',
              value: 'AAPL',
            },
            {
              _key: keyGenerator(),
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          offset: 0,
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        },
        focus: {
          offset: 0,
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        },
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          offset: 0,
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        },
        focus: {
          offset: 0,
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        },
        backward: false,
      })
    })

    editor.send({type: 'split'})

    await userEvent.keyboard('{ArrowRight}')

    await userEvent.type(locator, 'bar')

    expect(getTersePt(editor.getSnapshot().context)).toEqual([
      'foo,{stock-ticker},bar',
    ])
  })

  test('Scenario: Splitting block object is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: imageKey,
          _type: 'image',
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'bar'}],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          offset: 0,
          path: [{_key: imageKey}],
        },
        focus: {
          offset: 0,
          path: [{_key: imageKey}],
        },
      },
    })

    await vi.waitFor(() => {
      return expect(getSelectionText(editor.getSnapshot().context)).toEqual([
        '{image}',
      ])
    })

    editor.send({type: 'split'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        '{image}',
        'bar',
      ])
    })
  })

  test('Scenario: Splitting with an expanded selection starting on a block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const barKey = keyGenerator()
    const imageKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
        },
        {
          _key: imageKey,
          _type: 'image',
        },
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: barKey, _type: 'span', text: 'bar'}],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          offset: 0,
          path: [{_key: imageKey}],
        },
        focus: {
          offset: 1,
          path: [{_key: blockKey}, 'children', {_key: barKey}],
        },
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          offset: 0,
          path: [{_key: imageKey}],
        },
        focus: {
          offset: 1,
          path: [{_key: blockKey}, 'children', {_key: barKey}],
        },
        backward: false,
      })
    })

    editor.send({type: 'split'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo', 'ar'])
    })

    await userEvent.type(locator, 'baz')

    expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo', 'bazar'])
  })

  test('Scenario: Splitting with an expanded selection ending on a block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const imageKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: fooKey, _type: 'span', text: 'foo'}],
        },
        {
          _key: imageKey,
          _type: 'image',
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'bar'}],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          offset: 1,
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
        },
        focus: {
          offset: 0,
          path: [{_key: imageKey}],
        },
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          offset: 1,
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
        },
        focus: {
          offset: 0,
          path: [{_key: imageKey}],
        },
        backward: false,
      })
    })

    editor.send({type: 'split'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['f', 'bar'])
    })

    await userEvent.type(locator, 'baz')

    expect(getTersePt(editor.getSnapshot().context)).toEqual(['f', 'bazbar'])
  })

  test('Scenario: Splitting with an expanded selection from one span to another', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _key: fooBlockKey,
          _type: 'block',
          children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: barBlockKey,
          _type: 'block',
          children: [
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          offset: 2,
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
        },
        focus: {
          offset: 1,
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
        },
      },
    })

    editor.send({type: 'split'})

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: fooBlockKey,
          _type: 'block',
          children: [{_key: fooSpanKey, _type: 'span', text: 'fo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: barBlockKey,
          _type: 'block',
          children: [
            {_key: barSpanKey, _type: 'span', text: 'ar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})

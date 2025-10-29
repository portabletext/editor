import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'

describe('Feature: Inline Objects', () => {
  test('Scenario: Deleting inline object with Backspace', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
        },
      ],
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
    })

    await userEvent.click(locator)

    const stockTickerSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
      backward: false,
    }

    editor.send({
      type: 'select',
      at: stockTickerSelection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        stockTickerSelection,
      )
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })

    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
    })
  })

  test('Scenario: Deleting inline object with Delete', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
        },
      ],
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
    })

    await userEvent.click(locator)

    const stockTickerSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
      backward: false,
    }

    editor.send({
      type: 'select',
      at: stockTickerSelection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        stockTickerSelection,
      )
    })

    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })

    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
    })
  })

  test('Scenario: Pressing Enter on an inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
        },
      ],
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
    })

    await userEvent.click(locator)

    const stockTickerSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
      backward: false,
    }

    editor.send({
      type: 'select',
      at: stockTickerSelection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        stockTickerSelection,
      )
    })

    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo,{stock-ticker},',
        '',
      ])
    })

    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo,{stock-ticker},',
        'bar',
      ])
    })
  })
})

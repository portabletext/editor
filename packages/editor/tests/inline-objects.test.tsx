import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {toTextspec} from '@portabletext/textspec'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineBehavior, raise} from '../src/behaviors'
import {BehaviorPlugin} from '../src/plugins'
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('P: foo')
    })

    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('P: foobar')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('P: foo')
    })

    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('P: foobar')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('P: foo {stock-ticker}\nP:')
    })

    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('P: foo {stock-ticker}\nP: bar')
    })
  })

  test('Scenario: `insert.text` on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: span1Key, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
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

    editor.send({type: 'insert.text', text: 'hello'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('P: foo {stock-ticker} hellobar')
    })
  })

  test('Scenario: Typing after ArrowRight past inline object inserted by behavior', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                () => [
                  raise({
                    type: 'delete',
                    at: {
                      anchor: {
                        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
                        offset: 0,
                      },
                      focus: {
                        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
                        offset: 1,
                      },
                    },
                  }),
                  raise({
                    type: 'insert.child',
                    child: {
                      _key: 'k2',
                      _type: 'stock-ticker',
                    },
                  }),
                  raise({
                    type: 'select',
                    at: {
                      anchor: {
                        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
                        offset: 0,
                      },
                      focus: {
                        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
                        offset: 0,
                      },
                    },
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
    })

    await userEvent.click(locator)

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('P: {stock-ticker}')
    })

    await userEvent.keyboard('{ArrowRight}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
        backward: false,
      })
    })

    await userEvent.type(locator, 'new')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('P: {stock-ticker} new')
    })
  })
})

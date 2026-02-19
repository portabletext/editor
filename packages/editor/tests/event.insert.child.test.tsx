import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineBehavior, raise} from '../src/behaviors'
import {BehaviorPlugin, EventListenerPlugin} from '../src/plugins'
import {getFocusSpan, getFocusTextBlock} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'

describe('event.insert.child', () => {
  test('Scenario: Carrying over an annotation', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({snapshot}) => {
                const focusTextBlock = getFocusTextBlock(snapshot)
                const focusSpan = getFocusSpan(snapshot)

                if (!focusTextBlock || !focusSpan) {
                  return false
                }

                const suggestionKey =
                  focusSpan.node.marks?.at(0) ?? snapshot.context.keyGenerator()

                return {focusSpan, focusTextBlock, suggestionKey}
              },
              actions: [
                ({event}, {focusSpan, focusTextBlock, suggestionKey}) => [
                  ...((focusSpan.node.marks ?? []).length === 0
                    ? [
                        raise({
                          type: 'block.set',
                          at: focusTextBlock.path,
                          props: {
                            markDefs: [
                              ...(focusTextBlock.node.markDefs ?? []),
                              {
                                _type: 'suggestion',
                                _key: suggestionKey,
                              },
                            ],
                          },
                        }),
                        raise({
                          type: 'insert.child',
                          child: {
                            _type: 'span',
                            text: event.text,
                            marks: [suggestionKey],
                          },
                        }),
                      ]
                    : [
                        raise({
                          type: 'insert.child',
                          child: {
                            _type: 'span',
                            text: event.text,
                            marks: [suggestionKey],
                          },
                        }),
                      ]),
                ],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        annotations: [{name: 'suggestion'}],
      }),
    })

    await userEvent.click(locator)

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k3', text: 'a', marks: ['k2']}],
          markDefs: [{_type: 'suggestion', _key: 'k2'}],
          style: 'normal',
        },
      ])
    })

    await userEvent.type(locator, 'b')

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k3', text: 'ab', marks: ['k2']}],
          markDefs: [{_type: 'suggestion', _key: 'k2'}],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Inserting span on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: keyGenerator(), text: 'bar', marks: []},
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

    editor.send({
      type: 'insert.child',
      child: {
        _type: 'span',
        text: 'new',
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo,{stock-ticker},newbar',
      ])
    })
  })

  test('Scenario: Inserting inline object on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: keyGenerator(), text: ' bar baz', marks: []},
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

    editor.send({
      type: 'insert.child',
      child: {
        _type: 'stock-ticker',
        symbol: 'AAPL',
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo,{stock-ticker},,{stock-ticker}, bar baz',
      ])
    })
  })

  test('Scenario: Inserting inline object at the end of text block', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)

    const selection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 3,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 3,
      },
      backward: false,
    }
    editor.send({
      type: 'select',
      at: selection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    editor.send({
      type: 'insert.child',
      child: {
        _type: 'stock-ticker',
        symbol: 'AAPL',
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo,{stock-ticker},',
      ])
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: blockKey}, 'children', 0],
          position: 'after',
          items: [
            {
              _key: 'k4',
              _type: 'stock-ticker',
              symbol: 'AAPL',
            },
          ],
        },
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: 'k4'}],
          position: 'after',
          items: [
            {
              _key: 'k5',
              _type: 'span',
              marks: [],
              text: '',
            },
          ],
        },
      ])
    })
  })
})

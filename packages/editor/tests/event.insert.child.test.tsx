import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineBehavior, raise} from '../src/behaviors'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {BehaviorPlugin} from '../src/plugins'
import {getFocusSpan, getFocusTextBlock} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'

describe('event.insert.child', () => {
  test('Scenario: Inserting inline object inside span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'foo bar baz',
            marks: [],
          },
        ],
      },
    ]

    const {editor, locator} = await createTestEditor({
      initialValue,
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'stock-ticker',
            fields: [{name: 'symbol', type: 'string'}],
          },
        ],
      }),
    })

    await userEvent.click(locator)

    const afterFooSelection = getSelectionAfterText(
      editor.getSnapshot().context,
      'foo',
    )

    editor.send({
      type: 'select',
      at: afterFooSelection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterFooSelection)
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
        'foo,{stock-ticker}, bar baz',
      ])
    })
  })

  test('Scenario: Inserting inline object on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'foo',
            marks: [],
          },
          {
            _type: 'stock-ticker',
            _key: stockTickerKey,
            symbol: 'AAPL',
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: ' bar baz',
            marks: [],
          },
        ],
      },
    ]

    const {editor, locator} = await createTestEditor({
      initialValue,
      keyGenerator,
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
        symbol: 'NVDA',
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo,{stock-ticker},,{stock-ticker}, bar baz',
      ])
    })
  })

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
})

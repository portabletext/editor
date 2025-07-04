import {userEvent} from '@vitest/browser/context'
import {assert, describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {converterPortableText} from '../src/converters/converter.portable-text'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'

describe('event.drag.drop', () => {
  test('Scenario: Dragging inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const stockTicketKey = keyGenerator()
    const barKey = keyGenerator()

    const {locator, editorRef, editorActorRef, slateRef} =
      await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          inlineObjects: [
            {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
          ],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: keyGenerator(),
                _type: 'span',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'stock-ticker',
                _key: stockTicketKey,
                symbol: 'AAPL',
              },
              {
                _key: barKey,
                _type: 'span',
                text: 'bar',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

    const stockTickerSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: stockTicketKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: stockTicketKey}],
        offset: 0,
      },
    }

    await userEvent.click(locator)
    editorRef.current?.send({type: 'select', at: stockTickerSelection})

    await vi.waitFor(() => {
      const selection = editorRef.current?.getSnapshot().context.selection
      expect(selection).toEqual({
        ...stockTickerSelection,
        backward: false,
      })
    })

    const json = converterPortableText.serialize({
      snapshot: editorRef.current?.getSnapshot()!,
      event: {
        type: 'serialize',
        originEvent: 'drag.dragstart',
      },
    })

    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    editorActorRef.current?.send({
      type: 'behavior event',
      behaviorEvent: {
        type: 'drag.drop',
        originEvent: {
          dataTransfer,
        },
        dragOrigin: {selection: stockTickerSelection},
        position: {
          block: 'end',
          isEditor: false,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 3,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 3,
            },
          },
        },
      },
      editor: slateRef.current!,
    })

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foobar,{stock-ticker},'])
    })
  })
})

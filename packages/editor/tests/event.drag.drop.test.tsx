import {createTestKeyGenerator} from '@portabletext/test'
import {assert, describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {converterPortableText} from '../src/converters/converter.portable-text'
import {safeStringify} from '../src/internal-utils/safe-json'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('event.drag.drop', () => {
  test('Scenario: Dragging inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const stockTicketKey = keyGenerator()
    const barKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
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
              _key: fooKey,
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
    editor.send({type: 'select', at: stockTickerSelection})

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).toEqual({
        ...stockTickerSelection,
        backward: false,
      })
    })

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
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

    editor.send({
      type: 'drag.drop',
      originEvent: {
        dataTransfer,
      },
      dragOrigin: {selection: stockTickerSelection},
      position: {
        block: 'end',
        isEditor: false,
        isContainer: false,
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
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foobar', marks: []},
            {_key: stockTicketKey, _type: 'stock-ticker', symbol: 'AAPL'},
            {_key: 'k7', _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Dragging block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo bar baz'}],
        },
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
    })

    const imageSelection = {
      anchor: {
        path: [{_key: imageKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: imageKey}],
        offset: 0,
      },
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: imageSelection})

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).toEqual({
        ...imageSelection,
        backward: false,
      })
    })

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
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

    editor.send({
      type: 'drag.drop',
      originEvent: {
        dataTransfer,
      },
      dragOrigin: {selection: imageSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Dragging a block object when dataTransfer only carries text/plain (mobile/iOS)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo bar baz'}],
        },
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
    })

    const imageSelection = {
      anchor: {path: [{_key: imageKey}], offset: 0},
      focus: {path: [{_key: imageKey}], offset: 0},
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: imageSelection})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...imageSelection,
        backward: false,
      })
    })

    // Mimic iOS Safari: dataTransfer carries ONLY text/plain. Custom mime
    // types like `application/x-portable-text` were silently stripped by
    // the platform during the drag. The drop handler must still complete
    // the move because `dragOrigin` carries the source selection.
    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', '[Image]')

    editor.send({
      type: 'drag.drop',
      originEvent: {
        dataTransfer,
      },
      dragOrigin: {selection: imageSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
  test('Scenario: External drag.drop (no dragOrigin) inserts the deserialized payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo'}],
        },
      ],
    })

    await userEvent.click(locator)

    const externalPayload = safeStringify([
      {
        _key: 'externalImage',
        _type: 'image',
        src: 'https://example.com/external.jpg',
      },
    ])

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('application/x-portable-text', externalPayload)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'externalImage',
          _type: 'image',
          src: 'https://example.com/external.jpg',
        },
      ])
    })
  })

  test('Scenario: A consumer-overridden drag.drop reaches deserialization.success and inserts the payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo'}],
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'drag.drop',
              actions: [
                ({event}) => [raise({type: 'deserialize', originEvent: event})],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    const consumerPayload = safeStringify([
      {
        _key: 'consumerImage',
        _type: 'image',
        src: 'https://example.com/consumer.jpg',
      },
    ])

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('application/x-portable-text', consumerPayload)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'consumerImage',
          _type: 'image',
          src: 'https://example.com/consumer.jpg',
        },
      ])
    })
  })
})

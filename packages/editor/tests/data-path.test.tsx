import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('data-pt-path attribute', () => {
  describe('initial rendering', () => {
    test('Scenario: The editor renders an empty data-pt-path', async () => {
      const {locator} = await createTestEditor()

      await vi.waitFor(() => {
        expect(locator).toHaveAttribute('data-pt-path', '')
      })
    })

    test('Scenario: A text block renders its key as data-pt-path', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {locator} = await createTestEditor({
        keyGenerator: createTestKeyGenerator(),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'hello'}],
          },
        ],
      })

      await vi.waitFor(() => {
        const blockLocator = locator
          .element()
          .querySelector(`[data-pt-path='[_key=="${blockKey}"]']`)

        expect(blockLocator).not.toBeNull()
      })
    })

    test('Scenario: A span renders its block and span keys as data-pt-path', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {locator} = await createTestEditor({
        keyGenerator: createTestKeyGenerator(),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'hello'}],
          },
        ],
      })

      await vi.waitFor(() => {
        const spanLocator = locator
          .element()
          .querySelector(
            `[data-pt-path='[_key=="${blockKey}"].children[_key=="${spanKey}"]']`,
          )

        expect(spanLocator).not.toBeNull()
      })
    })

    test('Scenario: A block object renders its key as data-pt-path', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const imageKey = keyGenerator()

      const {locator} = await createTestEditor({
        keyGenerator: createTestKeyGenerator(),
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'hello'}],
          },
          {
            _key: imageKey,
            _type: 'image',
          },
        ],
      })

      await vi.waitFor(() => {
        const imageLocator = locator
          .element()
          .querySelector(`[data-pt-path='[_key=="${imageKey}"]']`)

        expect(imageLocator).not.toBeNull()
      })
    })

    test('Scenario: An inline object renders its block and child keys as data-pt-path', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const stockTickerKey = keyGenerator()
      const trailingSpanKey = keyGenerator()

      const {locator} = await createTestEditor({
        keyGenerator: createTestKeyGenerator(),
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'before '},
              {_key: stockTickerKey, _type: 'stock-ticker'},
              {_key: trailingSpanKey, _type: 'span', text: ' after'},
            ],
          },
        ],
      })

      await vi.waitFor(() => {
        const stockTickerLocator = locator
          .element()
          .querySelector(
            `[data-pt-path='[_key=="${blockKey}"].children[_key=="${stockTickerKey}"]']`,
          )

        expect(stockTickerLocator).not.toBeNull()
      })
    })

    test('Scenario: Multiple text blocks each render their block and span data-pt-path', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKeyA = keyGenerator()
      const spanKeyA = keyGenerator()
      const blockKeyB = keyGenerator()
      const spanKeyB = keyGenerator()

      const {locator} = await createTestEditor({
        keyGenerator: createTestKeyGenerator(),
        initialValue: [
          {
            _key: blockKeyA,
            _type: 'block',
            children: [{_key: spanKeyA, _type: 'span', text: 'first'}],
          },
          {
            _key: blockKeyB,
            _type: 'block',
            children: [{_key: spanKeyB, _type: 'span', text: 'second'}],
          },
        ],
      })

      await vi.waitFor(() => {
        const blockALocator = locator
          .element()
          .querySelector(`[data-pt-path='[_key=="${blockKeyA}"]']`)
        const blockBLocator = locator
          .element()
          .querySelector(`[data-pt-path='[_key=="${blockKeyB}"]']`)
        const spanALocator = locator
          .element()
          .querySelector(
            `[data-pt-path='[_key=="${blockKeyA}"].children[_key=="${spanKeyA}"]']`,
          )
        const spanBLocator = locator
          .element()
          .querySelector(
            `[data-pt-path='[_key=="${blockKeyB}"].children[_key=="${spanKeyB}"]']`,
          )

        expect(blockALocator).not.toBeNull()
        expect(blockBLocator).not.toBeNull()
        expect(spanALocator).not.toBeNull()
        expect(spanBLocator).not.toBeNull()
      })
    })
  })

  test('Scenario: `block.set` with a new text block key updates its data-pt-path', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const newBlockKey = keyGenerator()

    editor.send({
      type: 'block.set',
      at: [{_key: blockKey}],
      props: {
        _key: newBlockKey,
      },
    })

    await vi.waitFor(() => {
      const newBlockLocator = locator
        .element()
        .querySelector(`[data-pt-path='[_key=="${newBlockKey}"]']`)
      const newSpanLocator = locator
        .element()
        .querySelector(
          `[data-pt-path='[_key=="${newBlockKey}"].children[_key=="${spanKey}"]']`,
        )

      expect(newBlockLocator).not.toBeNull()
      expect(newSpanLocator).not.toBeNull()
    })
  })

  test('Scenario: `block.set` with a new block object key updates its data-pt-path', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: imageKey,
          _type: 'image',
        },
      ],
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    await vi.waitFor(() => {
      const imageLocator = locator
        .element()
        .querySelector(`[data-pt-path='[_key=="${imageKey}"]']`)

      expect(
        imageLocator,
        "Unable to find image from it's data-pt-path",
      ).not.toBeNull()
    })

    const newImageKey = keyGenerator()

    editor.send({
      type: 'block.set',
      at: [{_key: imageKey}],
      props: {
        _key: newImageKey,
      },
    })

    await vi.waitFor(() => {
      const newImageLocator = locator
        .element()
        .querySelector(`[data-pt-path='[_key=="${newImageKey}"]']`)

      expect(
        newImageLocator,
        "Unable to find image from it's updated data-pt-path",
      ).not.toBeNull()
    })
  })

  test('Scenario: A remote patch that sets a new text block key updates its data-pt-path', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const newBlockKey = keyGenerator()

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, '_key'],
          value: newBlockKey,
        },
      ],
    })

    await vi.waitFor(() => {
      const newBlockLocator = locator
        .element()
        .querySelector(`[data-pt-path='[_key=="${newBlockKey}"]']`)
      const newSpanLocator = locator
        .element()
        .querySelector(
          `[data-pt-path='[_key=="${newBlockKey}"].children[_key=="${spanKey}"]']`,
        )

      expect(newBlockLocator).not.toBeNull()
      expect(newSpanLocator).not.toBeNull()
    })
  })

  test('Scenario: A remote patch that sets a new block object key updates its data-pt-path', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [{_key: imageKey, _type: 'image'}],
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    const newImageKey = keyGenerator()

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: imageKey}, '_key'],
          value: newImageKey,
        },
      ],
    })

    await vi.waitFor(() => {
      const newImageLocator = locator
        .element()
        .querySelector(`[data-pt-path='[_key=="${newImageKey}"]']`)

      expect(newImageLocator).not.toBeNull()
    })
  })

  test('Scenario: Quoted null field paths support clicking and typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const containerKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'null', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: containerKey,
          null: [
            {
              _type: 'block',
              _key: blockKey,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: spanKey, text: 'foo', marks: []},
              ],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'null',
              render: ({attributes, children}) => (
                <div {...attributes}>{children}</div>
              ),
            }),
          ]}
        />
      ),
    })
    await vi.waitFor(() => {
      expect(
        locator
          .element()
          .querySelector('[data-pt-block="text"]')
          ?.getAttribute('data-pt-path'),
      ).toEqual('[_key=="k0"]["null"][_key=="k1"]')
      expect(
        locator
          .element()
          .querySelector('span[data-pt-path]')
          ?.getAttribute('data-pt-path'),
      ).toEqual('[_key=="k0"]["null"][_key=="k1"].children[_key=="k2"]')
    })
    await userEvent.click(locator.getByText('foo'))
    await userEvent.keyboard('{End}a')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'k0',
          null: [
            {
              _type: 'block',
              _key: 'k1',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k2', text: 'fooa', marks: []}],
            },
          ],
        },
      ])
    })
  })
})

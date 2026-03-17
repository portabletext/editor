import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

describe('data-pt-path attribute', () => {
  describe('initial rendering', () => {
    test('editor data-pt-path', async () => {
      const {locator} = await createTestEditor()

      await vi.waitFor(() => {
        expect(locator).toHaveAttribute('data-pt-path', '')
      })
    })

    test('text block data-pt-path', async () => {
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

      const blockLocator = locator
        .element()
        .querySelector(`[data-pt-path='[_key=="${blockKey}"]']`)

      await vi.waitFor(() => {
        expect(blockLocator).not.toBeNull()
      })
    })

    test('span data-pt-path', async () => {
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

      const spanLocator = locator
        .element()
        .querySelector(
          `[data-pt-path='[_key=="${blockKey}"].children[_key=="${spanKey}"]']`,
        )

      await vi.waitFor(() => {
        expect(spanLocator).not.toBeNull()
      })
    })

    test('block object data-pt-path', async () => {
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

      const imageLocator = locator
        .element()
        .querySelector(`[data-pt-path='[_key=="${imageKey}"]']`)

      await vi.waitFor(() => {
        expect(imageLocator).not.toBeNull()
      })
    })

    test('inline object data-pt-path', async () => {
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

      const stockTickerLocator = locator
        .element()
        .querySelector(
          `[data-pt-path='[_key=="${blockKey}"].children[_key=="${stockTickerKey}"]']`,
        )

      await vi.waitFor(() => {
        expect(stockTickerLocator).not.toBeNull()
      })
    })

    test('multiple text blocks', async () => {
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

      await vi.waitFor(() => {
        expect(blockALocator).not.toBeNull()
        expect(blockBLocator).not.toBeNull()
        expect(spanALocator).not.toBeNull()
        expect(spanBLocator).not.toBeNull()
      })
    })
  })

  test('`block.set` text block key', async () => {
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

  test('`block.set` block object key', async () => {
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

    const imageLocator = locator
      .element()
      .querySelector(`[data-pt-path='[_key=="${imageKey}"]']`)

    await vi.waitFor(() => {
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

  test('remote patch updates text block key', async () => {
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
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, '_key'],
          value: newBlockKey,
        },
      ],
      snapshot: undefined,
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

  test('remote patch updates block object key', async () => {
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
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: imageKey}, '_key'],
          value: newImageKey,
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      const newImageLocator = locator
        .element()
        .querySelector(`[data-pt-path='[_key=="${newImageKey}"]']`)

      expect(newImageLocator).not.toBeNull()
    })
  })
})

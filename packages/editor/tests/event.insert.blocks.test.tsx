import {isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {beforeEach, describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {defineBehavior, type InsertPlacement} from '../src/behaviors'
import {effect, forward} from '../src/behaviors/behavior.types.action'
import type {SyntheticBehaviorEvent} from '../src/behaviors/behavior.types.event'
import {BehaviorPlugin} from '../src/plugins'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {getTextBlockText} from '../src/utils'

describe('event.insert.blocks', () => {
  test('Scenario: Inserting text block with lonely inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'image',
            fields: [
              {name: 'src', type: 'string'},
              {name: 'alt', type: 'string'},
            ],
          },
        ],
      }),
    })

    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      blocks: [
        {
          _key: keyGenerator(),
          children: [
            {
              _type: 'image',
              src: 'https://example.com/image.jpg',
              alt: 'Image',
              _key: keyGenerator(),
            },
          ],
          markDefs: [],
          _type: 'block',
          style: 'normal',
        },
        {
          _key: keyGenerator(),
          children: [
            {
              _type: 'span',
              _key: keyGenerator(),
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          _type: 'block',
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'B: {image alt="Image" src="https://example.com/image.jpg"}',
          'B: |',
        ].join('\n'),
      )
    })
  })

  describe('Inserting blocks with duplicate _keys', () => {
    async function createTest(options: {
      target:
        | 'text-start'
        | 'text-end'
        | 'text-mid'
        | 'empty text'
        | 'block object'
      placement: InsertPlacement
      select: 'start' | 'end' | 'none'
      useAtProp?: boolean
    }) {
      const keyGenerator = createTestKeyGenerator()
      const imageAKey = keyGenerator()
      const imageBKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const imageA = {
        _key: imageAKey,
        _type: 'image',
        src: 'https://example.com/image-a.jpg',
      }
      const imageB = {
        _key: imageBKey,
        _type: 'image',
        src: 'https://example.com/image-b.jpg',
      }
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text:
              options.target === 'text-start' ||
              options.target === 'text-mid' ||
              options.target === 'text-end'
                ? 'foobar'
                : '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      }
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'src', type: 'string'}]},
          ],
        }),
        initialValue: [imageA, imageB, block],
      })

      const initialSelection =
        options.target === 'empty text' || options.target === 'text-start'
          ? {
              anchor: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 0,
              },
              focus: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 0,
              },
              backward: false,
            }
          : options.target === 'text-end'
            ? {
                anchor: {
                  path: [{_key: blockKey}, 'children', {_key: spanKey}],
                  offset: 6,
                },
                focus: {
                  path: [{_key: blockKey}, 'children', {_key: spanKey}],
                  offset: 6,
                },
                backward: false,
              }
            : options.target === 'text-mid'
              ? {
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
              : {
                  anchor: {
                    path: [{_key: imageAKey}],
                    offset: 0,
                  },
                  focus: {
                    path: [{_key: imageAKey}],
                    offset: 0,
                  },
                  backward: false,
                }

      if (!options.useAtProp) {
        await userEvent.click(locator)

        editor.send({
          type: 'select',
          at: initialSelection,
        })

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.selection).toEqual(
            initialSelection,
          )
        })
      }

      editor.send({
        type: 'insert.blocks',
        blocks: [imageA, imageB],
        placement: options.placement,
        select: options.select,
        ...(options.useAtProp ? {at: initialSelection} : {}),
      })

      return {editor, imageA, imageB, block, initialSelection}
    }

    test('Scenario: Inserting duplicate blocks into an empty text block with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB} = await createTest({
        target: 'empty text',
        placement: 'auto',
        select: 'end',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block given by `at` with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB} = await createTest({
        target: 'empty text',
        placement: 'auto',
        select: 'end',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB} = await createTest({
        target: 'empty text',
        placement: 'auto',
        select: 'start',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block given by `at` with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB} = await createTest({
        target: 'empty text',
        placement: 'auto',
        select: 'start',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB} = await createTest({
        target: 'empty text',
        placement: 'auto',
        select: 'none',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block given by `at` with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB} = await createTest({
        target: 'empty text',
        placement: 'auto',
        select: 'none',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block with placement before and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'before',
        select: 'end',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block given by `at` with placement before and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'before',
        select: 'end',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block with placement before and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'before',
        select: 'start',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block given by `at` with placement before and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'before',
        select: 'start',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block with placement before and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block, initialSelection} =
        await createTest({
          target: 'empty text',
          placement: 'before',
          select: 'none',
        })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual(initialSelection)
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block given by `at` with placement before and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'before',
        select: 'none',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block with placement after and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'after',
        select: 'end',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block given by `at` with placement after and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'after',
        select: 'end',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block with placement after and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'after',
        select: 'start',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block given by `at` with placement after and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'after',
        select: 'start',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block with placement after and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block, initialSelection} =
        await createTest({
          target: 'empty text',
          placement: 'after',
          select: 'none',
        })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual(initialSelection)
      })
    })

    test('Scenario: Inserting duplicate blocks into an empty text block given by `at` with placement after and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'empty text',
        placement: 'after',
        select: 'none',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'auto',
        select: 'end',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object given by `at` with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'auto',
        select: 'end',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'auto',
        select: 'start',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object given by `at` with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'auto',
        select: 'start',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'auto',
        select: 'none',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: imageA._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: imageA._key}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object given by `at` with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'auto',
        select: 'none',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object with placement before and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'before',
        select: 'end',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageA,
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object given by `at` with placement before and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'before',
        select: 'end',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageA,
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object with placement before and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'before',
        select: 'start',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageA,
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object given by `at` with placement before and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'before',
        select: 'start',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageA,
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object with placement before and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'before',
        select: 'none',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageA,
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: imageA._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: imageA._key}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object given by `at` with placement before and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'before',
        select: 'none',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageA,
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object with placement after and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'after',
        select: 'end',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object given by `at` with placement after and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'after',
        select: 'end',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object with placement after and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'after',
        select: 'start',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object given by `at` with placement after and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'after',
        select: 'start',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object with placement after and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'after',
        select: 'none',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: imageA._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: imageA._key}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at a block object given by `at` with placement after and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'block object',
        placement: 'after',
        select: 'none',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          imageB,
          block,
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })

    test('Scenario: Inserting duplicate blocks at the start of a text block with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-start',
        placement: 'auto',
        select: 'end',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at the start of a text block given by `at` with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-start',
        placement: 'auto',
        select: 'end',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at the start of a text block with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-start',
        placement: 'auto',
        select: 'start',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at the start of a text block given by `at` with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-start',
        placement: 'auto',
        select: 'start',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at the start of a text block with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block, initialSelection} =
        await createTest({
          target: 'text-start',
          placement: 'auto',
          select: 'none',
        })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toEqual(initialSelection)
      })
    })

    test('Scenario: Inserting duplicate blocks at the start of a text block given by `at` with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-start',
        placement: 'auto',
        select: 'none',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          block,
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })

    test('Scenario: Inserting duplicate blocks at the end of a text block with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-end',
        placement: 'auto',
        select: 'end',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at the end of a text block given by `at` with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-end',
        placement: 'auto',
        select: 'end',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at the end of a text block with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-end',
        placement: 'auto',
        select: 'start',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at the end of a text block given by `at` with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-end',
        placement: 'auto',
        select: 'start',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks at the end of a text block with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block, initialSelection} =
        await createTest({
          target: 'text-end',
          placement: 'auto',
          select: 'none',
        })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual(initialSelection)
      })
    })

    test('Scenario: Inserting duplicate blocks at the end of a text block given by `at` with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-end',
        placement: 'auto',
        select: 'none',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          block,
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })

    test('Scenario: Inserting duplicate blocks in the middle of a text block with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-mid',
        placement: 'auto',
        select: 'end',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          {
            ...block,
            children: [
              {
                ...block.children[0],
                text: 'foo',
              },
            ],
          },
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          {
            ...block,
            _key: 'k8',
            children: [
              {
                ...block.children[0],
                text: 'bar',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks in the middle of a text block given by `at` with placement auto and select end gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-mid',
        placement: 'auto',
        select: 'end',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          {
            ...block,
            children: [
              {
                ...block.children[0],
                text: 'foo',
              },
            ],
          },
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          {
            ...block,
            _key: 'k8',
            children: [
              {
                ...block.children[0],
                text: 'bar',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k7'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks in the middle of a text block with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-mid',
        placement: 'auto',
        select: 'start',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          {
            ...block,
            children: [
              {
                ...block.children[0],
                text: 'foo',
              },
            ],
          },
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          {
            ...block,
            _key: 'k8',
            children: [
              {
                ...block.children[0],
                text: 'bar',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks in the middle of a text block given by `at` with placement auto and select start gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-mid',
        placement: 'auto',
        select: 'start',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          {
            ...block,
            children: [
              {
                ...block.children[0],
                text: 'foo',
              },
            ],
          },
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          {
            ...block,
            _key: 'k8',
            children: [
              {
                ...block.children[0],
                text: 'bar',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k6'}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Inserting duplicate blocks in the middle of a text block with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block, initialSelection} =
        await createTest({
          target: 'text-mid',
          placement: 'auto',
          select: 'none',
        })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          {
            ...block,
            children: [
              {
                ...block.children[0],
                text: 'foo',
              },
            ],
          },
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          {
            ...block,
            _key: 'k8',
            children: [
              {
                ...block.children[0],
                text: 'bar',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual(initialSelection)
      })
    })

    test('Scenario: Inserting duplicate blocks in the middle of a text block given by `at` with placement auto and select none gives them new keys', async () => {
      const {editor, imageA, imageB, block} = await createTest({
        target: 'text-mid',
        placement: 'auto',
        select: 'none',
        useAtProp: true,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          imageA,
          imageB,
          {
            ...block,
            children: [
              {
                ...block.children[0],
                text: 'foo',
              },
            ],
          },
          // Inserting the same images again will generate new _keys to avoid
          // conflicts
          {
            ...imageA,
            _key: 'k6',
          },
          {
            ...imageB,
            _key: 'k7',
          },
          {
            ...block,
            _key: 'k8',
            children: [
              {
                ...block.children[0],
                text: 'bar',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toBeNull()
      })
    })
  })

  test('Scenario: aborting `insert.block` of a specific block', async () => {
    const {editor} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({snapshot, event}) => {
                if (!isTextBlock(snapshot.context, event.block)) {
                  return false
                }

                const text = getTextBlockText(event.block)

                return text === 'bar'
              },

              actions: [],
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'insert.blocks',
      blocks: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'foo',
            },
          ],
        },
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'bar',
            },
          ],
        },
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'baz',
            },
          ],
        },
      ],
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: baz|'].join('\n'),
      )
    })
  })

  test('Scenario: inheriting list level and listItem for keyless inserted blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}, {name: 'number'}],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          level: 2,
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: [],
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'insert.blocks',
      placement: 'after',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        backward: false,
      },
      blocks: [
        {
          _type: 'block',
          style: 'normal',
          children: [{_type: 'span', text: 'bar'}],
        },
        {
          _type: 'block',
          style: 'normal',
          listItem: 'number',
          level: 1,
          children: [{_type: 'span', text: 'baz'}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'B level=2 listItem="bullet": foo',
          'B: bar',
          'B level=2 listItem="bullet": baz|',
        ].join('\n'),
      )
    })
  })
})

test('Scenario: Replacing an expanded root selection with select start at an explicit target', async () => {
  const keyGenerator = createTestKeyGenerator()
  const initialValue = [
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
    },
  ]
  const blocks = [
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({keyGenerator, initialValue})
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
    },
  })
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    select: 'start',
    blocks,
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 2},
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'fbar', marks: []}],
      },
      {
        _key: 'k10',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k11', _type: 'span', text: 'bazr', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'baz', marks: []}],
      },
      {
        _key: 'k6',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k7', _type: 'span', text: 'foo', marks: []}],
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      backward: false,
    })
  })
})

describe('Replacing expanded callout selections', () => {
  let keyGenerator: ReturnType<typeof createTestKeyGenerator>
  let initialValue: Array<PortableTextBlock>
  let blocks: Array<PortableTextBlock>
  beforeEach(() => {
    keyGenerator = createTestKeyGenerator()
    initialValue = [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'callout',
        content: [
          {
            _key: keyGenerator(),
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
          },
          {
            _key: keyGenerator(),
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
            ],
          },
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
    ]
    blocks = [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
        ],
      },
    ]
  })
  test('Scenario: Replacing an expanded callout selection with select start at the selection', async () => {
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: {
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      },
      children: <NodePlugin nodes={[calloutContainer]} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 2,
        },
      },
    })
    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      select: 'start',
      blocks,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'callout',
          content: [
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'fbar', marks: []}],
            },
            {
              _key: 'k11',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k12', _type: 'span', text: 'bazr', marks: []}],
            },
          ],
        },
        {
          _key: 'k7',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k8', _type: 'span', text: 'foo', marks: []}],
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Replacing an expanded callout selection with select start at an explicit target', async () => {
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: {
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      },
      children: <NodePlugin nodes={[calloutContainer]} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      },
    })
    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      select: 'start',
      blocks,
      at: {
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 2,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'callout',
          content: [
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'fbar', marks: []}],
            },
            {
              _key: 'k11',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k12', _type: 'span', text: 'bazr', marks: []}],
            },
          ],
        },
        {
          _key: 'k7',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k8', _type: 'span', text: 'foo', marks: []}],
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Replacing an expanded callout selection with select none at the selection', async () => {
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: {
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      },
      children: <NodePlugin nodes={[calloutContainer]} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 2,
        },
      },
    })
    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      select: 'none',
      blocks,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'callout',
          content: [
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'fbar', marks: []}],
            },
            {
              _key: 'k11',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k12', _type: 'span', text: 'bazr', marks: []}],
            },
          ],
        },
        {
          _key: 'k7',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k8', _type: 'span', text: 'foo', marks: []}],
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Replacing an expanded callout selection with select end at the selection', async () => {
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: {
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      },
      children: <NodePlugin nodes={[calloutContainer]} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 2,
        },
      },
    })
    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      select: 'end',
      blocks,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'callout',
          content: [
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'fbar', marks: []}],
            },
            {
              _key: 'k11',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k12', _type: 'span', text: 'bazr', marks: []}],
            },
          ],
        },
        {
          _key: 'k7',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k8', _type: 'span', text: 'foo', marks: []}],
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k11'},
            'children',
            {_key: 'k12'},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k11'},
            'children',
            {_key: 'k12'},
          ],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Replacing an expanded callout selection with select end at an explicit target', async () => {
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: {
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      },
      children: <NodePlugin nodes={[calloutContainer]} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      },
    })
    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      select: 'end',
      blocks,
      at: {
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 2,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'callout',
          content: [
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'fbar', marks: []}],
            },
            {
              _key: 'k11',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k12', _type: 'span', text: 'bazr', marks: []}],
            },
          ],
        },
        {
          _key: 'k7',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k8', _type: 'span', text: 'foo', marks: []}],
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k11'},
            'children',
            {_key: 'k12'},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k11'},
            'children',
            {_key: 'k12'},
          ],
          offset: 3,
        },
        backward: false,
      })
    })
  })
})

test('Scenario: Swallowing delete duplicates the tail over an expanded selection', async () => {
  const keyGenerator = createTestKeyGenerator()
  const initialValue = [
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
    },
  ]
  const blocks = [
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    children: (
      <BehaviorPlugin
        behaviors={[defineBehavior({on: 'delete', actions: []})]}
      />
    ),
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 2},
    },
  })
  editor.send({type: 'insert.blocks', placement: 'auto', blocks})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'ffoor', marks: []}],
      },
      {
        _key: 'k8',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k9', _type: 'span', text: 'barr', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'baz', marks: []}],
      },
    ])
  })
})

test('Scenario: Explicit at with select none emits one select of the user caret', async () => {
  const keyGenerator = createTestKeyGenerator()
  const initialValue = [
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
    },
  ]
  const blocks = [
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
    },
  ]
  const selects: Array<SyntheticBehaviorEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    children: (
      <BehaviorPlugin
        behaviors={[
          defineBehavior({
            on: 'select',
            actions: [
              ({event}) => [
                effect(() => {
                  selects.push(event)
                }),
                forward(event),
              ],
            ],
          }),
        ]}
      />
    ),
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
      focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
    },
  })
  selects.length = 0
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    select: 'none',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 2},
    },
    blocks,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
      focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
      backward: false,
    })
    expect(selects).toEqual([
      {
        type: 'select',
        at: {
          anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
          focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
          backward: false,
        },
      },
    ])
  })
})

test('Scenario: An unresolvable explicit target preserves the user selection text', async () => {
  const keyGenerator = createTestKeyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
        ],
      },
    ],
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 2},
    },
  })
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    blocks: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
        ],
      },
    ],
    at: {
      anchor: {path: [{_key: 'k8'}, 'children', {_key: 'k9'}], offset: 1},
      focus: {path: [{_key: 'k10'}, 'children', {_key: 'k11'}], offset: 2},
    },
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'B: foo\nB: bar\nB: foo\nB: bar|',
    )
  })
})

test('Scenario: An explicit target clamped to one point preserves the user selection text', async () => {
  const keyGenerator = createTestKeyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
        ],
      },
    ],
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 1},
      focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 2},
    },
  })
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    blocks: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
        ],
      },
    ],
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 9},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    },
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'B: foofoo\nB: bar|\nB: bar\nB: baz',
    )
  })
})

test('Scenario: A null block preserves the expanded selection', async () => {
  const keyGenerator = createTestKeyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
        ],
      },
    ],
  })
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 2},
    },
  })
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    blocks: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      null!,
    ],
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: f^oo\nB: ba|r')
  })
  expect(error.mock.calls).toHaveLength(1)
  const [firstCall] = error.mock.calls
  expect(String(firstCall?.[0])).toMatch(
    /^Error: Evaluating actions for "insert\.blocks" failed due to: /,
  )
  error.mockRestore()
})

test('Scenario: A forwarding block transform runs once over an expanded selection', async () => {
  const keyGenerator = createTestKeyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
        ],
      },
    ],
    children: (
      <BehaviorPlugin
        behaviors={[
          defineBehavior({
            on: 'insert.blocks',
            actions: [
              ({event, snapshot}) => [
                forward({
                  ...event,
                  blocks: event.blocks.map((block) =>
                    isTextBlock(snapshot.context, block)
                      ? {
                          ...block,
                          children: block.children.map((child) =>
                            child._type === 'span'
                              ? {...child, text: `${child.text}!`}
                              : child,
                          ),
                        }
                      : block,
                  ),
                }),
              ],
            ],
          }),
        ]}
      />
    ),
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 2},
    },
  })
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    blocks: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
        ],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'B: ffoo!\nB: bar!r|',
    )
  })
})

test('Scenario: Replacing a selection keeps both blocks in the table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'table',
        fields: [
          {
            name: 'rows',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'row',
                fields: [
                  {
                    name: 'cells',
                    type: 'array',
                    of: [
                      {
                        type: 'object',
                        name: 'cell',
                        fields: [
                          {
                            name: 'content',
                            type: 'array',
                            of: [{type: 'block'}],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _key: keyGenerator(),
        _type: 'table',
        rows: [
          {
            _key: keyGenerator(),
            _type: 'row',
            cells: [
              {
                _key: keyGenerator(),
                _type: 'cell',
                content: [
                  {
                    _key: keyGenerator(),
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _key: keyGenerator(),
                        _type: 'span',
                        text: 'foo',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _key: keyGenerator(),
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _key: keyGenerator(),
                        _type: 'span',
                        text: 'bar',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <NodePlugin nodes={[tableContainer, rowContainer, cellContainer]} />
    ),
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: 'k0'},
          'rows',
          {_key: 'k1'},
          'cells',
          {_key: 'k2'},
          'content',
          {_key: 'k3'},
          'children',
          {_key: 'k4'},
        ],
        offset: 1,
      },
      focus: {
        path: [
          {_key: 'k0'},
          'rows',
          {_key: 'k1'},
          'cells',
          {_key: 'k2'},
          'content',
          {_key: 'k5'},
          'children',
          {_key: 'k6'},
        ],
        offset: 2,
      },
    },
  })
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    blocks: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
        ],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'ffoo', marks: []},
                    ],
                  },
                  {
                    _key: 'k11',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k12', _type: 'span', text: 'barr', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      ...{
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k11'},
            'children',
            {_key: 'k12'},
          ],
          offset: 4,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k11'},
            'children',
            {_key: 'k12'},
          ],
          offset: 4,
        },
      },
      backward: false,
    })
  })
})

test('Scenario: Replacing an explicit range with deleted endpoints in a root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const initialValue = [
    {
      _type: 'image',
      _key: keyGenerator(),
      src: 'image-1',
    },
    {
      _type: 'image',
      _key: keyGenerator(),
      src: 'image-2',
    },
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'baz',
          marks: [],
        },
      ],
    },
  ]
  const blocks = [
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'foo',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'bar',
          marks: [],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    schemaDefinition: {
      blockObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
    },
  })
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
        ],
        offset: 0,
      },
    },
    blocks,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k5',
            text: 'foo',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k7',
            text: 'barbaz',
            marks: [],
          },
        ],
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [
          {
            _key: 'k6',
          },
          'children',
          {
            _key: 'k7',
          },
        ],
        offset: 6,
      },
      focus: {
        path: [
          {
            _key: 'k6',
          },
          'children',
          {
            _key: 'k7',
          },
        ],
        offset: 6,
      },
      backward: false,
    })
  })
})

test('Scenario: Replacing an explicit range with deleted endpoints in a callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const initialValue = [
    {
      _type: 'callout',
      _key: keyGenerator(),
      content: [
        {
          _type: 'image',
          _key: keyGenerator(),
          src: 'image-1',
        },
        {
          _type: 'image',
          _key: keyGenerator(),
          src: 'image-2',
        },
        {
          _type: 'block',
          _key: keyGenerator(),
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'baz',
              marks: [],
            },
          ],
        },
      ],
    },
  ]
  const blocks = [
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'foo',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'bar',
          marks: [],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    schemaDefinition: {
      blockObjects: [
        {name: 'image', fields: [{name: 'src', type: 'string'}]},
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block'}, {type: 'image'}],
            },
          ],
        },
      ],
    },
    children: <NodePlugin nodes={[calloutContainer]} />,
  })
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
    },
    blocks,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k5',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k6',
                text: 'foo',
                marks: [],
              },
            ],
          },
          {
            _type: 'block',
            _key: 'k7',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k8',
                text: 'barbaz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k7',
          },
          'children',
          {
            _key: 'k8',
          },
        ],
        offset: 6,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k7',
          },
          'children',
          {
            _key: 'k8',
          },
        ],
        offset: 6,
      },
      backward: false,
    })
  })
})

test('Scenario: Replacing an explicit range with deleted endpoints in a table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const initialValue = [
    {
      _type: 'table',
      _key: keyGenerator(),
      rows: [
        {
          _type: 'row',
          _key: keyGenerator(),
          cells: [
            {
              _type: 'cell',
              _key: keyGenerator(),
              content: [
                {
                  _type: 'image',
                  _key: keyGenerator(),
                  src: 'image-1',
                },
                {
                  _type: 'image',
                  _key: keyGenerator(),
                  src: 'image-2',
                },
                {
                  _type: 'block',
                  _key: keyGenerator(),
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: keyGenerator(),
                      text: 'baz',
                      marks: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const blocks = [
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'foo',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'bar',
          marks: [],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    schemaDefinition: {
      blockObjects: [
        {name: 'image', fields: [{name: 'src', type: 'string'}]},
        {
          name: 'table',
          fields: [
            {
              name: 'rows',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'row',
                  fields: [
                    {
                      name: 'cells',
                      type: 'array',
                      of: [
                        {
                          type: 'object',
                          name: 'cell',
                          fields: [
                            {
                              name: 'content',
                              type: 'array',
                              of: [{type: 'block'}, {type: 'image'}],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    children: (
      <NodePlugin nodes={[tableContainer, rowContainer, cellContainer]} />
    ),
  })
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
    },
    blocks,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k0',
        rows: [
          {
            _type: 'row',
            _key: 'k1',
            cells: [
              {
                _type: 'cell',
                _key: 'k2',
                content: [
                  {
                    _type: 'block',
                    _key: 'k7',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k8',
                        text: 'foo',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k9',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k10',
                        text: 'barbaz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k9',
          },
          'children',
          {
            _key: 'k10',
          },
        ],
        offset: 6,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k9',
          },
          'children',
          {
            _key: 'k10',
          },
        ],
        offset: 6,
      },
      backward: false,
    })
  })
})

const calloutContainer = defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({attributes, children}) => <div {...attributes}>{children}</div>,
})

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({attributes, children}) => <div {...attributes}>{children}</div>,
})

const rowContainer = defineContainer({
  type: 'row',
  arrayField: 'cells',
  render: ({attributes, children}) => <div {...attributes}>{children}</div>,
})

const cellContainer = defineContainer({
  type: 'cell',
  arrayField: 'content',
  render: ({attributes, children}) => <div {...attributes}>{children}</div>,
})

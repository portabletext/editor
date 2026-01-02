import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import type {InsertPlacement} from '../src/behaviors'
import {createTestEditor} from '../src/test/vitest'

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
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{image},',
        '',
      ])
    })
  })

  describe('Scenario: Inserting blocks with duplicate _keys', () => {
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

    test('target: empty text, placement: auto, select: end', async () => {
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

    test('target: empty text, placement: auto, select: end, useAtProp: true', async () => {
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

    test('target: empty text, placement: auto, select: start', async () => {
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

    test('target: empty text, placement: auto, select: start, useAtProp: true', async () => {
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

    test('target: empty text, placement: auto, select: none', async () => {
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

    test('target: empty text, placement: auto, select: none, useAtProp: true', async () => {
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

    test('target: empty text, placement: before, select: end', async () => {
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

    test('target: empty text, placement: before, select: end, useAtProp: true', async () => {
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

    test('target: empty text, placement: before, select: start', async () => {
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

    test('target: empty text, placement: before, select: start, useAtProp: true', async () => {
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

    test('target: empty text, placement: before, select: none', async () => {
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

    test('target: empty text, placement: before, select: none, useAtProp: true', async () => {
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

    test('target: empty text, placement: after, select: end', async () => {
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

    test('target: empty text, placement: after, select: end, useAtProp: true', async () => {
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

    test('target: empty text, placement: after, select: start', async () => {
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

    test('target: empty text, placement: after, select: start, useAtProp: true', async () => {
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

    test('target: empty text, placement: after, select: none', async () => {
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

    test('target: empty text, placement: after, select: none, useAtProp: true', async () => {
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

    test('target: block object, placement: auto, select: end', async () => {
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

    test('target: block object, placement: auto, select: end, useAtProp: true', async () => {
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

    test('target: block object, placement: auto, select: start', async () => {
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

    test('target: block object, placement: auto, select: start, useAtProp: true', async () => {
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

    test('target: block object, placement: auto, select: none', async () => {
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

    test('target: block object, placement: auto, select: none, useAtProp: true', async () => {
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

    test('target: block object, placement: before, select: end', async () => {
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

    test('target: block object, placement: before, select: end, useAtProp: true', async () => {
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

    test('target: block object, placement: before, select: start', async () => {
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

    test('target: block object, placement: before, select: start, useAtProp: true', async () => {
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

    test('target: block object, placement: before, select: none', async () => {
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

    test('target: block object, placement: before, select: none, useAtProp: true', async () => {
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

    test('target: block object, placement: after, select: end', async () => {
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

    test('target: block object, placement: after, select: end, useAtProp: true', async () => {
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

    test('target: block object, placement: after, select: start', async () => {
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

    test('target: block object, placement: after, select: start, useAtProp: true', async () => {
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

    test('target: block object, placement: after, select: none', async () => {
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

    test('target: block object, placement: after, select: none, useAtProp: true', async () => {
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

    test('target: text-start, placement: auto, select: end', async () => {
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

    test('target: text-start, placement: auto, select: end, useAtProp: true', async () => {
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

    test('target: text-start, placement: auto, select: start', async () => {
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

    test('target: text-start, placement: auto, select: start, useAtProp: true', async () => {
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

    test('target: text-start, placement: auto, select: none', async () => {
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

    test('target: text-start, placement: auto, select: none, useAtProp: true', async () => {
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

    test('target: text-end, placement: auto, select: end', async () => {
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

    test('target: text-end, placement: auto, select: end, useAtProp: true', async () => {
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

    test('target: text-end, placement: auto, select: start', async () => {
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

    test('target: text-end, placement: auto, select: start, useAtProp: true', async () => {
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

    test('target: text-end, placement: auto, select: none', async () => {
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

    test('target: text-end, placement: auto, select: none, useAtProp: true', async () => {
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

    test('target: text-mid, placement: auto, select: end', async () => {
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

    test('target: text-mid, placement: auto, select: end, useAtProp: true', async () => {
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

    test('target: text-mid, placement: auto, select: start', async () => {
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

    test('target: text-mid, placement: auto, select: start, useAtProp: true', async () => {
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

    test('target: text-mid, placement: auto, select: none', async () => {
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

    test('target: text-mid, placement: auto, select: none, useAtProp: true', async () => {
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
})

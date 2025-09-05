import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/internal-utils/test-editor'

describe('event.insert.span', () => {
  test('Scenario: Unknown decorators are filtered out', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    editor.send({
      type: 'insert.span',
      text: 'foo',
      decorators: ['strong', 'em'],
    })

    await vi.waitFor(() => {
      if (editor) {
        expect(editor.getSnapshot().context.value).toEqual([
          expect.objectContaining({
            children: [
              expect.objectContaining({
                _type: 'span',
                text: 'foo',
                marks: ['strong'],
              }),
            ],
          }),
        ])
      }
    })
  })

  test('Scenario: Unknown annotations are filtered out', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    editor.send({
      type: 'insert.span',
      text: 'foo',
      annotations: [
        {
          name: 'link',
          value: {
            href: 'https://portabletext.org',
          },
        },
        {
          name: 'comment',
          value: {
            text: 'Consider rewriting this',
          },
        },
      ],
    })

    await vi.waitFor(() => {
      if (editor) {
        expect(editor.getSnapshot().context.value).toEqual([
          expect.objectContaining({
            children: [
              expect.objectContaining({
                _type: 'span',
                text: 'foo',
              }),
            ],
            markDefs: [
              expect.objectContaining({
                _type: 'link',
                href: 'https://portabletext.org',
              }),
            ],
          }),
        ])
      }
    })
  })

  test('Scenario: Inserting on block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'image',
          _key: imageKey,
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
        backward: false,
      })
    })

    editor.send({
      type: 'insert.span',
      text: 'foo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        '{image}',
        'foo',
      ])
    })
  })

  test('Scenario: Inserting on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: keyGenerator(),
              text: '',
              marks: [],
            },
            {
              _type: 'image',
              _key: imageKey,
            },
            {
              _type: 'span',
              _key: keyGenerator(),
              text: '',
              marks: [],
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: imageKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: imageKey}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: imageKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: imageKey}],
          offset: 0,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.span',
      text: 'foo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([',{image},foo'])
    })
  })
})

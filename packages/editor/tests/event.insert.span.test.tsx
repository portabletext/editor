import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/internal-utils/test-editor'

describe('event.insert.span', () => {
  test('Scenario: Unknown decorators are filtered out', async () => {
    const {editorRef} = await createTestEditor({
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    editorRef.current?.send({
      type: 'insert.span',
      text: 'foo',
      decorators: ['strong', 'em'],
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(editorRef.current.getSnapshot().context.value).toEqual([
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
    const {editorRef} = await createTestEditor({
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    editorRef.current?.send({
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
      if (editorRef.current) {
        expect(editorRef.current.getSnapshot().context.value).toEqual([
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
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
        backward: false,
      })
    })

    editorRef.current?.send({
      type: 'insert.span',
      text: 'foo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        '{image}',
        'foo',
      ])
    })
  })

  test('Scenario: Inserting on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const imageKey = keyGenerator()
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      expect(editorRef.current?.getSnapshot().context.selection).toEqual({
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

    editorRef.current?.send({
      type: 'insert.span',
      text: 'foo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        ',{image},foo',
      ])
    })
  })
})

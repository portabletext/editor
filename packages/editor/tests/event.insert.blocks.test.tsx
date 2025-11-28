import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
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
})

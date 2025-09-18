import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('event.child.set', () => {
  test('Scenario: Setting properties on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const imageKey = keyGenerator()
    const initialValue = [
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
            url: 'https://www.sanity.io/logo.svg',
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const {editor} = await createTestEditor({
      initialValue,
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'image',
            fields: [
              {name: 'alt', type: 'string'},
              {name: 'url', type: 'string'},
            ],
          },
        ],
      }),
    })

    await vi.waitFor(() => {
      return expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{image},',
      ])
    })

    const newImageKey = keyGenerator()

    editor.send({
      type: 'child.set',
      at: [{_key: blockKey}, 'children', {_key: imageKey}],
      props: {
        _type: 'image2',
        _key: newImageKey,
        alt: 'Sanity Logo',
        caption: 'Unknown field',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            ...initialValue[0].children.slice(0, 1),
            {
              _type: 'image',
              _key: newImageKey,
              url: 'https://www.sanity.io/logo.svg',
              alt: 'Sanity Logo',
            },
            ...initialValue[0].children.slice(2),
          ],
        },
      ])
    })
  })

  test('Scenario: Setting properties on span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'Hello',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await vi.waitFor(() => {
      return expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hello'])
    })

    const newSpanKey = keyGenerator()

    editor.send({
      type: 'child.set',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      props: {
        _type: 'span2',
        _key: newSpanKey,
        marks: ['strong'],
        text: 'Hello, world!',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            {
              ...initialValue[0].children[0],
              _key: newSpanKey,
              text: 'Hello, world!',
              marks: ['strong'],
            },
          ],
        },
      ])
    })
  })
})

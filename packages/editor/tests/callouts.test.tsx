import {diffMatchPatch, set, setIfMissing, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {ContainerRendererPlugin} from '../src/plugins/plugin.internal.container-renderer'
import {createTestEditor} from '../src/test/vitest'

const calloutEditableTypes = ['callout']

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'variant',
          type: 'string',
        },
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

async function createCalloutTestEditor() {
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator() // k0
  const blockKey = keyGenerator() // k1
  const spanKey = keyGenerator() // k2

  const span = {
    _key: spanKey,
    _type: 'span',
    text: 'hello',
  }
  const block = {
    _key: blockKey,
    _type: 'block',
    children: [span],
  }
  const callout = {
    _key: calloutKey,
    _type: 'callout',
    variant: 'note',
    content: [block],
  }

  const initialValue = [callout]

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue,
    children: <ContainerRendererPlugin types={calloutEditableTypes} />,
  })

  // After rendering, normalization adds marks, markDefs, style
  const normalizedSpan = {...span, marks: []}
  const normalizedBlock = {
    ...block,
    children: [normalizedSpan],
    markDefs: [],
    style: 'normal',
  }
  const normalizedCallout = {
    ...callout,
    content: [normalizedBlock],
  }

  return {
    editor,
    locator,
    callout: normalizedCallout,
    block: normalizedBlock,
    span: normalizedSpan,
  }
}

describe('callouts', () => {
  describe('incoming patches', () => {
    test('render', async () => {
      const {editor, callout} = await createCalloutTestEditor()

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([callout])
      })
    })

    test('set variant', async () => {
      const {editor, callout} = await createCalloutTestEditor()

      editor.send({
        type: 'patches',
        patches: [set('warning', [{_key: callout._key}, 'variant'])],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...callout,
            variant: 'warning',
          },
        ])
      })
    })

    test('set text on span inside callout', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          set('world', [
            {_key: callout._key},
            'content',
            {_key: block._key},
            'children',
            {_key: span._key},
            'text',
          ]),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...callout,
            content: [
              {
                ...block,
                children: [{...span, text: 'world'}],
              },
            ],
          },
        ])
      })
    })

    test('diffMatchPatch on span inside callout', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()

      const path = [
        {_key: callout._key},
        'content',
        {_key: block._key},
        'children',
        {_key: span._key},
        'text',
      ] as const

      editor.send({
        type: 'patches',
        patches: [diffMatchPatch('hello', 'hello world', [...path])],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...callout,
            content: [
              {
                ...block,
                children: [{...span, text: 'hello world'}],
              },
            ],
          },
        ])
      })
    })

    test('insert span into text block inside callout', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()

      const newSpan = {
        _key: editor.getSnapshot().context.keyGenerator(),
        _type: 'span',
        text: 'world',
        marks: [],
      }

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'insert' as const,
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            items: [newSpan],
            position: 'after' as const,
            origin: 'remote' as const,
          },
        ],
        snapshot: undefined,
      })

      // Adjacent spans with matching marks are merged.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...callout,
            content: [
              {
                ...block,
                children: [
                  {
                    ...span,
                    text: 'helloworld',
                  },
                ],
              },
            ],
          },
        ])
      })
    })

    test('unset span from text block inside callout', async () => {
      const {editor, callout, block} = await createCalloutTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          unset([
            {_key: callout._key},
            'content',
            {_key: block._key},
            'children',
            {_key: 'k2'},
          ]),
        ],
        snapshot: undefined,
      })

      // Normalization restores an empty span.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...callout,
            content: [
              {
                ...block,
                children: [
                  {
                    _key: 'k5',
                    _type: 'span',
                    text: '',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ])
      })
    })

    test('set style on text block inside callout', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          set('h1', [
            {_key: callout._key},
            'content',
            {_key: block._key},
            'style',
          ]),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...callout,
            content: [
              {
                ...block,
                children: [span],
                style: 'h1',
              },
            ],
          },
        ])
      })
    })

    test('setIfMissing marks on span inside callout', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()

      // Normalization has already set marks: [] on the span, so
      // setIfMissing is a no-op
      editor.send({
        type: 'patches',
        patches: [
          setIfMissing(
            ['strong'],
            [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
              'marks',
            ],
          ),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...callout,
            content: [
              {
                ...block,
                children: [
                  {
                    ...span,
                    marks: [],
                  },
                ],
              },
            ],
          },
        ])
      })
    })

    test('unset variant from callout', async () => {
      const {editor, callout} = await createCalloutTestEditor()

      editor.send({
        type: 'patches',
        patches: [unset([{_key: callout._key}, 'variant'])],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {...callout, variant: undefined},
        ])
      })
    })
  })

  describe('normalization', () => {
    test('text blocks inside callouts get missing .markDefs', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: calloutKey,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: spanKey, _type: 'span', text: 'hello', marks: []},
                ],
                style: 'normal',
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={calloutEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: calloutKey,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: spanKey, _type: 'span', text: 'hello', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
    })

    test('text blocks inside callouts get missing .style', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: calloutKey,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: spanKey, _type: 'span', text: 'hello', marks: []},
                ],
                markDefs: [],
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={calloutEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: calloutKey,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: spanKey, _type: 'span', text: 'hello', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
    })

    test('spans inside callouts get missing .marks', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: calloutKey,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [{_key: spanKey, _type: 'span', text: 'hello'}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={calloutEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: calloutKey,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: spanKey, _type: 'span', text: 'hello', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
    })

    test('empty text blocks inside callouts get a span inserted', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: calloutKey,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={calloutEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: calloutKey,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [{_key: 'k4', _type: 'span', text: '', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
    })
  })
})

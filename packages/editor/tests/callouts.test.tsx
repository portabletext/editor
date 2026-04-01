import {diffMatchPatch, set, setIfMissing, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {InternalSlateEditorRefPlugin} from '../src/plugins/plugin.internal.slate-editor-ref'
import {withoutPatching} from '../src/slate-plugins/slate-plugin.without-patching'
import {normalize} from '../src/slate/editor/normalize'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextSlateEditor} from '../src/types/slate-editor'

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

  const slateEditorRef = React.createRef<PortableTextSlateEditor>()

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue,
    children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
  })

  slateEditorRef.current!.editableTypes = new Set(['callout'])

  return {
    editor,
    locator,
    callout,
    block,
    span,
    initialValue,
  }
}

describe('callouts', () => {
  describe('incoming patches', () => {
    test('render', async () => {
      const {editor, initialValue} = await createCalloutTestEditor()

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
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
                children: [{...span, text: 'world', marks: []}],
                markDefs: [],
                style: 'normal',
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
                children: [{...span, text: 'hello world', marks: []}],
                markDefs: [],
                style: 'normal',
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
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
    })

    test('unset span from text block inside callout', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          unset([
            {_key: callout._key},
            'content',
            {_key: block._key},
            'children',
            {_key: span._key},
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
                markDefs: [],
                style: 'normal',
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
                markDefs: [],
                style: 'h1',
              },
            ],
          },
        ])
      })
    })

    test('setIfMissing marks on span inside callout', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()

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
                    marks: ['strong'],
                  },
                ],
                markDefs: [],
                style: 'normal',
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
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const callout = {
        _key: calloutKey,
        _type: 'callout',
        variant: 'note',
        content: [
          {
            _key: blockKey,
            _type: 'block',
            // Missing markDefs!
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'hello',
                marks: [],
              },
            ],
            style: 'normal',
          },
        ],
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [callout],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      slateEditorRef.current!.editableTypes = new Set(['callout'])

      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

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
                  {
                    _key: spanKey,
                    _type: 'span',
                    text: 'hello',
                    marks: [],
                  },
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
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const callout = {
        _key: calloutKey,
        _type: 'callout',
        variant: 'note',
        content: [
          {
            _key: blockKey,
            _type: 'block',
            // Missing style!
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'hello',
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [callout],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      slateEditorRef.current!.editableTypes = new Set(['callout'])

      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

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
                  {
                    _key: spanKey,
                    _type: 'span',
                    text: 'hello',
                    marks: [],
                  },
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
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const callout = {
        _key: calloutKey,
        _type: 'callout',
        variant: 'note',
        content: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'hello',
                // Missing marks!
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [callout],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      slateEditorRef.current!.editableTypes = new Set(['callout'])

      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

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
                  {
                    _key: spanKey,
                    _type: 'span',
                    text: 'hello',
                    marks: [],
                  },
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
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()

      const callout = {
        _key: calloutKey,
        _type: 'callout',
        variant: 'note',
        content: [
          {
            _key: blockKey,
            _type: 'block',
            // Empty children!
            children: [],
            markDefs: [],
            style: 'normal',
          },
        ],
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [callout],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      slateEditorRef.current!.editableTypes = new Set(['callout'])

      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

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
                  {_key: 'k4', _type: 'span', text: '', marks: []},
                ],
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

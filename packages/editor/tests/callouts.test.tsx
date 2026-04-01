import {diffMatchPatch, set, setIfMissing, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {Patch} from '../src'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
import type {Renderer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

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

const calloutRenderer: Renderer = {
  type: 'callout',
  render: ({attributes, children}) => (
    <div {...attributes} data-testid="callout">
      {children}
    </div>
  ),
}

async function createCalloutTestEditor() {
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator() // k0
  const blockKey = keyGenerator() // k1
  const spanKey = keyGenerator() // k2

  const span = {
    _key: spanKey,
    _type: 'span',
    text: 'hello',
    marks: [],
  }
  const block = {
    _key: blockKey,
    _type: 'block',
    children: [span],
    markDefs: [],
    style: 'normal',
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
    children: <RendererPlugin renderers={[calloutRenderer]} />,
  })

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
  test('render', async () => {
    const {locator} = await createCalloutTestEditor()

    const calloutLocator = locator.getByTestId('callout')
    const textLocator = calloutLocator.getByText('hello')

    await vi.waitFor(async () => {
      await expect.element(calloutLocator).toBeInTheDocument()
      await expect.element(textLocator).toBeInTheDocument()
    })
  })

  test('write', async () => {
    const {locator, editor, callout, block, span} =
      await createCalloutTestEditor()

    const calloutLocator = locator.getByTestId('callout')
    const textLocator = calloutLocator.getByText('hello')

    await vi.waitFor(async () => {
      await expect.element(textLocator).toBeInTheDocument()
    })

    await userEvent.click(textLocator)
    await userEvent.type(locator, 'world')

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...callout,
          content: [{...block, children: [{...span, text: 'worldhello'}]}],
        },
      ])
    })
  })

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

      // marks is already [] from normalization, so setIfMissing is a no-op
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
      const {editor, callout, block, span} = await createCalloutTestEditor()
      const patches: Array<Patch> = []

      editor.on('*', (event) => {
        if (event.type === 'patch') {
          const {origin: _, ...patch} = event.patch
          patches.push(patch)
        }
      })

      editor.send({
        type: 'patches',
        patches: [
          unset([
            {_key: callout._key},
            'content',
            {_key: block._key},
            'markDefs',
          ]),
        ],
        snapshot: editor.getSnapshot().context.value,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: callout._key,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: block._key,
                _type: 'block',
                children: [
                  {
                    _key: span._key,
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

      expect(patches).toEqual([
        set(
          [],
          [{_key: callout._key}, 'content', {_key: block._key}, 'markDefs'],
        ),
      ])
    })

    test('text blocks inside callouts get missing .style', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()
      const patches: Array<Patch> = []

      editor.on('*', (event) => {
        if (event.type === 'patch') {
          const {origin: _, ...patch} = event.patch
          patches.push(patch)
        }
      })

      editor.send({
        type: 'patches',
        patches: [
          unset([{_key: callout._key}, 'content', {_key: block._key}, 'style']),
        ],
        snapshot: editor.getSnapshot().context.value,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: callout._key,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: block._key,
                _type: 'block',
                children: [
                  {
                    _key: span._key,
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

      expect(patches).toEqual([
        set('normal', [
          {_key: callout._key},
          'content',
          {_key: block._key},
          'style',
        ]),
      ])
    })

    test('spans inside callouts get missing .marks', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()
      const patches: Array<Patch> = []

      editor.on('*', (event) => {
        if (event.type === 'patch') {
          const {origin: _, ...patch} = event.patch
          patches.push(patch)
        }
      })

      editor.send({
        type: 'patches',
        patches: [
          unset([
            {_key: callout._key},
            'content',
            {_key: block._key},
            'children',
            {_key: span._key},
            'marks',
          ]),
        ],
        snapshot: editor.getSnapshot().context.value,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: callout._key,
            _type: 'callout',
            variant: 'note',
            content: [
              {
                _key: block._key,
                _type: 'block',
                children: [
                  {
                    _key: span._key,
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

      expect(patches).toEqual([
        set(
          [],
          [
            {_key: callout._key},
            'content',
            {_key: block._key},
            'children',
            {_key: span._key},
            'marks',
          ],
        ),
      ])
    })

    test('empty text blocks inside callouts get a span inserted', async () => {
      const {editor, callout, block, span} = await createCalloutTestEditor()
      const patches: Array<Patch> = []

      editor.on('*', (event) => {
        if (event.type === 'patch') {
          const {origin: _, ...patch} = event.patch
          patches.push(patch)
        }
      })

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
        snapshot: editor.getSnapshot().context.value,
      })

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutNode = value.at(0) as Record<string, unknown>
        const contentArray = calloutNode['content'] as Array<
          Record<string, unknown>
        >
        const blockNode = contentArray.at(0)
        const children = blockNode?.['children'] as Array<
          Record<string, unknown>
        >
        return expect(children.length).toBe(1)
      })

      expect(patches).toEqual(
        expect.arrayContaining([expect.objectContaining({type: 'insert'})]),
      )
    })
  })
})

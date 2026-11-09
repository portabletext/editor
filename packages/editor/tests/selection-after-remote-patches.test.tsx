import {diffMatchPatch, insert, set, unset} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {Path} from '../src/engine/interfaces/path'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {whenTheCaretIsPutAfter} from '../test-utils/caret-placement'
import {getSelectionAfterText} from '../test-utils/text-selection'

describe('Feature: Selection adjustment after remote patches', () => {
  test('Scenario: Remote insert block before cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    const afterBarSelection = await whenTheCaretIsPutAfter(editor, 'bar')

    const insertedBlockKey = keyGenerator()
    const insertedSpanKey = keyGenerator()

    editor.send({
      type: 'apply',
      patches: [
        insert(
          [
            {
              _type: 'block',
              _key: insertedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: insertedSpanKey,
                  text: 'inserted',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [{_key: b1}],
        ),
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: insertedBlockKey,
          children: [
            {_type: 'span', _key: insertedSpanKey, text: 'inserted', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b2,
          children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterBarSelection)
    })
  })

  test('Scenario: Remote insert block after cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    const afterFooSelection = await whenTheCaretIsPutAfter(editor, 'foo')

    const insertedBlockKey = keyGenerator()
    const insertedSpanKey = keyGenerator()

    editor.send({
      type: 'apply',
      patches: [
        insert(
          [
            {
              _type: 'block',
              _key: insertedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: insertedSpanKey,
                  text: 'inserted',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          'after',
          [{_key: b2}],
        ),
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b2,
          children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: insertedBlockKey,
          children: [
            {_type: 'span', _key: insertedSpanKey, text: 'inserted', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterFooSelection)
    })
  })

  test('Scenario: Remote text edit in another block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    const afterFooSelection = await whenTheCaretIsPutAfter(editor, 'foo')

    editor.send({
      type: 'apply',
      patches: [
        diffMatchPatch('bar', 'baz', [
          {_key: b2},
          'children',
          {_key: s2},
          'text',
        ]),
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterFooSelection)
    })
  })

  test('Scenario: Remote delete of block before cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()
    const b3 = keyGenerator()
    const s3 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'aaa', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'bbb', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b3,
        children: [{_type: 'span', _key: s3, text: 'ccc', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    const afterCccSelection = await whenTheCaretIsPutAfter(editor, 'ccc')

    editor.send({
      type: 'apply',
      patches: [unset([{_key: b1}])],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b2,
          children: [{_type: 'span', _key: s2, text: 'bbb', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b3,
          children: [{_type: 'span', _key: s3, text: 'ccc', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterCccSelection)
    })
  })

  test('Scenario: Remote insert text in same block before cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'helloworld', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'helloworld')

    editor.send({
      type: 'apply',
      patches: [
        diffMatchPatch('helloworld', 'hello world', [
          {_key: b1},
          'children',
          {_key: s1},
          'text',
        ]),
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: hello world|',
      )
    })

    await vi.waitFor(() => {
      const adjustedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'hello world',
      )
      expect(editor.getSnapshot().context.selection).toEqual(adjustedSelection)
    })
  })

  test('Scenario: Remote insert span before cursor in same block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue,
    })

    await userEvent.click(locator)
    const afterHelloSelection = await whenTheCaretIsPutAfter(editor, 'hello')

    const newSpanKey = keyGenerator()

    editor.send({
      type: 'apply',
      patches: [
        insert(
          [
            {
              _type: 'span',
              _key: newSpanKey,
              text: 'world',
              marks: ['strong'],
            },
          ],
          'before',
          [{_key: b1}, 'children', {_key: s1}],
        ),
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: [strong:world]hello|',
      )
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        afterHelloSelection,
      )
    })
  })

  test('Scenario: Remote split of block where cursor is', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'foobar')

    const newBlockKey = keyGenerator()
    const newSpanKey = keyGenerator()

    editor.send({
      type: 'apply',
      patches: [
        diffMatchPatch('foobar', 'foo', [
          {_key: b1},
          'children',
          {_key: s1},
          'text',
        ]),
        insert(
          [
            {
              _type: 'block',
              _key: newBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: newSpanKey,
                  text: 'bar',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          'after',
          [{_key: b1}],
        ),
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo|', 'B: bar'].join('\n'),
      )
    })

    await vi.waitFor(() => {
      const adjustedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'foo',
      )
      expect(editor.getSnapshot().context.selection).toEqual(adjustedSelection)
    })
  })

  test('Scenario: Remote unset of span before cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [
          {_type: 'span', _key: s1, text: 'foo', marks: ['strong']},
          {_type: 'span', _key: s2, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    const afterBarSelection = await whenTheCaretIsPutAfter(editor, 'bar')

    editor.send({
      type: 'apply',
      patches: [unset([{_key: b1}, 'children', {_key: s1}])],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual(afterBarSelection)
    })
  })

  test('Scenario: Remote mark toggle with re-keyed spans preserves the caret', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foobarbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'foobarbaz')

    const newSpanFoo = keyGenerator()
    const newSpanBar = keyGenerator()
    const newSpanBaz = keyGenerator()

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: b1,
          children: [
            {_type: 'span', _key: newSpanFoo, text: 'foo', marks: []},
            {_type: 'span', _key: newSpanBar, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: newSpanBaz, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value[0]).toEqual({
        _type: 'block',
        _key: b1,
        children: [
          {_type: 'span', _key: newSpanFoo, text: 'foo', marks: []},
          {_type: 'span', _key: newSpanBar, text: 'bar', marks: ['strong']},
          {_type: 'span', _key: newSpanBaz, text: 'baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      })
    })

    await vi.waitFor(() => {
      const expectedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'baz',
      )
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })

  test('Scenario: Remote children replacement with different text keeps the current fallback', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foobarbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'foobarbaz')

    const newSpan = keyGenerator()

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: newSpan, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      const children = (
        editor.getSnapshot().context.value[0] as {
          children: Array<{text?: string}>
        }
      ).children
      expect(children[0]?.text).toBe('hello')
    })

    // Text changed, so offset mapping would be guesswork; the selection
    // keeps the pre-existing fallback (start of the replaced children).
    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.focus.path).toEqual([
        {_key: b1},
        'children',
        {_key: newSpan},
      ])
      expect(selection?.focus.offset).toBe(0)
    })
  })
})

describe.each([
  {depth: 'at the root', wrap: atRoot},
  {depth: 'inside a callout', wrap: inCallout},
  {depth: 'inside a callout inside a callout', wrap: inNestedCallout},
  {depth: 'inside a field with its own sub-schema', wrap: inNote},
])('Selection adjustment after remote patches $depth', ({wrap}) => {
  test("Scenario: Remote children replacement shrinking the caret's span clamps the caret to the new text length", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {wrapValue, prefix} = wrap(keyGenerator)
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockPath = [...prefix, {_key: blockKey}]
    const spanPath = [...blockPath, 'children', {_key: spanKey}]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestingSchemaDefinition,
      initialValue: wrapValue([block(blockKey, spanKey, 'foobarbaz')]),
      children: <NodePlugin nodes={nestingContainers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 6},
        focus: {path: spanPath, offset: 6},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath, offset: 6},
        focus: {path: spanPath, offset: 6},
        backward: false,
      })
    })

    editor.send({
      type: 'apply',
      patches: [
        set(
          [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          [...blockPath, 'children'],
        ),
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        wrapValue([block(blockKey, spanKey, 'foo')]),
      )
    })

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 3},
      backward: false,
    })
  })
})

const nestingSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'note',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal'}, {name: 'h1'}],
              decorators: [{name: 'em'}],
            },
          ],
        },
      ],
    },
  ],
})

const nestingContainers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'note', arrayField: 'body'}),
]

type Wrap = (keyGenerator: () => string) => {
  wrapValue: (blocks: Array<PortableTextBlock>) => Array<PortableTextBlock>
  prefix: Path
}

function atRoot(): ReturnType<Wrap> {
  return {wrapValue: (blocks) => blocks, prefix: []}
}

function inCallout(keyGenerator: () => string): ReturnType<Wrap> {
  const calloutKey = keyGenerator()

  return {
    wrapValue: (blocks) => [
      {_type: 'callout', _key: calloutKey, content: blocks},
    ],
    prefix: [{_key: calloutKey}, 'content'],
  }
}

function inNestedCallout(keyGenerator: () => string): ReturnType<Wrap> {
  const outerKey = keyGenerator()
  const innerKey = keyGenerator()

  return {
    wrapValue: (blocks) => [
      {
        _type: 'callout',
        _key: outerKey,
        content: [{_type: 'callout', _key: innerKey, content: blocks}],
      },
    ],
    prefix: [{_key: outerKey}, 'content', {_key: innerKey}, 'content'],
  }
}

function inNote(keyGenerator: () => string): ReturnType<Wrap> {
  const noteKey = keyGenerator()

  return {
    wrapValue: (blocks) => [{_type: 'note', _key: noteKey, body: blocks}],
    prefix: [{_key: noteKey}, 'body'],
  }
}

function block(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: compileSchema(nestingSchemaDefinition).block.name,
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

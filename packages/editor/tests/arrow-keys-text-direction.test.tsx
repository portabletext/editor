import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {Path} from '../src/engine/interfaces/path'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {name: 'image'},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}, {type: 'callout'}],
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
            {type: 'image'},
          ],
        },
      ],
    },
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
})

const containers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'note', arrayField: 'body'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

const ltr = 'foo'
const rtl = 'אבג'

describe.each([
  {depth: 'at the root', wrap: atRoot},
  {depth: 'inside a callout', wrap: inCallout},
  {depth: 'inside a callout inside a callout', wrap: inNestedCallout},
  {depth: 'inside a table cell', wrap: inTableCell},
  {depth: 'inside a field with its own sub-schema', wrap: inNote},
])(
  'Arrow keys follow the text direction of the focused block $depth',
  ({wrap}) => {
    test('Scenario: ArrowLeft in an RTL block after an LTR sibling moves toward the end of the text', async () => {
      const {editor, spanPath} = await setUp(wrap, [ltr, rtl], {offset: 1})

      await userEvent.keyboard('{ArrowLeft}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 2},
          backward: false,
        })
      })
    })

    test('Scenario: ArrowRight in an RTL block after an LTR sibling moves toward the start of the text', async () => {
      const {editor, spanPath} = await setUp(wrap, [ltr, rtl], {offset: 1})

      await userEvent.keyboard('{ArrowRight}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: ArrowLeft in an LTR block after an RTL sibling moves toward the start of the text', async () => {
      const {editor, spanPath} = await setUp(wrap, [rtl, ltr], {offset: 1})

      await userEvent.keyboard('{ArrowLeft}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: ArrowRight in an LTR block after an RTL sibling moves toward the end of the text', async () => {
      const {editor, spanPath} = await setUp(wrap, [rtl, ltr], {offset: 1})

      await userEvent.keyboard('{ArrowRight}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 2},
          backward: false,
        })
      })
    })

    test('Scenario: ArrowLeft over an expanded selection in an RTL block after an LTR sibling collapses to its end', async () => {
      const {editor, spanPath} = await setUp(wrap, [ltr, rtl], {
        offset: 0,
        focusOffset: 2,
      })

      await userEvent.keyboard('{ArrowLeft}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 2},
          backward: false,
        })
      })
    })

    test('Scenario: ArrowLeft on a block object between an RTL block and an LTR block moves to the end of the RTL block', async () => {
      const {editor, firstSpanPath} = await setUpBlockObject(wrap)

      await userEvent.keyboard('{ArrowLeft}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: firstSpanPath, offset: 3},
          focus: {path: firstSpanPath, offset: 3},
          backward: false,
        })
      })
    })

    test('Scenario: ArrowRight on a block object between an RTL block and an LTR block moves to the start of the LTR block', async () => {
      const {editor, lastSpanPath} = await setUpBlockObject(wrap)

      await userEvent.keyboard('{ArrowRight}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: lastSpanPath, offset: 0},
          focus: {path: lastSpanPath, offset: 0},
          backward: false,
        })
      })
    })
  },
)

type KeyGenerator = () => string

type Wrap = (
  blocks: Array<PortableTextBlock>,
  keyGenerator: KeyGenerator,
) => {
  value: Array<PortableTextBlock>
  prefix: Path
}

async function setUp(
  wrap: Wrap,
  texts: [string, string],
  selection: {offset: number; focusOffset?: number},
) {
  const keyGenerator = createTestKeyGenerator()
  const blocks = texts.map((text) => textBlock(keyGenerator, text))
  const {value, prefix} = wrap(blocks, keyGenerator)
  const spanPath = spanPathOf(prefix, blocks[1]!)

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: value,
    children: <NodePlugin nodes={containers} />,
  })

  await expect.element(locator.getByText(texts[1])).toBeVisible()
  await userEvent.click(locator)
  editor.send({
    type: 'select',
    at: {
      anchor: {path: spanPath, offset: selection.offset},
      focus: {
        path: spanPath,
        offset: selection.focusOffset ?? selection.offset,
      },
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: spanPath, offset: selection.offset},
      focus: {
        path: spanPath,
        offset: selection.focusOffset ?? selection.offset,
      },
      backward: false,
    })
  })

  return {editor, spanPath}
}

async function setUpBlockObject(wrap: Wrap) {
  const keyGenerator = createTestKeyGenerator()
  const first = textBlock(keyGenerator, rtl)
  const image = {_type: 'image', _key: keyGenerator()}
  const last = textBlock(keyGenerator, ltr)
  const {value, prefix} = wrap([first, image, last], keyGenerator)
  const imagePath = [...prefix, {_key: image._key}]

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: value,
    children: <NodePlugin nodes={containers} />,
  })

  await expect.element(locator.getByText(ltr)).toBeVisible()
  await userEvent.click(locator)
  editor.send({
    type: 'select',
    at: {
      anchor: {path: imagePath, offset: 0},
      focus: {path: imagePath, offset: 0},
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: imagePath, offset: 0},
      focus: {path: imagePath, offset: 0},
      backward: false,
    })
  })

  return {
    editor,
    firstSpanPath: spanPathOf(prefix, first),
    lastSpanPath: spanPathOf(prefix, last),
  }
}

function textBlock(keyGenerator: KeyGenerator, text: string) {
  return {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keyGenerator(), text, marks: []}],
  }
}

function spanPathOf(prefix: Path, block: ReturnType<typeof textBlock>) {
  return [
    ...prefix,
    {_key: block._key},
    'children',
    {_key: block.children[0]!._key},
  ]
}

function atRoot(blocks: Array<PortableTextBlock>) {
  return {value: blocks, prefix: []}
}

function inCallout(
  blocks: Array<PortableTextBlock>,
  keyGenerator: KeyGenerator,
) {
  const callout = {_type: 'callout', _key: keyGenerator(), content: blocks}

  return {
    value: [callout],
    prefix: [{_key: callout._key}, 'content'],
  }
}

function inNestedCallout(
  blocks: Array<PortableTextBlock>,
  keyGenerator: KeyGenerator,
) {
  const inner = {_type: 'callout', _key: keyGenerator(), content: blocks}
  const outer = {_type: 'callout', _key: keyGenerator(), content: [inner]}

  return {
    value: [outer],
    prefix: [{_key: outer._key}, 'content', {_key: inner._key}, 'content'],
  }
}

function inTableCell(
  blocks: Array<PortableTextBlock>,
  keyGenerator: KeyGenerator,
) {
  const cell = {_type: 'cell', _key: keyGenerator(), content: blocks}
  const row = {_type: 'row', _key: keyGenerator(), cells: [cell]}
  const table = {_type: 'table', _key: keyGenerator(), rows: [row]}

  return {
    value: [table],
    prefix: [
      {_key: table._key},
      'rows',
      {_key: row._key},
      'cells',
      {_key: cell._key},
      'content',
    ],
  }
}

function inNote(blocks: Array<PortableTextBlock>, keyGenerator: KeyGenerator) {
  const note = {_type: 'note', _key: keyGenerator(), body: blocks}

  return {
    value: [note],
    prefix: [{_key: note._key}, 'body'],
  }
}

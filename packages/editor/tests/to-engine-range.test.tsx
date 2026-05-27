import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent, type Locator} from 'vitest/browser'
import type {Editor} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('toEngineRange', () => {
  test('Scenario: Collapsed selection inside a span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
        },
      ],
    })

    await selectInDom({editor, locator}, [
      {block: blockKey, span: spanKey, offset: 2},
      {block: blockKey, span: spanKey, offset: 2},
    ])

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 2,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 2,
      },
      backward: false,
    })
  })

  test('Scenario: Expanded selection across two spans in one block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const span2Key = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: span1Key, text: 'hello ', marks: []},
            {_type: 'span', _key: span2Key, text: 'world', marks: ['strong']},
          ],
        },
      ],
    })

    await selectInDom({editor, locator}, [
      {block: blockKey, span: span1Key, offset: 0},
      {block: blockKey, span: span2Key, offset: 5},
    ])

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: span1Key}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: span2Key}],
        offset: 5,
      },
      backward: false,
    })
  })

  test('Scenario: Expanded selection across two text blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'bar', marks: []}],
        },
      ],
    })

    await selectInDom({editor, locator}, [
      {block: block1Key, span: span1Key, offset: 1},
      {block: block2Key, span: span2Key, offset: 2},
    ])

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: block1Key}, 'children', {_key: span1Key}],
        offset: 1,
      },
      focus: {
        path: [{_key: block2Key}, 'children', {_key: span2Key}],
        offset: 2,
      },
      backward: false,
    })
  })

  test('Scenario: Selection from text into a void block keeps the void in range', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
        {_type: 'image', _key: imageKey},
      ],
    })

    await userEvent.click(locator)

    const editorEl = locator.element() as HTMLElement
    const startNode = findTextNode(editorEl, blockKey, spanKey)
    const voidEl = editorEl.querySelector(
      `[data-block-key="${imageKey}"]`,
    ) as HTMLElement | null

    if (!startNode || !voidEl) {
      throw new Error('Could not find text node or void element')
    }

    document.getSelection()!.setBaseAndExtent(startNode, 0, voidEl, 0)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {path: [{_key: imageKey}], offset: 0},
        backward: false,
      })
    })
  })
})

async function selectInDom(
  context: {editor: Editor; locator: Locator},
  endpoints: [
    {block: string; span: string; offset: number},
    {block: string; span: string; offset: number},
  ],
) {
  const editorEl = context.locator.element() as HTMLElement
  editorEl.focus()

  const [start, end] = endpoints
  const startNode = findTextNode(editorEl, start.block, start.span)
  const endNode = findTextNode(editorEl, end.block, end.span)

  if (!startNode || !endNode) {
    throw new Error('Could not find one or both text nodes')
  }

  document
    .getSelection()!
    .setBaseAndExtent(startNode, start.offset, endNode, end.offset)
  document.dispatchEvent(new Event('selectionchange'))

  await vi.waitFor(() => {
    expect(context.editor.getSnapshot().context.selection).not.toBeNull()
  })
}

function findTextNode(
  editorEl: HTMLElement,
  blockKey: string,
  spanKey: string,
): Node | undefined {
  const blockEl = editorEl.querySelector(`[data-block-key="${blockKey}"]`)
  if (!blockEl) {
    return undefined
  }
  const spanEl = blockEl.querySelector(`[data-child-key="${spanKey}"]`)
  if (!spanEl) {
    return undefined
  }
  return spanEl.querySelector('[data-slate-string="true"]')?.childNodes[0]
}

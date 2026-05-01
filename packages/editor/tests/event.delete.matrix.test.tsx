import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {EditorSelection} from '../src'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

/**
 * Scenarios that motivated the unification of `deleteText` into
 * `deleteRange` + `deleteCollapsed`. Each test sets the selection, sends a
 * `delete` event, and asserts both the resulting value and the cursor
 * position. Setup uses literal keys (`b0`, `s0`, ...) so assertions can be
 * deeply compared without any partial matching.
 */

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  blockObjects: [{name: 'image'}],
  inlineObjects: [{name: 'stock-ticker'}],
})

describe('event.delete | unified primitives matrix', () => {
  test('collapsed selection with default unit deletes one character forward', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
      },
    ])
    await select(editor, point({_key: 'b0'}, 'children', {_key: 's0'}, 1))

    editor.send({type: 'delete'})

    await assertValue(editor, ['B: f|o'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 1),
    )
  })

  test('collapsed selection with backward direction deletes one character backward', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
      },
    ])
    await select(editor, point({_key: 'b0'}, 'children', {_key: 's0'}, 2))

    editor.send({type: 'delete', direction: 'backward'})

    await assertValue(editor, ['B: f|o'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 1),
    )
  })

  test('collapsed selection with unit:word deletes the word backward', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'hello world', marks: []}],
      },
    ])
    await select(editor, point({_key: 'b0'}, 'children', {_key: 's0'}, 11))

    editor.send({type: 'delete', direction: 'backward', unit: 'word'})

    await assertValue(editor, ['B: hello |'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 6),
    )
  })

  test('collapsed selection with unit:block unsets the block', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
      },
    ])
    await select(editor, point({_key: 'b0'}, 'children', {_key: 's0'}, 0))

    editor.send({type: 'delete', unit: 'block'})

    // The block holding the selection is unset; the selection ref points at
    // the dead block key, so textspec renders no cursor.
    // TODO: unit:'block' selection stale-ref bug - see /identity OPEN bugs
    await assertValue(editor, ['B: bar'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 0),
    )
  })

  test('collapsed selection on a void block unsets the void', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
      },
      {_type: 'image', _key: 'i0'},
    ])
    await select(editor, {path: [{_key: 'i0'}], offset: 0})

    editor.send({type: 'delete'})

    await assertValue(editor, ['B: foo|'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 3),
    )
  })

  test('expanded range within a single span trims the text', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foobar', marks: []}],
      },
    ])
    await select(
      editor,
      point({_key: 'b0'}, 'children', {_key: 's0'}, 1),
      point({_key: 'b0'}, 'children', {_key: 's0'}, 4),
    )

    editor.send({type: 'delete'})

    await assertValue(editor, ['B: f|ar'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 1),
    )
  })

  test('expanded range across two same-block spans with different marks keeps boundaries', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: ['strong']},
        ],
      },
    ])
    await select(
      editor,
      point({_key: 'b0'}, 'children', {_key: 's0'}, 1),
      point({_key: 'b0'}, 'children', {_key: 's1'}, 2),
    )

    editor.send({type: 'delete'})

    // Different-mark spans must NOT auto-merge; boundary survives.
    await assertValue(editor, ['B: f|[strong:r]'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 1),
    )
  })

  test('expanded range across two text blocks merges the blocks', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
      },
    ])
    await select(
      editor,
      point({_key: 'b0'}, 'children', {_key: 's0'}, 2),
      point({_key: 'b1'}, 'children', {_key: 's1'}, 1),
    )

    editor.send({type: 'delete'})

    await assertValue(editor, ['B: fo|ar'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 2),
    )
  })

  test('expanded range from offset 0 of start block preserves the end block key', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
      },
    ])
    await select(
      editor,
      point({_key: 'b0'}, 'children', {_key: 's0'}, 0),
      point({_key: 'b1'}, 'children', {_key: 's1'}, 1),
    )

    editor.send({type: 'delete'})

    // Start span emptied, so unset start; end block survives with its key.
    await assertValue(editor, ['B: |ar'])
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'ar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b1'}, 'children', {_key: 's1'}, 0),
    )
  })

  test('expanded range with a void at the start unsets the void and trims the end', async () => {
    const editor = await setup([
      {_type: 'image', _key: 'i0'},
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'bar', marks: []}],
      },
    ])
    await select(
      editor,
      {path: [{_key: 'i0'}], offset: 0},
      point({_key: 'b0'}, 'children', {_key: 's0'}, 2),
    )

    editor.send({type: 'delete'})

    await assertValue(editor, ['B: |r'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 0),
    )
  })

  test('expanded range with a void at the end trims the start and unsets the void', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
      },
      {_type: 'image', _key: 'i0'},
    ])
    await select(editor, point({_key: 'b0'}, 'children', {_key: 's0'}, 1), {
      path: [{_key: 'i0'}],
      offset: 0,
    })

    editor.send({type: 'delete'})

    await assertValue(editor, ['B: f|'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 1),
    )
  })

  test('expanded range from one void to another removes the entire region between', async () => {
    const editor = await setup([
      {_type: 'image', _key: 'i0'},
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
      },
      {_type: 'image', _key: 'i1'},
    ])
    await select(
      editor,
      {path: [{_key: 'i0'}], offset: 0},
      {path: [{_key: 'i1'}], offset: 0},
    )

    editor.send({type: 'delete'})

    // Both voids and the text block in range are removed; editor is left with
    // an empty placeholder block.
    await assertValue(editor, ['B: |'])
  })

  test('expanded range across more than two blocks removes the middle blocks', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'mid', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'bar', marks: []}],
      },
    ])
    await select(
      editor,
      point({_key: 'b0'}, 'children', {_key: 's0'}, 2),
      point({_key: 'b2'}, 'children', {_key: 's2'}, 1),
    )

    editor.send({type: 'delete'})

    await assertValue(editor, ['B: fo|ar'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 2),
    )
  })

  test('inline object inside a span range is removed', async () => {
    const editor = await setup([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'stock-ticker', _key: 'i0'},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
      },
    ])
    await select(
      editor,
      point({_key: 'b0'}, 'children', {_key: 's0'}, 2),
      point({_key: 'b0'}, 'children', {_key: 's1'}, 1),
    )

    editor.send({type: 'delete'})

    await assertValue(editor, ['B: fo|ar'])
    expect(editor.getSnapshot().context.selection).toEqual(
      collapsed({_key: 'b0'}, 'children', {_key: 's0'}, 2),
    )
  })
})

async function setup(value: Array<unknown>) {
  const keyGenerator = createTestKeyGenerator()
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: value as never,
  })

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  return editor
}

function point(...args: Array<{_key: string} | string | number>) {
  const offset = args.pop() as number
  const path = args as Array<{_key: string} | string>
  return {path, offset}
}

function collapsed(
  ...args: Array<{_key: string} | string | number>
): EditorSelection {
  const at = point(...args)
  return {anchor: at, focus: at, backward: false}
}

async function select(
  editor: Awaited<ReturnType<typeof setup>>,
  anchor: {path: Array<{_key: string} | string>; offset: number},
  focus?: {path: Array<{_key: string} | string>; offset: number},
) {
  editor.send({type: 'select', at: {anchor, focus: focus ?? anchor}})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).not.toBeNull()
  })
}

async function assertValue(
  editor: Awaited<ReturnType<typeof setup>>,
  expected: Array<string>,
) {
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      expected.join('\n'),
    )
  })
}

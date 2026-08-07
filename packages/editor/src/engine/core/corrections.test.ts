import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createEditor} from '../create-editor'
import {normalize} from '../editor/normalize'
import type {Editor} from '../interfaces/editor'
import {CORRECTIONS} from './corrections'

const schema = compileSchema(defineSchema({}))

type Fixture = Record<string, unknown>

// Keep in sync with `normalize-corrections.equivalence.test.ts`'s
// `createBareEditor`: this one skips `containers`, since none of the
// fixtures here exercise container corrections.
function createBareEditor(value: ReadonlyArray<Fixture>): Editor {
  const editor = createEditor()

  editor.containers = new Map()
  editor.blockIndexMap = new Map()
  editor.listIndexMap = new Map()
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap: editor.blockIndexMap,
    context: {
      containers: new Map(),
      converters: [],
      keyGenerator: createTestKeyGenerator(),
      readOnly: false,
      schema,
      selection: null,
      value: value as unknown as Array<PortableTextBlock>,
    },
    decoratorState: {},
  } as Editor['snapshot']

  return editor
}

describe('CORRECTIONS', () => {
  test('names and types match today\u2019s if-chain order exactly', () => {
    expect(
      CORRECTIONS.map((correction) => [correction.name, correction.type]),
    ).toEqual([
      ['root.no-blocks', 'structural'],
      ['node.missing-type', 'structural'],
      ['node.missing-key', 'structural'],
      ['node.duplicate-sibling-key', 'structural'],
      ['text-block.missing-mark-defs', 'cosmetic'],
      ['text-block.missing-style', 'cosmetic'],
      ['span.missing-text', 'structural'],
      ['span.missing-marks', 'cosmetic'],
      ['span.empty-with-annotations', 'cosmetic'],
      ['text-block.duplicate-mark-defs', 'cosmetic'],
      ['text-block.unused-mark-defs', 'cosmetic'],
      ['container.missing-child-array', 'structural'],
      ['container.duplicate-child-key', 'structural'],
      ['text-block.children-not-array', 'structural'],
      ['text-block.no-children', 'structural'],
    ])
  })
})

describe('scheduling', () => {
  test('while processing remote changes, a cosmetic correction is skipped but a structural one still runs', () => {
    const editor = createBareEditor([
      {
        // Missing `_key` (`node.missing-key`, structural) and missing
        // `style` (`text-block.missing-style`, cosmetic) on the same node.
        _type: 'block',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'a', marks: []}],
      },
    ])

    editor.isProcessingRemoteChanges = true
    normalize(editor, {force: true})

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'a', marks: []}],
      },
    ])
  })

  test('a group with a duplicate elsewhere is not cached, even when the node visited first is itself unique', () => {
    const value = [
      {
        _type: 'block',
        _key: 'dup',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'a', marks: []}],
      },
      {
        _type: 'block',
        _key: 'unique',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'b', marks: []}],
      },
      {
        _type: 'block',
        _key: 'dup',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's2', text: 'c', marks: []}],
      },
    ]
    const editor = createBareEditor(value)

    // Visit the unique node directly: `correct` scans the whole group, not
    // just this node's own key, so it must see the duplicate at index 0/2
    // and refuse to cache the group as verified-unique.
    editor.normalizeNode([editor.snapshot.context.value[1]!, [1]])
    expect(editor.verifiedUniqueChildGroups).toEqual(new Set())

    // The duplicate must still get fixed on this later visit - a wrongly
    // cached group above would make `tryCorrection` skip `correct` here too.
    editor.normalizeNode([editor.snapshot.context.value[0]!, [0]])

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'dup',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'a', marks: []}],
      },
      {
        _type: 'block',
        _key: 'unique',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'b', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's2', text: 'c', marks: []}],
      },
    ])
  })

  test('a verified-unique group is cached, and a later visit to the group skips `correct` entirely', () => {
    const value = [
      {
        _type: 'block',
        _key: 'a',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'c',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's2', text: '', marks: []}],
      },
    ]
    const editor = createBareEditor(value)

    editor.normalizeNode([editor.snapshot.context.value[0]!, [0]])
    expect(editor.verifiedUniqueChildGroups).toEqual(new Set(['']))

    // Introduce a duplicate directly on the value, bypassing `editor.apply`
    // (which would invalidate the cache entry). If the memo actually gates
    // `correct`, this duplicate is never touched by the visit below.
    ;(editor.snapshot.context.value[2] as {_key: string})._key = 'a'

    editor.normalizeNode([editor.snapshot.context.value[2]!, [2]])

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'a',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'a',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's2', text: '', marks: []}],
      },
    ])
  })
})

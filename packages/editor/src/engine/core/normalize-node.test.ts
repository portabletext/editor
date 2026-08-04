import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createEditor} from '../create-editor'
import {normalize} from '../editor/normalize'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {normalizeRuleTableForTesting} from './normalize-node'

const schema = compileSchema(defineSchema({}))

// Keep in sync with `createBareEditor` in `operation-channel.test.ts`; not
// extracted to a shared helper so each suite can drift independently.
function createBareEditor(value: Array<PortableTextBlock>): Editor {
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
      value,
    },
    decoratorState: {},
    // The bare engine editor lacks the fields that `withDOM` and
    // `createEditorEngine` assign. Only the snapshot fields used by
    // `normalizeNode` and `apply` are needed here.
  } as Editor['snapshot']

  return editor
}

describe('normalizeRuleTableForTesting', () => {
  test('rule ids and their remote-change gate, in table order', () => {
    expect(normalizeRuleTableForTesting).toEqual([
      ['root.no-blocks', true],
      ['text-block.merge-same-mark-spans', false],
      ['node.missing-type', true],
      ['node.missing-key', true],
      ['node.duplicate-sibling-key', true],
      ['text-block.missing-mark-defs', false],
      ['text-block.missing-style', false],
      ['span.missing-text', true],
      ['span.missing-marks', false],
      ['span.empty-with-annotations', false],
      ['text-block.duplicate-mark-defs', false],
      ['text-block.unused-mark-defs', false],
      ['span.opaque-to-later-rules', true],
      ['container.missing-child-array', true],
      ['container.duplicate-child-key', true],
      ['text-block.children-not-array', true],
      ['text-block.no-children', true],
      ['text-block.adjacent-spans', 'partial'],
    ])
  })
})

describe('normalizeNode ordering', () => {
  test('a node missing both `_type` and `_key` is repaired in table order and then trips `span.missing-text` and `span.missing-marks`', () => {
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{} as unknown as Node],
      },
    ])

    normalize(editor, {force: true})

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k0', text: '', marks: []}],
      },
    ])

    // `node.missing-type` runs before `node.missing-key` in table order: it
    // sets `_type` on the entry path as given, unresolved keyed segment and
    // all (the child has no `_key` yet, so that segment serializes as `{}`).
    // Only `node.missing-key`, run next, walks the tree to resolve that
    // segment to a numeric index before minting the key. Swapping those two
    // rows doesn't change the final tree (both eventually get set either
    // way), so this also pins the exact operation sequence, not just the
    // end state.
    expect(editor.operations).toEqual([
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {}, '_type'],
        value: 'span',
        inverse: {
          type: 'unset',
          path: [{_key: 'b1'}, 'children', {}, '_type'],
        },
      },
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', 0, '_key'],
        value: 'k0',
        inverse: {
          type: 'unset',
          path: [{_key: 'b1'}, 'children', 0, '_key'],
        },
      },
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 'k0'}, 'text'],
        value: '',
        inverse: {
          type: 'unset',
          path: [{_key: 'b1'}, 'children', {_key: 'k0'}, 'text'],
        },
      },
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 'k0'}, 'marks'],
        value: [],
        inverse: {
          type: 'unset',
          path: [{_key: 'b1'}, 'children', {_key: 'k0'}, 'marks'],
        },
      },
    ])
  })
})

describe('normalizeNode remote-changes gate', () => {
  test('a `false` rule is skipped, a `true` rule still runs, and the `partial` rule only defers its gated arm', () => {
    const editor = createBareEditor([
      {
        _type: 'block',
        markDefs: [],
        children: [
          // Bracketing this against a leading span is the `partial` rule's
          // ungated arm; it must run even while remote changes are applied.
          {_type: 'stock-ticker', _key: 'o1'} as unknown as Node,
          // Adjacent spans with equal marks are the `partial` rule's gated
          // (merge) arm; it must not run while remote changes are applied.
          {_type: 'span', _key: 's1', text: 'foo', marks: []},
          {_type: 'span', _key: 's2', text: 'foo', marks: []},
        ],
      } as unknown as PortableTextBlock,
    ])

    // `withRemoteChanges` (`engine-plugin.remote-changes.ts`) just toggles
    // this plain boolean; set it directly since there's no DOM-wired editor
    // here to call it through.
    editor.isProcessingRemoteChanges = true

    normalize(editor, {force: true})

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        // `node.missing-key` (`true`) mints the missing block key despite
        // remote-changes mode.
        _key: 'k0',
        markDefs: [],
        // `.style` stays missing: `text-block.missing-style` (`false`) is
        // skipped in remote-changes mode.
        children: [
          // Inserted by the `partial` rule's ungated bracketing arm.
          {_type: 'span', _key: 'k1', text: '', marks: []},
          {_type: 'stock-ticker', _key: 'o1'},
          // Stay unmerged: the `partial` rule's gated arm is skipped.
          {_type: 'span', _key: 's1', text: 'foo', marks: []},
          {_type: 'span', _key: 's2', text: 'foo', marks: []},
        ],
      },
    ])
  })
})

describe('normalizeNode span pass-through', () => {
  test('a span entry with empty text and a dangling annotation mark normalizes to no operations, locally and remotely', () => {
    // The mark doesn't resolve to any of the block's `markDefs`, so
    // `span.empty-with-annotations` leaves it alone even though the text is
    // empty (see that rule's comment). Every other span/text-block rule
    // already sees a fully valid span, so nothing in the table has
    // anything to repair; this holds whether or not a rule explicitly stops
    // the walk at spans, so it doesn't pin table structure.
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: '', marks: ['dangling-annotation']},
        ],
      },
    ]

    for (const isProcessingRemoteChanges of [false, true]) {
      const editor = createBareEditor(structuredClone(value))
      editor.isProcessingRemoteChanges = isProcessingRemoteChanges

      const spanEntry: [Node, Path] = [
        (editor.snapshot.context.value[0] as PortableTextTextBlock)
          .children[0] as Node,
        [{_key: 'b1'}, 'children', {_key: 's1'}],
      ]
      editor.normalizeNode(spanEntry)

      expect(editor.operations).toEqual([])
      expect(editor.snapshot.context.value).toEqual(value)
    }
  })
})

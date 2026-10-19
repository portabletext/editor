import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {
  applyMarkdownEdit,
  type ReconciliationReport,
} from './apply-markdown-edit'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {DefaultUnknownTypeRenderer} from './from-portable-text/renderers/type'

function block(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
  }
}

describe('the reconciliation report', () => {
  test('a typo fix reports the untouched siblings preserved as content-unchanged and the edited block preserved as same-position', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'Our pick:'),
      {_type: 'product', _key: 'p1', sku: 'abc-123'},
      block('b2', 's2', 'Ships tomorow.'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'tomorow',
      'tomorrow',
    )
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'p1',
          path: [{_key: 'p1'}],
          valueChanged: false,
        },
        {
          basis: 'same-position',
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('an edited `json:object` payload reports `valueChanged` on its preserved key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'text'),
      {_type: 'product', _key: 'p1', sku: 'abc'},
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      '"sku": "abc"',
      '"sku": "xyz"',
    )
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('b1', 's1', 'text'),
      {_type: 'product', _key: 'p1', sku: 'xyz'},
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'same-position',
          key: 'p1',
          path: [{_key: 'p1'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a stored span with no `_key` reports `valueChanged: true` once key filling mints one', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', text: 'foo', marks: []}],
      },
      block('b2', 's2', 'bar'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'bar',
      'baz',
    )
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      block('b2', 's2', 'baz'),
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'k1',
          path: [{_key: 'b1'}, 'children', {_key: 'k1'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a moved block reports `valueChanged: false` when only its position changed', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alpha'), block('b2', 's2', 'beta')]
    const markdown = 'beta\n\nalpha'
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          valueChanged: false,
        },
        {
          basis: 'content-moved',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a moved block reports its key preserved as content-moved', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alpha'), block('b2', 's2', 'beta')]
    const markdown = 'beta\n\nalpha'
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          valueChanged: false,
        },
        {
          basis: 'content-moved',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a split reports the surviving fragment preserved as content-split', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alphabeta')]
    const markdown = 'alpha\n\nbeta'
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-split',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a merge reports the surviving block preserved as content-merged', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alpha'), block('b2', 's2', 'beta')]
    const markdown = 'alphabeta'
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-merged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('an unequal-gap edit reports a mutual-best match as similar-content', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'the quick brown fox jumps'),
      block(
        'b2',
        's2',
        'over the lazy dog and quietly disappeared into the night',
      ),
    ]
    const markdown = [
      'the quick brown fox jumps',
      'new paragraph inserted',
      'over the lazy dog and quiet disappeared into the night',
    ].join('\n\n')
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'similar-content',
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a whole-document skip of key matching reports round-trip-mismatch with no preserved keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {
        _type: 'block',
        _key: 'b2',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 's2', text: 'bar\nbaz', marks: []}],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('k0', 'k1', 'foo'),
      {
        _type: 'block',
        _key: 'k2',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      block('k4', 'k5', 'baz'),
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b2'}, 'children', {_key: 's2'}],
        message:
          "The block's text came back different, starting at the text `\\nbaz`",
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch from an inline object reparsing as text reports the inline object', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: 'bar ', marks: []},
          {_type: 'wikilink', _key: 'w1'},
        ],
      },
      block('b3', 's3', 'baz'),
    ]
    const serialize = {types: {wikilink: () => '[[foo]]'}}
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('k0', 'k1', 'foo'),
      block('k2', 'k3', 'bar [[foo]]'),
      block('k4', 'k5', 'baz'),
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b2'}, 'children', {_key: 'w1'}],
        message:
          "The block's text came back different, starting at the `wikilink` inline object",
        snippet: '[[foo]]',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch from a mark renderer rewriting span text reports the span', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: 'foo ', marks: []},
          {_type: 'span', _key: 's3', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 's4', text: ' baz', marks: []},
        ],
      },
      block('b3', 's5', 'baz'),
    ]
    const serialize = {
      marks: {
        strong: ({children}: {children: string}) => children.toUpperCase(),
      },
    }
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('k0', 'k1', 'foo'),
      block('k2', 'k3', 'foo BAR baz'),
      block('k4', 'k5', 'baz'),
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b2'}, 'children', {_key: 's3'}],
        message:
          "The block's text came back different, starting at the text `bar`",
        snippet: 'BAR baz',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch past leading whitespace reports the child at the untrimmed offset', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: '  foo ', marks: []},
          {_type: 'span', _key: 's3', text: 'bar ', marks: []},
          {_type: 'wikilink', _key: 'w1'},
        ],
      },
    ]
    const serialize = {types: {wikilink: () => '[[baz]]'}}
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('k0', 'k1', 'foo'),
      block('k2', 'k3', 'foo bar [[baz]]'),
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b2'}, 'children', {_key: 'w1'}],
        message:
          "The block's text came back different, starting at the `wikilink` inline object",
        snippet: '[[baz]]',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch where the stored text is a prefix of what came back reports the block', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foo', marks: []},
          {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
        ],
      },
    ]
    const serialize = {
      marks: {strong: ({children}: {children: string}) => `${children} baz`},
    }
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([block('k0', 'k1', 'foobar baz')])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b1'}],
        message: "The block's text came back with more text at the end",
        snippet: 'baz',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch from one inline object going missing reports the position where the text first differs without claiming a loss', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foo ', marks: []},
          {_type: 'wikilink', _key: 'w1'},
          {_type: 'wikilink', _key: 'w2'},
        ],
      },
    ]
    const serialize = {
      types: {
        wikilink: (options: Parameters<typeof DefaultUnknownTypeRenderer>[0]) =>
          options.value._key === 'w1'
            ? ''
            : DefaultUnknownTypeRenderer(options),
      },
    }
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'wikilink', _key: 'w2'},
        ],
      },
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b1'}, 'children', {_key: 'w2'}],
        message:
          "The block's text came back different, starting at the `wikilink` inline object",
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch from a changed emoji keeps the message and snippet on whole code points', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foo ', marks: []},
          {_type: 'span', _key: 's2', text: '😀', marks: ['strong']},
        ],
      },
    ]
    const serialize = {
      marks: {
        strong: ({children}: {children: string}) =>
          children.replace('😀', '😁'),
      },
    }
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([block('k0', 'k1', 'foo 😁')])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b1'}, 'children', {_key: 's2'}],
        message:
          "The block's text came back different, starting at the text `😀`",
        snippet: '😁',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch from an emoji changing only its high surrogate keeps the message and snippet on whole code points', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foo ', marks: []},
          {_type: 'span', _key: 's2', text: '😀 bar', marks: ['strong']},
        ],
      },
    ]
    const serialize = {
      marks: {
        strong: ({children}: {children: string}) =>
          children.replace('😀', '🈀'),
      },
    }
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([block('k0', 'k1', 'foo 🈀 bar')])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b1'}, 'children', {_key: 's2'}],
        message:
          "The block's text came back different, starting at the text `😀 bar`",
        snippet: '🈀 bar',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch whose round-tripped text differs only by an inline object reports no snippet', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foo ', marks: []},
          {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
          {_type: 'wikilink', _key: 'w1'},
        ],
      },
    ]
    const serialize = {marks: {strong: () => ''}}
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'wikilink', _key: 'w1'},
        ],
      },
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b1'}, 'children', {_key: 's2'}],
        message:
          "The block's text came back different, starting at the text `bar`",
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch from a block object reparsing as a text block reports the block object', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {_type: 'callout', _key: 'c1', text: 'bar'},
      block('b3', 's3', 'baz'),
    ]
    const serialize = {
      types: {
        callout: ({value}: {value: {text: string}}) => value.text,
      },
    }
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('k0', 'k1', 'foo'),
      block('k2', 'k3', 'bar'),
      block('k4', 'k5', 'baz'),
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'type-changed',
        storedPath: [{_key: 'c1'}],
        message: 'The `callout` block came back as a `block`',
        snippet: 'bar',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch on a keyless block reports indexes in the stored value, counting empty blocks', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      block('e1', 'es1', ''),
      {
        _type: 'block',
        style: 'h1',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: 'bar', marks: []},
          {_type: 'span', text: '\nbaz', marks: []},
        ],
      } as unknown as PortableTextBlock,
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('k0', 'k1', 'foo'),
      {
        _type: 'block',
        _key: 'k2',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      block('k4', 'k5', 'baz'),
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [2, 'children', 1],
        message:
          "The block's text came back different, starting at the text `\\nbaz`",
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch that drops stored blocks reports the first block past the surviving prefix', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {_type: 'table', _key: 't1', rows: []},
      {_type: 'table', _key: 't2', rows: []},
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([block('k0', 'k1', 'foo')])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'block-count-changed',
        storedPath: [{_key: 't1'}],
        message: '2 blocks did not come back, starting with the `table` block',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch that adds blocks reports the last stored block', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {_type: 'html', _key: 'h1', html: '<div>bar</div>\n\nbaz'},
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('k0', 'k1', 'foo'),
      {_type: 'html', _key: 'k2', html: '<div>bar</div>'},
      block('k3', 'k4', 'baz'),
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'block-count-changed',
        storedPath: [{_key: 'h1'}],
        message: 'The round trip added 1 block after the `html` block',
        snippet: 'baz',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch where every stored block is an empty paragraph reports the last stored block', () => {
    const stored = [block('e1', 'es1', ''), block('e2', 'es2', '')]
    const serialize = {
      block: {normal: () => ' '},
      blockSpacing: () => '\n\n---\n\n',
    }
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator: createTestKeyGenerator()},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([{_type: 'horizontal-rule', _key: 'k0'}])
    expect(
      applyMarkdownEdit(stored, markdown, {
        serialize,
        deserialize: {keyGenerator: createTestKeyGenerator()},
      }),
    ).toEqual(result)
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'block-count-changed',
        storedPath: [{_key: 'e2'}],
        message: 'The empty paragraphs came back as 1 block',
      },
      renamedKeys: [],
    })
  })

  test('a round-trip-mismatch reports the earliest failing block, a text mismatch before a later type mismatch', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: 'bar ', marks: []},
          {_type: 'mention', _key: 'm1'},
        ],
      },
      {_type: 'callout', _key: 'c1', text: 'baz'},
    ]
    const serialize = {
      types: {
        mention: () => '[[foo]]',
        callout: ({value}: {value: {text: string}}) => value.text,
      },
    }
    const markdown = portableTextToMarkdown(structuredClone(stored), serialize)
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      serialize,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('k0', 'k1', 'foo'),
      block('k2', 'k3', 'bar [[foo]]'),
      block('k4', 'k5', 'baz'),
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b2'}, 'children', {_key: 'm1'}],
        message:
          "The block's text came back different, starting at the `mention` inline object",
        snippet: '[[foo]]',
      },
      renamedKeys: [],
    })
  })

  test('a markDef collision reports the losing definition as a key fallback, not a renamed key', () => {
    let calls = 0
    const keyGenerator = () => {
      const index = calls++
      return index === 1 ? 'a1' : `fresh${index}`
    }
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [{_type: 'link', _key: 'a1', href: 'https://old'}],
        children: [{_type: 'span', _key: 's1', text: 'old', marks: ['a1']}],
      },
    ]
    const markdown = '[new](https://new) [old](https://old)'
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'a1', href: 'https://new'},
          {_type: 'link', _key: 'fresh4', href: 'https://old'},
        ],
        children: [
          {_type: 'span', _key: 'fresh2', text: 'new', marks: ['a1']},
          {_type: 'span', _key: 'fresh3', text: ' ', marks: []},
          {_type: 'span', _key: 's1', text: 'old', marks: ['fresh4']},
        ],
      },
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'same-position',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [
        {
          type: 'annotation-key-conflict',
          path: [{_key: 'b1'}, 'markDefs', {_key: 'fresh4'}],
        },
      ],
      renamedKeys: [],
    })
  })

  test('a fresh key colliding with an adopted key reports the rewrite as a renamed key', () => {
    let calls = 0
    const keyGenerator = () => (calls++ === 0 ? 'b1' : `fresh${calls}`)
    const stored = [block('b1', 's1', 'alpha')]
    const markdown = 'brand new paragraph\n\nalpha'
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('fresh5', 'fresh2', 'brand new paragraph'),
      block('b1', 's1', 'alpha'),
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [
        {previousKey: 'b1', key: 'fresh5', path: [{_key: 'fresh5'}]},
      ],
    })
  })

  test('span-level preserved keys inside an edited block are reported at every depth', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foo ', marks: []},
          {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 's3', text: ' baz', marks: []},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'baz',
      'fizz',
    )
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'same-position',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
          valueChanged: false,
        },
        {
          basis: 'same-position',
          key: 's3',
          path: [{_key: 'b1'}, 'children', {_key: 's3'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a nested keyed node under a keyless `json:object` wrapper reports its renamed key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alpha')]
    const fence = [
      '```json:object',
      JSON.stringify({
        _type: 'widget',
        _key: 'w1',
        rows: [
          {
            cells: [
              {_key: 'dup', label: 'a'},
              {_key: 'dup', label: 'b'},
            ],
          },
        ],
      }),
      '```',
    ].join('\n')
    const markdown = `${portableTextToMarkdown(structuredClone(stored))}\n\n${fence}`
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('b1', 's1', 'alpha'),
      {
        _type: 'widget',
        _key: 'w1',
        rows: [
          {
            cells: [
              {_key: 'dup', label: 'a'},
              {_key: 'k2', label: 'b'},
            ],
          },
        ],
      },
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [
        {
          previousKey: 'dup',
          key: 'k2',
          path: [{_key: 'w1'}, 'rows', 0, 'cells', {_key: 'k2'}],
        },
      ],
    })
  })

  test('a node renamed after adopting a duplicated stored key is not listed as preserved', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'dup',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'alpha', marks: []}],
      },
      {
        _type: 'block',
        _key: 'dup',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's2', text: 'beta', marks: []}],
      },
    ]
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, 'alpha\n\nbeta', {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      {
        _type: 'block',
        _key: 'dup',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'alpha', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's2', text: 'beta', marks: []}],
      },
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'dup',
          path: [{_key: 'dup'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'dup'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [{_key: 'k4'}, 'children', {_key: 's2'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [{previousKey: 'dup', key: 'k4', path: [{_key: 'k4'}]}],
    })
  })

  test('a renamed key inside a keyless top-level `json:object` block reports with an index root', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alpha')]
    const fence = [
      '```json:object',
      JSON.stringify({
        _type: 'widget',
        rows: [
          {
            cells: [
              {_key: 'dup', label: 'a'},
              {_key: 'dup', label: 'b'},
            ],
          },
        ],
      }),
      '```',
    ].join('\n')
    const markdown = `${portableTextToMarkdown(structuredClone(stored))}\n\n${fence}`
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('b1', 's1', 'alpha'),
      {
        _type: 'widget',
        rows: [
          {
            cells: [
              {_key: 'dup', label: 'a'},
              {_key: 'k2', label: 'b'},
            ],
          },
        ],
      },
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [
        {
          previousKey: 'dup',
          key: 'k2',
          path: [1, 'rows', 0, 'cells', {_key: 'k2'}],
        },
      ],
    })
  })

  test('a gap over the similarity pair cap reports ambiguous-region-too-large with the affected keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = manyBlocks(51, 'stored')
    const markdown = manyParagraphs(52, 'edited')
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    const editedKeys = result.map((node) => (node as {_key: string})._key)
    expect(editedKeys).toHaveLength(52)
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [],
      keyFallbacks: [{type: 'ambiguous-region-too-large', keys: editedKeys}],
      renamedKeys: [],
    })
  })

  test('a preserved mark definition is reported alongside the spans and block that reference it', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [{_type: 'link', _key: 'link1', href: 'https://example.com'}],
        children: [
          {_type: 'span', _key: 's1', text: 'Read the ', marks: []},
          {_type: 'span', _key: 's2', text: 'docs', marks: ['link1']},
          {_type: 'span', _key: 's3', text: ' today', marks: []},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'today',
      'now',
    )
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'same-position',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
          valueChanged: false,
        },
        {
          basis: 'same-position',
          key: 's3',
          path: [{_key: 'b1'}, 'children', {_key: 's3'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'link1',
          path: [{_key: 'b1'}, 'markDefs', {_key: 'link1'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a reinserted empty-block run reports its whole subtree as content-unchanged', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'first paragraph'),
      block('empty1', 'es1', ''),
      block('b2', 's2', 'second paragraph'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'second',
      'SECOND',
    )
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'empty1',
          path: [{_key: 'empty1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'es1',
          path: [{_key: 'empty1'}, 'children', {_key: 'es1'}],
          valueChanged: false,
        },
        {
          basis: 'same-position',
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a reinserted empty-block run with a duplicate-keyed child reports the subtree change on the block', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'first paragraph'),
      {
        _type: 'block',
        _key: 'empty1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'dup', text: '', marks: []},
          {_type: 'span', _key: 'dup', text: '', marks: []},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('b1', 's1', 'first paragraph'),
      {
        _type: 'block',
        _key: 'empty1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'dup', text: '', marks: []},
          {_type: 'span', _key: 'k2', text: '', marks: []},
        ],
      },
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'empty1',
          path: [{_key: 'empty1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'dup',
          path: [{_key: 'empty1'}, 'children', {_key: 'dup'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [
        {
          previousKey: 'dup',
          key: 'k2',
          path: [{_key: 'empty1'}, 'children', {_key: 'k2'}],
        },
      ],
    })
  })

  test('a verbatim-returned anchored block reports its stored keys preserved at every depth', () => {
    const schema = compileSchema(
      defineSchema({decorators: [{name: 'strong'}, {name: 'highlight'}]}),
    )
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'hello ', marks: ['highlight']},
          {_type: 'span', _key: 's2', text: 'world', marks: []},
        ],
      },
      block('b2', 's3', 'beta'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored), {schema})
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown.replace('beta', 'gamma'), {
      schema,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
          valueChanged: false,
        },
        {
          basis: 'same-position',
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's3',
          path: [{_key: 'b2'}, 'children', {_key: 's3'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('a verbatim-returned moved block reports its root content-moved and its children content-unchanged', () => {
    const schema = compileSchema(
      defineSchema({decorators: [{name: 'strong'}, {name: 'highlight'}]}),
    )
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'hello ', marks: ['highlight']},
          {_type: 'span', _key: 's2', text: 'world', marks: []},
        ],
      },
      block('b2', 's3', 'beta'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored), {schema})
    const [first, second] = markdown.split('\n\n')
    const edited = `${second}\n\n${first}`
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, edited, {
      schema,
      deserialize: {keyGenerator: createTestKeyGenerator()},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's3',
          path: [{_key: 'b2'}, 'children', {_key: 's3'}],
          valueChanged: false,
        },
        {
          basis: 'content-moved',
          key: 'b1',
          path: [{_key: 'b1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
    })
  })

  test('leaving onReconciliation unset changes nothing about the returned value', () => {
    const stored = [block('b1', 's1', 'alpha'), block('b2', 's2', 'beta')]
    const markdown = 'beta\n\nalpha'
    const withoutReport = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator: createTestKeyGenerator()},
    })
    const withReport = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator: createTestKeyGenerator()},
      onReconciliation: () => {},
    })
    expect(withReport).toEqual(withoutReport)
  })

  test('onReconciliation fires exactly once, including when key matching is skipped', () => {
    const onReconciliation = vi.fn()
    const stored = [block('b1', 's1', 'alpha'), block('b2', 's2', 'beta')]
    applyMarkdownEdit(stored, 'beta\n\nalpha', {
      deserialize: {keyGenerator: createTestKeyGenerator()},
      onReconciliation,
    })
    expect(onReconciliation).toHaveBeenCalledTimes(1)

    onReconciliation.mockClear()
    const refusingStored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'one\ntwo', marks: []}],
      },
    ]
    applyMarkdownEdit(
      refusingStored,
      portableTextToMarkdown(structuredClone(refusingStored)),
      {
        deserialize: {keyGenerator: createTestKeyGenerator()},
        onReconciliation,
      },
    )
    expect(onReconciliation).toHaveBeenCalledTimes(1)
  })
})

function manyBlocks(count: number, prefix: string): Array<PortableTextBlock> {
  return Array.from({length: count}, (_, index) =>
    block(
      `${prefix}b${index}`,
      `${prefix}s${index}`,
      `${prefix} filler text ${index}`,
    ),
  )
}

function manyParagraphs(count: number, prefix: string): string {
  return Array.from(
    {length: count},
    (_, index) => `${prefix} filler text ${index}`,
  ).join('\n\n')
}

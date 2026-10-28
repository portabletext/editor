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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [
        {
          _type: 'widget',
          _key: 'w1',
          position: 'block',
          path: [{_key: 'w1'}],
          message:
            'Kept the block-level `widget` object as written: the schema has no block-level `widget` object',
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test("a renamed key inside a keyless top-level `json:object` payload reports under the payload's generated key", () => {
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
        _key: 'k2',
        rows: [
          {
            cells: [
              {_key: 'dup', label: 'a'},
              {_key: 'k3', label: 'b'},
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
          key: 'k3',
          path: [{_key: 'k2'}, 'rows', 0, 'cells', {_key: 'k3'}],
        },
      ],
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [
        {
          _type: 'widget',
          _key: 'k2',
          position: 'block',
          path: [{_key: 'k2'}],
          message:
            'Kept the block-level `widget` object as written: the schema has no block-level `widget` object',
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('an edited block whose stored annotation has no markdown form reports the dropped annotation as a hidden loss', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [internalLinkBlock('b1'), block('b2', 's4', 'bar')]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'baz.',
      'baz now.',
    )
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('b1', 'k1', 'Read foo before baz now.'),
      block('b2', 's4', 'bar'),
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
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's4',
          path: [{_key: 'b2'}, 'children', {_key: 's4'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [
        {
          type: 'annotation-dropped',
          message:
            'Removed the `internalLink` annotation, kept its text: no `internalLink` mark renderer',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
          snippet: 'foo',
        },
      ],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('a stored annotation with no markdown form on a block the edit left alone is not a hidden loss', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [internalLinkBlock('b1'), block('b2', 's4', 'bar')]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'bar',
      'qux',
    )
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([internalLinkBlock('b1'), block('b2', 's4', 'qux')])
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
          key: 'm1',
          path: [{_key: 'b1'}, 'markDefs', {_key: 'm1'}],
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
          basis: 'content-unchanged',
          key: 's3',
          path: [{_key: 'b1'}, 'children', {_key: 's3'}],
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
          key: 's4',
          path: [{_key: 'b2'}, 'children', {_key: 's4'}],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('a rewritten block that comes back with a fresh key next to an inserted block reports its dropped annotation as a hidden loss', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [internalLinkBlock('b1'), block('b2', 's4', 'bar')]
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(
      stored,
      'See foo for comparison.\n\nqux\n\nbar',
      {
        deserialize: {keyGenerator},
        onReconciliation: (r) => {
          report = r
        },
      },
    )
    expect(result).toEqual([
      block('k0', 'k1', 'See foo for comparison.'),
      block('k2', 'k3', 'qux'),
      block('b2', 's4', 'bar'),
    ])
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
          key: 's4',
          path: [{_key: 'b2'}, 'children', {_key: 's4'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [
        {
          type: 'annotation-dropped',
          message:
            'Removed the `internalLink` annotation, kept its text: no `internalLink` mark renderer',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
          snippet: 'foo',
        },
      ],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('a deleted block whose stored annotation has no markdown form reports the dropped annotation as a hidden loss', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [internalLinkBlock('b1'), block('b2', 's4', 'bar')]
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, 'bar', {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([block('b2', 's4', 'bar')])
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
          key: 's4',
          path: [{_key: 'b2'}, 'children', {_key: 's4'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [
        {
          type: 'annotation-dropped',
          message:
            'Removed the `internalLink` annotation, kept its text: no `internalLink` mark renderer',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
          snippet: 'foo',
        },
      ],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('a deleted block that held nothing markdown cannot show reports no hidden loss', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [internalLinkBlock('b1'), block('b2', 's4', 'bar')]
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, 'Read foo before baz.', {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([internalLinkBlock('b1')])
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
          key: 'm1',
          path: [{_key: 'b1'}, 'markDefs', {_key: 'm1'}],
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
          basis: 'content-unchanged',
          key: 's3',
          path: [{_key: 'b1'}, 'children', {_key: 's3'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('a whole-document skip of key matching reports every stored loss as a hidden loss', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      internalLinkBlock('b1'),
      {
        _type: 'block',
        _key: 'b2',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 's4', text: 'bar\nqux', marks: []}],
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
      block('k0', 'k1', 'Read foo before baz.'),
      {
        _type: 'block',
        _key: 'k2',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      block('k4', 'k5', 'qux'),
    ])
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b2'}, 'children', {_key: 's4'}],
        message:
          "The block's text came back different, starting at the text `\\nqux`",
      },
      renamedKeys: [],
      hiddenLosses: [
        {
          type: 'annotation-dropped',
          message:
            'Removed the `internalLink` annotation, kept its text: no `internalLink` mark renderer',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
          snippet: 'foo',
        },
      ],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('an edited block whose custom style and decorator markdown cannot show were restored reports no hidden loss', () => {
    const keyGenerator = createTestKeyGenerator()
    const leadBlock = {
      _type: 'block',
      _key: 'b1',
      style: 'lead',
      markDefs: [],
      children: [
        {_type: 'span', _key: 's1', text: 'foo baz.', marks: ['highlight']},
      ],
    }
    const stored = [leadBlock, block('b2', 's2', 'bar')]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'baz.',
      'baz now.',
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
        style: 'lead',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 's1',
            text: 'foo baz now.',
            marks: ['highlight'],
          },
        ],
      },
      block('b2', 's2', 'bar'),
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
          basis: 'same-position',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: true,
        },
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
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('an edit to one cell of a ragged table reports a loss in an untouched sibling cell', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'table',
        _key: 't1',
        headerRows: 0,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {_type: 'cell', _key: 'c1', value: [internalLinkBlock('cb1')]},
              {_type: 'cell', _key: 'c2', value: [block('cb2', 's4', 'bar')]},
            ],
          },
          {
            _type: 'row',
            _key: 'r2',
            cells: [
              {_type: 'cell', _key: 'c3', value: [block('cb3', 's5', 'qux')]},
              {_type: 'cell', _key: 'c4', value: [block('cb4', 's6', 'quux')]},
              {_type: 'cell', _key: 'c5', value: [block('cb5', 's7', 'corge')]},
            ],
          },
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'bar',
      'bar now',
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
        _type: 'table',
        _key: 't1',
        headerRows: 0,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'k11',
                value: [block('k9', 'k10', 'Read foo before baz.')],
              },
              {
                _type: 'cell',
                _key: 'k14',
                value: [block('k12', 'k13', 'bar now')],
              },
              {_type: 'cell', _key: 'k17', value: [block('k15', 'k16', '')]},
            ],
          },
          {
            _type: 'row',
            _key: 'r2',
            cells: [
              {_type: 'cell', _key: 'c3', value: [block('cb3', 's5', 'qux')]},
              {_type: 'cell', _key: 'c4', value: [block('cb4', 's6', 'quux')]},
              {_type: 'cell', _key: 'c5', value: [block('cb5', 's7', 'corge')]},
            ],
          },
        ],
      },
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'same-position',
          key: 't1',
          path: [{_key: 't1'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 'r1',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'r2',
          path: [{_key: 't1'}, 'rows', {_key: 'r2'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'c3',
          path: [{_key: 't1'}, 'rows', {_key: 'r2'}, 'cells', {_key: 'c3'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'cb3',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r2'},
            'cells',
            {_key: 'c3'},
            'value',
            {_key: 'cb3'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's5',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r2'},
            'cells',
            {_key: 'c3'},
            'value',
            {_key: 'cb3'},
            'children',
            {_key: 's5'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'c4',
          path: [{_key: 't1'}, 'rows', {_key: 'r2'}, 'cells', {_key: 'c4'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'cb4',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r2'},
            'cells',
            {_key: 'c4'},
            'value',
            {_key: 'cb4'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's6',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r2'},
            'cells',
            {_key: 'c4'},
            'value',
            {_key: 'cb4'},
            'children',
            {_key: 's6'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'c5',
          path: [{_key: 't1'}, 'rows', {_key: 'r2'}, 'cells', {_key: 'c5'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'cb5',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r2'},
            'cells',
            {_key: 'c5'},
            'value',
            {_key: 'cb5'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's7',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r2'},
            'cells',
            {_key: 'c5'},
            'value',
            {_key: 'cb5'},
            'children',
            {_key: 's7'},
          ],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [
        {
          type: 'annotation-dropped',
          message:
            'Removed the `internalLink` annotation, kept its text: no `internalLink` mark renderer',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'children',
            {_key: 's2'},
          ],
          snippet: 'foo',
        },
      ],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('an inline object carrying a lost annotation key in its own `marks` does not hide the loss of that annotation', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [
          {
            _type: 'internalLink',
            _key: 'm1',
            reference: {_type: 'reference', _ref: 'foo'},
          },
        ],
        children: [
          {_type: 'span', _key: 's1', text: 'foo', marks: ['m1']},
          {_type: 'span', _key: 's2', text: ' bar ', marks: []},
          {_type: 'wikilink', _key: 'w1', marks: ['m1']},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'bar',
      'bar [](foo)',
    )
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {
        keyGenerator,
        marks: {
          link: ({context, value}) => ({
            _type: 'internalLink',
            _key: context.keyGenerator(),
            reference: {_type: 'reference', _ref: value.href},
          }),
        },
      },
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
          {
            _type: 'internalLink',
            _key: 'm1',
            reference: {_type: 'reference', _ref: 'foo'},
          },
        ],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo bar  ', marks: []},
          {_type: 'wikilink', _key: 'w1', marks: ['m1']},
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
          key: 'w1',
          path: [{_key: 'b1'}, 'children', {_key: 'w1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'm1',
          path: [{_key: 'b1'}, 'markDefs', {_key: 'm1'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [
        {
          type: 'annotation-dropped',
          message:
            'Removed the `internalLink` annotation, kept its text: no `internalLink` mark renderer',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          snippet: 'foo',
        },
      ],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('an unchanged table whose cells reuse a span key reports no hidden loss for the decorator on the second cell', () => {
    const keyGenerator = createTestKeyGenerator()
    const table = {
      _type: 'table',
      _key: 't1',
      headerRows: 0,
      rows: [
        {
          _type: 'row',
          _key: 'r1',
          cells: [
            {_type: 'cell', _key: 'c1', value: [block('cb1', 's1', 'foo')]},
            {
              _type: 'cell',
              _key: 'c2',
              value: [
                {
                  _type: 'block',
                  _key: 'cb2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 's1',
                      text: 'bar',
                      marks: ['highlight'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    const stored = [table, block('b2', 's2', 'baz')]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'baz',
      'qux',
    )
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([table, block('b2', 's2', 'qux')])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'content-unchanged',
          key: 't1',
          path: [{_key: 't1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'r1',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'c1',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'cb1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'children',
            {_key: 's1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'c2',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c2'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'cb2',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c2'},
            'value',
            {_key: 'cb2'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c2'},
            'value',
            {_key: 'cb2'},
            'children',
            {_key: 's1'},
          ],
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
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('an edit to one table cell reports the untouched sibling cell content-unchanged at every depth', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'table',
        _key: 't1',
        headerRows: 0,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                value: [
                  {
                    _type: 'block',
                    _key: 'cb1',
                    style: 'normal',
                    markDefs: [
                      {
                        _type: 'internalLink',
                        _key: 'm1',
                        reference: {_type: 'reference', _ref: 'foo'},
                      },
                    ],
                    children: [
                      {_type: 'span', _key: 's1', text: 'Read ', marks: []},
                      {_type: 'span', _key: 's2', text: 'foo', marks: ['m1']},
                      {
                        _type: 'span',
                        _key: 's3',
                        text: ' before baz.',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
              {_type: 'cell', _key: 'c2', value: [block('cb2', 's4', 'bar')]},
            ],
          },
        ],
      },
      block('b2', 's5', 'qux'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'bar',
      'bar now',
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
          key: 't1',
          path: [{_key: 't1'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 'r1',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'c1',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'cb1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'm1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'markDefs',
            {_key: 'm1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'children',
            {_key: 's1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'children',
            {_key: 's2'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's3',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'children',
            {_key: 's3'},
          ],
          valueChanged: false,
        },
        {
          basis: 'same-position',
          key: 'c2',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c2'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 'cb2',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c2'},
            'value',
            {_key: 'cb2'},
          ],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's4',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c2'},
            'value',
            {_key: 'cb2'},
            'children',
            {_key: 's4'},
          ],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'b2',
          path: [{_key: 'b2'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's5',
          path: [{_key: 'b2'}, 'children', {_key: 's5'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('an edit to one table cell reports an untouched sibling cell holding a plain link content-unchanged', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'table',
        _key: 't1',
        headerRows: 0,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                value: [
                  {
                    _type: 'block',
                    _key: 'cb1',
                    style: 'normal',
                    markDefs: [
                      {_type: 'link', _key: 'm1', href: 'https://example.com'},
                    ],
                    children: [
                      {_type: 'span', _key: 's1', text: 'Read ', marks: []},
                      {_type: 'span', _key: 's2', text: 'foo', marks: ['m1']},
                      {
                        _type: 'span',
                        _key: 's3',
                        text: ' before baz.',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
              {_type: 'cell', _key: 'c2', value: [block('cb2', 's4', 'bar')]},
            ],
          },
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'bar',
      'bar now',
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
          key: 't1',
          path: [{_key: 't1'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 'r1',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'c1',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'cb1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 'm1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'markDefs',
            {_key: 'm1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'children',
            {_key: 's1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'children',
            {_key: 's2'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's3',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'cb1'},
            'children',
            {_key: 's3'},
          ],
          valueChanged: false,
        },
        {
          basis: 'same-position',
          key: 'c2',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c2'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 'cb2',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c2'},
            'value',
            {_key: 'cb2'},
          ],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's4',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c2'},
            'value',
            {_key: 'cb2'},
            'children',
            {_key: 's4'},
          ],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('a keyless block in an untouched table cell is not reported as a preserved key once key filling mints one', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'table',
        _key: 't1',
        headerRows: 0,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                value: [
                  {
                    _type: 'block',
                    style: 'normal',
                    markDefs: [
                      {
                        _type: 'internalLink',
                        _key: 'm1',
                        reference: {_type: 'reference', _ref: 'foo'},
                      },
                    ],
                    children: [
                      {_type: 'span', _key: 's1', text: 'Read ', marks: []},
                      {_type: 'span', _key: 's2', text: 'foo', marks: ['m1']},
                      {
                        _type: 'span',
                        _key: 's3',
                        text: ' before baz.',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
              {_type: 'cell', _key: 'c2', value: [block('cb2', 's4', 'bar')]},
            ],
          },
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'bar',
      'bar now',
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
        _type: 'table',
        _key: 't1',
        headerRows: 0,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k6',
                    style: 'normal',
                    markDefs: [
                      {
                        _type: 'internalLink',
                        _key: 'm1',
                        reference: {_type: 'reference', _ref: 'foo'},
                      },
                    ],
                    children: [
                      {_type: 'span', _key: 's1', text: 'Read ', marks: []},
                      {_type: 'span', _key: 's2', text: 'foo', marks: ['m1']},
                      {
                        _type: 'span',
                        _key: 's3',
                        text: ' before baz.',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'c2',
                value: [block('cb2', 's4', 'bar now')],
              },
            ],
          },
        ],
      },
    ])
    expect(report).toEqual({
      keyMatching: 'performed',
      preservedKeys: [
        {
          basis: 'same-position',
          key: 't1',
          path: [{_key: 't1'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 'r1',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'c1',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'm1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'k6'},
            'markDefs',
            {_key: 'm1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's1',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'k6'},
            'children',
            {_key: 's1'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's2',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'k6'},
            'children',
            {_key: 's2'},
          ],
          valueChanged: false,
        },
        {
          basis: 'content-unchanged',
          key: 's3',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'value',
            {_key: 'k6'},
            'children',
            {_key: 's3'},
          ],
          valueChanged: false,
        },
        {
          basis: 'same-position',
          key: 'c2',
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c2'}],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 'cb2',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c2'},
            'value',
            {_key: 'cb2'},
          ],
          valueChanged: true,
        },
        {
          basis: 'same-position',
          key: 's4',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c2'},
            'value',
            {_key: 'cb2'},
            'children',
            {_key: 's4'},
          ],
          valueChanged: true,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
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

  test('a heading level the schema has no style for is a markdown loss the caller still observes through onDegradation', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(defineSchema({styles: [{name: 'normal'}]}))
    const stored = [block('b1', 's1', 'foo')]
    const onDegradation = vi.fn()
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, 'foo\n\n### bar', {
      schema,
      deserialize: {keyGenerator, onDegradation},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([block('b1', 's1', 'foo'), block('k2', 'k3', 'bar')])
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'style-fallback',
              message:
                '`###` heading became a normal paragraph: the schema has no `h3` style',
              line: 3,
              snippet: 'bar',
            },
          ],
          message: expect.stringContaining('h3'),
        },
      ],
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
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [
        {
          type: 'style-fallback',
          message:
            '`###` heading became a normal paragraph: the schema has no `h3` style',
          line: 3,
          snippet: 'bar',
        },
      ],
      undeclaredObjects: [],
    })
  })

  test('a caller onDegradation that throws still makes applyMarkdownEdit throw', () => {
    const schema = compileSchema(defineSchema({styles: [{name: 'normal'}]}))
    const onReconciliation = vi.fn()
    expect(() =>
      applyMarkdownEdit([block('b1', 's1', 'foo')], 'foo\n\n### bar', {
        schema,
        deserialize: {
          keyGenerator: createTestKeyGenerator(),
          onDegradation: ({message}) => {
            throw new Error(message)
          },
        },
        onReconciliation,
      }),
    ).toThrow('the schema has no `h3` style')
    expect(onReconciliation).not.toHaveBeenCalled()
  })

  test('a `json:object` fence adding an undeclared block object is an undeclared object, not a markdown loss', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'foo')]
    const markdown = [
      'foo',
      '',
      '```json:object',
      '{"_type": "product", "_key": "p1"}',
      '```',
    ].join('\n')
    const onDegradation = vi.fn()
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator, onDegradation},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('b1', 's1', 'foo'),
      {_type: 'product', _key: 'p1'},
    ])
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'object-type-undeclared',
              message:
                'Kept the block-level `product` object as written: the schema has no block-level `product` object',
              line: 3,
              snippet: '{"_type": "product", "_key": "p1"}',
            },
          ],
          message: expect.stringContaining('product'),
        },
      ],
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
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [
        {
          _type: 'product',
          _key: 'p1',
          position: 'block',
          path: [{_key: 'p1'}],
          message:
            'Kept the block-level `product` object as written: the schema has no block-level `product` object',
        },
      ],
    })
  })

  test('a stored undeclared block object the edit keeps is not an undeclared object', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {_type: 'product', _key: 'p1', sku: 'abc'},
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'foo',
      'bar',
    )
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('b1', 's1', 'bar'),
      {_type: 'product', _key: 'p1', sku: 'abc'},
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
          basis: 'same-position',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          valueChanged: true,
        },
        {
          basis: 'content-unchanged',
          key: 'p1',
          path: [{_key: 'p1'}],
          valueChanged: false,
        },
      ],
      keyFallbacks: [],
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [],
      undeclaredObjects: [],
    })
  })

  test('a stored keyless undeclared object the edit keeps is not an undeclared object, though the round trip gives it a key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {_type: 'product', sku: 'abc'} as unknown as PortableTextBlock,
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'foo',
      'bar',
    )
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report.undeclaredObjects).toEqual([])
  })

  test('an undeclared object inside a declared container is not checked, stored or added', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = containerSchema()
    const stored = [
      block('b1', 's1', 'foo'),
      {
        _type: 'container',
        items: [{_type: 'legacy', _key: 'l1'}],
      } as unknown as PortableTextBlock,
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored), {
      schema,
    }).replace('foo', 'bar')
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      schema,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report.undeclaredObjects).toEqual([])
  })

  test('a second undeclared object of a stored type is an undeclared object, the stored one is not', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'foo'),
      {_type: 'product', sku: 'abc'} as unknown as PortableTextBlock,
    ]
    const markdown = [
      portableTextToMarkdown(structuredClone(stored)),
      '',
      '```json:object',
      JSON.stringify({_type: 'product', _key: 'p2', sku: 'def'}),
      '```',
    ].join('\n')
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report.undeclaredObjects).toEqual([
      {
        _type: 'product',
        _key: 'p2',
        position: 'block',
        path: [{_key: 'p2'}],
        message:
          'Kept the block-level `product` object as written: the schema has no block-level `product` object',
      },
    ])
  })

  test('an undeclared object the edit adds inside a declared container is not an undeclared object, since fields of declared objects are not searched', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = containerSchema()
    const stored = [
      block('b1', 's1', 'foo'),
      {
        _type: 'container',
        _key: 'c1',
        items: [
          {_type: 'entry', _key: 'e1'},
          {_type: 'legacy', _key: 'l1'},
        ],
      },
    ]
    const markdown = [
      'foo',
      '',
      '```json:object',
      JSON.stringify({
        _type: 'container',
        _key: 'c1',
        items: [
          {_type: 'entry', _key: 'e1'},
          {_type: 'legacy', _key: 'l1'},
          {_type: 'product', _key: 'p1'},
        ],
      }),
      '```',
    ].join('\n')
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      schema,
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('b1', 's1', 'foo'),
      {
        _type: 'container',
        _key: 'c1',
        items: [
          {_type: 'entry', _key: 'e1'},
          {_type: 'legacy', _key: 'l1'},
          {_type: 'product', _key: 'p1'},
        ],
      },
    ])
    expect(report.undeclaredObjects).toEqual([])
  })

  test('an undeclared inline object added to a paragraph is an undeclared object at its inline path', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'foo')]
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(
      stored,
      'foo json:object`{"_type":"mention","_key":"m1"}`',
      {
        deserialize: {keyGenerator},
        onReconciliation: (r) => {
          report = r
        },
      },
    )
    expect(result).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'mention', _key: 'm1'},
        ],
      },
    ])
    expect(report.markdownLosses).toEqual([])
    expect(report.undeclaredObjects).toEqual([
      {
        _type: 'mention',
        _key: 'm1',
        position: 'inline',
        path: [{_key: 'b1'}, 'children', {_key: 'm1'}],
        message:
          'Kept the inline `mention` object as written: the schema has no inline `mention` object',
      },
    ])
  })

  test('a stored undeclared inline object survives an edit that gives its paragraph a fresh key without being an undeclared object', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foo ', marks: []},
          {_type: 'mention', _key: 'm1'},
          {_type: 'span', _key: 's2', text: ' bar', marks: []},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'foo',
      'Completely different words',
    )
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, `baz\n\n${markdown}`, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('k0', 'k1', 'baz'),
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k3',
            text: 'Completely different words ',
            marks: [],
          },
          {_type: 'mention', _key: 'm1'},
          {_type: 'span', _key: 'k4', text: ' bar', marks: []},
        ],
      },
    ])
    expect(report.undeclaredObjects).toEqual([])
  })

  test('a callout the edit adds is not an undeclared object', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'foo')]
    const markdown = ['foo', '', '> [!NOTE]', '> bar'].join('\n')
    let report!: ReconciliationReport
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(result).toEqual([
      block('b1', 's1', 'foo'),
      {
        _key: 'k4',
        _type: 'callout',
        tone: 'note',
        content: [
          {
            _type: 'block',
            _key: 'k2',
            style: 'blockquote',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
    ])
    expect(report.markdownLosses).toEqual([])
    expect(report.undeclaredObjects).toEqual([])
  })

  test('a skipped report carries markdown losses and undeclared objects', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'foo\nbar', marks: []}],
      },
    ]
    const markdown = [
      portableTextToMarkdown(structuredClone(stored)),
      '### baz',
      '```json:object',
      '{"_type": "product", "_key": "p1"}',
      '```',
    ].join('\n\n')
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      schema: compileSchema(
        defineSchema({styles: [{name: 'normal'}, {name: 'h1'}]}),
      ),
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      keyMatching: 'skipped',
      reason: 'round-trip-mismatch',
      mismatch: {
        type: 'text-changed',
        storedPath: [{_key: 'b1'}, 'children', {_key: 's1'}],
        message:
          "The block's text came back different, starting at the text `\\nbar`",
      },
      renamedKeys: [],
      hiddenLosses: [],
      markdownLosses: [
        {
          type: 'style-fallback',
          message:
            '`###` heading became a normal paragraph: the schema has no `h3` style',
          line: 4,
          snippet: 'baz',
        },
      ],
      undeclaredObjects: [
        {
          _type: 'product',
          _key: 'p1',
          position: 'block',
          path: [{_key: 'p1'}],
          message:
            'Kept the block-level `product` object as written: the schema has no block-level `product` object',
        },
      ],
    })
  })
})

function containerSchema() {
  return compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'container',
          fields: [
            {
              name: 'items',
              type: 'array',
              of: [
                {type: 'block'},
                {type: 'object', name: 'entry', fields: []},
              ],
            },
          ],
        },
      ],
    }),
  )
}

function internalLinkBlock(blockKey: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [
      {
        _type: 'internalLink',
        _key: 'm1',
        reference: {_type: 'reference', _ref: 'foo'},
      },
    ],
    children: [
      {_type: 'span', _key: 's1', text: 'Read ', marks: []},
      {_type: 'span', _key: 's2', text: 'foo', marks: ['m1']},
      {_type: 'span', _key: 's3', text: ' before baz.', marks: []},
    ],
  }
}

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

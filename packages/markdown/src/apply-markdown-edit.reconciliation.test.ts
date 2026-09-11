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
  test('a typo fix reports the untouched siblings unchanged and the edited block positional', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
        {reason: 'unchanged', key: 'p1', path: [{_key: 'p1'}]},
        {reason: 'positional', key: 'b2', path: [{_key: 'b2'}]},
        {
          reason: 'positional',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        },
      ],
      refusals: [],
      repairs: [],
    })
  })

  test('a moved block reports its key as moved', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'b2', path: [{_key: 'b2'}]},
        {
          reason: 'unchanged',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        },
        {reason: 'moved', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
      ],
      refusals: [],
      repairs: [],
    })
  })

  test('a split reports the surviving fragment split', () => {
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
      restorations: [
        {reason: 'split', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'positional',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
      ],
      refusals: [],
      repairs: [],
    })
  })

  test('a merge reports the surviving block merged', () => {
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
      restorations: [
        {reason: 'merged', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'positional',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
      ],
      refusals: [],
      repairs: [],
    })
  })

  test('an unequal-gap edit reports a mutual-best match as similarity', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
        {reason: 'similarity', key: 'b2', path: [{_key: 'b2'}]},
        {
          reason: 'positional',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        },
      ],
      refusals: [],
      repairs: [],
    })
  })

  test('a whole-document refusal reports round-trip-mismatch with no restorations', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'one\ntwo', marks: []}],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    let report!: ReconciliationReport
    applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
      onReconciliation: (r) => {
        report = r
      },
    })
    expect(report).toEqual({
      restorations: [],
      refusals: [{reason: 'round-trip-mismatch'}],
      repairs: [],
    })
  })

  test('a markDef collision reports the losing definition refused, not repaired', () => {
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
          {_type: 'span', _key: 'fresh5', text: 'old', marks: ['fresh4']},
        ],
      },
    ])
    expect(report).toEqual({
      restorations: [{reason: 'positional', key: 'b1', path: [{_key: 'b1'}]}],
      refusals: [
        {
          reason: 'markdef-collision',
          path: [{_key: 'b1'}, 'markDefs', {_key: 'fresh4'}],
        },
      ],
      repairs: [],
    })
  })

  test('a fresh key colliding with an adopted key reports the rewrite as a repair', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
      ],
      refusals: [],
      repairs: [{previousKey: 'b1', key: 'fresh5', path: [{_key: 'fresh5'}]}],
    })
  })

  test('span-level restorations inside an edited block are reported at every depth', () => {
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
      restorations: [
        {reason: 'positional', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
        {
          reason: 'unchanged',
          key: 's2',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        },
        {
          reason: 'positional',
          key: 's3',
          path: [{_key: 'b1'}, 'children', {_key: 's3'}],
        },
      ],
      refusals: [],
      repairs: [],
    })
  })

  test('a nested keyed node under a keyless `json:object` wrapper reports its repair', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
      ],
      refusals: [],
      repairs: [
        {
          previousKey: 'dup',
          key: 'k2',
          path: [{_key: 'w1'}, 'rows', '0', 'cells', {_key: 'k2'}],
        },
      ],
    })
  })

  test('a node repaired after adopting a duplicated stored key is not listed as restored', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'dup', path: [{_key: 'dup'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'dup'}, 'children', {_key: 's1'}],
        },
        {
          reason: 'unchanged',
          key: 's2',
          path: [{_key: 'k4'}, 'children', {_key: 's2'}],
        },
      ],
      refusals: [],
      repairs: [{previousKey: 'dup', key: 'k4', path: [{_key: 'k4'}]}],
    })
  })

  test('a repair inside a keyless top-level `json:object` block reports with an index root', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
      ],
      refusals: [],
      repairs: [
        {
          previousKey: 'dup',
          key: 'k2',
          path: ['1', 'rows', '0', 'cells', {_key: 'k2'}],
        },
      ],
    })
  })

  test('a gap over the similarity pair cap reports evidence-cap with the affected keys', () => {
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
      restorations: [],
      refusals: [{reason: 'evidence-cap', keys: editedKeys}],
      repairs: [],
    })
  })

  test('a restored mark definition is reported alongside the spans and block that reference it', () => {
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
      restorations: [
        {reason: 'positional', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
        {
          reason: 'unchanged',
          key: 's2',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        },
        {
          reason: 'positional',
          key: 's3',
          path: [{_key: 'b1'}, 'children', {_key: 's3'}],
        },
        {
          reason: 'unchanged',
          key: 'link1',
          path: [{_key: 'b1'}, 'markDefs', {_key: 'link1'}],
        },
      ],
      refusals: [],
      repairs: [],
    })
  })

  test('a reinserted empty-block run reports its whole subtree unchanged', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
        {reason: 'unchanged', key: 'empty1', path: [{_key: 'empty1'}]},
        {
          reason: 'unchanged',
          key: 'es1',
          path: [{_key: 'empty1'}, 'children', {_key: 'es1'}],
        },
        {reason: 'positional', key: 'b2', path: [{_key: 'b2'}]},
        {
          reason: 'positional',
          key: 's2',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        },
      ],
      refusals: [],
      repairs: [],
    })
  })

  test('a verbatim-returned anchored block reports its stored keys restored at every depth', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
        {
          reason: 'unchanged',
          key: 's2',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        },
        {reason: 'positional', key: 'b2', path: [{_key: 'b2'}]},
        {
          reason: 'positional',
          key: 's3',
          path: [{_key: 'b2'}, 'children', {_key: 's3'}],
        },
      ],
      refusals: [],
      repairs: [],
    })
  })

  test('a verbatim-returned moved block reports its root moved and its children unchanged', () => {
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
      restorations: [
        {reason: 'unchanged', key: 'b2', path: [{_key: 'b2'}]},
        {
          reason: 'unchanged',
          key: 's3',
          path: [{_key: 'b2'}, 'children', {_key: 's3'}],
        },
        {reason: 'moved', key: 'b1', path: [{_key: 'b1'}]},
        {
          reason: 'unchanged',
          key: 's1',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        },
        {
          reason: 'unchanged',
          key: 's2',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        },
      ],
      refusals: [],
      repairs: [],
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

  test('onReconciliation fires exactly once, including on total refusal', () => {
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

import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {applyMarkdownEdit} from './apply-markdown-edit'
import {defaultTableObjectDefinition} from './default-schema'
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

describe(applyMarkdownEdit.name, () => {
  test('a fence key differing from the matched stored block loses to the stored key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [{_type: 'product', _key: 'p1', sku: 'a'}]
    const fence = [
      '```json:object',
      '{"_type": "product", "_key": "p9", "sku": "z"}',
      '```',
    ].join('\n')
    expect(
      applyMarkdownEdit(stored, fence, {deserialize: {keyGenerator}}),
    ).toEqual([{_type: 'product', _key: 'p1', sku: 'z'}])
  })

  test('a document-wide refusal drops stored empty blocks instead of adopting their keys', () => {
    const keyGenerator = createTestKeyGenerator()
    // A heading carrying `listItem` serializes to `- ## title text`, which
    // reparses as two blocks: the round trip changes the node count, so
    // the origin trace refuses and nothing may adopt, including the
    // trailing empty block, whose anchor (the payload's verbatim key)
    // would otherwise still be found in the result.
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'h2',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'title text', marks: []}],
      },
      {_type: 'product', _key: 'p1', sku: 'abc-123'},
      block('e1', 'es1', ''),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(markdown).toEqual(
      '- ## title text\n\n```json:object\n{\n  "_type": "product",\n  "_key": "p1",\n  "sku": "abc-123"\n}\n```',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
        listItem: 'bullet',
        level: 1,
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'h2',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'title text', marks: []}],
      },
      {_type: 'product', _key: 'p1', sku: 'abc-123'},
    ])
  })

  test('an empty custom-styled block reinserts like an empty paragraph', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'alpha'),
      {
        _type: 'block',
        _key: 'e1',
        style: 'lead',
        markDefs: [],
        children: [{_type: 'span', _key: 'es1', text: '  ', marks: []}],
      },
      block('b2', 's2', 'beta'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown.replace('beta', 'gamma'), {
        deserialize: {keyGenerator},
      }),
    ).toEqual([
      block('b1', 's1', 'alpha'),
      {
        _type: 'block',
        _key: 'e1',
        style: 'lead',
        markDefs: [],
        children: [{_type: 'span', _key: 'es1', text: '  ', marks: []}],
      },
      block('b2', 's2', 'gamma'),
    ])
  })

  test('a block of non-breaking spaces round-trips as content and keeps every key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'alpha'),
      {
        _type: 'block',
        _key: 'e1',
        style: 'lead',
        markDefs: [],
        children: [{_type: 'span', _key: 'es1', text: '\u00a0', marks: []}],
      },
      block('b2', 's2', 'beta'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown.replace('beta', 'gamma'), {
        deserialize: {keyGenerator},
      }),
    ).toEqual([
      block('b1', 's1', 'alpha'),
      {
        _type: 'block',
        _key: 'e1',
        style: 'lead',
        markDefs: [],
        children: [{_type: 'span', _key: 'es1', text: '\u00a0', marks: []}],
      },
      block('b2', 's2', 'gamma'),
    ])
  })

  test('an unchanged document gets every key back', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'alpha'),
      {_type: 'product', _key: 'p1', sku: 'abc-123'},
      block('b2', 's2', 'beta'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual(stored)
  })

  test('a one-word fix keeps the block key and the span key', () => {
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
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block('b1', 's1', 'Our pick:'),
      {_type: 'product', _key: 'p1', sku: 'abc-123'},
      block('b2', 's2', 'Ships tomorrow.'),
    ])
  })

  test('a typo fix next to a strong span lands as a text change on the same span', () => {
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
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foo ', marks: []},
          {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 's3', text: ' fizz', marks: []},
        ],
      },
    ])
  })

  test('merged spans keep the first contributor key, like editor normalization', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foo', marks: []},
          {_type: 'span', _key: 's2', text: 'bar', marks: []},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([block('b1', 's1', 'foobar')])
  })

  test('a merge past the span-pair cap does not adopt the key; below the cap it still does', () => {
    const belowCap = applyMarkdownEdit(
      [alternatingSpansBlock('b1', 3, 'small')],
      alternatingMarkdown(2, 0, 'small0small1'),
      {deserialize: {keyGenerator: createTestKeyGenerator()}},
    )
    expect(belowCap).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'smalls0', text: 'small0small1', marks: []},
          {_type: 'span', _key: 'smalls2', text: 'edited1', marks: ['strong']},
        ],
      },
    ])

    const overCap = applyMarkdownEdit(
      [alternatingSpansBlock('b1', 51, 'stored')],
      alternatingMarkdown(61, 30, 'stored0stored1'),
      {deserialize: {keyGenerator: createTestKeyGenerator()}},
    )
    expect(
      (overCap[0] as {children: Array<{_key: string}>}).children.map(
        (child) => child._key,
      ),
    ).toEqual(Array.from({length: 61}, (_, index) => `k${index + 1}`))
  })

  test('two identical annotations keep their keys, pairing in order', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'a1', href: 'https://same.example'},
          {_type: 'link', _key: 'a2', href: 'https://same.example'},
        ],
        children: [
          {_type: 'span', _key: 's1', text: 'first', marks: ['a1']},
          {_type: 'span', _key: 's2', text: ' and ', marks: []},
          {_type: 'span', _key: 's3', text: 'second', marks: ['a2']},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual(stored)
  })

  test('two identical annotations with a dropped field keep their keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [
          {
            _type: 'link',
            _key: 'a1',
            href: 'https://same.example',
            rel: 'nofollow',
          },
          {
            _type: 'link',
            _key: 'a2',
            href: 'https://same.example',
            rel: 'nofollow',
          },
        ],
        children: [
          {_type: 'span', _key: 's1', text: 'first', marks: ['a1']},
          {_type: 'span', _key: 's2', text: ' and ', marks: []},
          {_type: 'span', _key: 's3', text: 'second', marks: ['a2']},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual(stored)
  })

  test('an unchanged link keeps its annotation key and reference', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [{_type: 'link', _key: 'a1', href: 'https://example.com'}],
        children: [
          {_type: 'span', _key: 's1', text: 'visit ', marks: []},
          {_type: 'span', _key: 's2', text: 'here', marks: ['a1']},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual(stored)
  })

  test('a changed link keeps the block, span, and annotation keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'a1', href: 'https://example.com/old'},
        ],
        children: [{_type: 'span', _key: 's1', text: 'here', marks: ['a1']}],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      '/old',
      '/new',
    )
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
    })
    expect(result).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'a1', href: 'https://example.com/new'},
        ],
        children: [{_type: 'span', _key: 's1', text: 'here', marks: ['a1']}],
      },
    ])
  })

  test('an adopted markDef key colliding with a sibling fresh key does not misattach a span', () => {
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
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
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
  })

  test('a colliding key generator cannot mint two annotations with one key', () => {
    const stored: Array<PortableTextBlock> = []
    let calls = 0
    const keyGenerator = () => {
      const index = calls++
      return index === 1 || index === 4 ? 'x' : `fresh${index}`
    }
    const markdown = '[a](https://one) [b](https://two)'
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
    })
    expect(result).toEqual([
      {
        _type: 'block',
        _key: 'fresh0',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'x', href: 'https://one'},
          {_type: 'link', _key: 'fresh5', href: 'https://two'},
        ],
        children: [
          {_type: 'span', _key: 'fresh2', text: 'a', marks: ['x']},
          {_type: 'span', _key: 'fresh3', text: ' ', marks: []},
          {_type: 'span', _key: 'fresh6', text: 'b', marks: ['fresh5']},
        ],
      },
    ])
  })

  test('a colliding generator keeps multi-span annotations attached to their own links', () => {
    let calls = 0
    const keyGenerator = () => {
      const index = calls++
      return index < 6 ? 'x' : `fresh${index}`
    }
    expect(
      applyMarkdownEdit([], '[**a** b](https://one) [c](https://two)', {
        deserialize: {keyGenerator},
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'x',
        style: 'normal',
        markDefs: [
          {_key: 'x-2', _type: 'link', href: 'https://one'},
          {_key: 'fresh9', _type: 'link', href: 'https://two'},
        ],
        children: [
          {_type: 'span', _key: 'fresh6', text: 'a', marks: ['x-2', 'strong']},
          {_type: 'span', _key: 'fresh7', text: ' b', marks: ['x-2']},
          {_type: 'span', _key: 'fresh8', text: ' ', marks: []},
          {_type: 'span', _key: 'fresh10', text: 'c', marks: ['fresh9']},
        ],
      },
    ])
  })

  test('a moved block keeps its key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alpha'), block('b2', 's2', 'beta')]
    const markdown = 'beta\n\nalpha'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([block('b2', 's2', 'beta'), block('b1', 's1', 'alpha')])
  })

  test('a split keeps the key on the first fragment, like pressing enter', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alphabeta')]
    const markdown = 'alpha\n\nbeta'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([block('b1', 's1', 'alpha'), block('k2', 'k3', 'beta')])
  })

  test('a merge keeps the first block key, like pressing backspace', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alpha'), block('b2', 's2', 'beta')]
    const markdown = 'alphabeta'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([block('b1', 's1', 'alphabeta')])
  })

  test('repeated content pairs in order; the copy keeps a new key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'same')]
    const markdown = 'same\n\nsame'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([block('b1', 's1', 'same'), block('k2', 'k3', 'same')])
  })

  test('a similarity tie gets a new key instead of guessing between candidates', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'prefix cat suffix'),
      block('b2', 's2', 'prefix cut suffix'),
    ]
    const markdown = 'prefix cot suffix'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([block('k0', 'k1', 'prefix cot suffix')])
  })

  test('a rewrite in place keeps the block and span keys, like typing over a paragraph', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'the quick brown fox jumps')]
    const markdown = 'an entirely different sentence now'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([block('b1', 's1', 'an entirely different sentence now')])
  })

  test('an edited `json:object` payload keeps the key it carries', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [{_type: 'product', _key: 'p1', sku: 'old'}]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'old',
      'new',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([{_type: 'product', _key: 'p1', sku: 'new'}])
  })

  test('an unchanged table gets its whole subtree of keys back', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'table',
        _key: 'tbl1',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                value: [block('cb1', 'cs1', 'one')],
              },
              {
                _type: 'cell',
                _key: 'c2',
                value: [block('cb2', 'cs2', 'two')],
              },
            ],
          },
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual(stored)
  })

  test('the top-level schema reaches both conversion directions', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(defineSchema({}))
    const table = {
      _type: 'table',
      _key: 'tbl1',
      headerRows: 1,
      rows: [
        {
          _type: 'row',
          _key: 'r1',
          cells: [
            {_type: 'cell', _key: 'c1', value: [block('cb1', 'cs1', 'one')]},
            {_type: 'cell', _key: 'c2', value: [block('cb2', 'cs2', 'two')]},
          ],
        },
      ],
    }
    const heading = {
      _type: 'block',
      _key: 'b1',
      style: 'h1',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: 's1',
          text: 'a wonderfully long heading about the world of portable text',
          marks: [],
        },
      ],
    }
    const stored = [table, heading]
    const markdown = `${portableTextToMarkdown(structuredClone(stored), {
      schema,
    }).replace('world', 'globe')}\n\n| added | table |\n| ----- | ----- |`
    expect(
      applyMarkdownEdit(stored, markdown, {
        schema,
        deserialize: {keyGenerator},
      }),
    ).toEqual([
      table,
      {
        _type: 'block',
        _key: 'b1',
        style: 'h1',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 's1',
            text: 'a wonderfully long heading about the globe of portable text',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'added', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: 'table', marks: []}],
      },
    ])
  })

  test('editing text around an inline object keeps the block key and the object key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'AAPL is at ', marks: []},
          {_type: 'stockTicker', _key: 't1', symbol: 'AAPL'},
          {_type: 'span', _key: 's2', text: ' right now!', marks: []},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'right now!',
      'right now.',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'AAPL is at ', marks: []},
          {_type: 'stockTicker', _key: 't1', symbol: 'AAPL'},
          {_type: 'span', _key: 's2', text: ' right now.', marks: []},
        ],
      },
    ])
  })

  test('a heading with a hard break cannot be traced, so keys reset', () => {
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
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'one', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'two', marks: []}],
      },
    ])
  })

  test('empty markdown means an empty value', () => {
    const keyGenerator = createTestKeyGenerator()
    expect(
      applyMarkdownEdit([block('b1', 's1', 'alpha')], '', {
        deserialize: {keyGenerator},
      }),
    ).toEqual([])
  })

  test('editing one table cell keeps the whole table subtree of keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'table',
        _key: 'tbl1',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {_type: 'cell', _key: 'c1', value: [block('cb1', 'cs1', 'one')]},
              {_type: 'cell', _key: 'c2', value: [block('cb2', 'cs2', 'two')]},
            ],
          },
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'two',
      'TWO',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'table',
        _key: 'tbl1',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {_type: 'cell', _key: 'c1', value: [block('cb1', 'cs1', 'one')]},
              {_type: 'cell', _key: 'c2', value: [block('cb2', 'cs2', 'TWO')]},
            ],
          },
        ],
      },
    ])
  })

  test('two edited cells in one row each keep their keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'table',
        _key: 'tbl1',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {_type: 'cell', _key: 'c1', value: [block('cb1', 'cs1', 'one')]},
              {_type: 'cell', _key: 'c2', value: [block('cb2', 'cs2', 'two')]},
              {
                _type: 'cell',
                _key: 'c3',
                value: [block('cb3', 'cs3', 'three')],
              },
            ],
          },
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
      .replace('two', 'TWO')
      .replace('three', 'THREE')
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'table',
        _key: 'tbl1',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {_type: 'cell', _key: 'c1', value: [block('cb1', 'cs1', 'one')]},
              {_type: 'cell', _key: 'c2', value: [block('cb2', 'cs2', 'TWO')]},
              {
                _type: 'cell',
                _key: 'c3',
                value: [block('cb3', 'cs3', 'THREE')],
              },
            ],
          },
        ],
      },
    ])
  })

  test('two edited rows keep their row and cell keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'table',
        _key: 'tbl1',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {_type: 'cell', _key: 'c1', value: [block('cb1', 'cs1', 'one')]},
              {_type: 'cell', _key: 'c2', value: [block('cb2', 'cs2', 'two')]},
            ],
          },
          {
            _type: 'row',
            _key: 'r2',
            cells: [
              {
                _type: 'cell',
                _key: 'c3',
                value: [block('cb3', 'cs3', 'three')],
              },
              {_type: 'cell', _key: 'c4', value: [block('cb4', 'cs4', 'four')]},
            ],
          },
          {
            _type: 'row',
            _key: 'r3',
            cells: [
              {_type: 'cell', _key: 'c5', value: [block('cb5', 'cs5', 'five')]},
              {_type: 'cell', _key: 'c6', value: [block('cb6', 'cs6', 'six')]},
            ],
          },
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
      .replace('two', 'TWO')
      .replace('six', 'SIX')
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'table',
        _key: 'tbl1',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {_type: 'cell', _key: 'c1', value: [block('cb1', 'cs1', 'one')]},
              {_type: 'cell', _key: 'c2', value: [block('cb2', 'cs2', 'TWO')]},
            ],
          },
          {
            _type: 'row',
            _key: 'r2',
            cells: [
              {
                _type: 'cell',
                _key: 'c3',
                value: [block('cb3', 'cs3', 'three')],
              },
              {_type: 'cell', _key: 'c4', value: [block('cb4', 'cs4', 'four')]},
            ],
          },
          {
            _type: 'row',
            _key: 'r3',
            cells: [
              {_type: 'cell', _key: 'c5', value: [block('cb5', 'cs5', 'five')]},
              {_type: 'cell', _key: 'c6', value: [block('cb6', 'cs6', 'SIX')]},
            ],
          },
        ],
      },
    ])
  })

  test('a reorder-plus-edit of siblings with balanced counts mispairs, the accepted trade', () => {
    const schema = compileSchema(
      defineSchema({blockObjects: [defaultTableObjectDefinition]}),
    )
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
              {_type: 'cell', _key: 'c1', value: [block('cb1', 'cs1', 'one')]},
              {_type: 'cell', _key: 'c2', value: [block('cb2', 'cs2', 'two')]},
              {
                _type: 'cell',
                _key: 'c3',
                value: [block('cb3', 'cs3', 'three')],
              },
            ],
          },
        ],
      },
    ]
    // The edited row swaps the content of cells two and three and edits
    // both, so the residual zip (equal counts, position order) pairs
    // each stored cell key with whichever edited cell landed in that
    // cell's original position, not with the text it descends from:
    // `c2` (originally "two") ends up on "THREEx", `c3` on "TWOx".
    const markdown = [
      '|  |  |  |',
      '| --- | --- | --- |',
      '| one | THREEx | TWOx |',
    ].join('\n')
    expect(
      applyMarkdownEdit(stored, markdown, {
        schema,
        deserialize: {keyGenerator: createTestKeyGenerator()},
      }),
    ).toEqual([
      {
        _type: 'table',
        _key: 't1',
        headerRows: 0,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {_type: 'cell', _key: 'c1', value: [block('cb1', 'cs1', 'one')]},
              {
                _type: 'cell',
                _key: 'c2',
                value: [block('cb2', 'cs2', 'THREEx')],
              },
              {
                _type: 'cell',
                _key: 'c3',
                value: [block('cb3', 'cs3', 'TWOx')],
              },
            ],
          },
        ],
      },
    ])
  })

  test('two edited spans in one block each keep their keys', () => {
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
    const markdown = portableTextToMarkdown(structuredClone(stored))
      .replace('foo', 'FOO')
      .replace('baz', 'BAZ')
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'FOO ', marks: []},
          {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 's3', text: ' BAZ', marks: []},
        ],
      },
    ])
  })

  test('two edited spans next to a deleted span lose their keys for lack of evidence', () => {
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
          {_type: 'span', _key: 's3', text: ' baz ', marks: []},
          {_type: 'span', _key: 's4', text: 'qux', marks: ['em']},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
      .replace('foo', 'FOO')
      .replace('baz ', 'BAZ')
      .replace('_qux_', '')
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'FOO ', marks: []},
          {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k3', text: ' BAZ', marks: []},
        ],
      },
    ])
  })

  test('a copy-pasted `json:object` block does not duplicate its key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'alpha'),
      {_type: 'product', _key: 'p1', sku: 'a'},
    ]
    const fence = [
      '```json:object',
      '{"_type": "product", "_key": "p1", "sku": "b"}',
      '```',
    ].join('\n')
    const markdown = `${portableTextToMarkdown(structuredClone(stored))}\n\n${fence}`
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block('b1', 's1', 'alpha'),
      {_type: 'product', _key: 'p1', sku: 'a'},
      {_type: 'product', _key: 'k2', sku: 'b'},
    ])
  })

  test('a count-preserving scramble of the serialization adopts nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'one\ntwo', marks: []}],
      },
      block('b2', 's2', 'plain text'),
      block('b3', 's3', ''),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    const reconciled = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
    })
    expect(reconciled).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'one', marks: []}],
      },
      block('k2', 'k3', 'two'),
      block('k4', 'k5', 'plain text'),
    ])
  })

  test('rewriting every block in place keeps every key pairwise', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'first paragraph here'),
      block('b2', 's2', 'second paragraph here'),
    ]
    const markdown = 'premier paragraphe ici\n\ndeuxieme paragraphe ici'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block('b1', 's1', 'premier paragraphe ici'),
      block('b2', 's2', 'deuxieme paragraphe ici'),
    ])
  })

  test('a paragraph-to-heading conversion next to an edit keeps both keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'a title'),
      block('b2', 's2', 'some prose here'),
    ]
    const markdown = '# a title\n\nsome prose there'
    const reconciled = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
    })
    expect(reconciled).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'a title', marks: []}],
      },
      block('b2', 's2', 'some prose there'),
    ])
  })

  test('a soft-wrap join is a merge: the first block key survives', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'alpha'), block('b2', 's2', 'beta')]
    const markdown = 'alpha\nbeta'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([block('b1', 's1', 'alpha beta')])
  })

  test('a split with an empty first fragment keeps the key on the text', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'alphabeta', marks: []}],
      },
    ]
    const markdown = '#\n\nalphabeta'
    const reconciled = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
    })
    expect(reconciled).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'alphabeta', marks: []}],
      },
    ])
  })

  test('short blocks in an unequal gap lose their keys for lack of evidence', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'ab'), block('b2', 's2', 'cd')]
    const markdown = 'ax\n\ncx\n\nnew trailing paragraph'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block('k0', 'k1', 'ax'),
      block('k2', 'k3', 'cx'),
      block('k4', 'k5', 'new trailing paragraph'),
    ])
  })

  test('an unequal gap past the similarity pair cap gets fresh keys everywhere', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = manyBlocks(51, 'stored')
    const markdown = manyParagraphs(61, 'edited')
    const reconciled = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
    })
    expect(reconciled.map((node) => (node as {_key: string})._key)).toEqual(
      Array.from({length: 61}, (_, index) => `k${index * 2}`),
    )
  })

  test('a genuine split past the concatenation pair cap does not adopt', () => {
    const splitSource = block('split-b', 'split-s', 'alphabeta')

    const belowCap = applyMarkdownEdit([splitSource], 'alpha\n\nbeta', {
      deserialize: {keyGenerator: createTestKeyGenerator()},
    })
    expect(belowCap).toEqual([
      block('split-b', 'split-s', 'alpha'),
      block('k2', 'k3', 'beta'),
    ])

    const stored = [splitSource, ...manyBlocks(50, 'stored')]
    const markdown = ['alpha', 'beta', manyParagraphs(59, 'edited')].join(
      '\n\n',
    )
    const overCap = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator: createTestKeyGenerator()},
    })
    expect(overCap.map((node) => (node as {_key: string})._key)).toEqual(
      Array.from({length: 61}, (_, index) => `k${index * 2}`),
    )
  })

  test('an edited list item keeps its key; siblings keep theirs', () => {
    const keyGenerator = createTestKeyGenerator()
    const listBlock = (
      blockKey: string,
      spanKey: string,
      text: string,
      level: number,
    ): PortableTextBlock => ({
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      listItem: 'bullet',
      level,
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text, marks: []}],
    })
    const stored = [
      listBlock('l1', 'ls1', 'first item', 1),
      listBlock('l2', 'ls2', 'second item', 2),
      listBlock('l3', 'ls3', 'third item', 1),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'second item',
      'second thing',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      listBlock('l1', 'ls1', 'first item', 1),
      listBlock('l2', 'ls2', 'second thing', 2),
      listBlock('l3', 'ls3', 'third item', 1),
    ])
  })

  test('an edited code block keeps its key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {_type: 'code', _key: 'code1', language: 'js', code: 'const a = 1'},
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'a = 1',
      'a = 2',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {_type: 'code', _key: 'code1', language: 'js', code: 'const a = 2'},
    ])
  })

  test('repeated horizontal rules pair in order around an edit', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {_type: 'horizontal-rule', _key: 'hr1'},
      block('b1', 's1', 'middle'),
      {_type: 'horizontal-rule', _key: 'hr2'},
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'middle',
      'centre',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {_type: 'horizontal-rule', _key: 'hr1'},
      block('b1', 's1', 'centre'),
      {_type: 'horizontal-rule', _key: 'hr2'},
    ])
  })

  test('bolding a word keeps the block key; the split spans get new keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'foo bar baz')]
    const markdown = 'foo **bar** baz'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
      },
    ])
  })

  test('two links in one block each keep their annotation keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'a1', href: 'https://one.example'},
          {_type: 'link', _key: 'a2', href: 'https://two.example'},
        ],
        children: [
          {_type: 'span', _key: 's1', text: 'one', marks: ['a1']},
          {_type: 'span', _key: 's2', text: ' and ', marks: []},
          {_type: 'span', _key: 's3', text: 'two', marks: ['a2']},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      ' and ',
      ' plus ',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'a1', href: 'https://one.example'},
          {_type: 'link', _key: 'a2', href: 'https://two.example'},
        ],
        children: [
          {_type: 'span', _key: 's1', text: 'one', marks: ['a1']},
          {_type: 'span', _key: 's2', text: ' plus ', marks: []},
          {_type: 'span', _key: 's3', text: 'two', marks: ['a2']},
        ],
      },
    ])
  })

  test('a one-word edit in a 120-block document keeps every other key', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = Array.from({length: 120}, (_, index) =>
      block(`b${index}`, `s${index}`, `unique paragraph number ${index}`),
    )
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'unique paragraph number 60',
      'unique paragraph number sixty',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual(
      Array.from({length: 120}, (_, index) =>
        block(
          `b${index}`,
          `s${index}`,
          index === 60
            ? 'unique paragraph number sixty'
            : `unique paragraph number ${index}`,
        ),
      ),
    )
  })

  test('a typo, a move, and an insertion in one edit each resolve correctly', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'alpha section text'),
      block('b2', 's2', 'beta section text'),
      block('b3', 's3', 'gamma section text'),
    ]
    const markdown = [
      'gamma section text',
      '',
      'alpha section test',
      '',
      'a brand new paragraph',
      '',
      'beta section text',
    ].join('\n')
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block('b3', 's3', 'gamma section text'),
      block('b1', 's1', 'alpha section test'),
      block('k4', 'k5', 'a brand new paragraph'),
      block('b2', 's2', 'beta section text'),
    ])
  })

  test('a fresh key colliding with an adopted key is regenerated', () => {
    let calls = 0
    const keyGenerator = () => (calls++ === 0 ? 'b1' : `fresh${calls}`)
    const stored = [block('b1', 's1', 'alpha')]
    const markdown = 'brand new paragraph\n\nalpha'
    const reconciled = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
    })
    expect(reconciled).toEqual([
      block('fresh5', 'fresh2', 'brand new paragraph'),
      block('b1', 's1', 'alpha'),
    ])
  })

  test('an edited inline object payload keeps the key it carries', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'price: ', marks: []},
          {_type: 'stockTicker', _key: 't1', symbol: 'AAPL'},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'AAPL',
      'MSFT',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'price: ', marks: []},
          {_type: 'stockTicker', _key: 't1', symbol: 'MSFT'},
        ],
      },
    ])
  })

  test('a keyless inline object stays keyless through reconciliation', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [block('b1', 's1', 'before after')]
    const markdown =
      'before json:object`{"_type":"stockTicker","symbol":"AAPL"}` after'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'before ', marks: []},
          {_type: 'stockTicker', symbol: 'AAPL'},
          {_type: 'span', _key: 'k2', text: ' after', marks: []},
        ],
      },
    ])
  })

  test('two inline objects in one block each keep their keys through an edit', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'from ', marks: []},
          {_type: 'stockTicker', _key: 't1', symbol: 'AAPL'},
          {_type: 'span', _key: 's2', text: ' to ', marks: []},
          {_type: 'stockTicker', _key: 't2', symbol: 'MSFT'},
          {_type: 'span', _key: 's3', text: ' today!', marks: []},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'today!',
      'tomorrow.',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'from ', marks: []},
          {_type: 'stockTicker', _key: 't1', symbol: 'AAPL'},
          {_type: 'span', _key: 's2', text: ' to ', marks: []},
          {_type: 'stockTicker', _key: 't2', symbol: 'MSFT'},
          {_type: 'span', _key: 's3', text: ' tomorrow.', marks: []},
        ],
      },
    ])
  })

  test('an inline object survives a full rewrite of its block', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 's1',
            text: 'the old wording around ',
            marks: [],
          },
          {_type: 'stockTicker', _key: 't1', symbol: 'AAPL'},
        ],
      },
    ]
    const markdown =
      'completely new wording json:object`{"_type":"stockTicker","_key":"t1","symbol":"AAPL"}` here'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'completely new wording ',
            marks: [],
          },
          {_type: 'stockTicker', _key: 't1', symbol: 'AAPL'},
          {_type: 'span', _key: 'k2', text: ' here', marks: []},
        ],
      },
    ])
  })

  test('a stored list block without a key does not get one added in place', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [{_type: 'span', text: 'first item', marks: []}],
      },
    ] as unknown as Array<PortableTextBlock>
    const storedSnapshot = structuredClone(stored)
    const markdown = portableTextToMarkdown(structuredClone(stored))
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
    })
    expect(stored).toEqual(storedSnapshot)
    expect(result).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'first item', marks: []}],
      },
    ])
  })

  test('onDegradation does not see the internal canonicalization of the stored value', () => {
    const keyGenerator = createTestKeyGenerator()
    const onDegradation = vi.fn()
    const schema = compileSchema(defineSchema({styles: [{name: 'normal'}]}))
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'h1',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'heading text', marks: []},
        ],
      },
    ]
    const markdown = 'clean paragraph'
    applyMarkdownEdit(stored, markdown, {
      schema,
      deserialize: {keyGenerator, onDegradation},
    })
    expect(onDegradation).not.toHaveBeenCalled()
  })

  test('onDegradation still fires when the edited markdown itself degrades', () => {
    const keyGenerator = createTestKeyGenerator()
    const onDegradation = vi.fn()
    const schema = compileSchema(defineSchema({styles: [{name: 'normal'}]}))
    const stored = [block('b1', 's1', 'plain text')]
    const markdown = '# heading text'
    applyMarkdownEdit(stored, markdown, {
      schema,
      deserialize: {keyGenerator, onDegradation},
    })
    expect(onDegradation).toHaveBeenCalledTimes(1)
  })

  test('two fences carrying the same key stay unique against a constant keyGenerator', () => {
    const stored: Array<PortableTextBlock> = []
    const fence = (key: string, sku: string) =>
      [
        '```json:object',
        `{"_type": "product", "_key": "${key}", "sku": "${sku}"}`,
        '```',
      ].join('\n')
    const markdown = `${fence('constant', 'a')}\n\n${fence('constant', 'b')}`
    expect(
      applyMarkdownEdit(stored, markdown, {
        deserialize: {keyGenerator: () => 'constant'},
      }),
    ).toEqual([
      {_type: 'product', _key: 'constant', sku: 'a'},
      {_type: 'product', _key: 'constant_1', sku: 'b'},
    ])
  })

  test('duplicate keys nested inside a plain-object field come out unique', () => {
    const stored: Array<PortableTextBlock> = []
    const keyGenerator = createTestKeyGenerator()
    const fence = [
      '```json:object',
      '{"_type": "product", "_key": "p1", "meta": {"items": [{"_type": "item", "_key": "d1", "label": "a"}, {"_type": "item", "_key": "d1", "label": "b"}]}}',
      '```',
    ].join('\n')
    expect(
      applyMarkdownEdit(stored, fence, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'product',
        _key: 'p1',
        meta: {
          items: [
            {_type: 'item', _key: 'd1', label: 'a'},
            {_type: 'item', _key: 'k0', label: 'b'},
          ],
        },
      },
    ])
  })

  test('an adopted text block gets its markdown-inexpressible fields back', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        ...block('b1', 's1', 'Ships tomorow.'),
        alignment: 'center',
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'tomorow',
      'tomorrow',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        ...block('b1', 's1', 'Ships tomorrow.'),
        alignment: 'center',
      },
    ])
  })

  test('inexpressible fields are restored on spans, markDefs, rows, and cells', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
        blockObjects: [defaultTableObjectDefinition],
      }),
    )
    const fixture = (cellText: string) => [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [
          {
            _type: 'link',
            _key: 'a1',
            href: 'https://x.example',
            rel: 'nofollow',
          },
        ],
        children: [
          {_type: 'span', _key: 's1', text: 'plain ', marks: [], emphasis: 0.7},
          {_type: 'span', _key: 's2', text: 'linked', marks: ['a1']},
          {_type: 'span', _key: 's3', text: ' and ', marks: []},
          {_type: 'span', _key: 's4', text: 'tail', marks: ['strong']},
        ],
      },
      {
        _type: 'table',
        _key: 't1',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            rowTint: 'blue',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                colspan: 2,
                value: [
                  {
                    _type: 'block',
                    _key: 'cb1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'cs1', text: cellText, marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]
    const stored = fixture('cell')
    const markdown = portableTextToMarkdown(structuredClone(stored), {
      schema,
    }).replace('cell', 'CELL')
    expect(
      applyMarkdownEdit(stored, markdown, {
        schema,
        deserialize: {keyGenerator: createTestKeyGenerator()},
      }),
    ).toEqual(fixture('CELL'))
  })

  test('a typed-object array field the dialect drops entirely comes back verbatim', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        footnotes: [{_type: 'footnote', _key: 'f1', note: 'x'}],
        children: [{_type: 'span', _key: 's1', text: 'alpha', marks: []}],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'alpha',
      'ALPHA',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        footnotes: [{_type: 'footnote', _key: 'f1', note: 'x'}],
        children: [{_type: 'span', _key: 's1', text: 'ALPHA', marks: []}],
      },
    ])
  })

  test('an adopted table gets its markdown-inexpressible fields back', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'table',
        _key: 'tbl1',
        headerRows: 1,
        headerColumns: 2,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                value: [block('cb1', 'cs1', 'one')],
              },
              {
                _type: 'cell',
                _key: 'c2',
                value: [block('cb2', 'cs2', 'two')],
              },
            ],
          },
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'two',
      'TWO',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'table',
        _key: 'tbl1',
        headerRows: 1,
        headerColumns: 2,
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                value: [block('cb1', 'cs1', 'one')],
              },
              {
                _type: 'cell',
                _key: 'c2',
                value: [block('cb2', 'cs2', 'TWO')],
              },
            ],
          },
        ],
      },
    ])
  })

  test('a field the markdown expresses stays removed when the edit removes it', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {_type: 'code', _key: 'code1', language: 'js', code: 'const a = 1'},
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      '```js',
      '```',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([{_type: 'code', _key: 'code1', code: 'const a = 1'}])
  })

  test('callout content keeps its style through the quote-syntax round trip', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {name: 'tone', type: 'string'},
              {name: 'content', type: 'array'},
            ],
          },
        ],
        styles: [{name: 'normal'}, {name: 'blockquote'}],
      }),
    )
    const stored = [
      {
        _type: 'callout',
        _key: 'doc6',
        tone: 'note',
        content: [
          {
            _type: 'block',
            _key: 'doc4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'doc5', text: 'aef', marks: []}],
          },
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored), {
      schema,
    }).replace('aef', 'aefX')
    expect(
      applyMarkdownEdit(stored, markdown, {
        schema,
        deserialize: {keyGenerator},
      }),
    ).toEqual([
      {
        _type: 'callout',
        _key: 'doc6',
        tone: 'note',
        content: [
          {
            _type: 'block',
            _key: 'doc4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'doc5', text: 'aefX', marks: []}],
          },
        ],
      },
    ])
  })

  test('a declared type with a misshapen structure becomes a `json:object` fence and stays editable', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {name: 'tone', type: 'string'},
              {name: 'indhold', type: 'array'},
            ],
          },
        ],
      }),
    )
    const calloutWithRenamedContent = (text: string) => [
      {
        _type: 'callout',
        _key: 'co1',
        tone: 'note',
        indhold: [
          {
            _type: 'block',
            _key: 'ib1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'is1', text, marks: []}],
          },
        ],
      },
    ]
    const stored = calloutWithRenamedContent('hej verden')
    const markdown = portableTextToMarkdown(structuredClone(stored), {schema})
    expect(markdown.startsWith('```json:object')).toBe(true)
    expect(
      applyMarkdownEdit(stored, markdown.replace('hej verden', 'hej Danmark'), {
        schema,
        deserialize: {keyGenerator},
      }),
    ).toEqual(calloutWithRenamedContent('hej Danmark'))
  })

  test('markdown syntax targeting an undeclared field vanishes without touching identity', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'code',
            fields: [
              {name: 'code', type: 'string'},
              {name: 'sprog', type: 'string'},
            ],
          },
        ],
      }),
    )
    const stored = [
      {_type: 'code', _key: 'c1', code: 'const a = 1', sprog: 'js'},
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored), {
      schema,
    }).replace('```\n', '```typescript\n')
    expect(
      applyMarkdownEdit(stored, markdown, {
        schema,
        deserialize: {keyGenerator},
      }),
    ).toEqual(stored)
  })

  test('an adopted block keeps its custom style', () => {
    const schema = compileSchema(
      defineSchema({styles: [{name: 'normal'}, {name: 'lead'}]}),
    )
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'lead',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'lead paragraph', marks: []},
        ],
      },
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: 'normal paragraph', marks: []},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored), {
      schema,
    }).replace('normal paragraph', 'normal PARAGRAPH')
    expect(
      applyMarkdownEdit(stored, markdown, {
        schema,
        deserialize: {keyGenerator},
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'lead',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'lead paragraph', marks: []},
        ],
      },
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: 'normal PARAGRAPH', marks: []},
        ],
      },
    ])
  })

  test('a declared decorator with no markdown form survives on an adopted span', () => {
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
          {_type: 'span', _key: 's1', text: 'plain ', marks: []},
          {_type: 'span', _key: 's2', text: 'bold', marks: ['strong']},
          {_type: 'span', _key: 's3', text: ' note', marks: ['highlight']},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored), {schema})
    expect(
      applyMarkdownEdit(stored, markdown, {
        schema,
        deserialize: {keyGenerator},
      }),
    ).toEqual(stored)
  })

  test('an edit that genuinely changes the style keeps the edit, not the stored style', () => {
    const schema = compileSchema(
      defineSchema({styles: [{name: 'normal'}, {name: 'lead'}, {name: 'h1'}]}),
    )
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'lead',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'headline text', marks: []},
        ],
      },
    ]
    const markdown = '# headline text'
    expect(
      applyMarkdownEdit(stored, markdown, {
        schema,
        deserialize: {keyGenerator},
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'h1',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'headline text', marks: []},
        ],
      },
    ])
  })

  test('restoration skips levels where the canonical counterpart is untrustworthy', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        alignment: 'center',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 's1',
            text: 'foo',
            marks: ['strong'],
            emphasis: 'high',
          },
          {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 's3', text: ' baz', marks: []},
        ],
      },
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'baz',
      'buzz',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        alignment: 'center',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'foobar', marks: ['strong']},
          {_type: 'span', _key: 's3', text: ' buzz', marks: []},
        ],
      },
    ])
  })

  test('a restored structured field is cloned, not shared, and the stored value is untouched', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      {
        ...block('b1', 's1', 'Ships tomorow.'),
        customField: [
          {_key: 'x1', label: 'one'},
          {_key: 'x2', label: 'two'},
        ],
      },
    ]
    const storedSnapshot = structuredClone(stored)
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'tomorow',
      'tomorrow',
    )
    const result = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator},
    })
    expect(stored).toEqual(storedSnapshot)
    expect((result[0] as Record<string, unknown>)['customField']).toEqual(
      (stored[0] as Record<string, unknown>)['customField'],
    )
    expect((result[0] as Record<string, unknown>)['customField']).not.toBe(
      (stored[0] as Record<string, unknown>)['customField'],
    )
  })

  test('inputs are not mutated and reconciliation is idempotent', () => {
    const stored = [
      block('b1', 's1', 'alpha'),
      {_type: 'product', _key: 'p1', sku: 'abc-123'},
    ]
    const storedSnapshot = structuredClone(stored)
    const markdown = portableTextToMarkdown(structuredClone(stored))

    const once = applyMarkdownEdit(stored, markdown, {
      deserialize: {keyGenerator: createTestKeyGenerator()},
    })
    expect(stored).toEqual(storedSnapshot)

    const twice = applyMarkdownEdit(stored, portableTextToMarkdown(once), {
      deserialize: {keyGenerator: createTestKeyGenerator()},
    })
    expect(twice).toEqual(once)
  })

  test('empty blocks survive an unchanged serialization with every key intact', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'first paragraph'),
      block('empty1', 'es1', ''),
      block('b2', 's2', 'second paragraph'),
      block('empty2', 'es2', ''),
      block('empty3', 'es3', ''),
      block('b3', 's3', 'third paragraph'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual(stored)
  })

  test('empty blocks survive an edit with all keys intact', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'first paragraph'),
      block('empty1', 'es1', ''),
      block('b2', 's2', 'second paragraph'),
      block('empty2', 'es2', ''),
      block('empty3', 'es3', ''),
      block('b3', 's3', 'third paragraph'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'second',
      'SECOND',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block('b1', 's1', 'first paragraph'),
      block('empty1', 'es1', ''),
      block('b2', 's2', 'SECOND paragraph'),
      block('empty2', 'es2', ''),
      block('empty3', 'es3', ''),
      block('b3', 's3', 'third paragraph'),
    ])
  })

  test('a whitespace-only block survives the loop with every key intact', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'first'),
      block('ws1', 'wss1', ' '),
      block('b2', 's2', 'second'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual(stored)
  })

  test('a whitespace-only block survives an edit with all keys intact', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'first'),
      block('ws1', 'wss1', ' '),
      block('b2', 's2', 'second'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'second',
      'SECOND',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block('b1', 's1', 'first'),
      block('ws1', 'wss1', ' '),
      block('b2', 's2', 'SECOND'),
    ])
  })

  test('an empty run whose anchor was deleted goes with it', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'alpha'),
      block('empty1', 'es1', ''),
      block(
        'b2',
        's2',
        'a distinctively long beta paragraph that nothing else resembles',
      ),
    ]
    const markdown =
      'a distinctively long beta paragraph that nothing else resembles'
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block(
        'b2',
        's2',
        'a distinctively long beta paragraph that nothing else resembles',
      ),
    ])
  })

  test('leading empty blocks anchor to the first following block', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('empty1', 'es1', ''),
      block('b1', 's1', 'content here'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored))
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual(stored)
  })

  test('an empty heading is not treated as an empty block, since it renders visibly', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'alpha'),
      {
        _type: 'block',
        _key: 'h1',
        style: 'h2',
        markDefs: [],
        children: [{_type: 'span', _key: 'hs1', text: '', marks: []}],
      },
      block('b2', 's2', 'beta'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'beta',
      'gamma',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block('b1', 's1', 'alpha'),
      {
        _type: 'block',
        _key: 'h1',
        style: 'h2',
        markDefs: [],
        children: [{_type: 'span', _key: 'hs1', text: '', marks: []}],
      },
      block('b2', 's2', 'gamma'),
    ])
  })

  test('a whitespace-only bullet list item is not treated as an empty block, since it renders visibly', () => {
    const keyGenerator = createTestKeyGenerator()
    const stored = [
      block('b1', 's1', 'alpha'),
      {
        _type: 'block',
        _key: 'li1',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [{_type: 'span', _key: 'lis1', text: '  ', marks: []}],
      },
      block('b2', 's2', 'beta'),
    ]
    const markdown = portableTextToMarkdown(structuredClone(stored)).replace(
      'beta',
      'gamma',
    )
    expect(
      applyMarkdownEdit(stored, markdown, {deserialize: {keyGenerator}}),
    ).toEqual([
      block('b1', 's1', 'alpha'),
      {
        _type: 'block',
        _key: 'li1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'lis1', text: '  ', marks: []}],
        listItem: 'bullet',
        level: 1,
      },
      block('b2', 's2', 'gamma'),
    ])
  })
})

function alternatingSpansBlock(
  blockKey: string,
  count: number,
  prefix: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: Array.from({length: count}, (_, index) => ({
      _type: 'span',
      _key: `${prefix}s${index}`,
      text: `${prefix}${index}`,
      marks: index % 2 === 0 ? [] : ['strong'],
    })),
  }
}

// Adjacent same-mark spans merge at parse time, so the tokens making up
// one target span must alternate marks to stay separate; `mergedAt`
// substitutes a text that is the concatenation of two stored spans,
// giving the pair search a genuine merge to find.
function alternatingMarkdown(
  count: number,
  mergedAt: number,
  mergedText: string,
): string {
  return Array.from({length: count}, (_, index) =>
    index === mergedAt ? mergedText : `edited${index}`,
  )
    .map((text, index) => (index % 2 === 0 ? text : `**${text}**`))
    .join('')
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

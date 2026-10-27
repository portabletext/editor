import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {
  portableTextToSlack,
  type SerializeDegradation,
} from './from-portable-text/portable-text-to-slack'
import {slackToPortableText} from './to-portable-text/slack-to-portable-text'

describe(portableTextToSlack.name, () => {
  test('an empty value', () => {
    expect(portableTextToSlack([])).toEqual({
      texty: JSON.stringify({ops: []}),
      text: '',
    })
  })

  test('decorators and links', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const linkKey = keyGenerator()
    const fooKey = keyGenerator()
    const spaceKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    expect(
      portableTextToSlack([
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [
            {_type: 'link', _key: linkKey, href: 'https://example.com'},
          ],
          children: [
            {
              _type: 'span',
              _key: fooKey,
              text: 'foo',
              marks: ['strong', 'em'],
            },
            {_type: 'span', _key: spaceKey, text: ' ', marks: []},
            {
              _type: 'span',
              _key: barKey,
              text: 'bar',
              marks: ['strike-through', 'code'],
            },
            {_type: 'span', _key: bazKey, text: ' baz', marks: [linkKey]},
          ],
        },
      ]),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo', attributes: {bold: true, italic: true}},
          {insert: ' '},
          {insert: 'bar', attributes: {strike: true, code: true}},
          {insert: ' baz', attributes: {link: 'https://example.com'}},
          {insert: '\n'},
        ],
      }),
      text: 'foo bar baz',
    })
  })

  test('nested lists and blockquotes', () => {
    const keyGenerator = createTestKeyGenerator()
    const quoteKey = keyGenerator()
    const quoteSpanKey = keyGenerator()
    expect(
      portableTextToSlack([
        listBlock(keyGenerator, 'foo', 'number', 1),
        listBlock(keyGenerator, 'bar', 'bullet', 2),
        listBlock(keyGenerator, 'baz', 'number', 1),
        {
          _type: 'block',
          _key: quoteKey,
          style: 'blockquote',
          markDefs: [],
          children: [
            {_type: 'span', _key: quoteSpanKey, text: 'fizz', marks: []},
          ],
        },
      ]),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo'},
          {insert: '\n', attributes: {list: 'ordered'}},
          {insert: 'bar'},
          {insert: '\n', attributes: {list: 'bullet', indent: 1}},
          {insert: 'baz'},
          {insert: '\n', attributes: {list: 'ordered'}},
          {insert: 'fizz'},
          {insert: '\n', attributes: {blockquote: true}},
        ],
      }),
      text: ['1. foo', '    • bar', '2. baz', '> fizz'].join('\n'),
    })
  })

  test('a code block with `code` or `lines`', () => {
    const keyGenerator = createTestKeyGenerator()
    const codeKey = keyGenerator()
    const linesCodeKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    expect(
      portableTextToSlack([
        {_type: 'code', _key: codeKey, code: 'foo\nbar'},
        {
          _type: 'code',
          _key: linesCodeKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ]),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo'},
          {insert: '\n', attributes: {'code-block': true}},
          {insert: 'bar'},
          {insert: '\n', attributes: {'code-block': true}},
          {insert: 'baz'},
          {insert: '\n', attributes: {'code-block': true}},
        ],
      }),
      text: ['```', 'foo', 'bar', 'baz', '```'].join('\n'),
    })
  })

  test('a newline inside a span repeats the line formatting', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    expect(
      portableTextToSlack([
        {
          _type: 'block',
          _key: blockKey,
          style: 'blockquote',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo\nbar',
              marks: ['strong'],
            },
          ],
        },
      ]),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo', attributes: {bold: true}},
          {insert: '\n', attributes: {blockquote: true}},
          {insert: 'bar', attributes: {bold: true}},
          {insert: '\n', attributes: {blockquote: true}},
        ],
      }),
      text: '> foo\n> bar',
    })
  })

  test('what Slack cannot show degrades to text and is reported', () => {
    const keyGenerator = createTestKeyGenerator()
    const headingKey = keyGenerator()
    const commentKey = keyGenerator()
    const fooKey = keyGenerator()
    const tickerKey = keyGenerator()
    const barKey = keyGenerator()
    const imageKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const cellSpanKey = keyGenerator()
    const breakKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'block',
            _key: headingKey,
            style: 'h1',
            markDefs: [{_type: 'comment', _key: commentKey, text: 'fizz'}],
            children: [
              {
                _type: 'span',
                _key: fooKey,
                text: 'foo',
                marks: [commentKey],
              },
              {_type: 'stock-ticker', _key: tickerKey, symbol: 'BAR'},
              {
                _type: 'span',
                _key: barKey,
                text: ' bar',
                marks: ['underline'],
              },
            ],
          },
          listBlock(keyGenerator, 'baz', 'task', 1),
          {
            _type: 'image',
            _key: imageKey,
            src: 'https://example.com/foo.png',
          },
          {
            _type: 'table',
            _key: tableKey,
            rows: [
              {
                _type: 'row',
                _key: rowKey,
                cells: [
                  {
                    _type: 'cell',
                    _key: cellKey,
                    value: [
                      {
                        _type: 'block',
                        _key: cellBlockKey,
                        children: [
                          {
                            _type: 'span',
                            _key: cellSpanKey,
                            text: 'fizz',
                            marks: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {_type: 'break', _key: breakKey},
        ],
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo bar', attributes: {bold: true}},
          {insert: '\nbaz'},
          {insert: '\n', attributes: {list: 'bullet'}},
          {insert: 'https://example.com/foo.png\nfizz\n'},
        ],
      }),
      text: ['foo bar', '• baz', 'https://example.com/foo.png', 'fizz'].join(
        '\n',
      ),
    })
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'annotation-dropped',
              message:
                'Removed the `comment` annotation, kept its text: Slack only shows links',
              path: [{_key: headingKey}, 'children', {_key: fooKey}],
              snippet: 'foo',
            },
            {
              type: 'object-dropped',
              message:
                "Removed the `stock-ticker` object: Slack can't show it and it holds no text",
              path: [{_key: headingKey}, 'children', {_key: tickerKey}],
            },
            {
              type: 'decorator-dropped',
              message:
                'Removed the `underline` decorator, kept the text: Slack has no matching formatting',
              path: [{_key: headingKey}, 'children', {_key: barKey}],
              snippet: ' bar',
            },
            {
              type: 'style-fallback',
              message:
                'The `h1` heading became a bold line: Slack has no headings',
              path: [{_key: headingKey}],
              snippet: 'foo bar',
            },
            {
              type: 'list-item-fallback',
              message:
                'Wrote the `task` list item as a bullet, kept the text: Slack only has bullet and numbered lists',
              path: [{_key: 'k12'}],
              snippet: 'baz',
            },
            {
              type: 'object-to-text',
              message:
                "The `image` object became plain text: Slack can't show it",
              path: [{_key: imageKey}],
              snippet: 'https://example.com/foo.png',
            },
            {
              type: 'object-to-text',
              message:
                "The `table` object became plain text: Slack can't show it",
              path: [{_key: tableKey}],
              snippet: 'fizz',
            },
            {
              type: 'object-dropped',
              message:
                "Removed the `break` object: Slack can't show it and it holds no text",
              path: [{_key: breakKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            '- block 0: Removed the `comment` annotation, kept its text: Slack only shows links ("foo")',
            "- block 0: Removed the `stock-ticker` object: Slack can't show it and it holds no text",
            '- block 0: Removed the `underline` decorator, kept the text: Slack has no matching formatting (" bar")',
            '- block 0: The `h1` heading became a bold line: Slack has no headings ("foo bar")',
            '- block 1: Wrote the `task` list item as a bullet, kept the text: Slack only has bullet and numbered lists ("baz")',
            '- block 2: The `image` object became plain text: Slack can\'t show it ("https://example.com/foo.png")',
            '- block 3: The `table` object became plain text: Slack can\'t show it ("fizz")',
            "- block 4: Removed the `break` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
    ])
  })

  test('a schema without a `code` object writes a code block as text', () => {
    const keyGenerator = createTestKeyGenerator()
    const codeKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack([{_type: 'code', _key: codeKey, code: 'foo\nbar'}], {
        schema: compileSchema(defineSchema({})),
        onDegradation,
      }),
    ).toEqual({
      texty: JSON.stringify({ops: [{insert: 'foo\nbar\n'}]}),
      text: 'foo\nbar',
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'object-to-text',
        message: "The `code` object became plain text: Slack can't show it",
        path: [{_key: codeKey}],
        snippet: 'foo bar',
      },
    ])
  })
  test('a link with an unsafe URL keeps its text and is reported', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const linkKey = keyGenerator()
    const spanKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [
              {_type: 'link', _key: linkKey, href: ' JavaScript:alert(1)'},
            ],
            children: [
              {_type: 'span', _key: spanKey, text: 'foo', marks: [linkKey]},
            ],
          },
        ],
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({ops: [{insert: 'foo\n'}]}),
      text: 'foo',
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'annotation-dropped',
        message:
          'Removed a link with a `javascript:`, `vbscript:`, `file:` or `data:` URL, kept its text',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        snippet: 'foo',
      },
    ])
  })

  test('what a code line holds besides plain text is reported', () => {
    const keyGenerator = createTestKeyGenerator()
    const codeKey = keyGenerator()
    const lineKey = keyGenerator()
    const linkKey = keyGenerator()
    const spanKey = keyGenerator()
    const mentionKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'code',
            _key: codeKey,
            lines: [
              {
                _type: 'block',
                _key: lineKey,
                style: 'blockquote',
                listItem: 'bullet',
                level: 1,
                markDefs: [
                  {_type: 'link', _key: linkKey, href: 'https://example.com'},
                ],
                children: [
                  {
                    _type: 'span',
                    _key: spanKey,
                    text: 'foo',
                    marks: ['strong', linkKey],
                  },
                  {_type: 'mention', _key: mentionKey, userId: 'bar'},
                ],
              },
            ],
          },
        ],
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo'},
          {insert: '\n', attributes: {'code-block': true}},
        ],
      }),
      text: ['```', 'foo', '```'].join('\n'),
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'style-fallback',
        message:
          'Dropped the `blockquote` style, kept the text: a Slack code block has no formatting',
        path: [{_key: codeKey}, 'lines', {_key: lineKey}],
        snippet: 'foo',
      },
      {
        type: 'list-item-fallback',
        message:
          'Dropped the `bullet` list item, kept the text: a Slack code block has no formatting',
        path: [{_key: codeKey}, 'lines', {_key: lineKey}],
        snippet: 'foo',
      },
      {
        type: 'decorator-dropped',
        message:
          'Removed the `strong` decorator, kept the text: a Slack code block has no formatting',
        path: [
          {_key: codeKey},
          'lines',
          {_key: lineKey},
          'children',
          {_key: spanKey},
        ],
        snippet: 'foo',
      },
      {
        type: 'annotation-dropped',
        message:
          'Removed the `link` annotation, kept its text: a Slack code block has no formatting',
        path: [
          {_key: codeKey},
          'lines',
          {_key: lineKey},
          'children',
          {_key: spanKey},
        ],
        snippet: 'foo',
      },
      {
        type: 'object-dropped',
        message:
          "Removed the `mention` object: Slack can't show it and it holds no text",
        path: [
          {_key: codeKey},
          'lines',
          {_key: lineKey},
          'children',
          {_key: mentionKey},
        ],
      },
    ])
  })

  test('code lines are the text blocks the `lines` field declares', () => {
    const keyGenerator = createTestKeyGenerator()
    const codeKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()
    const markerKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'code',
            _key: codeKey,
            lines: [
              {
                _type: 'codeLine',
                _key: lineKey,
                markDefs: [],
                children: [
                  {_type: 'span', _key: spanKey, text: 'foo', marks: []},
                ],
              },
              {_type: 'marker', _key: markerKey},
            ],
          },
        ],
        {
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {
                  name: 'code',
                  fields: [
                    {
                      name: 'lines',
                      type: 'array',
                      of: [
                        {type: 'block', name: 'codeLine'},
                        {type: 'object', name: 'marker', fields: []},
                      ],
                    },
                  ],
                },
              ],
            }),
          ),
          onDegradation,
        },
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo'},
          {insert: '\n', attributes: {'code-block': true}},
        ],
      }),
      text: ['```', 'foo', '```'].join('\n'),
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'object-dropped',
        message:
          "Removed the `marker` object: Slack can't show it and it holds no text",
        path: [{_key: codeKey}, 'lines', {_key: markerKey}],
      },
    ])
  })

  test('a code line with a style other than the first its own schema declares is reported', () => {
    const keyGenerator = createTestKeyGenerator()
    const codeKey = keyGenerator()
    const fooLineKey = keyGenerator()
    const fooKey = keyGenerator()
    const barLineKey = keyGenerator()
    const barKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'code',
            _key: codeKey,
            lines: [
              {
                _type: 'codeLine',
                _key: fooLineKey,
                style: 'codeStyle',
                markDefs: [],
                children: [
                  {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                ],
              },
              {
                _type: 'codeLine',
                _key: barLineKey,
                style: 'otherCodeStyle',
                markDefs: [],
                children: [
                  {_type: 'span', _key: barKey, text: 'bar', marks: []},
                ],
              },
            ],
          },
        ],
        {
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {
                  name: 'code',
                  fields: [
                    {
                      name: 'lines',
                      type: 'array',
                      of: [
                        {
                          type: 'block',
                          name: 'codeLine',
                          styles: [
                            {name: 'codeStyle'},
                            {name: 'otherCodeStyle'},
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          ),
          onDegradation,
        },
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo'},
          {insert: '\n', attributes: {'code-block': true}},
          {insert: 'bar'},
          {insert: '\n', attributes: {'code-block': true}},
        ],
      }),
      text: ['```', 'foo', 'bar', '```'].join('\n'),
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'style-fallback',
        message:
          'Dropped the `otherCodeStyle` style, kept the text: a Slack code block has no formatting',
        path: [{_key: codeKey}, 'lines', {_key: barLineKey}],
        snippet: 'bar',
      },
    ])
  })

  test('a custom object with `children` becomes text and is reported', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const spanKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: calloutKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'foo', marks: ['strong']},
            ],
          },
        ],
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({ops: [{insert: 'foo\n'}]}),
      text: 'foo',
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'object-to-text',
        message: "The `callout` object became plain text: Slack can't show it",
        path: [{_key: calloutKey}],
        snippet: 'foo',
      },
    ])
  })

  test('with a schema, text blocks are the schema block type', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const onDegradation = vi.fn()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'paragraph',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'foo', marks: ['strong']},
            ],
          },
        ],
        {
          schema: {
            ...compileSchema(defineSchema({})),
            block: {name: 'paragraph'},
          },
          onDegradation,
        },
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [{insert: 'foo', attributes: {bold: true}}, {insert: '\n'}],
      }),
      text: 'foo',
    })
    expect(onDegradation).not.toHaveBeenCalled()
  })

  test('with a schema, spans are the schema span type', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const codeKey = keyGenerator()
    const lineKey = keyGenerator()
    const barKey = keyGenerator()
    const textMatcher = vi.fn(() => 'baz')
    const onDegradation = vi.fn()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'code',
            fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )

    expect(
      portableTextToSlack(
        [
          {
            _type: 'block',
            _key: blockKey,
            markDefs: [],
            children: [
              {_type: 'text', _key: fooKey, text: 'foo', marks: ['strong']},
            ],
          },
          {
            _type: 'code',
            _key: codeKey,
            lines: [
              {
                _type: 'block',
                _key: lineKey,
                markDefs: [],
                children: [{_type: 'text', _key: barKey, text: 'bar'}],
              },
            ],
          },
        ],
        {
          schema: {...schema, span: {name: 'text'}},
          types: {text: textMatcher},
          onDegradation,
        },
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo', attributes: {bold: true}},
          {insert: '\nbar'},
          {insert: '\n', attributes: {'code-block': true}},
        ],
      }),
      text: ['foo', '```', 'bar', '```'].join('\n'),
    })
    expect(textMatcher).not.toHaveBeenCalled()
    expect(onDegradation).not.toHaveBeenCalled()
  })

  test('a keyless child reports its own index in the path', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    portableTextToSlack(
      [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', text: 'foo', marks: []},
            {_type: 'span', text: 'bar', marks: ['underline']},
            {_type: 'stock-ticker', symbol: 'BAZ'},
          ] as unknown as PortableTextTextBlock['children'],
        },
      ],
      {onDegradation},
    )

    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'decorator-dropped',
        message:
          'Removed the `underline` decorator, kept the text: Slack has no matching formatting',
        path: [{_key: blockKey}, 'children', 1],
        snippet: 'bar',
      },
      {
        type: 'object-dropped',
        message:
          "Removed the `stock-ticker` object: Slack can't show it and it holds no text",
        path: [{_key: blockKey}, 'children', 2],
      },
    ])
  })

  test('an empty code block is one empty code line, from `lines` or `code`', () => {
    const keyGenerator = createTestKeyGenerator()
    const linesCodeKey = keyGenerator()
    const stringCodeKey = keyGenerator()
    const emptyCodeLine = {
      texty: JSON.stringify({
        ops: [{insert: '\n', attributes: {'code-block': true}}],
      }),
      text: ['```', '', '```'].join('\n'),
    }

    expect([
      portableTextToSlack([{_type: 'code', _key: linesCodeKey, lines: []}]),
      portableTextToSlack([{_type: 'code', _key: stringCodeKey, code: ''}]),
    ]).toEqual([emptyCodeLine, emptyCodeLine])
  })

  test('a newline inside a code line stays in the code block', () => {
    const keyGenerator = createTestKeyGenerator()
    const codeKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()
    const afterKey = keyGenerator()
    const afterSpanKey = keyGenerator()

    expect(
      portableTextToSlack([
        {
          _type: 'code',
          _key: codeKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'foo\nbar', marks: []},
              ],
            },
          ],
        },
        {
          _type: 'block',
          _key: afterKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: afterSpanKey, text: 'baz', marks: []},
          ],
        },
      ]),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo'},
          {insert: '\n', attributes: {'code-block': true}},
          {insert: 'bar'},
          {insert: '\n', attributes: {'code-block': true}},
          {insert: 'baz\n'},
        ],
      }),
      text: ['```', 'foo', 'bar', '```', 'baz'].join('\n'),
    })
  })

  test('text blocks inside a container keep their formatting', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const linkKey = keyGenerator()
    const fooKey = keyGenerator()
    const quoteKey = keyGenerator()
    const quoteSpanKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: fooBlockKey,
                style: 'normal',
                markDefs: [
                  {_type: 'link', _key: linkKey, href: 'https://example.com'},
                ],
                children: [
                  {
                    _type: 'span',
                    _key: fooKey,
                    text: 'foo',
                    marks: ['strong', linkKey],
                  },
                ],
              },
              listBlock(keyGenerator, 'bar', 'bullet', 2),
              {
                _type: 'block',
                _key: quoteKey,
                style: 'blockquote',
                markDefs: [],
                children: [
                  {_type: 'span', _key: quoteSpanKey, text: 'baz', marks: []},
                ],
              },
            ],
          },
        ],
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {
            insert: 'foo',
            attributes: {bold: true, link: 'https://example.com'},
          },
          {insert: '\nbar'},
          {insert: '\n', attributes: {list: 'bullet', indent: 1}},
          {insert: 'baz'},
          {insert: '\n', attributes: {blockquote: true}},
        ],
      }),
      text: ['foo', '    • bar', '> baz'].join('\n'),
    })
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'object-to-text',
              message:
                "Removed the `callout` object, kept its content: Slack can't show it",
              path: [{_key: calloutKey}],
              snippet: 'foo bar baz',
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            '- block 0: Removed the `callout` object, kept its content: Slack can\'t show it ("foo bar baz")',
          ].join('\n'),
        },
      ],
    ])
  })

  test('text blocks inside a container inside a container keep their formatting', () => {
    const keyGenerator = createTestKeyGenerator()
    const outerKey = keyGenerator()
    const innerKey = keyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const linkKey = keyGenerator()
    const bazKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: outerKey,
            content: [
              {
                _type: 'callout',
                _key: innerKey,
                content: [
                  {
                    _type: 'block',
                    _key: blockKey,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: fooKey, text: 'foo', marks: ['em']},
                      {
                        _type: 'span',
                        _key: barKey,
                        text: ' bar',
                        marks: ['strike-through'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'table',
            _key: tableKey,
            rows: [
              {
                _type: 'row',
                _key: rowKey,
                cells: [
                  {
                    _type: 'cell',
                    _key: cellKey,
                    value: [
                      {
                        _type: 'block',
                        _key: cellBlockKey,
                        style: 'normal',
                        markDefs: [
                          {
                            _type: 'link',
                            _key: linkKey,
                            href: 'https://example.com',
                          },
                        ],
                        children: [
                          {
                            _type: 'span',
                            _key: bazKey,
                            text: 'baz',
                            marks: [linkKey],
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
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo', attributes: {italic: true}},
          {insert: ' bar', attributes: {strike: true}},
          {insert: '\n'},
          {insert: 'baz', attributes: {link: 'https://example.com'}},
          {insert: '\n'},
        ],
      }),
      text: ['foo bar', 'baz'].join('\n'),
    })
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'object-to-text',
              message:
                "Removed the `callout` object, kept its content: Slack can't show it",
              path: [{_key: outerKey}],
              snippet: 'foo bar',
            },
            {
              type: 'object-to-text',
              message:
                "Removed the `table` object, kept its content: Slack can't show it",
              path: [{_key: tableKey}],
              snippet: 'baz',
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            '- block 0: Removed the `callout` object, kept its content: Slack can\'t show it ("foo bar")',
            '- block 1: Removed the `table` object, kept its content: Slack can\'t show it ("baz")',
          ].join('\n'),
        },
      ],
    ])
  })

  test('text blocks inside an object field are the text blocks its sub-schema declares', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const noteKey = keyGenerator()
    const linkKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'note',
                _key: noteKey,
                style: 'normal',
                markDefs: [
                  {_type: 'link', _key: linkKey, href: 'https://example.com'},
                ],
                children: [
                  {
                    _type: 'span',
                    _key: fooKey,
                    text: 'foo',
                    marks: ['em', linkKey],
                  },
                  {
                    _type: 'span',
                    _key: barKey,
                    text: ' bar',
                    marks: ['strong'],
                  },
                  {
                    _type: 'span',
                    _key: bazKey,
                    text: ' baz',
                    marks: ['underline'],
                  },
                ],
              },
            ],
          },
        ],
        {
          schema: compileSchema(
            defineSchema({
              decorators: [{name: 'strong'}],
              blockObjects: [
                {
                  name: 'callout',
                  fields: [
                    {
                      name: 'content',
                      type: 'array',
                      of: [
                        {
                          type: 'block',
                          name: 'note',
                          decorators: [{name: 'em'}, {name: 'underline'}],
                          annotations: [{name: 'link'}],
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          ),
          onDegradation,
        },
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {
            insert: 'foo',
            attributes: {italic: true, link: 'https://example.com'},
          },
          {insert: ' bar', attributes: {bold: true}},
          {insert: ' baz\n'},
        ],
      }),
      text: 'foo bar baz',
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'decorator-dropped',
        message:
          'Removed the `underline` decorator, kept the text: Slack has no matching formatting',
        path: [
          {_key: calloutKey},
          'content',
          {_key: noteKey},
          'children',
          {_key: bazKey},
        ],
        snippet: ' baz',
      },
      {
        type: 'object-to-text',
        message:
          "Removed the `callout` object, kept its content: Slack can't show it",
        path: [{_key: calloutKey}],
        snippet: 'foo bar baz',
      },
    ])
  })

  test('a code block inside a container is a code block', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const codeKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'code',
                _key: codeKey,
                lines: [
                  {
                    _type: 'block',
                    _key: lineKey,
                    children: [
                      {
                        _type: 'span',
                        _key: lineSpanKey,
                        text: 'foo',
                        marks: ['strong'],
                      },
                    ],
                  },
                ],
              },
              {
                _type: 'block',
                _key: barKey,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
                ],
              },
            ],
          },
        ],
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo'},
          {insert: '\n', attributes: {'code-block': true}},
          {insert: 'bar\n'},
        ],
      }),
      text: ['```', 'foo', '```', 'bar'].join('\n'),
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'decorator-dropped',
        message:
          'Removed the `strong` decorator, kept the text: a Slack code block has no formatting',
        path: [
          {_key: calloutKey},
          'content',
          {_key: codeKey},
          'lines',
          {_key: lineKey},
          'children',
          {_key: lineSpanKey},
        ],
        snippet: 'foo',
      },
      {
        type: 'object-to-text',
        message:
          "Removed the `callout` object, kept its content: Slack can't show it",
        path: [{_key: calloutKey}],
        snippet: 'foo bar',
      },
    ])
  })

  test('with a schema, a code block inside a container is a code block only where its field declares one', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const calloutCodeKey = keyGenerator()
    const calloutLineKey = keyGenerator()
    const calloutSpanKey = keyGenerator()
    const asideKey = keyGenerator()
    const asideCodeKey = keyGenerator()
    const asideLineKey = keyGenerator()
    const asideSpanKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'code',
                _key: calloutCodeKey,
                lines: [
                  {
                    _type: 'codeLine',
                    _key: calloutLineKey,
                    children: [
                      {
                        _type: 'span',
                        _key: calloutSpanKey,
                        text: 'foo',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'aside',
            _key: asideKey,
            content: [
              {
                _type: 'code',
                _key: asideCodeKey,
                lines: [
                  {
                    _type: 'codeLine',
                    _key: asideLineKey,
                    children: [
                      {
                        _type: 'span',
                        _key: asideSpanKey,
                        text: 'bar',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        {
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {
                  name: 'code',
                  fields: [
                    {
                      name: 'lines',
                      type: 'array',
                      of: [{type: 'block', name: 'codeLine'}],
                    },
                  ],
                },
                {
                  name: 'callout',
                  fields: [
                    {
                      name: 'content',
                      type: 'array',
                      of: [{type: 'block'}, {type: 'code'}],
                    },
                  ],
                },
                {
                  name: 'aside',
                  fields: [
                    {name: 'content', type: 'array', of: [{type: 'block'}]},
                  ],
                },
              ],
            }),
          ),
          onDegradation,
        },
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo'},
          {insert: '\n', attributes: {'code-block': true}},
          {insert: 'bar\n'},
        ],
      }),
      text: ['```', 'foo', '```', 'bar'].join('\n'),
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'object-to-text',
        message:
          "Removed the `callout` object, kept its content: Slack can't show it",
        path: [{_key: calloutKey}],
        snippet: 'foo',
      },
      {
        type: 'object-to-text',
        message: "The `aside` object became plain text: Slack can't show it",
        path: [{_key: asideKey}],
        snippet: 'bar',
      },
    ])
  })

  test('with a schema, objects at any depth are read with the schema their field declares', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const asideKey = keyGenerator()
    const noteKey = keyGenerator()
    const fooKey = keyGenerator()
    const asideCodeKey = keyGenerator()
    const asideLineKey = keyGenerator()
    const barKey = keyGenerator()
    const panelKey = keyGenerator()
    const itemKey = keyGenerator()
    const bazKey = keyGenerator()
    const panelCodeKey = keyGenerator()
    const panelLineKey = keyGenerator()
    const quxKey = keyGenerator()
    const footerCodeKey = keyGenerator()
    const footerLineKey = keyGenerator()
    const fizzKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'aside',
                _key: asideKey,
                body: [
                  {
                    _type: 'note',
                    _key: noteKey,
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: fooKey, text: 'foo', marks: ['em']},
                    ],
                  },
                  {
                    _type: 'code',
                    _key: asideCodeKey,
                    lines: [
                      {
                        _type: 'codeLine',
                        _key: asideLineKey,
                        children: [
                          {_type: 'span', _key: barKey, text: 'bar', marks: []},
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'panel',
                    _key: panelKey,
                    items: [
                      {
                        _type: 'item',
                        _key: itemKey,
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: bazKey,
                            text: 'baz',
                            marks: ['em'],
                          },
                        ],
                      },
                      {
                        _type: 'code',
                        _key: panelCodeKey,
                        lines: [
                          {
                            _type: 'codeLine',
                            _key: panelLineKey,
                            children: [
                              {
                                _type: 'span',
                                _key: quxKey,
                                text: 'qux',
                                marks: [],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
                footer: [
                  {
                    _type: 'code',
                    _key: footerCodeKey,
                    lines: [
                      {
                        _type: 'codeLine',
                        _key: footerLineKey,
                        children: [
                          {
                            _type: 'span',
                            _key: fizzKey,
                            text: 'fizz',
                            marks: [],
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
        {
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {
                  name: 'code',
                  fields: [
                    {
                      name: 'lines',
                      type: 'array',
                      of: [{type: 'block', name: 'codeLine'}],
                    },
                  ],
                },
                {
                  name: 'callout',
                  fields: [
                    {
                      name: 'content',
                      type: 'array',
                      of: [
                        {type: 'block'},
                        {
                          type: 'object',
                          name: 'aside',
                          fields: [
                            {
                              name: 'body',
                              type: 'array',
                              of: [
                                {
                                  type: 'block',
                                  name: 'note',
                                  decorators: [{name: 'em'}],
                                },
                                {type: 'code'},
                                {
                                  type: 'object',
                                  name: 'panel',
                                  fields: [
                                    {
                                      name: 'items',
                                      type: 'array',
                                      of: [
                                        {
                                          type: 'block',
                                          name: 'item',
                                          decorators: [{name: 'em'}],
                                        },
                                        {type: 'code'},
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              name: 'footer',
                              type: 'array',
                              of: [{type: 'block', name: 'note'}],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          ),
          onDegradation,
        },
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo', attributes: {italic: true}},
          {insert: '\nbar'},
          {insert: '\n', attributes: {'code-block': true}},
          {insert: 'baz', attributes: {italic: true}},
          {insert: '\nqux'},
          {insert: '\n', attributes: {'code-block': true}},
          {insert: 'fizz\n'},
        ],
      }),
      text: [
        'foo',
        '```',
        'bar',
        '```',
        'baz',
        '```',
        'qux',
        '```',
        'fizz',
      ].join('\n'),
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'object-to-text',
        message:
          "Removed the `callout` object, kept its content: Slack can't show it",
        path: [{_key: calloutKey}],
        snippet: 'foo bar baz qux fizz',
      },
    ])
  })

  test('with a schema, a field named `src`, `url` or `code` that holds an array is walked', () => {
    const keyGenerator = createTestKeyGenerator()
    const boxKey = keyGenerator()
    const noteKey = keyGenerator()
    const fooKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'box',
            _key: boxKey,
            code: [
              {
                _type: 'note',
                _key: noteKey,
                markDefs: [],
                children: [
                  {_type: 'span', _key: fooKey, text: 'foo', marks: ['em']},
                ],
              },
            ],
            url: 'https://example.com',
          },
        ],
        {
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {
                  name: 'box',
                  fields: [
                    {
                      name: 'code',
                      type: 'array',
                      of: [{type: 'block', name: 'note'}],
                    },
                    {name: 'url', type: 'string'},
                  ],
                },
              ],
            }),
          ),
          onDegradation,
        },
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'foo', attributes: {italic: true}},
          {insert: '\nhttps://example.com\n'},
        ],
      }),
      text: ['foo', 'https://example.com'].join('\n'),
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'object-to-text',
        message:
          "Removed the `box` object, kept its content: Slack can't show it",
        path: [{_key: boxKey}],
        snippet: 'foo https://example.com',
      },
    ])
  })

  test('a custom object with spans in `children` also writes its other fields', () => {
    const keyGenerator = createTestKeyGenerator()
    const boxKey = keyGenerator()
    const barKey = keyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const bazKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'box',
            _key: boxKey,
            children: [
              {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
            ],
            content: [
              {
                _type: 'block',
                _key: blockKey,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: fooKey, text: 'foo', marks: ['em']},
                  {
                    _type: 'span',
                    _key: bazKey,
                    text: ' baz',
                    marks: ['underline'],
                  },
                ],
              },
            ],
          },
        ],
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({
        ops: [
          {insert: 'bar\n'},
          {insert: 'foo', attributes: {italic: true}},
          {insert: ' baz\n'},
        ],
      }),
      text: ['bar', 'foo baz'].join('\n'),
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'decorator-dropped',
        message:
          'Removed the `underline` decorator, kept the text: Slack has no matching formatting',
        path: [
          {_key: boxKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: bazKey},
        ],
        snippet: ' baz',
      },
      {
        type: 'object-to-text',
        message:
          "Removed the `box` object, kept its content: Slack can't show it",
        path: [{_key: boxKey}],
        snippet: 'bar foo baz',
      },
    ])
  })

  test('an empty code block inside a container is one empty code line, from `lines` or `code`', () => {
    const keyGenerator = createTestKeyGenerator()
    const linesCalloutKey = keyGenerator()
    const linesCodeKey = keyGenerator()
    const stringCalloutKey = keyGenerator()
    const stringCodeKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()
    const emptyCodeLine = {
      texty: JSON.stringify({
        ops: [{insert: '\n', attributes: {'code-block': true}}],
      }),
      text: ['```', '', '```'].join('\n'),
    }

    expect([
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: linesCalloutKey,
            content: [{_type: 'code', _key: linesCodeKey, lines: []}],
          },
        ],
        {onDegradation},
      ),
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: stringCalloutKey,
            content: [{_type: 'code', _key: stringCodeKey, code: ''}],
          },
        ],
        {onDegradation},
      ),
    ]).toEqual([emptyCodeLine, emptyCodeLine])
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'object-to-text',
              message:
                "Removed the `callout` object, kept its content: Slack can't show it",
              path: [{_key: linesCalloutKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `callout` object, kept its content: Slack can't show it",
          ].join('\n'),
        },
      ],
      [
        {
          degradations: [
            {
              type: 'object-to-text',
              message:
                "Removed the `callout` object, kept its content: Slack can't show it",
              path: [{_key: stringCalloutKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `callout` object, kept its content: Slack can't show it",
          ].join('\n'),
        },
      ],
    ])
  })

  test('what a container with no text loses inside it is reported before the container', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const mentionKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: blockKey,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'mention', _key: mentionKey}],
              },
            ],
          },
        ],
        {onDegradation},
      ),
    ).toEqual({texty: JSON.stringify({ops: []}), text: ''})
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'object-dropped',
              message:
                "Removed the `mention` object: Slack can't show it and it holds no text",
              path: [
                {_key: calloutKey},
                'content',
                {_key: blockKey},
                'children',
                {_key: mentionKey},
              ],
            },
            {
              type: 'object-dropped',
              message:
                "Removed the `callout` object: Slack can't show it and it holds no text",
              path: [{_key: calloutKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `mention` object: Slack can't show it and it holds no text",
            "- block 0: Removed the `callout` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
    ])
  })

  test('an object whose `src`, `url` or `code` string holds only line breaks is removed', () => {
    const keyGenerator = createTestKeyGenerator()
    const srcBoxKey = keyGenerator()
    const urlBoxKey = keyGenerator()
    const codeBoxKey = keyGenerator()
    const srcCalloutKey = keyGenerator()
    const urlCalloutKey = keyGenerator()
    const codeCalloutKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()
    const empty = {texty: JSON.stringify({ops: []}), text: ''}

    expect([
      portableTextToSlack([{_type: 'box', _key: srcBoxKey, src: '\n'}], {
        onDegradation,
      }),
      portableTextToSlack([{_type: 'box', _key: urlBoxKey, url: '\n'}], {
        onDegradation,
      }),
      portableTextToSlack([{_type: 'box', _key: codeBoxKey, code: '\n\n'}], {
        onDegradation,
      }),
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: srcCalloutKey,
            content: [{_type: 'box', _key: keyGenerator(), src: '\n'}],
          },
        ],
        {onDegradation},
      ),
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: urlCalloutKey,
            content: [{_type: 'box', _key: keyGenerator(), url: '\n'}],
          },
        ],
        {onDegradation},
      ),
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: codeCalloutKey,
            content: [{_type: 'box', _key: keyGenerator(), code: '\n\n'}],
          },
        ],
        {onDegradation},
      ),
    ]).toEqual([empty, empty, empty, empty, empty, empty])
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'object-dropped',
              message:
                "Removed the `box` object: Slack can't show it and it holds no text",
              path: [{_key: srcBoxKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `box` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
      [
        {
          degradations: [
            {
              type: 'object-dropped',
              message:
                "Removed the `box` object: Slack can't show it and it holds no text",
              path: [{_key: urlBoxKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `box` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
      [
        {
          degradations: [
            {
              type: 'object-dropped',
              message:
                "Removed the `box` object: Slack can't show it and it holds no text",
              path: [{_key: codeBoxKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `box` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
      [
        {
          degradations: [
            {
              type: 'object-dropped',
              message:
                "Removed the `callout` object: Slack can't show it and it holds no text",
              path: [{_key: srcCalloutKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `callout` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
      [
        {
          degradations: [
            {
              type: 'object-dropped',
              message:
                "Removed the `callout` object: Slack can't show it and it holds no text",
              path: [{_key: urlCalloutKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `callout` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
      [
        {
          degradations: [
            {
              type: 'object-dropped',
              message:
                "Removed the `callout` object: Slack can't show it and it holds no text",
              path: [{_key: codeCalloutKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `callout` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
    ])
  })

  test('an object whose own spans hold only line breaks is removed', () => {
    const keyGenerator = createTestKeyGenerator()
    const boxKey = keyGenerator()
    const calloutKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()
    const empty = {texty: JSON.stringify({ops: []}), text: ''}

    expect([
      portableTextToSlack(
        [
          {
            _type: 'box',
            _key: boxKey,
            children: [
              {_type: 'span', _key: keyGenerator(), text: '\n', marks: []},
            ],
          },
        ],
        {onDegradation},
      ),
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'box',
                _key: keyGenerator(),
                children: [
                  {
                    _type: 'span',
                    _key: keyGenerator(),
                    text: '\n\n',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
        {onDegradation},
      ),
    ]).toEqual([empty, empty])
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'object-dropped',
              message:
                "Removed the `box` object: Slack can't show it and it holds no text",
              path: [{_key: boxKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `box` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
      [
        {
          degradations: [
            {
              type: 'object-dropped',
              message:
                "Removed the `callout` object: Slack can't show it and it holds no text",
              path: [{_key: calloutKey}],
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            "- block 0: Removed the `callout` object: Slack can't show it and it holds no text",
          ].join('\n'),
        },
      ],
    ])
  })

  test('empty lines beside text in a `code` string or own spans are kept, spaces too', () => {
    const keyGenerator = createTestKeyGenerator()
    const boxKey = keyGenerator()
    const spanKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'box',
            _key: boxKey,
            children: [
              {_type: 'span', _key: spanKey, text: '\nfoo\n', marks: []},
            ],
            code: 'bar\n\n ',
          },
        ],
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({ops: [{insert: '\nfoo\n\nbar\n\n \n'}]}),
      text: ['', 'foo', '', 'bar', '', ' '].join('\n'),
    })
    expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
      {
        type: 'object-to-text',
        message: "The `box` object became plain text: Slack can't show it",
        path: [{_key: boxKey}],
        snippet: '\\nfoo\\n bar   ',
      },
    ])
  })

  test('what Slack cannot show inside a container is reported at its full path', () => {
    const keyGenerator = createTestKeyGenerator()
    const outerKey = keyGenerator()
    const innerKey = keyGenerator()
    const blockKey = keyGenerator()
    const commentKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const cellCommentKey = keyGenerator()
    const bazKey = keyGenerator()
    const quxKey = keyGenerator()
    const onDegradation =
      vi.fn<
        (report: {
          degradations: Array<SerializeDegradation>
          message: string
        }) => void
      >()

    expect(
      portableTextToSlack(
        [
          {
            _type: 'callout',
            _key: outerKey,
            content: [
              {
                _type: 'callout',
                _key: innerKey,
                content: [
                  {
                    _type: 'block',
                    _key: blockKey,
                    style: 'normal',
                    markDefs: [
                      {_type: 'comment', _key: commentKey, text: 'fizz'},
                    ],
                    children: [
                      {
                        _type: 'span',
                        _key: fooKey,
                        text: 'foo',
                        marks: [commentKey],
                      },
                      {
                        _type: 'span',
                        _key: barKey,
                        text: ' bar',
                        marks: ['underline'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'table',
            _key: tableKey,
            rows: [
              {
                _type: 'row',
                _key: rowKey,
                cells: [
                  {
                    _type: 'cell',
                    _key: cellKey,
                    value: [
                      {
                        _type: 'block',
                        _key: cellBlockKey,
                        style: 'normal',
                        markDefs: [
                          {
                            _type: 'comment',
                            _key: cellCommentKey,
                            text: 'buzz',
                          },
                        ],
                        children: [
                          {
                            _type: 'span',
                            _key: bazKey,
                            text: 'baz',
                            marks: ['underline'],
                          },
                          {
                            _type: 'span',
                            _key: quxKey,
                            text: ' qux',
                            marks: [cellCommentKey],
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
        {onDegradation},
      ),
    ).toEqual({
      texty: JSON.stringify({ops: [{insert: 'foo bar\nbaz qux\n'}]}),
      text: ['foo bar', 'baz qux'].join('\n'),
    })
    expect(onDegradation.mock.calls).toEqual([
      [
        {
          degradations: [
            {
              type: 'annotation-dropped',
              message:
                'Removed the `comment` annotation, kept its text: Slack only shows links',
              path: [
                {_key: outerKey},
                'content',
                {_key: innerKey},
                'content',
                {_key: blockKey},
                'children',
                {_key: fooKey},
              ],
              snippet: 'foo',
            },
            {
              type: 'decorator-dropped',
              message:
                'Removed the `underline` decorator, kept the text: Slack has no matching formatting',
              path: [
                {_key: outerKey},
                'content',
                {_key: innerKey},
                'content',
                {_key: blockKey},
                'children',
                {_key: barKey},
              ],
              snippet: ' bar',
            },
            {
              type: 'object-to-text',
              message:
                "The `callout` object became plain text: Slack can't show it",
              path: [{_key: outerKey}],
              snippet: 'foo bar',
            },
            {
              type: 'decorator-dropped',
              message:
                'Removed the `underline` decorator, kept the text: Slack has no matching formatting',
              path: [
                {_key: tableKey},
                'rows',
                {_key: rowKey},
                'cells',
                {_key: cellKey},
                'value',
                {_key: cellBlockKey},
                'children',
                {_key: bazKey},
              ],
              snippet: 'baz',
            },
            {
              type: 'annotation-dropped',
              message:
                'Removed the `comment` annotation, kept its text: Slack only shows links',
              path: [
                {_key: tableKey},
                'rows',
                {_key: rowKey},
                'cells',
                {_key: cellKey},
                'value',
                {_key: cellBlockKey},
                'children',
                {_key: quxKey},
              ],
              snippet: ' qux',
            },
            {
              type: 'object-to-text',
              message:
                "The `table` object became plain text: Slack can't show it",
              path: [{_key: tableKey}],
              snippet: 'baz qux',
            },
          ],
          message: [
            'Portable Text could not be serialized to Slack without loss:',
            '- Removed the `comment` annotation, kept its text: Slack only shows links (2×: "foo", " qux")',
            '- Removed the `underline` decorator, kept the text: Slack has no matching formatting (2×: " bar", "baz")',
            '- block 0: The `callout` object became plain text: Slack can\'t show it ("foo bar")',
            '- block 1: The `table` object became plain text: Slack can\'t show it ("baz qux")',
          ].join('\n'),
        },
      ],
    ])
  })

  describe('types', () => {
    test('a matcher writes a mention, a channel, an emoji or text', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const mentionKey = keyGenerator()
      const channelKey = keyGenerator()
      const emojiKey = keyGenerator()
      const tagKey = keyGenerator()
      const onDegradation = vi.fn()
      const mention = vi.fn(
        ({value}: {value: {userId: string; label: string}}) => ({
          mention: {id: value.userId, text: value.label},
        }),
      )

      expect(
        portableTextToSlack(
          [
            {
              _type: 'block',
              _key: blockKey,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: fooKey, text: 'foo ', marks: []},
                {
                  _type: 'mention',
                  _key: mentionKey,
                  userId: 'U0123ABCD',
                  label: '@foo',
                },
                {
                  _type: 'channel',
                  _key: channelKey,
                  channelId: 'C0123ABCD',
                  label: '#bar',
                },
                {_type: 'emoji', _key: emojiKey, name: 'baz'},
                {_type: 'tag', _key: tagKey, label: 'fizz'},
              ],
            },
          ],
          {
            onDegradation,
            types: {
              mention,
              channel: ({value}) => ({
                channel: {id: value.channelId, text: value.label},
              }),
              emoji: ({value}) => ({emoji: {text: `:${value.name}:`}}),
              tag: ({value}) => value.label,
            },
          },
        ),
      ).toEqual({
        texty: JSON.stringify({
          ops: [
            {insert: 'foo '},
            {
              attributes: {
                slackmention: {
                  id: 'U0123ABCD',
                  label: '@foo',
                  mention: true,
                  unverified: false,
                },
              },
              insert: '@foo',
            },
            {
              attributes: {
                slackmention: {
                  id: 'C0123ABCD',
                  label: '#bar',
                  mention: false,
                  unverified: false,
                },
              },
              insert: '#bar',
            },
            {insert: {slackemoji: {text: ':baz:'}}},
            {insert: 'fizz\n'},
          ],
        }),
        text: 'foo @foo#bar:baz:fizz',
      })
      expect(mention.mock.calls).toEqual([
        [
          {
            context: {schema: undefined},
            value: {
              _type: 'mention',
              _key: mentionKey,
              userId: 'U0123ABCD',
              label: '@foo',
            },
          },
        ],
      ])
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('a matcher receives the `schema` option', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const mentionKey = keyGenerator()
      const schema = compileSchema(
        defineSchema({inlineObjects: [{name: 'mention'}]}),
      )
      const mention = vi.fn(
        (_input: {context: {schema: unknown}; value: unknown}) => 'foo',
      )

      portableTextToSlack(
        [
          {
            _type: 'block',
            _key: blockKey,
            markDefs: [],
            children: [{_type: 'mention', _key: mentionKey}],
          },
        ],
        {schema, types: {mention}},
      )

      expect(mention.mock.calls).toEqual([
        [{context: {schema}, value: {_type: 'mention', _key: mentionKey}}],
      ])
    })

    test('a matcher returning `undefined` drops the object and reports it', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const mentionKey = keyGenerator()
      const onDegradation =
        vi.fn<
          (report: {
            degradations: Array<SerializeDegradation>
            message: string
          }) => void
        >()

      expect(
        portableTextToSlack(
          [
            {
              _type: 'block',
              _key: blockKey,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                {_type: 'mention', _key: mentionKey, userId: 'U0123ABCD'},
              ],
            },
          ],
          {onDegradation, types: {mention: () => undefined}},
        ),
      ).toEqual({
        texty: JSON.stringify({ops: [{insert: 'foo\n'}]}),
        text: 'foo',
      })
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'object-dropped',
          message:
            "Removed the `mention` object: Slack can't show it and it holds no text",
          path: [{_key: blockKey}, 'children', {_key: mentionKey}],
        },
      ])
    })

    test('without `types`, an inline object is dropped and reported', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const mentionKey = keyGenerator()
      const onDegradation =
        vi.fn<
          (report: {
            degradations: Array<SerializeDegradation>
            message: string
          }) => void
        >()

      expect(
        portableTextToSlack(
          [
            {
              _type: 'block',
              _key: blockKey,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                {
                  _type: 'mention',
                  _key: mentionKey,
                  userId: 'U0123ABCD',
                  label: '@foo',
                },
              ],
            },
          ],
          {onDegradation},
        ),
      ).toEqual({
        texty: JSON.stringify({ops: [{insert: 'foo\n'}]}),
        text: 'foo',
      })
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'object-dropped',
          message:
            "Removed the `mention` object: Slack can't show it and it holds no text",
          path: [{_key: blockKey}, 'children', {_key: mentionKey}],
        },
      ])
    })

    test('marks around an inline object do not apply to it', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const linkKey = keyGenerator()
      const fooKey = keyGenerator()
      const mentionKey = keyGenerator()
      const tagKey = keyGenerator()
      const barKey = keyGenerator()

      expect(
        portableTextToSlack(
          [
            {
              _type: 'block',
              _key: blockKey,
              style: 'normal',
              markDefs: [
                {_type: 'link', _key: linkKey, href: 'https://example.com'},
              ],
              children: [
                {
                  _type: 'span',
                  _key: fooKey,
                  text: 'foo',
                  marks: ['strong', linkKey],
                },
                {_type: 'mention', _key: mentionKey},
                {_type: 'tag', _key: tagKey},
                {
                  _type: 'span',
                  _key: barKey,
                  text: 'bar',
                  marks: ['strong', linkKey],
                },
              ],
            },
          ],
          {
            types: {
              mention: () => ({mention: {id: 'U0123ABCD', text: '@foo'}}),
              tag: () => 'baz',
            },
          },
        ),
      ).toEqual({
        texty: JSON.stringify({
          ops: [
            {
              insert: 'foo',
              attributes: {bold: true, link: 'https://example.com'},
            },
            {
              attributes: {
                slackmention: {
                  id: 'U0123ABCD',
                  label: '@foo',
                  mention: true,
                  unverified: false,
                },
              },
              insert: '@foo',
            },
            {insert: 'baz'},
            {
              insert: 'bar',
              attributes: {bold: true, link: 'https://example.com'},
            },
            {insert: '\n'},
          ],
        }),
        text: 'foo@foobazbar',
      })
    })

    test('line breaks in mention and channel text become spaces', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        portableTextToSlack(
          [
            {
              _type: 'block',
              _key: keyGenerator(),
              style: 'normal',
              listItem: 'bullet',
              level: 1,
              markDefs: [],
              children: [
                {_type: 'mention', _key: keyGenerator()},
                {_type: 'channel', _key: keyGenerator()},
              ],
            },
          ],
          {
            types: {
              mention: () => ({
                mention: {id: 'U0123ABCD', text: '@foo\nbar\rbaz'},
              }),
              channel: () => ({
                channel: {id: 'C0123ABCD', text: '#baz\r\nqux'},
              }),
            },
          },
        ),
      ).toEqual({
        texty: JSON.stringify({
          ops: [
            {
              attributes: {
                slackmention: {
                  id: 'U0123ABCD',
                  label: '@foo bar baz',
                  mention: true,
                  unverified: false,
                },
              },
              insert: '@foo bar baz',
            },
            {
              attributes: {
                slackmention: {
                  id: 'C0123ABCD',
                  label: '#baz qux',
                  mention: false,
                  unverified: false,
                },
              },
              insert: '#baz qux',
            },
            {insert: '\n', attributes: {list: 'bullet'}},
          ],
        }),
        text: '• @foo bar baz#baz qux',
      })
    })

    test('neighbouring mentions stay apart', () => {
      const keyGenerator = createTestKeyGenerator()
      const mentionOp = {
        attributes: {
          slackmention: {
            id: 'U0123ABCD',
            label: '@foo',
            mention: true,
            unverified: false,
          },
        },
        insert: '@foo',
      }

      expect(
        portableTextToSlack(
          [
            {
              _type: 'block',
              _key: keyGenerator(),
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'mention', _key: keyGenerator()},
                {_type: 'mention', _key: keyGenerator()},
              ],
            },
          ],
          {
            types: {
              mention: () => ({mention: {id: 'U0123ABCD', text: '@foo'}}),
            },
          },
        ),
      ).toEqual({
        texty: JSON.stringify({ops: [mentionOp, mentionOp, {insert: '\n'}]}),
        text: '@foo@foo',
      })
    })

    test('an inline object in a code line never reaches a matcher', () => {
      const keyGenerator = createTestKeyGenerator()
      const codeKey = keyGenerator()
      const lineKey = keyGenerator()
      const fooKey = keyGenerator()
      const mentionKey = keyGenerator()
      const mention = vi.fn(() => 'bar')
      const onDegradation =
        vi.fn<
          (report: {
            degradations: Array<SerializeDegradation>
            message: string
          }) => void
        >()

      expect(
        portableTextToSlack(
          [
            {
              _type: 'code',
              _key: codeKey,
              lines: [
                {
                  _type: 'block',
                  _key: lineKey,
                  children: [
                    {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                    {_type: 'mention', _key: mentionKey},
                  ],
                },
              ],
            },
          ],
          {onDegradation, types: {mention}},
        ),
      ).toEqual({
        texty: JSON.stringify({
          ops: [
            {insert: 'foo'},
            {insert: '\n', attributes: {'code-block': true}},
          ],
        }),
        text: ['```', 'foo', '```'].join('\n'),
      })
      expect(mention).not.toHaveBeenCalled()
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'object-dropped',
          message:
            "Removed the `mention` object: Slack can't show it and it holds no text",
          path: [
            {_key: codeKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: mentionKey},
          ],
        },
      ])
    })
  })
})

describe('round trip', () => {
  test('everything Slack supports survives a copy and a paste', () => {
    const keyGenerator = createTestKeyGenerator()
    const inputKeyGenerator = createTestKeyGenerator()
    const fooBlockKey = inputKeyGenerator()
    const fooKey = inputKeyGenerator()
    const barKey = inputKeyGenerator()
    const bazKey = inputKeyGenerator()
    const quoteKey = inputKeyGenerator()
    const linkKey = inputKeyGenerator()
    const fizzKey = inputKeyGenerator()
    const numberKey = inputKeyGenerator()
    const buzzKey = inputKeyGenerator()
    const bulletKey = inputKeyGenerator()
    const yadaKey = inputKeyGenerator()
    const codeKey = inputKeyGenerator()
    const emptyBlockKey = inputKeyGenerator()
    const emptySpanKey = inputKeyGenerator()
    const blocks: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [
          {_type: 'span', _key: fooKey, text: 'foo ', marks: []},
          {_type: 'span', _key: barKey, text: 'bar', marks: ['strong', 'em']},
          {
            _type: 'span',
            _key: bazKey,
            text: ' baz',
            marks: ['strike-through', 'code'],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: quoteKey,
        children: [
          {_type: 'span', _key: fizzKey, text: 'fizz', marks: [linkKey]},
        ],
        markDefs: [{_type: 'link', _key: linkKey, href: 'https://example.com'}],
        style: 'blockquote',
      },
      {
        _type: 'block',
        _key: numberKey,
        children: [{_type: 'span', _key: buzzKey, text: 'buzz', marks: []}],
        markDefs: [],
        style: 'normal',
        listItem: 'number',
        level: 1,
      },
      {
        _type: 'block',
        _key: bulletKey,
        children: [{_type: 'span', _key: yadaKey, text: 'yada', marks: []}],
        markDefs: [],
        style: 'normal',
        listItem: 'bullet',
        level: 2,
      },
      {_type: 'code', _key: codeKey, code: 'foo\nbar'},
      {
        _type: 'block',
        _key: emptyBlockKey,
        children: [{_type: 'span', _key: emptySpanKey, text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    expect(
      slackToPortableText(portableTextToSlack(blocks).texty, {keyGenerator}),
    ).toEqual(blocks)
  })

  test('mentions, channels and emoji survive a paste and a copy through matchers', () => {
    const ops = [
      {
        attributes: {
          slackmention: {
            id: 'U0123ABCD',
            label: '@foo',
            mention: true,
            unverified: false,
          },
        },
        insert: '@foo',
      },
      {insert: ' '},
      {
        attributes: {
          slackmention: {
            id: 'C0123ABCD',
            label: '#bar',
            mention: false,
            unverified: false,
          },
        },
        insert: '#bar',
      },
      {insert: ' '},
      {insert: {slackemoji: {text: ':baz:'}}},
      {insert: '\n'},
    ]
    const keyGenerator = createTestKeyGenerator()
    const blocks = slackToPortableText(JSON.stringify({ops}), {
      keyGenerator,
      embeds: {
        mention: ({context, value}) => ({
          _type: 'mention',
          _key: context.keyGenerator(),
          userId: value.id,
          label: value.text,
        }),
        channel: ({context, value}) => ({
          _type: 'channel',
          _key: context.keyGenerator(),
          channelId: value.id,
          label: value.text,
        }),
        emoji: ({context, value}) => ({
          _type: 'emoji',
          _key: context.keyGenerator(),
          name: value.name,
        }),
      },
    })

    expect(blocks).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'mention', _key: 'k1', userId: 'U0123ABCD', label: '@foo'},
          {_type: 'span', _key: 'k2', text: ' ', marks: []},
          {_type: 'channel', _key: 'k3', channelId: 'C0123ABCD', label: '#bar'},
          {_type: 'span', _key: 'k4', text: ' ', marks: []},
          {_type: 'emoji', _key: 'k5', name: 'baz'},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    const {texty, text} = portableTextToSlack(blocks, {
      types: {
        mention: ({value}) => ({
          mention: {id: value.userId, text: value.label},
        }),
        channel: ({value}) => ({
          channel: {id: value.channelId, text: value.label},
        }),
        emoji: ({value}) => ({emoji: {text: `:${value.name}:`}}),
      },
    })

    expect(JSON.parse(texty)).toEqual({ops})
    expect(text).toEqual('@foo #bar :baz:')
    expect(
      slackToPortableText(texty, {
        keyGenerator: createTestKeyGenerator(),
        embeds: {
          mention: ({context, value}) => ({
            _type: 'mention',
            _key: context.keyGenerator(),
            userId: value.id,
            label: value.text,
          }),
          channel: ({context, value}) => ({
            _type: 'channel',
            _key: context.keyGenerator(),
            channelId: value.id,
            label: value.text,
          }),
          emoji: ({context, value}) => ({
            _type: 'emoji',
            _key: context.keyGenerator(),
            name: value.name,
          }),
        },
      }),
    ).toEqual(blocks)
  })

  test('a code block keeps the first style its code line schema declares through a paste and a copy', () => {
    const schema = compileSchema(
      defineSchema({
        styles: [{name: 'normal'}],
        blockObjects: [
          {
            name: 'code',
            fields: [
              {
                name: 'lines',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    name: 'codeLine',
                    styles: [{name: 'codeStyle'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    const ops = [
      {insert: 'foo'},
      {insert: '\n', attributes: {'code-block': true}},
    ]
    const blocks = slackToPortableText(JSON.stringify({ops}), {
      keyGenerator: createTestKeyGenerator(),
      schema,
    })
    const onDegradation = vi.fn()

    expect(blocks).toEqual([
      {
        _type: 'code',
        _key: 'k0',
        lines: [
          {
            _type: 'codeLine',
            _key: 'k1',
            style: 'codeStyle',
            markDefs: [],
            children: [{_type: 'span', _key: 'k2', text: 'foo', marks: []}],
          },
        ],
      },
    ])
    expect(portableTextToSlack(blocks, {schema, onDegradation})).toEqual({
      texty: JSON.stringify({ops}),
      text: ['```', 'foo', '```'].join('\n'),
    })
    expect(onDegradation).not.toHaveBeenCalled()
  })
})

function listBlock(
  keyGenerator: () => string,
  text: string,
  listItem: string,
  level: number,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    listItem,
    level,
    children: [{_type: 'span', _key: keyGenerator(), text, marks: []}],
  }
}

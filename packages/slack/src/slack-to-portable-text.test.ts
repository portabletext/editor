import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defaultSchema} from './default-schema'
import {
  channelBroadcastTexty,
  channelTexty,
  emojiTexty,
  hereTexty,
  userMentionTexty,
} from './to-portable-text/slack-embeds.fixture'
import {
  slackToPortableText,
  type Degradation,
} from './to-portable-text/slack-to-portable-text'

describe(slackToPortableText.name, () => {
  test('a real Slack message copy', () => {
    const keyGenerator = createTestKeyGenerator()

    expect(
      slackToPortableText(
        '{"ops":[{"insert":"foo "},{"attributes":{"bold":true},"insert":"bar"},{"insert":" baz\\nfizz "},{"attributes":{"link":"http://example.com"},"insert":"buzz"},{"attributes":{"list":"ordered"},"insert":"\\n"},{"insert":"yada "},{"attributes":{"italic":true},"insert":"yada"},{"attributes":{"list":"ordered"},"insert":"\\n"}]}',
        {keyGenerator},
      ),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'k4',
        children: [
          {_type: 'span', _key: 'k5', text: 'fizz ', marks: []},
          {_type: 'span', _key: 'k7', text: 'buzz', marks: ['k6']},
        ],
        markDefs: [{_type: 'link', _key: 'k6', href: 'http://example.com'}],
        style: 'normal',
        listItem: 'number',
        level: 1,
      },
      {
        _type: 'block',
        _key: 'k8',
        children: [
          {_type: 'span', _key: 'k9', text: 'yada ', marks: []},
          {_type: 'span', _key: 'k10', text: 'yada', marks: ['em']},
        ],
        markDefs: [],
        style: 'normal',
        listItem: 'number',
        level: 1,
      },
    ])
  })

  describe('input', () => {
    test('an empty Delta', () => {
      expect(slackToPortableText('{"ops":[]}')).toEqual([])
    })

    test('text that is not JSON', () => {
      expect(slackToPortableText('foo bar')).toEqual([])
    })

    test('JSON without `ops`', () => {
      expect(slackToPortableText('{"foo":"bar"}')).toEqual([])
    })

    test('ops that are not objects are skipped', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(
          JSON.stringify({ops: [null, 1, {insert: 2}, {insert: 'foo\n'}]}),
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a last line without a closing newline', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(delta({insert: 'foo\nbar'}), {keyGenerator}),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('CRLF and lone CR end a line like LF', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(delta({insert: 'foo\r\nbar\rbaz\r\n'}), {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('an empty line becomes an empty block', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(delta({insert: 'foo\n\nbar\n'}), {keyGenerator}),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('decorators', () => {
    test('bold, italic, strike and code', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo', attributes: {bold: true}},
            {insert: 'bar', attributes: {italic: true, strike: true}},
            {insert: 'baz', attributes: {code: true}},
            {insert: '\n'},
          ),
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: ['strong']},
            {
              _type: 'span',
              _key: 'k2',
              text: 'bar',
              marks: ['em', 'strike-through'],
            },
            {_type: 'span', _key: 'k3', text: 'baz', marks: ['code']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a decorator the schema lacks is dropped and reported', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo '},
            {insert: 'bar', attributes: {bold: true}},
            {insert: ' baz', attributes: {italic: true}},
            {insert: '\n'},
          ),
          {
            keyGenerator,
            schema: compileSchema(defineSchema({decorators: [{name: 'em'}]})),
            onDegradation,
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo bar', marks: []},
            {_type: 'span', _key: 'k3', text: ' baz', marks: ['em']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls).toEqual([
        [
          {
            degradations: [
              {
                type: 'decorator-dropped',
                message:
                  'Removed bold formatting, kept the text: the schema has no `strong` decorator',
                line: 1,
                snippet: 'bar',
              },
            ],
            message: [
              'Slack content could not be converted without loss:',
              '- line 1: Removed bold formatting, kept the text: the schema has no `strong` decorator ("bar")',
            ].join('\n'),
          },
        ],
      ])
    })

    test('custom decorator matchers', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(
          delta({insert: 'foo', attributes: {bold: true}}, {insert: '\n'}),
          {
            keyGenerator,
            schema: compileSchema(defineSchema({decorators: [{name: 'bold'}]})),
            marks: {
              strong: ({context}) =>
                context.schema.decorators.find(
                  (decorator) => decorator.name === 'bold',
                )?.name,
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: ['bold']}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('links', () => {
    test('a `slackslug` link from the message box', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo '},
            {
              insert: 'example.com/bar',
              attributes: {
                slackslug: {
                  id: 'https://example.com/bar',
                  label: 'example.com/bar',
                  url: 'https://example.com/bar',
                  type: 'link',
                  attachmentConversionEnabled: true,
                },
              },
            },
            {insert: ' baz\n'},
          ),
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
            {_type: 'span', _key: 'k3', text: 'example.com/bar', marks: ['k2']},
            {_type: 'span', _key: 'k4', text: ' baz', marks: []},
          ],
          markDefs: [
            {_type: 'link', _key: 'k2', href: 'https://example.com/bar'},
          ],
          style: 'normal',
        },
      ])
    })

    test('a key the `link` matcher returns is never generated again', () => {
      const keyGenerator = createTestKeyGenerator()
      const laterKeyGenerator = createTestKeyGenerator()
      laterKeyGenerator()
      const laterKey = laterKeyGenerator()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo', attributes: {link: 'https://example.com'}},
            {insert: '\n'},
          ),
          {
            keyGenerator,
            marks: {
              link: ({value}) => ({
                _type: 'link',
                _key: laterKey,
                href: value.href,
              }),
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k2', text: 'foo', marks: ['k1']}],
          markDefs: [{_type: 'link', _key: 'k1', href: 'https://example.com'}],
          style: 'normal',
        },
      ])
    })

    test('a `slackslug` that is not a link stays text', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo', attributes: {slackslug: {type: 'file', url: 'x'}}},
            {insert: '\n'},
          ),
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('runs of one link share a mark definition', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo', attributes: {link: 'https://example.com'}},
            {
              insert: 'bar',
              attributes: {link: 'https://example.com', bold: true},
            },
            {insert: '\n'},
          ),
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k2', text: 'foo', marks: ['k1']},
            {_type: 'span', _key: 'k3', text: 'bar', marks: ['strong', 'k1']},
          ],
          markDefs: [{_type: 'link', _key: 'k1', href: 'https://example.com'}],
          style: 'normal',
        },
      ])
    })

    test('unsafe and missing URLs are dropped and reported', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo', attributes: {link: ' JavaScript:alert(1)'}},
            {insert: 'bar', attributes: {link: ''}},
            {insert: '\n'},
          ),
          {keyGenerator, onDegradation},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'annotation-dropped',
          message:
            'Removed a link with a `javascript:`, `vbscript:`, `file:` or `data:` URL, kept its text',
          line: 1,
          snippet: 'foo',
        },
        {
          type: 'annotation-dropped',
          message: 'Removed a link that has no URL, kept its text',
          line: 1,
          snippet: 'bar',
        },
      ])
    })

    test('a schema without a `link` annotation drops the link', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo', attributes: {link: 'https://example.com'}},
            {insert: '\n'},
          ),
          {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
            onDegradation,
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'annotation-dropped',
          message:
            'Removed the link, kept its text: the schema has no `link` annotation',
          line: 1,
          snippet: 'foo',
        },
      ])
    })
  })

  describe('lists', () => {
    test('nested lists take their level from `indent`', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo'},
            {insert: '\n', attributes: {list: 'bullet'}},
            {insert: 'bar'},
            {insert: '\n', attributes: {list: 'ordered', indent: 1}},
            {insert: 'baz'},
            {insert: '\n', attributes: {list: 'bullet', indent: 2}},
          ),
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 2,
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 3,
        },
      ])
    })

    test('a list the schema lacks is flattened and reported once per run', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo'},
            {insert: '\n', attributes: {list: 'bullet'}},
            {insert: 'bar'},
            {insert: '\n', attributes: {list: 'bullet', indent: 1}},
            {insert: 'baz'},
            {insert: '\n', attributes: {list: 'ordered'}},
          ),
          {
            keyGenerator,
            schema: compileSchema(defineSchema({lists: [{name: 'number'}]})),
            onDegradation,
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'list-flattened',
          message:
            'Bullet list became plain paragraphs: the schema has no `bullet` list',
          line: 1,
        },
      ])
    })
  })

  describe('blockquotes', () => {
    test('a quoted line takes the `blockquote` style', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo'},
            {insert: '\n', attributes: {blockquote: true}},
          ),
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'blockquote',
        },
      ])
    })

    test('a blockquote the schema lacks becomes normal and is reported once per run', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo'},
            {insert: '\n', attributes: {blockquote: true}},
            {insert: 'bar'},
            {insert: '\n', attributes: {blockquote: true}},
          ),
          {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
            onDegradation,
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'style-fallback',
          message:
            'Blockquote became normal paragraphs: the schema has no `blockquote` style',
          line: 1,
        },
      ])
    })
  })

  describe('code blocks', () => {
    const codeTexty = delta(
      {insert: 'foo'},
      {insert: '\n'},
      {insert: 'const bar = 1'},
      {insert: '\n', attributes: {'code-block': true}},
      {insert: 'bar++', attributes: {bold: true}},
      {insert: '\n', attributes: {'code-block': true}},
      {insert: 'baz'},
      {insert: '\n'},
    )

    test('a run of code-block lines becomes one `code` object in the default schema', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(slackToPortableText(codeTexty, {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_type: 'code', _key: 'k2', code: 'const bar = 1\nbar++'},
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a `code` object with a `lines` field gets one text block per line', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(codeTexty, {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              styles: [{name: 'normal'}],
              blockObjects: [
                {
                  name: 'code',
                  fields: [
                    {name: 'language', type: 'string'},
                    {name: 'lines', type: 'array', of: [{type: 'block'}]},
                  ],
                },
              ],
            }),
          ),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code',
          _key: 'k2',
          lines: [
            {
              _type: 'block',
              _key: 'k3',
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: 'k4', text: 'const bar = 1', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: 'k5',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k6', text: 'bar++', marks: []}],
            },
          ],
        },
        {
          _type: 'block',
          _key: 'k7',
          children: [{_type: 'span', _key: 'k8', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a schema without a `code` object turns the run into one text block', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(codeTexty, {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [
            {
              _type: 'span',
              _key: 'k3',
              text: 'const bar = 1\nbar++',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'code-block-to-text',
          message:
            'Code block became plain text: the schema has no `code` block object with a `lines` field of text blocks or a `code` string field',
          line: 2,
          snippet: 'const bar = 1',
        },
        {
          type: 'decorator-dropped',
          message:
            'Removed bold formatting, kept the text: a code block holds plain text',
          line: 3,
          snippet: 'bar++',
        },
      ])
    })

    test('a `lines` string field falls back to the `code` string field', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo'},
            {insert: '\n', attributes: {'code-block': true}},
          ),
          {
            keyGenerator,
            onDegradation,
            schema: compileSchema(
              defineSchema({
                styles: [{name: 'normal'}],
                blockObjects: [
                  {
                    name: 'code',
                    fields: [
                      {name: 'lines', type: 'string'},
                      {name: 'code', type: 'string'},
                    ],
                  },
                ],
              }),
            ),
          },
        ),
      ).toEqual([{_type: 'code', _key: 'k0', code: 'foo'}])
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('a `code` object whose `lines` holds no text blocks and whose `code` is no string turns the run into one text block', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo'},
            {insert: '\n', attributes: {'code-block': true}},
          ),
          {
            keyGenerator,
            onDegradation,
            schema: compileSchema(
              defineSchema({
                styles: [{name: 'normal'}],
                blockObjects: [
                  {
                    name: 'code',
                    fields: [
                      {
                        name: 'lines',
                        type: 'array',
                        of: [{type: 'object', name: 'item', fields: []}],
                      },
                      {name: 'code', type: 'number'},
                    ],
                  },
                ],
              }),
            ),
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'code-block-to-text',
          message:
            'Code block became plain text: the schema has no `code` block object with a `lines` field of text blocks or a `code` string field',
          line: 1,
          snippet: 'foo',
        },
      ])
    })

    test('`lines` text blocks take the block name and first style their own schema declares', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo'},
            {insert: '\n', attributes: {'code-block': true}},
          ),
          {
            keyGenerator,
            onDegradation,
            schema: compileSchema(
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
            ),
          },
        ),
      ).toEqual([
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
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('`lines` text blocks get no style when their own schema declares an empty style list', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo'},
            {insert: '\n', attributes: {'code-block': true}},
          ),
          {
            keyGenerator,
            onDegradation,
            schema: compileSchema(
              defineSchema({
                styles: [{name: 'normal'}],
                blockObjects: [
                  {
                    name: 'code',
                    fields: [
                      {
                        name: 'lines',
                        type: 'array',
                        of: [{type: 'block', styles: []}],
                      },
                    ],
                  },
                ],
              }),
            ),
          },
        ),
      ).toEqual([
        {
          _type: 'code',
          _key: 'k0',
          lines: [
            {
              _type: 'block',
              _key: 'k1',
              markDefs: [],
              children: [{_type: 'span', _key: 'k2', text: 'foo', marks: []}],
            },
          ],
        },
      ])
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('what a code line holds besides plain text is reported', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()
      const mention = vi.fn()

      expect(
        slackToPortableText(
          delta(
            {insert: 'foo', attributes: {bold: true}},
            {insert: {image: 'bar'}},
            {insert: {slackemoji: {text: ':baz:'}}},
            {insert: 'fizz', attributes: {link: 'https://example.com'}},
            {insert: '\n', attributes: {'code-block': true}},
            {
              attributes: {
                slackmention: {
                  id: 'U0123ABCD',
                  label: '@buzz',
                  mention: true,
                  unverified: false,
                },
              },
              insert: '@buzz',
            },
            {insert: '\n', attributes: {'code-block': true}},
          ),
          {keyGenerator, onDegradation, embeds: {mention}},
        ),
      ).toEqual([{_type: 'code', _key: 'k0', code: 'foo:baz:fizz\n@buzz'}])
      expect(mention.mock.calls).toEqual([])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'decorator-dropped',
          message:
            'Removed bold formatting, kept the text: a code block holds plain text',
          line: 1,
          snippet: 'foo',
        },
        {
          type: 'embed-dropped',
          message:
            'Removed an embed with no display text: the conversion does not recognize its shape',
          line: 1,
          snippet: '{"image":"bar"}',
        },
        {
          type: 'embed-to-text',
          message:
            'Emoji became its display text: a code block holds plain text',
          line: 1,
          snippet: ':baz:',
        },
        {
          type: 'annotation-dropped',
          message:
            'Removed the link, kept its text: a code block holds plain text',
          line: 1,
          snippet: 'fizz',
        },
        {
          type: 'embed-to-text',
          message:
            'Mention became its display text: a code block holds plain text',
          line: 2,
          snippet: '@buzz',
        },
      ])
    })

    test('a custom `types.code` matcher', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(codeTexty, {
          keyGenerator,
          types: {
            code: ({context, value}) => ({
              _type: 'snippet',
              _key: context.keyGenerator(),
              source: value.code,
            }),
          },
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_type: 'snippet', _key: 'k2', source: 'const bar = 1\nbar++'},
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    test('a key the `types.code` matcher returns is never generated again', () => {
      const keyGenerator = createTestKeyGenerator()
      const laterKeyGenerator = createTestKeyGenerator()
      laterKeyGenerator()
      laterKeyGenerator()
      const laterKey = laterKeyGenerator()

      expect(
        slackToPortableText(codeTexty, {
          keyGenerator,
          types: {
            code: ({value}) => ({
              _type: 'code',
              _key: laterKey,
              code: value.code,
            }),
          },
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_type: 'code', _key: 'k2', code: 'const bar = 1\nbar++'},
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('embeds', () => {
    test('a user mention without a matcher becomes its display text and is reported', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(userMentionTexty, {keyGenerator, onDegradation}),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: '@cosmo hello', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'embed-to-text',
          message:
            'Mention became its display text: no `embeds.mention` matcher built it',
          line: 1,
          snippet: '@cosmo',
        },
      ])
    })

    test('a user mention matcher returning an inline object', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn()
      const mention = vi.fn(
        ({
          context,
          value,
        }: {
          context: {keyGenerator: () => string}
          value: {id: string; text: string}
        }) => ({
          _type: 'mention',
          _key: context.keyGenerator(),
          userId: value.id,
        }),
      )

      expect(
        slackToPortableText(userMentionTexty, {
          keyGenerator,
          onDegradation,
          embeds: {mention},
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'mention', _key: 'k1', userId: 'U0120JGV36K'},
            {_type: 'span', _key: 'k2', text: ' hello', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      const conversionKeyGenerator =
        mention.mock.calls[0]?.[0].context.keyGenerator
      expect(mention.mock.calls).toEqual([
        [
          {
            context: {
              schema: defaultSchema,
              keyGenerator: conversionKeyGenerator,
            },
            value: {id: 'U0120JGV36K', text: '@cosmo'},
          },
        ],
      ])
      expect(conversionKeyGenerator?.()).toEqual('k3')
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('a user mention with a `W` id reaches the mention matcher', () => {
      const keyGenerator = createTestKeyGenerator()
      const mention = vi.fn(
        (_input: {
          context: {schema: unknown; keyGenerator: () => string}
          value: {id: string; text: string}
        }) => undefined,
      )

      slackToPortableText(
        delta(
          {
            attributes: {
              slackmention: {id: 'W0123', label: '@foo', mention: true},
            },
            insert: '@foo',
          },
          {insert: '\n'},
        ),
        {keyGenerator, embeds: {mention}},
      )

      const conversionKeyGenerator =
        mention.mock.calls[0]?.[0].context.keyGenerator
      expect(mention.mock.calls).toEqual([
        [
          {
            context: {
              schema: defaultSchema,
              keyGenerator: conversionKeyGenerator,
            },
            value: {id: 'W0123', text: '@foo'},
          },
        ],
      ])
      expect(conversionKeyGenerator?.()).toEqual('k2')
    })

    test('a channel matcher returning spans', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn()

      expect(
        slackToPortableText(channelTexty, {
          keyGenerator,
          onDegradation,
          schema: compileSchema(
            defineSchema({decorators: [{name: 'channel'}]}),
          ),
          embeds: {
            channel: ({context, value}) => [
              {
                _type: 'span',
                _key: context.keyGenerator(),
                text: value.text,
                marks: ['channel'],
              },
            ],
          },
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: '#general', marks: ['channel']},
            {_type: 'span', _key: 'k2', text: ' hello', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('a channel without a matcher becomes its display text and is reported', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()
      const mention = vi.fn()

      expect(
        slackToPortableText(channelTexty, {
          keyGenerator,
          onDegradation,
          embeds: {mention},
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: '#general hello', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(mention).not.toHaveBeenCalled()
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'embed-to-text',
          message:
            'Channel link became its display text: no `embeds.channel` matcher built it',
          line: 1,
          snippet: '#general',
        },
      ])
    })

    test('`@here` stays its display text, unreported, without reaching the mention matcher', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn()
      const mention = vi.fn()

      expect(
        slackToPortableText(hereTexty, {
          keyGenerator,
          onDegradation,
          embeds: {mention},
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: '@here test', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(mention).not.toHaveBeenCalled()
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('`@channel` stays its display text, unreported, without reaching the mention matcher', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn()
      const mention = vi.fn()
      const channel = vi.fn()

      expect(
        slackToPortableText(channelBroadcastTexty, {
          keyGenerator,
          onDegradation,
          embeds: {mention, channel},
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: '@channel test', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(mention).not.toHaveBeenCalled()
      expect(channel).not.toHaveBeenCalled()
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('a user group mention stays its display text and is reported without reaching the mention matcher', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()
      const mention = vi.fn()

      expect(
        slackToPortableText(
          delta(
            {
              attributes: {
                slackmention: {
                  id: 'S0123',
                  label: '@foo-team',
                  mention: true,
                  unverified: false,
                },
              },
              insert: '@foo-team',
            },
            {insert: '\n'},
          ),
          {keyGenerator, onDegradation, embeds: {mention}},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: '@foo-team', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(mention).not.toHaveBeenCalled()
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'embed-to-text',
          message:
            'Mention became its display text: `embeds.mention` only receives user mentions',
          line: 1,
          snippet: '@foo-team',
        },
      ])
    })

    test('an emoji without a matcher becomes its colon code and is reported', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(emojiTexty, {keyGenerator, onDegradation}),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'Hello :wave: world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'embed-to-text',
          message:
            'Emoji became its display text: no `embeds.emoji` matcher built it',
          line: 1,
          snippet: ':wave:',
        },
      ])
    })

    test('an emoji matcher receives the colon code and its name', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(emojiTexty, {
          keyGenerator,
          embeds: {
            emoji: ({context, value}) => ({
              _type: 'emoji',
              _key: context.keyGenerator(),
              name: value.name,
              code: value.text,
            }),
          },
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'Hello ', marks: []},
            {_type: 'emoji', _key: 'k2', name: 'wave', code: ':wave:'},
            {_type: 'span', _key: 'k3', text: ' world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('an emoji matcher returning `undefined` falls back to the colon code', () => {
      const keyGenerator = createTestKeyGenerator()
      const emoji = vi.fn(
        (_input: {
          context: {schema: unknown; keyGenerator: () => string}
          value: {name: string; text: string}
        }) => undefined,
      )

      expect(
        slackToPortableText(emojiTexty, {keyGenerator, embeds: {emoji}}),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'Hello :wave: world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      const conversionKeyGenerator =
        emoji.mock.calls[0]?.[0].context.keyGenerator
      expect(emoji.mock.calls).toEqual([
        [
          {
            context: {
              schema: defaultSchema,
              keyGenerator: conversionKeyGenerator,
            },
            value: {name: 'wave', text: ':wave:'},
          },
        ],
      ])
      expect(conversionKeyGenerator?.()).toEqual('k4')
    })

    test('repeated keys in matcher results become unique', () => {
      const keyGenerator = createTestKeyGenerator()
      const matcherKey = createTestKeyGenerator('m')()

      expect(
        slackToPortableText(
          delta(
            {
              attributes: {
                slackmention: {
                  id: 'CRXB3HYP9',
                  label: '#general',
                  mention: false,
                  unverified: false,
                },
              },
              insert: '#general',
            },
            {insert: {slackemoji: {text: ':wave:'}}},
            {insert: '\n'},
          ),
          {
            keyGenerator,
            embeds: {
              channel: ({value}) => [
                {_type: 'span', _key: matcherKey, text: value.text, marks: []},
                {_type: 'span', _key: matcherKey, text: ' ', marks: []},
              ],
              emoji: ({value}) => ({
                _type: 'emoji',
                _key: matcherKey,
                name: value.name,
              }),
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'mk0', text: '#general', marks: []},
            {_type: 'span', _key: 'k1', text: ' ', marks: []},
            {_type: 'emoji', _key: 'k2', name: 'wave'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a matcher key never repeats a sibling key or a later generated key', () => {
      const keyGenerator = createTestKeyGenerator()
      const matcherKeyGenerator = createTestKeyGenerator()
      matcherKeyGenerator()
      const matcherKey = matcherKeyGenerator()

      expect(
        slackToPortableText(
          delta(
            {insert: {slackemoji: {text: ':foo:'}}},
            {insert: {slackemoji: {text: ':bar:'}}},
            {insert: 'baz'},
            {insert: '\n'},
          ),
          {
            keyGenerator,
            embeds: {
              emoji: ({value}) => ({
                _type: 'emoji',
                _key: matcherKey,
                name: value.name,
              }),
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'emoji', _key: 'k1', name: 'foo'},
            {_type: 'emoji', _key: 'k2', name: 'bar'},
            {_type: 'span', _key: 'k3', text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a repeated matcher key is repaired without taking a key a later matcher span holds', () => {
      const keyGenerator = createTestKeyGenerator()
      const matcherKey = createTestKeyGenerator('m')()
      const laterKeyGenerator = createTestKeyGenerator()
      laterKeyGenerator()
      const laterKey = laterKeyGenerator()

      expect(
        slackToPortableText(channelTexty, {
          keyGenerator,
          embeds: {
            channel: ({value}) => [
              {_type: 'span', _key: matcherKey, text: value.text, marks: []},
              {_type: 'span', _key: matcherKey, text: ' ', marks: []},
              {_type: 'span', _key: laterKey, text: 'foo', marks: []},
            ],
          },
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'mk0', text: '#general', marks: []},
            {_type: 'span', _key: 'k2', text: ' ', marks: []},
            {_type: 'span', _key: 'k1', text: 'foo', marks: []},
            {_type: 'span', _key: 'k3', text: ' hello', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a generator that keeps returning one key never repeats a matcher key', () => {
      const constantKey = createTestKeyGenerator()()

      expect(
        slackToPortableText(
          delta(
            {insert: {slackemoji: {text: ':foo:'}}},
            {insert: '\n'},
            {insert: 'bar'},
            {insert: '\n'},
          ),
          {
            keyGenerator: () => constantKey,
            embeds: {
              emoji: ({value}) => ({
                _type: 'emoji',
                _key: `${constantKey}-2`,
                name: value.name,
              }),
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'emoji', _key: 'k0-2', name: 'foo'}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k0-3',
          children: [{_type: 'span', _key: 'k0-4', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('the marks around an embed a matcher built as an inline object are reported, not minted', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(
          delta(
            {
              insert: {slackemoji: {text: ':foo:'}},
              attributes: {bold: true, link: 'https://example.com'},
            },
            {insert: '\n'},
          ),
          {
            keyGenerator,
            onDegradation,
            embeds: {
              emoji: ({context, value}) => ({
                _type: 'emoji',
                _key: context.keyGenerator(),
                name: value.name,
              }),
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'emoji', _key: 'k1', name: 'foo'}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'decorator-dropped',
          message:
            'Removed bold formatting from an embed: the inline object its matcher built carries no marks',
          line: 1,
          snippet: ':foo:',
        },
        {
          type: 'annotation-dropped',
          message:
            'Removed the link from an embed: the inline object its matcher built carries no marks',
          line: 1,
          snippet: ':foo:',
        },
      ])
    })

    test('an emoji inside formatted text keeps the formatting', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        slackToPortableText(
          delta(
            {insert: {slackemoji: {text: ':foo:'}}, attributes: {bold: true}},
            {insert: '\n'},
          ),
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: ':foo:', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('an unrecognized embed is dropped and reported', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation =
        vi.fn<
          (report: {degradations: Array<Degradation>; message: string}) => void
        >()

      expect(
        slackToPortableText(
          delta({insert: 'foo'}, {insert: {image: 'bar'}}, {insert: '\n'}),
          {keyGenerator, onDegradation},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(onDegradation.mock.calls[0]?.[0].degradations).toEqual([
        {
          type: 'embed-dropped',
          message:
            'Removed an embed with no display text: the conversion does not recognize its shape',
          line: 1,
          snippet: '{"image":"bar"}',
        },
      ])
    })
  })

  test('the grouped message collapses repeats', () => {
    const onDegradation =
      vi.fn<
        (report: {degradations: Array<Degradation>; message: string}) => void
      >()

    slackToPortableText(
      delta(
        {insert: 'foo', attributes: {bold: true}},
        {insert: '\n'},
        {insert: 'bar', attributes: {bold: true}},
        {insert: '\n'},
        {insert: 'baz'},
        {insert: '\n', attributes: {list: 'bullet'}},
      ),
      {schema: compileSchema(defineSchema({})), onDegradation},
    )

    expect(onDegradation.mock.calls[0]?.[0].message).toEqual(
      [
        'Slack content could not be converted without loss:',
        '- Removed bold formatting, kept the text: the schema has no `strong` decorator (2×: "foo", "bar")',
        '- line 3: Bullet list became plain paragraphs: the schema has no `bullet` list',
      ].join('\n'),
    )
  })
})

function delta(
  ...ops: Array<{
    insert: string | Record<string, unknown>
    attributes?: Record<string, unknown>
  }>
): string {
  return JSON.stringify({ops})
}

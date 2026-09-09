import {
  compileSchema,
  defineSchema,
  type BlockObjectDefinition,
} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defaultCalloutObjectDefinition, defaultSchema} from './default-schema'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {
  markdownToPortableText,
  type Degradation,
} from './to-portable-text/markdown-to-portable-text'
import {buildObjectMatcher} from './to-portable-text/matchers'

/**
 * Strips `_key` from a Portable Text tree before comparing two conversions
 * that use independent key generators (a structural decline against the
 * flat path it's supposed to mirror, say): the keys are never equal, only
 * the structure needs to be.
 */
function omitKeys<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (key, val) => (key === '_key' ? undefined : val)),
  )
}

describe(markdownToPortableText.name, () => {
  test('empty string', () => {
    const keyGenerator = createTestKeyGenerator()
    expect(markdownToPortableText('', {keyGenerator})).toEqual([])
  })

  describe('style', () => {
    describe('normal', () => {
      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('foo', {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      test('custom definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo', {
            keyGenerator,
            schema: compileSchema(
              defineSchema({styles: [{name: 'paragraph'}]}),
            ),
            block: {
              normal: ({context}) => {
                return context.schema.styles.find(
                  (style) => style.name === 'paragraph',
                )?.name
              },
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'paragraph',
          },
        ])
      })

      test('no definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
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
    })

    describe('blockquote', () => {
      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('> foo', {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'blockquote',
          },
        ])
      })

      test('custom definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('> foo', {
            keyGenerator,
            schema: compileSchema(
              defineSchema({
                styles: [{name: 'normal'}, {name: 'quote'}],
              }),
            ),
            block: {
              blockquote: ({context}) =>
                context.schema.styles.find((style) => style.name === 'quote')
                  ?.name,
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'quote',
          },
        ])
      })

      test('no definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('> foo', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
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

      describe('multiple lines', () => {
        const markdown = '> foo\n>\n> bar\n> baz'

        test('default definition', () => {
          const keyGenerator = createTestKeyGenerator()
          expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              markDefs: [],
              style: 'blockquote',
            },
            {
              _type: 'block',
              _key: 'k2',
              children: [
                {_type: 'span', _key: 'k3', text: 'bar baz', marks: []},
              ],
              markDefs: [],
              style: 'blockquote',
            },
          ])
        })

        test('custom definition', () => {
          const keyGenerator = createTestKeyGenerator()
          expect(
            markdownToPortableText(markdown, {
              keyGenerator,
              schema: compileSchema(defineSchema({styles: [{name: 'quote'}]})),
              block: {
                blockquote: () => 'quote',
              },
            }),
          ).toEqual([
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              markDefs: [],
              style: 'quote',
            },
            {
              _type: 'block',
              _key: 'k2',
              children: [
                {_type: 'span', _key: 'k3', text: 'bar baz', marks: []},
              ],
              markDefs: [],
              style: 'quote',
            },
          ])
        })

        test('no definition', () => {
          const keyGenerator = createTestKeyGenerator()
          expect(
            markdownToPortableText(markdown, {
              keyGenerator,
              schema: compileSchema(defineSchema({})),
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
                {_type: 'span', _key: 'k3', text: 'bar baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ])
        })
      })

      test('nested blockquotes', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = ['> outer', '> > inner'].join('\n')
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'outer', marks: []}],
            markDefs: [],
            style: 'blockquote',
          },
          {
            _type: 'block',
            _key: 'k2',
            children: [{_type: 'span', _key: 'k3', text: 'inner', marks: []}],
            markDefs: [],
            style: 'blockquote',
          },
        ])
      })

      describe('with list items', () => {
        const markdown = ['> - foo', '> - bar'].join('\n')

        test('default definition', () => {
          const keyGenerator = createTestKeyGenerator()
          expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              markDefs: [],
              style: 'blockquote',
              listItem: 'bullet',
              level: 1,
            },
            {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
              markDefs: [],
              style: 'blockquote',
              listItem: 'bullet',
              level: 1,
            },
          ])
        })

        test('only list definition', () => {
          const keyGenerator = createTestKeyGenerator()
          expect(
            markdownToPortableText(markdown, {
              keyGenerator,
              schema: compileSchema(defineSchema({lists: [{name: 'bullet'}]})),
            }),
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
              listItem: 'bullet',
              level: 1,
            },
          ])
        })
      })
    })

    describe('h1', () => {
      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('# foo', {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'h1',
          },
        ])
      })

      test('custom definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('# foo', {
            keyGenerator,
            schema: compileSchema(
              defineSchema({styles: [{name: 'heading 1'}]}),
            ),
            block: {
              h1: ({context}) => {
                return context.schema.styles.find(
                  (style) => style.name === 'heading 1',
                )?.name
              },
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'heading 1',
          },
        ])
      })

      test('no definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('# foo', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
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
    })
  })

  describe('hard breaks', () => {
    test('backslash syntax', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('foo\\\nbar', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo\nbar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('two-space syntax', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('foo  \nbar', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo\nbar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('multiple hard breaks in same paragraph', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('foo  \nbar  \nbaz', {keyGenerator}),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo\nbar\nbaz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('hard break in list item', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('- foo  \n  bar', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo\nbar', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
      ])
    })
  })

  describe('soft breaks', () => {
    test('produces a single space', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('foo\nbar', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a single trailing space before the newline does not produce a double space', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('foo \nbar', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('an indented continuation line collapses to a single space', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('foo\n   bar', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('soft break inside a blockquote', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['> foo', '> bar'].join('\n')
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar', marks: []}],
          markDefs: [],
          style: 'blockquote',
        },
      ])
    })

    test('soft break inside a list item', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('- foo\n  bar', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
      ])
    })

    test('a soft break inside marked text keeps the mark across the joined span', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('*foo\nbar*', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo bar', marks: ['em']},
          ],
          markDefs: [],
        },
      ])
    })

    test('a two-space hard break still produces a literal newline, not a space', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('foo  \nbar', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo\nbar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a backslash hard break still produces a literal newline, not a space', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('foo\\\nbar', {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo\nbar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('round-trips through portableTextToMarkdown as a fixpoint', () => {
      const blocks = markdownToPortableText('foo\nbar', {
        keyGenerator: createTestKeyGenerator(),
      })
      const markdown = portableTextToMarkdown(blocks)

      expect(markdown).toBe('foo bar')

      const blocksAgain = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })
      expect(portableTextToMarkdown(blocksAgain)).toBe(markdown)
    })
  })

  describe('decorators', () => {
    describe('strong', () => {
      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo **bar** baz', {keyGenerator}),
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
        ])
      })

      test('custom definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo **bar** baz', {
            keyGenerator,
            schema: compileSchema(defineSchema({decorators: [{name: 'bold'}]})),
            marks: {
              strong: () => 'bold',
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
              {_type: 'span', _key: 'k2', text: 'bar', marks: ['bold']},
              {_type: 'span', _key: 'k3', text: ' baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      test('no definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo **bar** baz', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    describe('emphasis', () => {
      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('foo _bar_ baz', {keyGenerator})).toEqual(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [
                {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
                {_type: 'span', _key: 'k2', text: 'bar', marks: ['em']},
                {_type: 'span', _key: 'k3', text: ' baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        )
      })

      test('custom definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo _bar_ baz', {
            keyGenerator,
            schema: compileSchema(
              defineSchema({decorators: [{name: 'italic'}]}),
            ),
            marks: {
              em: () => 'italic',
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
              {_type: 'span', _key: 'k2', text: 'bar', marks: ['italic']},
              {_type: 'span', _key: 'k3', text: ' baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      test('no definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo _bar_ baz', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    describe('code', () => {
      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('foo `bar` baz', {keyGenerator})).toEqual(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [
                {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
                {_type: 'span', _key: 'k2', text: 'bar', marks: ['code']},
                {_type: 'span', _key: 'k3', text: ' baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        )
      })

      test('custom definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo `bar` baz', {
            keyGenerator,
            schema: compileSchema(
              defineSchema({decorators: [{name: 'monospace'}]}),
            ),
            marks: {
              code: () => 'monospace',
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
              {_type: 'span', _key: 'k2', text: 'bar', marks: ['monospace']},
              {_type: 'span', _key: 'k3', text: ' baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      test('no definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo `bar` baz', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    describe('strike-through', () => {
      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo ~~bar~~ baz', {keyGenerator}),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
              {
                _type: 'span',
                _key: 'k2',
                text: 'bar',
                marks: ['strike-through'],
              },
              {_type: 'span', _key: 'k3', text: ' baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      test('custom definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo ~~bar~~ baz', {
            keyGenerator,
            schema: compileSchema(
              defineSchema({decorators: [{name: 'strikethrough'}]}),
            ),
            marks: {
              strikeThrough: () => 'strikethrough',
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
              {
                _type: 'span',
                _key: 'k2',
                text: 'bar',
                marks: ['strikethrough'],
              },
              {_type: 'span', _key: 'k3', text: ' baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      test('no definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo ~~bar~~ baz', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })
  })

  describe('link', () => {
    test('default definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('foo [bar](https://example.com) baz', {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
            {_type: 'span', _key: 'k3', text: 'bar', marks: ['k2']},
            {_type: 'span', _key: 'k4', text: ' baz', marks: []},
          ],
          markDefs: [
            {
              _key: 'k2',
              _type: 'link',
              href: 'https://example.com',
            },
          ],
          style: 'normal',
        },
      ])
    })

    test('no href field', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('foo [bar](https://example.com) baz', {
          keyGenerator,
          schema: compileSchema(
            defineSchema({annotations: [{name: 'link', fields: []}]}),
          ),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
            {_type: 'span', _key: 'k3', text: 'bar', marks: ['k2']},
            {_type: 'span', _key: 'k4', text: ' baz', marks: []},
          ],
          markDefs: [
            {
              _key: 'k2',
              _type: 'link',
            },
          ],
          style: 'normal',
        },
      ])
    })

    test('custom definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('foo [bar](https://example.com) baz', {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              annotations: [
                {
                  name: 'internal link',
                  fields: [{name: 'url', type: 'string'}],
                },
              ],
            }),
          ),
          marks: {
            link: ({context, value}) => {
              return {
                _type: 'internal link',
                _key: context.keyGenerator(),
                url: value.href,
              }
            },
          },
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
            {_type: 'span', _key: 'k3', text: 'bar', marks: ['k2']},
            {_type: 'span', _key: 'k4', text: ' baz', marks: []},
          ],
          markDefs: [
            {
              _key: 'k2',
              _type: 'internal link',
              url: 'https://example.com',
            },
          ],
          style: 'normal',
        },
      ])
    })

    test('no definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('foo [bar](https://example.com) baz', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('with title', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          'foo [bar](https://example.com "Link Title") baz',
          {
            keyGenerator,
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
            {_type: 'span', _key: 'k3', text: 'bar', marks: ['k2']},
            {_type: 'span', _key: 'k4', text: ' baz', marks: []},
          ],
          markDefs: [
            {
              _key: 'k2',
              _type: 'link',
              href: 'https://example.com',
              title: 'Link Title',
            },
          ],
          style: 'normal',
        },
      ])
    })

    test('autolink', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('Visit <https://example.com> for more', {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'Visit ', marks: []},
            {
              _type: 'span',
              _key: 'k3',
              text: 'https://example.com',
              marks: ['k2'],
            },
            {_type: 'span', _key: 'k4', text: ' for more', marks: []},
          ],
          markDefs: [
            {
              _key: 'k2',
              _type: 'link',
              href: 'https://example.com',
            },
          ],
          style: 'normal',
        },
      ])
    })

    test('reference-style link', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        'See [my site][ref] for details',
        '',
        '[ref]: https://example.com "My Site"',
      ].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'See ', marks: []},
            {_type: 'span', _key: 'k3', text: 'my site', marks: ['k2']},
            {_type: 'span', _key: 'k4', text: ' for details', marks: []},
          ],
          markDefs: [
            {
              _key: 'k2',
              _type: 'link',
              href: 'https://example.com',
              title: 'My Site',
            },
          ],
          style: 'normal',
        },
      ])
    })

    test('link with escaped bracket in text', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('foo [b\\[ar](https://example.com) baz', {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'foo ',
              marks: [],
            },
            {
              _type: 'span',
              _key: 'k3',
              text: 'b[ar',
              marks: ['k2'],
            },
            {
              _type: 'span',
              _key: 'k4',
              text: ' baz',
              marks: [],
            },
          ],
          markDefs: [
            {
              _key: 'k2',
              _type: 'link',
              href: 'https://example.com',
            },
          ],
          style: 'normal',
        },
      ])
    })
  })

  test('link with escaped backslash in text', () => {
    const keyGenerator = createTestKeyGenerator()
    expect(
      markdownToPortableText('foo [b\\\\ar](https://example.com) baz', {
        keyGenerator,
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo ',
            marks: [],
          },
          {
            _type: 'span',
            _key: 'k3',
            text: 'b\\ar',
            marks: ['k2'],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: ' baz',
            marks: [],
          },
        ],
        markDefs: [
          {
            _key: 'k2',
            _type: 'link',
            href: 'https://example.com',
          },
        ],
        style: 'normal',
      },
    ])
  })

  describe('lists', () => {
    describe('unordered', () => {
      test('default unordered list', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('- foo', {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'bullet',
            level: 1,
          },
        ])
      })

      test('custom unordered list', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('- foo', {
            keyGenerator,
            schema: compileSchema(defineSchema({lists: [{name: 'dot'}]})),
            listItem: {
              bullet: ({context}) => {
                return context.schema.lists.find((list) => list.name === 'dot')
                  ?.name
              },
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'dot',
            level: 1,
          },
        ])
      })

      test('no unordered list', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('- foo', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
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
    })

    describe('ordered', () => {
      test('default ordered list', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('1. foo', {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('custom ordered list', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('1. foo', {
            keyGenerator,
            schema: compileSchema(defineSchema({lists: [{name: 'alpha'}]})),
            listItem: {
              number: ({context}) => {
                return context.schema.lists.find(
                  (list) => list.name === 'alpha',
                )?.name
              },
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'alpha',
            level: 1,
          },
        ])
      })

      test('no ordered list', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('1. foo', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
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
    })

    describe('nested', () => {
      test('unordered nested lists', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = [
          '- Level 1 item 1',
          '  - Level 2 item 1',
          '  - Level 2 item 2',
          '    - Level 3 item 1',
          '- Level 1 item 2',
        ].join('\n')
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'Level 1 item 1', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'bullet',
            level: 1,
          },
          {
            _type: 'block',
            _key: 'k2',
            children: [
              {_type: 'span', _key: 'k3', text: 'Level 2 item 1', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'bullet',
            level: 2,
          },
          {
            _type: 'block',
            _key: 'k4',
            children: [
              {_type: 'span', _key: 'k5', text: 'Level 2 item 2', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'bullet',
            level: 2,
          },
          {
            _type: 'block',
            _key: 'k6',
            children: [
              {_type: 'span', _key: 'k7', text: 'Level 3 item 1', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'bullet',
            level: 3,
          },
          {
            _type: 'block',
            _key: 'k8',
            children: [
              {_type: 'span', _key: 'k9', text: 'Level 1 item 2', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'bullet',
            level: 1,
          },
        ])
      })

      test('ordered nested lists', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = [
          '1. Level 1 item 1',
          '   1. Level 2 item 1',
          '   2. Level 2 item 2',
          '2. Level 1 item 2',
        ].join('\n')
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'Level 1 item 1', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _type: 'block',
            _key: 'k2',
            children: [
              {_type: 'span', _key: 'k3', text: 'Level 2 item 1', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 2,
          },
          {
            _type: 'block',
            _key: 'k4',
            children: [
              {_type: 'span', _key: 'k5', text: 'Level 2 item 2', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 2,
          },
          {
            _type: 'block',
            _key: 'k6',
            children: [
              {_type: 'span', _key: 'k7', text: 'Level 1 item 2', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('mixed nested lists', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = [
          '1. Ordered item',
          '   - Unordered nested',
          '   - Another unordered',
          '2. Back to ordered',
        ].join('\n')
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'Ordered item', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _type: 'block',
            _key: 'k2',
            children: [
              {_type: 'span', _key: 'k3', text: 'Unordered nested', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'bullet',
            level: 2,
          },
          {
            _type: 'block',
            _key: 'k4',
            children: [
              {
                _type: 'span',
                _key: 'k5',
                text: 'Another unordered',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'bullet',
            level: 2,
          },
          {
            _type: 'block',
            _key: 'k6',
            children: [
              {_type: 'span', _key: 'k7', text: 'Back to ordered', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('mixed, deeply nested lists', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = [
          '1. Ordered parent',
          '   - Unordered child',
          '   - Another unordered',
          '      1. Back to ordered',
          '      2. Still ordered',
          '2. Continue ordered parent',
        ].join('\n')
        const portableText = markdownToPortableText(markdown, {keyGenerator})

        expect(
          getTersePt({
            schema: defaultSchema,
            value: portableText,
          }),
        ).toEqual([
          '>#:Ordered parent',
          '>>-:Unordered child',
          '>>-:Another unordered',
          '>>>#:Back to ordered',
          '>>>#:Still ordered',
          '>#:Continue ordered parent',
        ])
      })
    })

    describe('task', () => {
      test('default unchecked task', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('- [ ] foo', {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'task',
            level: 1,
            checked: false,
          },
        ])
      })

      test('default checked task', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('- [x] foo', {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'task',
            level: 1,
            checked: true,
          },
        ])
      })

      test('uppercase X is also checked', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText('- [X] foo', {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'task',
            level: 1,
            checked: true,
          },
        ])
      })

      test('custom task list type', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('- [x] foo', {
            keyGenerator,
            schema: compileSchema(defineSchema({lists: [{name: 'todo'}]})),
            listItem: {
              task: ({context}) => {
                return context.schema.lists.find((list) => list.name === 'todo')
                  ?.name
              },
            },
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'todo',
            level: 1,
            checked: true,
          },
        ])
      })

      test('falls back to bullet when schema does not declare a task list', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('- [x] foo', {
            keyGenerator,
            schema: compileSchema(defineSchema({lists: [{name: 'bullet'}]})),
          }),
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
        ])
      })

      test('mixed task and plain bullet items', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = ['- [ ] todo', '- done', '- [x] also done'].join('\n')
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'todo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'task',
            level: 1,
            checked: false,
          },
          {
            _type: 'block',
            _key: 'k2',
            children: [{_type: 'span', _key: 'k3', text: 'done', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'bullet',
            level: 1,
          },
          {
            _type: 'block',
            _key: 'k4',
            children: [
              {_type: 'span', _key: 'k5', text: 'also done', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'task',
            level: 1,
            checked: true,
          },
        ])
      })

      test('task nested under bullet', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = ['- foo', '   - [x] bar'].join('\n')
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
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
            listItem: 'task',
            level: 2,
            checked: true,
          },
        ])
      })
    })

    describe('with code block', () => {
      const markdown = [
        '1. foo',
        '',
        '       const foo = "bar"',
        '',
        '    bar',
      ].join('\n')

      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'foo',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'code',
            code: 'const foo = "bar"',
          },
          {
            _key: 'k3',
            _type: 'block',
            children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('no code block definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            schema: compileSchema(defineSchema({lists: [{name: 'number'}]})),
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'foo',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'block',
            children: [
              {
                _key: 'k3',
                _type: 'span',
                text: 'const foo = "bar"',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'k4',
            _type: 'block',
            children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })
    })

    describe('with multiline code block', () => {
      const markdown = [
        '3. Dump everything in the pot and follow',
        '   this algorithm:',
        '',
        '       find wooden spoon',
        '       uncover pot',
        '       stir',
        '       cover pot',
        '       balance wooden spoon precariously on pot handle',
        '       wait 10 minutes',
        '       goto first step (or shut off burner when done)',
        '',
        '   Do not bump wooden spoon or it will fall.',
      ].join('\n')

      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'Dump everything in the pot and follow this algorithm:',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'code',
            code: 'find wooden spoon\nuncover pot\nstir\ncover pot\nbalance wooden spoon precariously on pot handle\nwait 10 minutes\ngoto first step (or shut off burner when done)',
          },
          {
            _key: 'k3',
            _type: 'block',
            children: [
              {
                _key: 'k4',
                _type: 'span',
                text: 'Do not bump wooden spoon or it will fall.',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('no code block definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            schema: compileSchema(defineSchema({lists: [{name: 'number'}]})),
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'Dump everything in the pot and follow this algorithm:',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'block',
            children: [
              {
                _key: 'k3',
                _type: 'span',
                text: 'find wooden spoon\nuncover pot\nstir\ncover pot\nbalance wooden spoon precariously on pot handle\nwait 10 minutes\ngoto first step (or shut off burner when done)',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'k4',
            _type: 'block',
            children: [
              {
                _key: 'k5',
                _type: 'span',
                text: 'Do not bump wooden spoon or it will fall.',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })
    })

    describe('with fenced code block', () => {
      const markdown = [
        '1. foo',
        '',
        '    ```js',
        '    const foo = "bar"',
        '    ```',
        '',
        '    bar',
      ].join('\n')

      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'code',
            code: 'const foo = "bar"',
            language: 'js',
          },
          {
            _key: 'k3',
            _type: 'block',
            children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('no code block definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            schema: compileSchema(defineSchema({lists: [{name: 'number'}]})),
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'block',
            children: [
              {_key: 'k3', _type: 'span', text: 'const foo = "bar"', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'k4',
            _type: 'block',
            children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })
    })

    describe('with multiline fenced code block', () => {
      const markdown = [
        '1. foo',
        '',
        '    ```js',
        '    line1',
        '    line2',
        '    line3',
        '    ```',
        '',
        '    bar',
      ].join('\n')

      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'code',
            code: 'line1\nline2\nline3',
            language: 'js',
          },
          {
            _key: 'k3',
            _type: 'block',
            children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('no code block definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            schema: compileSchema(defineSchema({lists: [{name: 'number'}]})),
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'block',
            children: [
              {
                _key: 'k3',
                _type: 'span',
                text: 'line1\nline2\nline3',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'k4',
            _type: 'block',
            children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })
    })

    describe('with block image', () => {
      const markdown = [
        '1. foo',
        '',
        '    ![alt](https://example.com/image.png)',
        '',
        '    bar',
      ].join('\n')

      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'image',
            src: 'https://example.com/image.png',
            alt: 'alt',
          },
          {
            _key: 'k3',
            _type: 'block',
            children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('only inline image definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            schema: compileSchema(
              defineSchema({
                inlineObjects: [
                  {
                    name: 'image',
                    fields: [
                      {name: 'src', type: 'string'},
                      {name: 'alt', type: 'string'},
                    ],
                  },
                ],
                lists: [{name: 'number'}],
              }),
            ),
            keyGenerator,
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {_key: 'k1', _type: 'span', text: 'foo', marks: []},
              {
                _key: 'k2',
                _type: 'image',
                src: 'https://example.com/image.png',
                alt: 'alt',
              },
              {_key: 'k3', _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('only inline image definition and no list definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            schema: compileSchema(
              defineSchema({
                inlineObjects: [
                  {
                    name: 'image',
                    fields: [
                      {name: 'src', type: 'string'},
                      {name: 'alt', type: 'string'},
                    ],
                  },
                ],
              }),
            ),
            keyGenerator,
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {_key: 'k1', _type: 'span', text: 'foo', marks: []},
              {
                _key: 'k2',
                _type: 'image',
                src: 'https://example.com/image.png',
                alt: 'alt',
              },
              {_key: 'k3', _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      test('no image definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            schema: compileSchema(
              defineSchema({
                lists: [{name: 'number'}],
              }),
            ),
            keyGenerator,
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'foo![alt](https://example.com/image.png)bar',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })
    })

    describe('with horizontal rule', () => {
      const markdown = ['1. foo', '', '    ---', '', '    bar'].join('\n')

      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'horizontal-rule',
          },
          {
            _key: 'k3',
            _type: 'block',
            children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('no horizontal rule definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            schema: compileSchema(
              defineSchema({
                lists: [{name: 'number'}],
              }),
            ),
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'block',
            children: [{_type: 'span', _key: 'k3', text: '---', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'k4',
            _type: 'block',
            children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('no horizontal rule definition and no list definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'k2',
            _type: 'block',
            children: [{_type: 'span', _key: 'k3', text: '---', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'k4',
            _type: 'block',
            children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('with multiple block elements', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '1. foo',
        '',
        '    ```js',
        '    const x = 1',
        '    ```',
        '',
        '    ![alt](https://example.com/image.png)',
        '',
        '    bar',
      ].join('\n')

      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k2',
          _type: 'code',
          code: 'const x = 1',
          language: 'js',
        },
        {
          _key: 'k4',
          _type: 'image',
          src: 'https://example.com/image.png',
          alt: 'alt',
        },
        {
          _key: 'k5',
          _type: 'block',
          children: [{_type: 'span', _key: 'k6', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
      ])
    })

    test('nested list with block element', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '1. parent',
        '    - nested',
        '',
        '        ```js',
        '        const x = 1',
        '        ```',
        '',
        '        after code',
      ].join('\n')

      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'parent', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k2',
          _type: 'block',
          children: [{_key: 'k3', _type: 'span', text: 'nested', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 2,
        },
        {
          _key: 'k4',
          _type: 'code',
          code: 'const x = 1',
          language: 'js',
        },
        {
          _key: 'k5',
          _type: 'block',
          children: [
            {_type: 'span', _key: 'k6', text: 'after code', marks: []},
          ],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 2,
        },
      ])
    })

    describe('with html block', () => {
      const markdown = [
        '1. foo',
        '',
        '    <div>html content</div>',
        '',
        '    bar',
      ].join('\n')

      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()

        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'html',
            html: '<div>html content</div>',
          },
          {
            _key: 'k3',
            _type: 'block',
            children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })

      test('no html block definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            schema: compileSchema(
              defineSchema({
                lists: [{name: 'number'}],
              }),
            ),
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'foo',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
          {
            _key: 'k2',
            _type: 'block',
            children: [
              {
                _type: 'span',
                _key: 'k3',
                text: '<div>html content</div>',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'k4',
            _type: 'block',
            children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
            listItem: 'number',
            level: 1,
          },
        ])
      })
    })

    test('block element at start of list item', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '1. x',
        '',
        '    ```js',
        '    const foo = "bar"',
        '    ```',
        '',
        '    after',
        '',
        '2. second',
      ].join('\n')

      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'x', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k2',
          _type: 'code',
          code: 'const foo = "bar"',
          language: 'js',
        },
        {
          _key: 'k3',
          _type: 'block',
          children: [{_type: 'span', _key: 'k4', text: 'after', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k5',
          _type: 'block',
          children: [{_type: 'span', _key: 'k6', text: 'second', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
      ])
    })

    test('block element at end of list item', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '1. before',
        '',
        '    ```js',
        '    const foo = "bar"',
        '    ```',
      ].join('\n')

      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'before', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k2',
          _type: 'code',
          code: 'const foo = "bar"',
          language: 'js',
        },
      ])
    })

    test('with blockquote', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['1. foo', '', '    > quoted text', '', '    bar'].join(
        '\n',
      )

      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k2',
          _type: 'block',
          children: [
            {_type: 'span', _key: 'k3', text: 'quoted text', marks: []},
          ],
          markDefs: [],
          style: 'blockquote',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k4',
          _type: 'block',
          children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
      ])
    })

    test('blockquote followed by code block', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '1. foo',
        '',
        '    > quoted',
        '',
        '    ```js',
        '    const x = 1',
        '    ```',
        '',
        '    bar',
      ].join('\n')

      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k2',
          _type: 'block',
          children: [{_type: 'span', _key: 'k3', text: 'quoted', marks: []}],
          markDefs: [],
          style: 'blockquote',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k4',
          _type: 'code',
          code: 'const x = 1',
          language: 'js',
        },
        {
          _key: 'k5',
          _type: 'block',
          children: [{_type: 'span', _key: 'k6', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
      ])
    })

    test('consecutive blockquotes', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '1. foo',
        '',
        '    > quote 1',
        '',
        '    > quote 2',
        '',
        '    bar',
      ].join('\n')

      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k2',
          _type: 'block',
          children: [{_type: 'span', _key: 'k3', text: 'quote 1', marks: []}],
          markDefs: [],
          style: 'blockquote',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k4',
          _type: 'block',
          children: [{_type: 'span', _key: 'k5', text: 'quote 2', marks: []}],
          markDefs: [],
          style: 'blockquote',
          listItem: 'number',
          level: 1,
        },
        {
          _key: 'k6',
          _type: 'block',
          children: [{_type: 'span', _key: 'k7', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
      ])
    })
  })

  /*********************
   * Objects
   *********************/

  describe('block image', () => {
    test('default definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('![alt text](https://example.com/image.png)', {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'image',
          _key: 'k1',
          src: 'https://example.com/image.png',
          alt: 'alt text',
        },
      ])
    })

    test('custom definition and matcher', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('![alt](https://example.com/pic.jpg)', {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {
                  name: 'photo',
                  fields: [
                    {name: 'url', type: 'string'},
                    {name: 'description', type: 'string'},
                  ],
                },
              ],
            }),
          ),
          types: {
            image: ({context, value}) => ({
              _key: context.keyGenerator(),
              _type: 'photo',
              url: value.src,
              description: value.alt,
            }),
          },
        }),
      ).toEqual([
        {
          _type: 'photo',
          _key: 'k1',
          url: 'https://example.com/pic.jpg',
          description: 'alt',
        },
      ])
    })

    test('no definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('![alt](https://example.com/image.png)', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: '![alt](https://example.com/image.png)',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('no `src` field', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('![alt](https://example.com/image.png)', {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {
                  name: 'image',
                  fields: [
                    {name: 'asset', type: 'object'},
                    {name: 'alt', type: 'string'},
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
          children: [
            {
              _type: 'span',
              _key: 'k2',
              text: '![alt](https://example.com/image.png)',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('no matching fields', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('![alt](https://example.com/image.png)', {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {name: 'image', fields: [{name: 'asset', type: 'object'}]},
              ],
            }),
          ),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k2',
              text: '![alt](https://example.com/image.png)',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('both block and inline images', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '![block image](https://example.com/block.png)',
        '',
        'Text with ![inline image](https://example.com/inline.png) in it',
      ].join('\n')

      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'image',
          _key: 'k1',
          src: 'https://example.com/block.png',
          alt: 'block image',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [
            {_type: 'span', _key: 'k3', text: 'Text with ', marks: []},
            {
              _type: 'image',
              _key: 'k4',
              src: 'https://example.com/inline.png',
              alt: 'inline image',
            },
            {_type: 'span', _key: 'k5', text: ' in it', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('block image with title', () => {
    test('default definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          '![alt text](https://example.com/image.png "Image Title")',
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'image',
          _key: 'k1',
          src: 'https://example.com/image.png',
          alt: 'alt text',
          title: 'Image Title',
        },
      ])
    })
  })

  describe('inline image', () => {
    test('default definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          'foo ![alt text](https://example.com/image.png) baz',
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
            {
              _type: 'image',
              _key: 'k2',
              src: 'https://example.com/image.png',
              alt: 'alt text',
            },
            {_type: 'span', _key: 'k3', text: ' baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('custom definition and matcher', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('foo ![alt](https://example.com/pic.jpg) baz', {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              inlineObjects: [
                {
                  name: 'photo',
                  fields: [
                    {name: 'url', type: 'string'},
                    {name: 'description', type: 'string'},
                  ],
                },
              ],
            }),
          ),
          types: {
            image: ({context, value}) => ({
              _key: context.keyGenerator(),
              _type: 'photo',
              url: value.src,
              description: value.alt,
            }),
          },
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
            {
              _type: 'photo',
              _key: 'k2',
              url: 'https://example.com/pic.jpg',
              description: 'alt',
            },
            {_type: 'span', _key: 'k3', text: ' baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('no definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          'foo ![alt](https://example.com/image.png) baz',
          {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'foo ![alt](https://example.com/image.png) baz',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('only image block object definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          'foo ![alt](https://example.com/image.png) baz',
          {
            keyGenerator,
            schema: compileSchema(
              defineSchema({
                blockObjects: [
                  {
                    name: 'image',
                    fields: [
                      {name: 'src', type: 'string'},
                      {name: 'alt', type: 'string'},
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
          children: [{_type: 'span', _key: 'k1', text: 'foo ', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'k2',
          src: 'https://example.com/image.png',
          alt: 'alt',
        },
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: ' baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('image with escaped bracket in alt text', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('![b\\[ar](https://example.com/image.png)', {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'image',
          _key: 'k1',
          src: 'https://example.com/image.png',
          alt: 'b[ar',
        },
      ])
    })
  })

  describe('horizontal rule', () => {
    test('default definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('---', {keyGenerator})).toEqual([
        {
          _type: 'horizontal-rule',
          _key: 'k0',
        },
      ])
    })

    test('custom definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('---', {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {
                  name: 'divider',
                  fields: [{name: 'orientation', type: 'string'}],
                },
              ],
            }),
          ),
          types: {
            horizontalRule: ({context}) => ({
              _key: context.keyGenerator(),
              _type: 'divider',
              orientation: 'horizontal',
            }),
          },
        }),
      ).toEqual([
        {
          _type: 'divider',
          _key: 'k0',
          orientation: 'horizontal',
        },
      ])
    })

    test('no definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('---', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
        }),
      ).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: '---',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('code block', () => {
    describe('default definition', () => {
      test('one line', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = ['```js', `const foo = 'bar'`, '```'].join('\n')
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _type: 'code',
            _key: 'k0',
            code: `const foo = 'bar'`,
            language: 'js',
          },
        ])
      })

      test('multiple lines', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = [
          '```js',
          `const foo = 'bar'`,
          `const bar = 'baz'`,
          '```',
        ].join('\n')
        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _type: 'code',
            _key: 'k0',
            code: `const foo = 'bar'\nconst bar = 'baz'`,
            language: 'js',
          },
        ])
      })
    })

    test('custom definition', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['```js', `const foo = 'bar'`, '```'].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {
                  name: 'kode',
                  fields: [
                    {
                      name: 'sprog',
                      type: 'string',
                    },
                    {
                      name: 'indhold',
                      type: 'string',
                    },
                  ],
                },
              ],
            }),
          ),
          types: {
            code: ({context, value}) => {
              const schemaDefinition = context.schema.blockObjects.find(
                (object) => object.name === 'kode',
              )

              if (!schemaDefinition) {
                return undefined
              }

              return {
                _type: schemaDefinition.name,
                _key: context.keyGenerator(),
                indhold: value.code,
                ...(value.language ? {sprog: value.language} : {}),
              }
            },
          },
        }),
      ).toEqual([
        {
          _type: 'kode',
          _key: 'k0',
          sprog: 'js',
          indhold: "const foo = 'bar'",
        },
      ])
    })

    describe('no definition', () => {
      test('one line', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = ['```js', `const foo = 'bar'`, '```'].join('\n')
        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: "const foo = 'bar'",
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      test('multiple lines', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = [
          '```js',
          `const foo = 'bar'`,
          `const bar = 'baz'`,
          '```',
        ].join('\n')
        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: `const foo = 'bar'\nconst bar = 'baz'`,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('some matching fields', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['```js', `const foo = 'bar'`, '```'].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {name: 'code', fields: [{name: 'code', type: 'string'}]},
              ],
            }),
          ),
        }),
      ).toEqual([
        {
          _type: 'code',
          _key: 'k0',
          code: `const foo = 'bar'`,
        },
      ])
    })

    test('no matching fields', () => {
      const markdown = ['```js', `const foo = 'bar'`, '```'].join('\n')
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              blockObjects: [{name: 'code'}],
            }),
          ),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k1',
          children: [
            {
              _type: 'span',
              _key: 'k2',
              text: "const foo = 'bar'",
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('indented code block', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = '    const foo = "bar"'
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'code',
          _key: 'k0',
          code: 'const foo = "bar"',
        },
      ])
    })
  })

  describe('HTML', () => {
    describe('block HTML', () => {
      test('default definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('<div class="custom">Content</div>', {
            keyGenerator,
          }),
        ).toEqual([
          {
            _type: 'html',
            _key: 'k0',
            html: '<div class="custom">Content</div>',
          },
        ])
      })

      test('custom definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('<div>Content</div>', {
            keyGenerator,
            schema: compileSchema(
              defineSchema({
                blockObjects: [
                  {name: 'rawHtml', fields: [{name: 'code', type: 'string'}]},
                ],
              }),
            ),
            types: {
              html: ({context, value}) => ({
                _key: context.keyGenerator(),
                _type: 'rawHtml',
                code: value.html,
              }),
            },
          }),
        ).toEqual([
          {
            _type: 'rawHtml',
            _key: 'k0',
            code: '<div>Content</div>',
          },
        ])
      })

      test('no definition', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('<div>Content</div>', {
            keyGenerator,
            schema: compileSchema(defineSchema({})),
          }),
        ).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: '<div>Content</div>',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    describe('inline HTML', () => {
      test('skip by default', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo <span>bar</span> baz', {keyGenerator}),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      test('convert to text when configured', () => {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText('foo <span>bar</span> baz', {
            keyGenerator,
            html: {inline: 'text'},
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo <span>bar</span> baz',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })
  })

  describe('tables', () => {
    const tableObjectDefinition = {
      name: 'table',
      fields: [
        {name: 'headerRows', type: 'number'},
        {name: 'alignment', type: 'array'},
        {name: 'rows', type: 'array'},
      ],
    } as const satisfies BlockObjectDefinition

    const schemaWithTable = compileSchema(
      defineSchema({
        ...defaultSchema,
        blockObjects: [...defaultSchema.blockObjects, tableObjectDefinition],
      }),
    )

    // Helper to get table options for tests
    const getTableTestOptions = (keyGenerator: () => string) => ({
      keyGenerator,
      schema: schemaWithTable,
      types: {
        table: buildObjectMatcher(tableObjectDefinition),
      },
    })

    test('empty header row reads back as headerRows 0 with only the body rows', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '|  |  |',
        '| --- | --- |',
        '| Cell 1 | Cell 2 |',
        '| Cell 3 | Cell 4 |',
      ].join('\n')
      expect(
        markdownToPortableText(markdown, getTableTestOptions(keyGenerator)),
      ).toEqual([
        {
          _key: 'k20',
          _type: 'table',
          headerRows: 0,
          rows: [
            {
              _key: 'k12',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k8',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k6',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k7', text: 'Cell 1', marks: []},
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k11',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k9',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k10', text: 'Cell 2', marks: []},
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k19',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k15',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k13',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k14', text: 'Cell 3', marks: []},
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k18',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k16',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k17', text: 'Cell 4', marks: []},
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('simple table', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| Header 1 | Header 2 |',
        '|----------|----------|',
        '| Cell 1   | Cell 2   |',
        '| Cell 3   | Cell 4   |',
      ].join('\n')
      expect(
        markdownToPortableText(markdown, getTableTestOptions(keyGenerator)),
      ).toEqual([
        {
          _type: 'table',
          _key: 'k21',
          headerRows: 1,
          rows: [
            {
              _key: 'k6',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'Header 1',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k5',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k3',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k4',
                          text: 'Header 2',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k13',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k9',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k7',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k8',
                          text: 'Cell 1',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k12',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k10',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k11',
                          text: 'Cell 2',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k20',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k16',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k14',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k15',
                          text: 'Cell 3',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k19',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k17',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k18',
                          text: 'Cell 4',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('table with formatting', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| **Header 1** | **Header 2** |',
        '|--------------|--------------|',
        '| *Cell 1*     | *Cell 2*     |',
        '| *Cell 3*     | *Cell 4*     |',
      ].join('\n')
      expect(
        markdownToPortableText(markdown, getTableTestOptions(keyGenerator)),
      ).toEqual([
        {
          _type: 'table',
          _key: 'k21',
          headerRows: 1,
          rows: [
            {
              _key: 'k6',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'Header 1',
                          marks: ['strong'],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k5',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k3',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k4',
                          text: 'Header 2',
                          marks: ['strong'],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k13',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k9',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k7',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k8',
                          text: 'Cell 1',
                          marks: ['em'],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k12',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k10',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k11',
                          text: 'Cell 2',
                          marks: ['em'],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k20',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k16',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k14',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k15',
                          text: 'Cell 3',
                          marks: ['em'],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k19',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k17',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k18',
                          text: 'Cell 4',
                          marks: ['em'],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('table with image', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| Block image | Inline image |',
        '| --- | --- |',
        '| ![Block image](https://example.com/block.png) | foo ![Inline image](https://example.com/inline.png) bar |',
      ].join('\n')
      expect(
        markdownToPortableText(markdown, getTableTestOptions(keyGenerator)),
      ).toEqual([
        {
          _type: 'table',
          _key: 'k16',
          headerRows: 1,
          rows: [
            {
              _key: 'k6',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'Block image',
                          marks: [],
                        },
                      ],
                      style: 'normal',
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k5',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k3',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k4',
                          text: 'Inline image',
                          marks: [],
                        },
                      ],
                      style: 'normal',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k15',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k9',
                  value: [
                    {
                      _type: 'image',
                      _key: 'k8',
                      src: 'https://example.com/block.png',
                      alt: 'Block image',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k14',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k10',
                      children: [
                        {
                          _key: 'k11',
                          _type: 'span',
                          text: 'foo ',
                          marks: [],
                        },
                        {
                          _key: 'k12',
                          _type: 'image',
                          src: 'https://example.com/inline.png',
                          alt: 'Inline image',
                        },
                        {
                          _key: 'k13',
                          _type: 'span',
                          text: ' bar',
                          marks: [],
                        },
                      ],
                      style: 'normal',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('table with images without inline image support', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| Block image | Inline image |',
        '| --- | --- |',
        '| ![Block image](https://example.com/block.png) | foo ![Inline image](https://example.com/inline.png) bar |',
      ].join('\n')

      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {
              name: 'image',
              fields: [
                {name: 'src', type: 'string'},
                {name: 'alt', type: 'string'},
              ],
            },
            tableObjectDefinition,
          ],
        }),
      )

      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema,
          types: {
            table: buildObjectMatcher(tableObjectDefinition),
          },
        }),
      ).toEqual([
        {
          _type: 'table',
          _key: 'k16',
          headerRows: 1,
          rows: [
            {
              _key: 'k6',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'Block image',
                          marks: [],
                        },
                      ],
                      style: 'normal',
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k5',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k3',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k4',
                          text: 'Inline image',
                          marks: [],
                        },
                      ],
                      style: 'normal',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k15',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k9',
                  value: [
                    {
                      _type: 'image',
                      _key: 'k8',
                      src: 'https://example.com/block.png',
                      alt: 'Block image',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k14',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k10',
                      children: [
                        {
                          _key: 'k11',
                          _type: 'span',
                          text: 'foo ',
                          marks: [],
                        },
                        {
                          _key: 'k12',
                          _type: 'image',
                          src: 'https://example.com/inline.png',
                          alt: 'Inline image',
                        },
                        {
                          _key: 'k13',
                          _type: 'span',
                          text: ' bar',
                          marks: [],
                        },
                      ],
                      style: 'normal',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('table with empty cells', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['| A | | C |', '|---|---|---|', '| 1 | | 3 |'].join(
        '\n',
      )
      expect(
        markdownToPortableText(markdown, getTableTestOptions(keyGenerator)),
      ).toEqual([
        {
          _type: 'table',
          _key: 'k20',
          headerRows: 1,
          rows: [
            {
              _key: 'k9',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'A',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k5',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k3',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k4',
                          text: '',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k8',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k6',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k7',
                          text: 'C',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k19',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k12',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k10',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k11',
                          text: '1',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k15',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k13',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k14',
                          text: '',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k18',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k16',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k17',
                          text: '3',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('table with links', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| Link |',
        '| --- |',
        '| [Example](https://example.com) |',
      ].join('\n')
      expect(
        markdownToPortableText(markdown, getTableTestOptions(keyGenerator)),
      ).toEqual([
        {
          _type: 'table',
          _key: 'k9',
          headerRows: 1,
          rows: [
            {
              _key: 'k3',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'Link',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k8',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k7',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k4',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k6',
                          text: 'Example',
                          marks: ['k5'],
                        },
                      ],
                      markDefs: [
                        {
                          _type: 'link',
                          _key: 'k5',
                          href: 'https://example.com',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('table with inline code', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['| Code |', '| --- |', '| `const x = 1` |'].join('\n')
      expect(
        markdownToPortableText(markdown, getTableTestOptions(keyGenerator)),
      ).toEqual([
        {
          _type: 'table',
          _key: 'k8',
          headerRows: 1,
          rows: [
            {
              _key: 'k3',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'Code',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k7',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k4',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k5',
                          text: 'const x = 1',
                          marks: ['code'],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('table with mixed formatting', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| Mixed |',
        '| --- |',
        '| **bold** and *italic* and [link](https://example.com) |',
      ].join('\n')
      expect(
        markdownToPortableText(markdown, getTableTestOptions(keyGenerator)),
      ).toEqual([
        {
          _type: 'table',
          _key: 'k13',
          headerRows: 1,
          rows: [
            {
              _key: 'k3',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'Mixed',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k12',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k11',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k4',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k5',
                          text: 'bold',
                          marks: ['strong'],
                        },
                        {
                          _type: 'span',
                          _key: 'k6',
                          text: ' and ',
                          marks: [],
                        },
                        {
                          _type: 'span',
                          _key: 'k7',
                          text: 'italic',
                          marks: ['em'],
                        },
                        {
                          _type: 'span',
                          _key: 'k8',
                          text: ' and ',
                          marks: [],
                        },
                        {
                          _type: 'span',
                          _key: 'k10',
                          text: 'link',
                          marks: ['k9'],
                        },
                      ],
                      markDefs: [
                        {
                          _type: 'link',
                          _key: 'k9',
                          href: 'https://example.com',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('custom table definition', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {name: 'dataTable', fields: [{name: 'data', type: 'array'}]},
              ],
            }),
          ),
          types: {
            table: ({context, value}) => ({
              _key: context.keyGenerator(),
              _type: 'dataTable',
              data: value.rows,
            }),
          },
        }),
      ).toEqual([
        {
          _type: 'dataTable',
          _key: 'k14',
          data: [
            {
              _key: 'k6',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'A',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k5',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k3',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k4',
                          text: 'B',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k13',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k9',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k7',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k8',
                          text: '1',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k12',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k10',
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k11',
                          text: '2',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('schema without `table` flattens', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'A',
              marks: [],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k3',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'k4',
              text: 'B',
              marks: [],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k7',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'k8',
              text: '1',
              marks: [],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k10',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'k11',
              text: '2',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ])
    })

    test('no table definition with formatting', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| **Bold** | _Italic_ |',
        '| -------- | -------- |',
        '| `Code`   | Normal   |',
      ].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
            }),
          ),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'Bold',
              marks: ['strong'],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k3',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'k4',
              text: 'Italic',
              marks: ['em'],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k7',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'k8',
              text: 'Code',
              marks: ['code'],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k10',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'k11',
              text: 'Normal',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ])
    })

    test('table with column alignment', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| L | C | R | D |',
        '| :--- | :---: | ---: | --- |',
        '| 1 | 2 | 3 | 4 |',
      ].join('\n')

      const result = markdownToPortableText(
        markdown,
        getTableTestOptions(keyGenerator),
      )
      expect((result.at(0) as {alignment?: unknown}).alignment).toEqual([
        'left',
        'center',
        'right',
        null,
      ])
    })

    test('table with one aligned column among unaligned columns', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| A | B | C |',
        '| --- | --- | ---: |',
        '| 1 | 2 | 3 |',
      ].join('\n')

      const result = markdownToPortableText(
        markdown,
        getTableTestOptions(keyGenerator),
      )
      expect((result.at(0) as {alignment?: unknown}).alignment).toEqual([
        null,
        null,
        'right',
      ])
    })

    test('table with no alignment omits the alignment field', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['| A | B |', '| --- | --- |', '| 1 | 2 |'].join('\n')

      const result = markdownToPortableText(
        markdown,
        getTableTestOptions(keyGenerator),
      )
      expect(result.at(0) as Record<string, unknown>).not.toHaveProperty(
        'alignment',
      )
    })

    describe('zero-config (default schema)', () => {
      test('GFM table with alignment converts to the canonical table object', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = ['| L | R |', '| :--- | ---: |', '| foo | bar |'].join(
          '\n',
        )

        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _key: 'k14',
            _type: 'table',
            headerRows: 1,
            alignment: ['left', 'right'],
            rows: [
              {
                _key: 'k6',
                _type: 'row',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'k2',
                    value: [
                      {
                        _type: 'block',
                        _key: 'k0',
                        style: 'normal',
                        children: [
                          {_type: 'span', _key: 'k1', text: 'L', marks: []},
                        ],
                        markDefs: [],
                      },
                    ],
                  },
                  {
                    _type: 'cell',
                    _key: 'k5',
                    value: [
                      {
                        _type: 'block',
                        _key: 'k3',
                        style: 'normal',
                        children: [
                          {_type: 'span', _key: 'k4', text: 'R', marks: []},
                        ],
                        markDefs: [],
                      },
                    ],
                  },
                ],
              },
              {
                _key: 'k13',
                _type: 'row',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'k9',
                    value: [
                      {
                        _type: 'block',
                        _key: 'k7',
                        style: 'normal',
                        children: [
                          {_type: 'span', _key: 'k8', text: 'foo', marks: []},
                        ],
                        markDefs: [],
                      },
                    ],
                  },
                  {
                    _type: 'cell',
                    _key: 'k12',
                    value: [
                      {
                        _type: 'block',
                        _key: 'k10',
                        style: 'normal',
                        children: [
                          {_type: 'span', _key: 'k11', text: 'bar', marks: []},
                        ],
                        markDefs: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ])
      })

      test('headerless GFM table (empty header row) converts to headerRows: 0', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = ['|  |  |', '| --- | --- |', '| foo | bar |'].join(
          '\n',
        )

        expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
          {
            _key: 'k13',
            _type: 'table',
            headerRows: 0,
            rows: [
              {
                _key: 'k12',
                _type: 'row',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'k8',
                    value: [
                      {
                        _type: 'block',
                        style: 'normal',
                        children: [
                          {_type: 'span', _key: 'k7', text: 'foo', marks: []},
                        ],
                        _key: 'k6',
                        markDefs: [],
                      },
                    ],
                  },
                  {
                    _type: 'cell',
                    _key: 'k11',
                    value: [
                      {
                        _type: 'block',
                        style: 'normal',
                        children: [
                          {_type: 'span', _key: 'k10', text: 'bar', marks: []},
                        ],
                        _key: 'k9',
                        markDefs: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ])
      })

      test('`types: {table: undefined}` opts out and flattens', () => {
        const keyGenerator = createTestKeyGenerator()
        const markdown = ['| A | B |', '| --- | --- |', '| 1 | 2 |'].join('\n')

        expect(
          markdownToPortableText(markdown, {
            keyGenerator,
            types: {table: undefined},
          }),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            children: [{_type: 'span', _key: 'k1', text: 'A', marks: []}],
            markDefs: [],
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            children: [{_type: 'span', _key: 'k4', text: 'B', marks: []}],
            markDefs: [],
          },
          {
            _type: 'block',
            _key: 'k7',
            style: 'normal',
            children: [{_type: 'span', _key: 'k8', text: '1', marks: []}],
            markDefs: [],
          },
          {
            _type: 'block',
            _key: 'k10',
            style: 'normal',
            children: [{_type: 'span', _key: 'k11', text: '2', marks: []}],
            markDefs: [],
          },
        ])
      })

      test('a differently-shaped schema `table` (no `rows` field) flattens instead of losing content', () => {
        const keyGenerator = createTestKeyGenerator()
        const schema = compileSchema(
          defineSchema({
            ...defaultSchema,
            blockObjects: [
              ...defaultSchema.blockObjects.filter(
                (blockObject) => blockObject.name !== 'table',
              ),
              {name: 'table', fields: [{name: 'data', type: 'string'}]},
            ],
          }),
        )
        const markdown = ['| A | B |', '| --- | --- |', '| 1 | 2 |'].join('\n')

        expect(
          markdownToPortableText(markdown, {keyGenerator, schema}),
        ).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            children: [{_type: 'span', _key: 'k1', text: 'A', marks: []}],
            markDefs: [],
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            children: [{_type: 'span', _key: 'k4', text: 'B', marks: []}],
            markDefs: [],
          },
          {
            _type: 'block',
            _key: 'k7',
            style: 'normal',
            children: [{_type: 'span', _key: 'k8', text: '1', marks: []}],
            markDefs: [],
          },
          {
            _type: 'block',
            _key: 'k10',
            style: 'normal',
            children: [{_type: 'span', _key: 'k11', text: '2', marks: []}],
            markDefs: [],
          },
        ])
      })
    })
  })

  describe('callout', () => {
    test('basic note callout', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('> [!NOTE]\n> This is a note', {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'callout',
          _key: 'k2',
          tone: 'note',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'blockquote',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'This is a note',
                  marks: [],
                },
              ],
              markDefs: [],
            },
          ],
        },
      ])
    })

    test('warning callout', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('> [!WARNING]\n> Be careful here', {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'callout',
          _key: 'k2',
          tone: 'warning',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'blockquote',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'Be careful here',
                  marks: [],
                },
              ],
              markDefs: [],
            },
          ],
        },
      ])
    })

    test('callout with formatting', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('> [!TIP]\n> This is **bold** and *italic*', {
          keyGenerator,
        }),
      ).toEqual([
        {
          _type: 'callout',
          _key: 'k5',
          tone: 'tip',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'blockquote',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'This is ',
                  marks: [],
                },
                {
                  _type: 'span',
                  _key: 'k2',
                  text: 'bold',
                  marks: ['strong'],
                },
                {
                  _type: 'span',
                  _key: 'k3',
                  text: ' and ',
                  marks: [],
                },
                {
                  _type: 'span',
                  _key: 'k4',
                  text: 'italic',
                  marks: ['em'],
                },
              ],
              markDefs: [],
            },
          ],
        },
      ])
    })

    test('callout with multiple paragraphs', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          '> [!IMPORTANT]\n> First paragraph\n>\n> Second paragraph',
          {keyGenerator},
        ),
      ).toEqual([
        {
          _type: 'callout',
          _key: 'k4',
          tone: 'important',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'blockquote',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'First paragraph',
                  marks: [],
                },
              ],
              markDefs: [],
            },
            {
              _type: 'block',
              _key: 'k2',
              style: 'blockquote',
              children: [
                {
                  _type: 'span',
                  _key: 'k3',
                  text: 'Second paragraph',
                  marks: [],
                },
              ],
              markDefs: [],
            },
          ],
        },
      ])
    })

    test('callout not in schema falls back to `blockquote` blocks', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('> [!NOTE]\n> This is a note', {
          keyGenerator,
          schema: compileSchema(
            defineSchema({
              styles: [{name: 'normal'}, {name: 'blockquote'}],
            }),
          ),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'blockquote',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'This is a note',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ])
    })

    test('callout not in schema and no `blockquote` style falls back to `normal` text blocks', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('> [!NOTE]\n> This is a note', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'This is a note',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ])
    })

    test('all supported callout types', () => {
      const types = ['NOTE', 'TIP', 'WARNING', 'CAUTION', 'IMPORTANT']

      for (const type of types) {
        const keyGenerator = createTestKeyGenerator()
        expect(
          markdownToPortableText(`> [!${type}]\n> Content`, {
            keyGenerator,
          }),
        ).toEqual([
          {
            _type: 'callout',
            _key: 'k2',
            tone: type.toLowerCase(),
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'blockquote',
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'Content',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
            ],
          },
        ])
      }
    })
  })

  describe('list as container (`types.list`)', () => {
    const listItemDefinition = {
      name: 'list-item',
      fields: [
        {name: 'checked', type: 'boolean'},
        {name: 'content', type: 'array'},
      ],
    } as const satisfies BlockObjectDefinition

    const listObjectDefinition = {
      name: 'list',
      fields: [
        {name: 'kind', type: 'string'},
        {name: 'items', type: 'array'},
      ],
    } as const satisfies BlockObjectDefinition

    const tableObjectDefinition = {
      name: 'table',
      fields: [
        {name: 'headerRows', type: 'number'},
        {name: 'rows', type: 'array'},
      ],
    } as const satisfies BlockObjectDefinition

    const schemaWithList = compileSchema(
      defineSchema({
        ...defaultSchema,
        blockObjects: [
          ...defaultSchema.blockObjects,
          listObjectDefinition,
          listItemDefinition,
        ],
      }),
    )

    const schemaWithListAndTable = compileSchema(
      defineSchema({
        ...defaultSchema,
        blockObjects: [
          ...defaultSchema.blockObjects,
          listObjectDefinition,
          listItemDefinition,
          tableObjectDefinition,
        ],
      }),
    )

    const getListTestOptions = (keyGenerator: () => string) => ({
      keyGenerator,
      schema: schemaWithList,
      types: {
        list: buildObjectMatcher(listObjectDefinition),
      },
    })

    test('simple bullet list', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['- one', '- two'].join('\n'),
          getListTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k6',
          _type: 'list',
          items: [
            {
              _key: 'k0',
              _type: 'list-item',
              content: [
                {
                  _key: 'k1',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k2',
                      _type: 'span',
                      marks: [],
                      text: 'one',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
            {
              _key: 'k3',
              _type: 'list-item',
              content: [
                {
                  _key: 'k4',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k5',
                      _type: 'span',
                      marks: [],
                      text: 'two',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
          kind: 'bullet',
        },
      ])
    })

    test('ordered list', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['1. one', '2. two'].join('\n'),
          getListTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k6',
          _type: 'list',
          items: [
            {
              _key: 'k0',
              _type: 'list-item',
              content: [
                {
                  _key: 'k1',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k2',
                      _type: 'span',
                      marks: [],
                      text: 'one',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
            {
              _key: 'k3',
              _type: 'list-item',
              content: [
                {
                  _key: 'k4',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k5',
                      _type: 'span',
                      marks: [],
                      text: 'two',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
          kind: 'number',
        },
      ])
    })

    test('task list with checked state', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['- [ ] todo', '- [x] done'].join('\n'),
          getListTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k6',
          _type: 'list',
          items: [
            {
              _key: 'k0',
              _type: 'list-item',
              checked: false,
              content: [
                {
                  _key: 'k1',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k2',
                      _type: 'span',
                      marks: [],
                      text: 'todo',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
            {
              _key: 'k3',
              _type: 'list-item',
              checked: true,
              content: [
                {
                  _key: 'k4',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k5',
                      _type: 'span',
                      marks: [],
                      text: 'done',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
          kind: 'task',
        },
      ])
    })

    test('list item with code block', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          [
            '- one',
            '',
            '    ```ts',
            '    const x = 1',
            '    ```',
            '',
            '- two',
          ].join('\n'),
          getListTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k7',
          _type: 'list',
          items: [
            {
              _key: 'k0',
              _type: 'list-item',
              content: [
                {
                  _key: 'k1',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k2',
                      _type: 'span',
                      marks: [],
                      text: 'one',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _key: 'k3',
                  _type: 'code',
                  code: 'const x = 1',
                  language: 'ts',
                },
              ],
            },
            {
              _key: 'k4',
              _type: 'list-item',
              content: [
                {
                  _key: 'k5',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k6',
                      _type: 'span',
                      marks: [],
                      text: 'two',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
          kind: 'bullet',
        },
      ])
    })

    test('nested bullet list', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['- one', '  - nested', '- two'].join('\n'),
          getListTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k10',
          _type: 'list',
          items: [
            {
              _key: 'k0',
              _type: 'list-item',
              content: [
                {
                  _key: 'k1',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k2',
                      _type: 'span',
                      marks: [],
                      text: 'one',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _key: 'k6',
                  _type: 'list',
                  items: [
                    {
                      _key: 'k3',
                      _type: 'list-item',
                      content: [
                        {
                          _key: 'k4',
                          _type: 'block',
                          children: [
                            {
                              _key: 'k5',
                              _type: 'span',
                              marks: [],
                              text: 'nested',
                            },
                          ],
                          markDefs: [],
                          style: 'normal',
                        },
                      ],
                    },
                  ],
                  kind: 'bullet',
                },
              ],
            },
            {
              _key: 'k7',
              _type: 'list-item',
              content: [
                {
                  _key: 'k8',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k9',
                      _type: 'span',
                      marks: [],
                      text: 'two',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
          kind: 'bullet',
        },
      ])
    })

    test('mixed nested kinds (bullet outside, ordered inside)', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['- one', '  1. nested', '- two'].join('\n'),
          getListTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k10',
          _type: 'list',
          items: [
            {
              _key: 'k0',
              _type: 'list-item',
              content: [
                {
                  _key: 'k1',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k2',
                      _type: 'span',
                      marks: [],
                      text: 'one',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _key: 'k6',
                  _type: 'list',
                  items: [
                    {
                      _key: 'k3',
                      _type: 'list-item',
                      content: [
                        {
                          _key: 'k4',
                          _type: 'block',
                          children: [
                            {
                              _key: 'k5',
                              _type: 'span',
                              marks: [],
                              text: 'nested',
                            },
                          ],
                          markDefs: [],
                          style: 'normal',
                        },
                      ],
                    },
                  ],
                  kind: 'number',
                },
              ],
            },
            {
              _key: 'k7',
              _type: 'list-item',
              content: [
                {
                  _key: 'k8',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k9',
                      _type: 'span',
                      marks: [],
                      text: 'two',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
          kind: 'bullet',
        },
      ])
    })

    test('matcher returning undefined falls back to flat list parsing', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(['- one', '- two'].join('\n'), {
          keyGenerator,
          schema: schemaWithList,
          types: {
            list: () => undefined,
          },
        }),
      ).toEqual([
        {
          _key: 'k1',
          _type: 'block',
          children: [
            {
              _key: 'k2',
              _type: 'span',
              marks: [],
              text: 'one',
            },
          ],
          level: 1,
          listItem: 'bullet',
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k4',
          _type: 'block',
          children: [
            {
              _key: 'k5',
              _type: 'span',
              marks: [],
              text: 'two',
            },
          ],
          level: 1,
          listItem: 'bullet',
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('without `types.list`, lists fall back to flat blocks', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(['- one', '- two'].join('\n'), {keyGenerator}),
      ).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              marks: [],
              text: 'one',
            },
          ],
          level: 1,
          listItem: 'bullet',
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k2',
          _type: 'block',
          children: [
            {
              _key: 'k3',
              _type: 'span',
              marks: [],
              text: 'two',
            },
          ],
          level: 1,
          listItem: 'bullet',
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('list inside a callout', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['> [!NOTE]', '> - one', '> - two'].join('\n'),
          getListTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k7',
          _type: 'callout',
          content: [
            {
              _key: 'k6',
              _type: 'list',
              items: [
                {
                  _key: 'k0',
                  _type: 'list-item',
                  content: [
                    {
                      _key: 'k1',
                      _type: 'block',
                      children: [
                        {
                          _key: 'k2',
                          _type: 'span',
                          marks: [],
                          text: 'one',
                        },
                      ],
                      markDefs: [],
                      style: 'blockquote',
                    },
                  ],
                },
                {
                  _key: 'k3',
                  _type: 'list-item',
                  content: [
                    {
                      _key: 'k4',
                      _type: 'block',
                      children: [
                        {
                          _key: 'k5',
                          _type: 'span',
                          marks: [],
                          text: 'two',
                        },
                      ],
                      markDefs: [],
                      style: 'blockquote',
                    },
                  ],
                },
              ],
              kind: 'bullet',
            },
          ],
          tone: 'note',
        },
      ])
    })

    test('list inside a table cell', () => {
      // GFM pipe tables only allow inline content in cells, so `- one`
      // inside a cell stays as plain text.
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['| Header |', '|--------|', '| - one  |', '| - two  |'].join('\n'),
          {
            keyGenerator,
            schema: schemaWithListAndTable,
            types: {
              table: buildObjectMatcher(tableObjectDefinition),
              list: buildObjectMatcher(listObjectDefinition),
            },
          },
        ),
      ).toEqual([
        {
          _key: 'k12',
          _type: 'table',
          headerRows: 1,
          rows: [
            {
              _key: 'k3',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  value: [
                    {
                      _key: 'k0',
                      _type: 'block',
                      children: [
                        {
                          _key: 'k1',
                          _type: 'span',
                          marks: [],
                          text: 'Header',
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k7',
              _type: 'row',
              cells: [
                {
                  _key: 'k6',
                  _type: 'cell',
                  value: [
                    {
                      _key: 'k4',
                      _type: 'block',
                      children: [
                        {
                          _key: 'k5',
                          _type: 'span',
                          marks: [],
                          text: '- one',
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k11',
              _type: 'row',
              cells: [
                {
                  _key: 'k10',
                  _type: 'cell',
                  value: [
                    {
                      _key: 'k8',
                      _type: 'block',
                      children: [
                        {
                          _key: 'k9',
                          _type: 'span',
                          marks: [],
                          text: '- two',
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('blockquote-styled block inside a list item', () => {
      // The GFM alert plugin does not recognize `[!NOTE]` inside a list
      // item, but regular blockquotes ARE recognized and land in the
      // item's content with `style: 'blockquote'`.
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['- one', '', '  > a quote', '', '- two'].join('\n'),
          getListTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k8',
          _type: 'list',
          items: [
            {
              _key: 'k0',
              _type: 'list-item',
              content: [
                {
                  _key: 'k1',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k2',
                      _type: 'span',
                      marks: [],
                      text: 'one',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _key: 'k3',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k4',
                      _type: 'span',
                      marks: [],
                      text: 'a quote',
                    },
                  ],
                  markDefs: [],
                  style: 'blockquote',
                },
              ],
            },
            {
              _key: 'k5',
              _type: 'list-item',
              content: [
                {
                  _key: 'k6',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k7',
                      _type: 'span',
                      marks: [],
                      text: 'two',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
          kind: 'bullet',
        },
      ])
    })
  })

  describe('blockquote as container (`types.blockquote`)', () => {
    const blockquoteObjectDefinition = {
      name: 'blockquote',
      fields: [{name: 'content', type: 'array'}],
    } as const satisfies BlockObjectDefinition

    const schemaWithBlockquote = compileSchema(
      defineSchema({
        ...defaultSchema,
        blockObjects: [
          ...defaultSchema.blockObjects,
          blockquoteObjectDefinition,
        ],
      }),
    )

    const getBlockquoteTestOptions = (keyGenerator: () => string) => ({
      keyGenerator,
      schema: schemaWithBlockquote,
      types: {
        blockquote: buildObjectMatcher(blockquoteObjectDefinition),
      },
    })

    test('simple blockquote', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText('> one', getBlockquoteTestOptions(keyGenerator)),
      ).toEqual([
        {
          _key: 'k2',
          _type: 'blockquote',
          content: [
            {
              _type: 'block',
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'one',
                  marks: [],
                },
              ],
              _key: 'k0',
              markDefs: [],
            },
          ],
        },
      ])
    })

    test('multi-paragraph blockquote', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['> one', '>', '> two'].join('\n'),
          getBlockquoteTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k4',
          _type: 'blockquote',
          content: [
            {
              _type: 'block',
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'one',
                  marks: [],
                },
              ],
              _key: 'k0',
              markDefs: [],
            },
            {
              _type: 'block',
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  _key: 'k3',
                  text: 'two',
                  marks: [],
                },
              ],
              _key: 'k2',
              markDefs: [],
            },
          ],
        },
      ])
    })

    test('nested blockquote', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['> outer', '>', '> > inner'].join('\n'),
          getBlockquoteTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k5',
          _type: 'blockquote',
          content: [
            {
              _type: 'block',
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'outer',
                  marks: [],
                },
              ],
              _key: 'k0',
              markDefs: [],
            },
            {
              _key: 'k4',
              _type: 'blockquote',
              content: [
                {
                  _type: 'block',
                  style: 'normal',
                  children: [
                    {
                      _type: 'span',
                      _key: 'k3',
                      text: 'inner',
                      marks: [],
                    },
                  ],
                  _key: 'k2',
                  markDefs: [],
                },
              ],
            },
          ],
        },
      ])
    })

    test('blockquote with code block', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['> intro', '>', '> ```js', "> console.log('hi')", '> ```'].join(
            '\n',
          ),
          getBlockquoteTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k3',
          _type: 'blockquote',
          content: [
            {
              _type: 'block',
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'intro',
                  marks: [],
                },
              ],
              _key: 'k0',
              markDefs: [],
            },
            {
              _key: 'k2',
              _type: 'code',
              language: 'js',
              code: "console.log('hi')",
            },
          ],
        },
      ])
    })

    test('GFM alert is still a callout, not a blockquote', () => {
      // When both `types.callout` and `types.blockquote` are registered, GFM
      // alerts (`> [!NOTE]`) hit the alert_open/close tokens and produce
      // callouts; only plain blockquotes hit blockquote_open/close.
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(
          ['> [!NOTE]', '> heads up'].join('\n'),
          getBlockquoteTestOptions(keyGenerator),
        ),
      ).toEqual([
        {
          _key: 'k2',
          _type: 'callout',
          tone: 'note',
          content: [
            {
              _type: 'block',
              style: 'blockquote',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'heads up',
                  marks: [],
                },
              ],
              _key: 'k0',
              markDefs: [],
            },
          ],
        },
      ])
    })

    test('matcher returning undefined falls back to flat blockquote-styled blocks', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(['> one', '>', '> two'].join('\n'), {
          keyGenerator,
          schema: schemaWithBlockquote,
          types: {
            blockquote: () => undefined,
          },
        }),
      ).toEqual([
        {
          _type: 'block',
          style: 'blockquote',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'one',
              marks: [],
            },
          ],
          _key: 'k0',
          markDefs: [],
        },
        {
          _type: 'block',
          style: 'blockquote',
          children: [
            {
              _type: 'span',
              _key: 'k3',
              text: 'two',
              marks: [],
            },
          ],
          _key: 'k2',
          markDefs: [],
        },
      ])
    })

    test("without `types.blockquote`, blockquotes fall back to flat `style: 'blockquote'` blocks", () => {
      const keyGenerator = createTestKeyGenerator()
      expect(
        markdownToPortableText(['> one', '>', '> two'].join('\n'), {
          keyGenerator,
          schema: schemaWithBlockquote,
        }),
      ).toEqual([
        {
          _type: 'block',
          style: 'blockquote',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'one',
              marks: [],
            },
          ],
          _key: 'k0',
          markDefs: [],
        },
        {
          _type: 'block',
          style: 'blockquote',
          children: [
            {
              _type: 'span',
              _key: 'k3',
              text: 'two',
              marks: [],
            },
          ],
          _key: 'k2',
          markDefs: [],
        },
      ])
    })
  })
  describe('json:object fence', () => {
    test('reconstructs the object, `_key` included', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '```json:object',
        '{"_type": "product", "_key": "product-key", "sku": "abc-123"}',
        '```',
      ].join('\n')
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'product',
          _key: 'product-key',
          sku: 'abc-123',
        },
      ])
    })

    test('reconstructs regardless of the schema', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '```json:object',
        '{"_type": "product", "sku": "abc-123"}',
        '```',
      ].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
        }),
      ).toEqual([
        {
          _type: 'product',
          sku: 'abc-123',
        },
      ])
    })

    test('a payload without a `_key` stays keyless', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '```json:object',
        '{"_type": "product", "sku": "abc-123"}',
        '```',
      ].join('\n')
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'product',
          sku: 'abc-123',
        },
      ])
    })

    test('malformed JSON degrades to a code block', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['```json:object', '{"_type": "product",', '```'].join(
        '\n',
      )
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'code',
          _key: 'k0',
          code: '{"_type": "product",',
          language: 'json:object',
        },
      ])
    })

    test('JSON without a string `_type` degrades to a code block', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['```json:object', '{"sku": "abc-123"}', '```'].join(
        '\n',
      )
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'code',
          _key: 'k0',
          code: '{"sku": "abc-123"}',
          language: 'json:object',
        },
      ])
    })

    test('a tagged inline code span reconstructs an inline object in place', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown =
        'AAPL is at json:object`{"_type":"stockTicker","_key":"t1","symbol":"AAPL"}` right now.'
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 'k1', text: 'AAPL is at ', marks: []},
            {_type: 'stockTicker', _key: 't1', symbol: 'AAPL'},
            {_type: 'span', _key: 'k2', text: ' right now.', marks: []},
          ],
        },
      ])
    })

    test('an inline payload without a `_key` stays keyless', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = 'json:object`{"_type":"stockTicker","symbol":"AAPL"}`'
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'stockTicker', symbol: 'AAPL'}],
        },
      ])
    })

    test('a space between the tag and the code span prevents binding', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = 'json:object `{"_type":"stockTicker"}`'
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 'k1', text: 'json:object ', marks: []},
            {
              _type: 'span',
              _key: 'k2',
              text: '{"_type":"stockTicker"}',
              marks: ['code'],
            },
          ],
        },
      ])
    })

    test('a tagged code span without a string `_type` stays a code span', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = 'json:object`{"symbol":"AAPL"}`'
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 'k1', text: 'json:object', marks: []},
            {
              _type: 'span',
              _key: 'k2',
              text: '{"symbol":"AAPL"}',
              marks: ['code'],
            },
          ],
        },
      ])
    })

    test('a pretty-printed payload in a tagged span still reconstructs', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown =
        'json:object`{\n  "_type": "stockTicker",\n  "_key": "t1",\n  "symbol": "AAPL"\n}`'
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'stockTicker', _key: 't1', symbol: 'AAPL'}],
        },
      ])
    })

    test('a fence inside a blockquote reconstructs inside the quote content', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '> quoted',
        '>',
        '> ```json:object',
        '> {"_type": "product", "_key": "p1", "sku": "abc-123"}',
        '> ```',
      ].join('\n')
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'blockquote',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'quoted', marks: []}],
        },
        {_type: 'product', _key: 'p1', sku: 'abc-123'},
      ])
    })

    test('emphasis around a tagged span binds the object and drops the emphasis', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = '*json:object`{"_type":"stockTicker","_key":"t1"}`*'
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'stockTicker', _key: 't1'}],
        },
      ])
    })

    test('a JSON array degrades to a code block', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['```json:object', '[{"_type": "product"}]', '```'].join(
        '\n',
      )
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'code',
          _key: 'k0',
          code: '[{"_type": "product"}]',
          language: 'json:object',
        },
      ])
    })
  })
  describe('degradation report', () => {
    type DegradationReport = {
      degradations: Array<Degradation>
      message: string
    }

    test('dropped decorator: undeclared `strong` decorator', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('**foo**', {
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
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'decorator-dropped',
          message:
            'Removed bold formatting, kept the text: the schema has no `strong` decorator',
          line: 1,
          snippet: 'foo',
        },
      ])
    })

    test('style fallback: undeclared `h1` heading falls back to `normal`', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('# foo', {
          keyGenerator,
          schema: compileSchema(defineSchema({styles: [{name: 'normal'}]})),
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
      ])

      expect(onDegradation.mock.calls).toEqual([
        [
          {
            degradations: [
              {
                type: 'style-fallback',
                message:
                  '`#` heading became a normal paragraph: the schema has no `h1` style',
                line: 1,
                snippet: 'foo',
              },
            ],
            message: [
              'Markdown could not be converted without loss:',
              '- line 1: `#` heading became a normal paragraph: the schema has no `h1` style ("foo")',
            ].join('\n'),
          },
        ],
      ])
    })

    test('table flattened: undeclared `table` type', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const markdown = ['| a | b |', '| - | - |', '| 1 | 2 |'].join('\n')

      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'a', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: 'b', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k7',
          children: [{_type: 'span', _key: 'k8', text: '1', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k10',
          children: [{_type: 'span', _key: 'k11', text: '2', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'table-flattened',
          message:
            'Table became plain text blocks, rows and columns lost: the schema has no `table` block object',
          line: 1,
        },
      ])
    })

    test('task checkbox stripped: undeclared `task` list', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('- [x] foo', {
          keyGenerator,
          schema: compileSchema(defineSchema({lists: [{name: 'bullet'}]})),
          onDegradation,
        }),
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
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'task-checkbox-stripped',
          message:
            'Removed the `[x]` checkbox, kept a plain list item: the schema has no `task` list',
          line: 1,
          snippet: 'foo',
        },
      ])
    })

    test('pure task list on a task-only schema: nothing reported, `bullet_list_open` defers the verdict to item resolution', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      const result = markdownToPortableText(
        ['- [x] foo', '- [ ] bar'].join('\n'),
        {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({lists: [{name: 'task'}]})),
          onDegradation,
        },
      )

      expect(result).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'task',
          level: 1,
          checked: true,
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'task',
          level: 1,
          checked: false,
        },
      ])

      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('code fence to text: undeclared `code` type names the language', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const markdown = ['```js', 'code', '```'].join('\n')

      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'code', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'code-block-to-text',
          message:
            '`js` code block became plain text: the schema has no `code` block object',
          line: 1,
          snippet: 'code',
        },
      ])
    })

    test('multiple degradations arrive in encounter order with their token-map lines, in one callback invocation', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const markdown = [
        '# foo',
        '',
        '**bar**',
        '',
        '```js',
        'code',
        '```',
      ].join('\n')

      expect(
        markdownToPortableText(markdown, {
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
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'code', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]).toEqual({
        degradations: [
          {
            type: 'style-fallback',
            message:
              '`#` heading became a normal paragraph: the schema has no `h1` style',
            line: 1,
            snippet: 'foo',
          },
          {
            type: 'decorator-dropped',
            message:
              'Removed bold formatting, kept the text: the schema has no `strong` decorator',
            line: 3,
            snippet: 'bar',
          },
          {
            type: 'code-block-to-text',
            message:
              '`js` code block became plain text: the schema has no `code` block object',
            line: 5,
            snippet: 'code',
          },
        ],
        message: [
          'Markdown could not be converted without loss:',
          '- line 1: `#` heading became a normal paragraph: the schema has no `h1` style ("foo")',
          '- line 3: Removed bold formatting, kept the text: the schema has no `strong` decorator ("bar")',
          '- line 5: `js` code block became plain text: the schema has no `code` block object ("code")',
        ].join('\n'),
      })
    })

    test('nested blockquote declines report in encounter order (innermost closes first)', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {
              name: 'blockquote',
              fields: [{name: 'content', type: 'array'}],
            },
          ],
        }),
      )

      markdownToPortableText('> foo\n>> bar', {
        keyGenerator,
        schema,
        types: {blockquote: () => undefined},
        onDegradation,
      })

      // The inner blockquote (line 2) closes before the outer one (line 1),
      // so `degradations` sees line 2 first: closing order, not document order.
      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'style-fallback',
          message:
            'Blockquote became normal paragraphs: the schema has no `blockquote` style',
          line: 2,
        },
        {
          type: 'style-fallback',
          message:
            'Blockquote became normal paragraphs: the schema has no `blockquote` style',
          line: 1,
        },
      ])
    })

    test('a consumer throw groups same-message declines and lists their lines top-to-bottom, despite reverse encounter order', () => {
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {
              name: 'blockquote',
              fields: [{name: 'content', type: 'array'}],
            },
          ],
        }),
      )

      expect(() =>
        markdownToPortableText('> foo\n>> bar', {
          keyGenerator: createTestKeyGenerator(),
          schema,
          types: {blockquote: () => undefined},
          onDegradation: ({message}) => {
            throw new Error(message)
          },
        }),
      ).toThrowError(
        [
          'Markdown could not be converted without loss:',
          '- Blockquote became normal paragraphs: the schema has no `blockquote` style (2\u00d7: lines 1, 2)',
        ].join('\n'),
      )
    })

    test('`onDegradation` fires at most once, and only when something degraded', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('foo **bar** baz', {
          keyGenerator: createTestKeyGenerator(),
          onDegradation,
        }),
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
      ])
      expect(onDegradation).not.toHaveBeenCalled()

      markdownToPortableText('**bar**\n\n**baz**', {
        keyGenerator: createTestKeyGenerator(),
        schema: compileSchema(defineSchema({})),
        onDegradation,
      })
      expect(onDegradation).toHaveBeenCalledTimes(1)
    })

    test('`onDegradation` not set: conversion degrades silently, nothing reaches `console.warn`', () => {
      const keyGenerator = createTestKeyGenerator()
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      markdownToPortableText('**bold**', {
        keyGenerator,
        schema: compileSchema(defineSchema({})),
      })

      expect(consoleWarnSpy).not.toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })

    test('horizontal rule to text: undeclared `horizontal-rule` type', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('---', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: '---', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'horizontal-rule-to-text',
          message:
            'Horizontal rule became the text `---`: the schema has no `horizontal-rule` block object',
          line: 1,
        },
      ])
    })

    test('HTML block to text: undeclared `html` type', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('<div>Content</div>', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: '<div>Content</div>', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'html-block-to-text',
          message:
            'HTML block became plain text: the schema has no `html` block object',
          line: 1,
          snippet: '<div>Content</div>',
        },
      ])
    })

    test('indented code to text: undeclared `code` type', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('    const foo = "bar"', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'const foo = "bar"',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'code-block-to-text',
          message:
            'Code block became plain text: the schema has no `code` block object',
          line: 1,
          snippet: 'const foo = "bar"',
        },
      ])
    })

    test('inline HTML dropped: default `skip` mode', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('foo <br/> bar', {
          keyGenerator,
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo  bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'inline-html-dropped',
          message:
            'Removed inline HTML tags, kept nothing: `html.inline` is `skip` (the default)',
          line: 1,
          snippet: '<br/>',
        },
      ])
    })

    test('inline HTML in `text` mode: no degradation, no event', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('foo <br/> bar', {
          keyGenerator,
          html: {inline: 'text'},
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo <br/> bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('image to text: standalone image, undeclared `image` type', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('![alt](src.png)', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: '![alt](src.png)', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'image-to-text',
          message:
            'Image became its markdown source as plain text: the schema has no `image` object',
          line: 1,
          snippet: 'alt',
        },
      ])
    })

    test('image to text: inline-position image, undeclared `image` type', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('foo ![alt](src.png) bar', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'foo ![alt](src.png) bar',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'image-to-text',
          message:
            'Image became its markdown source as plain text: the schema has no `image` object',
          line: 1,
          snippet: 'alt',
        },
      ])
    })

    test('image demoted to inline: standalone image, `image` declared only as an inline object', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          inlineObjects: [
            {
              name: 'image',
              fields: [
                {name: 'src', type: 'string'},
                {name: 'alt', type: 'string'},
                {name: 'title', type: 'string'},
              ],
            },
          ],
        }),
      )

      expect(
        markdownToPortableText('![alt](src.png)', {
          keyGenerator: createTestKeyGenerator(),
          schema,
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [{_key: 'k1', _type: 'image', src: 'src.png', alt: 'alt'}],
          markDefs: [],
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'image-block-to-inline',
          message:
            'The image became inline: the schema has no block-level `image`',
          line: 1,
          snippet: 'alt',
        },
      ])
    })

    test('image promoted to block: inline-position image, `image` declared only as a block object', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {
              name: 'image',
              fields: [
                {name: 'src', type: 'string'},
                {name: 'alt', type: 'string'},
                {name: 'title', type: 'string'},
              ],
            },
          ],
        }),
      )

      expect(
        markdownToPortableText('foo ![alt](src.png) bar', {
          keyGenerator: createTestKeyGenerator(),
          schema,
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [{_type: 'span', _key: 'k1', text: 'foo ', marks: []}],
          markDefs: [],
        },
        {_key: 'k2', _type: 'image', src: 'src.png', alt: 'alt'},
        {
          _type: 'block',
          _key: 'k3',
          style: 'normal',
          children: [{_type: 'span', _key: 'k4', text: ' bar', marks: []}],
          markDefs: [],
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'image-inline-to-block',
          message:
            'The image became its own block, splitting the paragraph: the schema has no inline `image`',
          line: 1,
          snippet: 'alt',
        },
      ])
    })

    test('image lifted back to block: standalone image inside a table cell', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const markdown = [
        '| a | b |',
        '| - | - |',
        '| 1 | ![alt](src.png) |',
      ].join('\n')

      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          onDegradation,
        }),
      ).toEqual([
        {
          _key: 'k14',
          _type: 'table',
          headerRows: 1,
          rows: [
            {
              _key: 'k6',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k1', text: 'a', marks: []},
                      ],
                      _key: 'k0',
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k5',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k4', text: 'b', marks: []},
                      ],
                      _key: 'k3',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k13',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k9',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k8', text: '1', marks: []},
                      ],
                      _key: 'k7',
                      markDefs: [],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'k12',
                  value: [
                    {_key: 'k11', _type: 'image', src: 'src.png', alt: 'alt'},
                  ],
                },
              ],
            },
          ],
        },
      ])

      // The default schema declares `image` in both `blockObjects` and
      // `inlineObjects`, so the sole-image cell round-trips to the
      // canonical block-level shape without loss.
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('image stays inline: standalone image inside a table cell, schema has no block-level `image`', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      // `image` only exists as an inline object, so the standalone-image
      // site's block attempt declines before its inline fallback matches.
      const schema = compileSchema(
        defineSchema({
          ...defaultSchema,
          blockObjects: defaultSchema.blockObjects.filter(
            (blockObject) => blockObject.name !== 'image',
          ),
        }),
      )
      const markdown = ['| a |', '| - |', '| ![alt](src.png) |'].join('\n')

      const result = markdownToPortableText(markdown, {
        keyGenerator,
        schema,
        onDegradation,
      })

      expect(result).toEqual([
        {
          _key: 'k8',
          _type: 'table',
          headerRows: 1,
          rows: [
            {
              _key: 'k3',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k1', text: 'a', marks: []},
                      ],
                      _key: 'k0',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k7',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {
                          _key: 'k5',
                          _type: 'image',
                          src: 'src.png',
                          alt: 'alt',
                        },
                      ],
                      _key: 'k4',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])

      // `image` is declared inline-only, which is a legal inline home, so
      // `td_close`'s sole-object lift declines and the image stays put as
      // the cell's inline child.
      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'image-block-to-inline',
          message:
            'The image became inline: the schema has no block-level `image`',
          line: 1,
          snippet: 'alt',
        },
      ])
    })

    test('image demoted, not lifted: mixed cell content, schema has no block-level `image`', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          ...defaultSchema,
          blockObjects: defaultSchema.blockObjects.filter(
            (blockObject) => blockObject.name !== 'image',
          ),
        }),
      )
      const markdown = ['| a |', '| - |', '| foo ![alt](src.png) |'].join('\n')

      const result = markdownToPortableText(markdown, {
        keyGenerator,
        schema,
        onDegradation,
      })

      expect(result).toEqual([
        {
          _key: 'k9',
          _type: 'table',
          headerRows: 1,
          rows: [
            {
              _key: 'k3',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k1', text: 'a', marks: []},
                      ],
                      _key: 'k0',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k8',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k7',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k5', text: 'foo ', marks: []},
                        {
                          _key: 'k6',
                          _type: 'image',
                          src: 'src.png',
                          alt: 'alt',
                        },
                      ],
                      _key: 'k4',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])

      // The image sits alongside text, so the standalone-image site never
      // runs at all: the inline image is the correct, lossless shape here,
      // whether the schema has a block-level `image` or not, and the
      // sole-image lift never gets a chance to apply. Contrast with the
      // sole-image case above: matching schema, no `inTableCell` deferral
      // masks a genuine event when the cell actually mixes content.
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('image not lifted back: mixed cell content with `image` declared only as a block object', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      // `table` is already a block object on the default schema; only
      // `image` is trimmed down to a block-only object here.
      const schema = compileSchema(
        defineSchema({
          ...defaultSchema,
          inlineObjects: defaultSchema.inlineObjects.filter(
            (inlineObject) => inlineObject.name !== 'image',
          ),
        }),
      )
      const markdown = ['| a |', '| - |', '| foo ![alt](src.png) |'].join('\n')

      const result = markdownToPortableText(markdown, {
        keyGenerator,
        schema,
        onDegradation,
      })

      expect(result).toEqual([
        {
          _key: 'k9',
          _type: 'table',
          headerRows: 1,
          rows: [
            {
              _key: 'k3',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k1', text: 'a', marks: []},
                      ],
                      _key: 'k0',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k8',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k7',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k5', text: 'foo ', marks: []},
                        {
                          _key: 'k6',
                          _type: 'image',
                          src: 'src.png',
                          alt: 'alt',
                        },
                      ],
                      _key: 'k4',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'image-block-to-inline',
          message:
            "The image became inline: a table cell can't hold a block-level `image`",
          line: 1,
          snippet: 'alt',
        },
      ])
    })

    test('image not lifted back: mixed cell content reports dropped fields too', () => {
      // Same shape as the sibling test above, but the schema's block-only
      // `image` declares only `src`, so the demoted image also drops `alt`.
      // The demotion site must report that loss like every other
      // accepted-object site does.
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'src', type: 'string'}]},
            defaultSchema.blockObjects.find(
              (blockObject) => blockObject.name === 'table',
            )!,
          ],
        }),
      )
      const markdown = [
        '| a |',
        '| - |',
        '| foo ![my alt](https://x.co/i.png) |',
      ].join('\n')

      const result = markdownToPortableText(markdown, {
        keyGenerator,
        schema,
        onDegradation,
      })

      expect(result).toEqual([
        {
          _key: 'k9',
          _type: 'table',
          headerRows: 1,
          rows: [
            {
              _key: 'k3',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k1', text: 'a', marks: []},
                      ],
                      _key: 'k0',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k8',
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k7',
                  value: [
                    {
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_type: 'span', _key: 'k5', text: 'foo ', marks: []},
                        {
                          _key: 'k6',
                          _type: 'image',
                          src: 'https://x.co/i.png',
                        },
                      ],
                      _key: 'k4',
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'fields-dropped',
          message:
            "Dropped `alt` from `image`: not in the schema's `image` fields",
          line: 1,
        },
        {
          type: 'image-block-to-inline',
          message:
            "The image became inline: a table cell can't hold a block-level `image`",
          line: 1,
          snippet: 'https://x.co/i.png',
        },
      ])
    })

    test('heading inside a callout keeps its own style, no `blockquote` style-fallback fires', () => {
      // The callout's own content style (`blockquote`, absent here) only
      // degrades if a committing block actually took it. A heading commits
      // with its own `h1` style, so nothing here needed the fallback.
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          styles: [{name: 'normal'}, {name: 'h1'}],
          blockObjects: [defaultCalloutObjectDefinition],
        }),
      )

      expect(
        markdownToPortableText('> [!NOTE]\n> # foo', {
          keyGenerator,
          schema,
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'callout',
          _key: 'k2',
          tone: 'note',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'h1',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              markDefs: [],
            },
          ],
        },
      ])

      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('plain text inside a callout still fires the `blockquote` style-fallback', () => {
      // Contrast to the heading case above: a plain paragraph DOES take the
      // declined `blockquote` style, so the fallback still fires.
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          styles: [{name: 'normal'}, {name: 'h1'}],
          blockObjects: [defaultCalloutObjectDefinition],
        }),
      )

      expect(
        markdownToPortableText('> [!NOTE]\n> plain text', {
          keyGenerator,
          schema,
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'callout',
          _key: 'k2',
          tone: 'note',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              children: [
                {_type: 'span', _key: 'k1', text: 'plain text', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'style-fallback',
          message:
            'Blockquote became normal paragraphs: the schema has no `blockquote` style',
          line: 1,
        },
      ])
    })

    test('a heading falling back to `normal` on its own does not also trigger the callout content style fallback', () => {
      // Both the callout's own content style and the heading's `h1` style
      // decline to the same `normal` fallback here: two independent
      // declines landing on the same value, not one causing the other. The
      // heading never touches `currentBlockquoteStyle`, so only its own
      // `h1` fallback should fire.
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          styles: [{name: 'normal'}],
          blockObjects: [defaultCalloutObjectDefinition],
        }),
      )

      expect(
        markdownToPortableText('> [!NOTE]\n> # foo', {
          keyGenerator,
          schema,
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'callout',
          _key: 'k2',
          tone: 'note',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              markDefs: [],
            },
          ],
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'style-fallback',
          message:
            '`#` heading became a normal paragraph: the schema has no `h1` style',
          line: 2,
          snippet: 'foo',
        },
      ])
    })

    test('callout fallback: undeclared `callout` type names the tone and the content style it fell back to', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      // The `> [!NOTE]` marker sits on line 1; only the callout's content
      // (`baz`) is on line 2.
      const markdown = ['> [!NOTE]', '> baz'].join('\n')

      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      // No `blockquote` style declared, so the content falls back to
      // `normal`; the callout message names that, not `blockquote`, which
      // is what the content was actually styled as.
      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'style-fallback',
          message:
            'Blockquote became normal paragraphs: the schema has no `blockquote` style',
          line: 1,
        },
        {
          type: 'callout-fallback',
          message:
            '`[!NOTE]` callout became normal-styled text: the schema has no `callout` block object',
          line: 1,
        },
      ])
    })

    test('callout fallback: neither `blockquote` nor `normal` style declared, both fallbacks reported', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const markdown = ['> [!NOTE]', '> baz'].join('\n')

      const result = markdownToPortableText(markdown, {
        keyGenerator,
        schema: compileSchema(defineSchema({})),
        block: {normal: () => undefined},
        onDegradation,
      })

      expect(result).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'style-fallback',
          message:
            'Blockquote became normal paragraphs: the schema has no `blockquote` style',
          line: 1,
        },
        {
          type: 'style-fallback',
          message: 'Fell back to `normal` style: `normal` not in schema',
          line: 1,
        },
        {
          type: 'callout-fallback',
          message:
            '`[!NOTE]` callout became normal-styled text: the schema has no `callout` block object',
          line: 1,
        },
      ])
    })

    test('fields dropped: accepted `callout` whose schema fields omit `content` destroys the body', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {name: 'callout', fields: [{name: 'tone', type: 'string'}]},
          ],
          styles: [{name: 'normal'}, {name: 'blockquote'}],
        }),
      )

      const result = markdownToPortableText(
        ['> [!NOTE]', '> body'].join('\n'),
        {
          keyGenerator: createTestKeyGenerator(),
          schema,
          onDegradation,
        },
      )

      expect(result).toEqual([{_key: 'k2', _type: 'callout', tone: 'note'}])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'fields-dropped',
          message:
            "Dropped `content` from `callout`: not in the schema's `callout` fields",
          line: 1,
        },
      ])
    })

    test('accepted callout with no `blockquote` style but no text content either: nothing reported', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
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
            {
              name: 'image',
              fields: [
                {name: 'src', type: 'string'},
                {name: 'alt', type: 'string'},
              ],
            },
          ],
        }),
      )

      const result = markdownToPortableText(
        ['> [!WARNING]', '> ![foo](u)'].join('\n'),
        {keyGenerator: createTestKeyGenerator(), schema, onDegradation},
      )

      expect(result).toEqual([
        {
          _key: 'k2',
          _type: 'callout',
          tone: 'warning',
          content: [{_key: 'k1', _type: 'image', src: 'u', alt: 'foo'}],
        },
      ])

      // No `blockquote` style declared, but nothing inside the callout ever
      // needed one: its only content is a standalone image, which never
      // creates a text block. Reporting the pending style fallback here
      // would name a paragraph that never existed.
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('fields dropped: accepted `image` whose schema fields omit `alt` and `title` names both', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'src', type: 'string'}]},
          ],
        }),
      )

      const result = markdownToPortableText('![alt text](src.png "a title")', {
        keyGenerator: createTestKeyGenerator(),
        schema,
        onDegradation,
      })

      expect(result).toEqual([{_key: 'k1', _type: 'image', src: 'src.png'}])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'fields-dropped',
          message:
            "Dropped `alt`, `title` from `image`: not in the schema's `image` fields",
          line: 1,
        },
      ])
    })

    test('style fallback: heading and `normal` both undeclared reports both, not a silent literal fallback', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('# foo', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          block: {normal: () => undefined},
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
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'style-fallback',
          message:
            '`#` heading became a normal paragraph: the schema has no `h1` style',
          line: 1,
          snippet: 'foo',
        },
        {
          type: 'style-fallback',
          message: 'Fell back to `normal` style: `normal` not in schema',
          line: 1,
        },
      ])
    })

    test('style fallback: blockquote and `normal` both undeclared reports both, not a silent literal fallback', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('> foo', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          block: {normal: () => undefined},
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
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'style-fallback',
          message:
            'Blockquote became normal paragraphs: the schema has no `blockquote` style',
          line: 1,
        },
        {
          type: 'style-fallback',
          message: 'Fell back to `normal` style: `normal` not in schema',
          line: 1,
        },
      ])
    })

    test('style fallback: structural-list paragraph with `normal` undeclared', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      const result = markdownToPortableText(['- foo', '', '  bar'].join('\n'), {
        keyGenerator,
        schema: compileSchema(
          defineSchema({
            blockObjects: [
              {name: 'list', fields: [{name: 'items', type: 'array'}]},
            ],
          }),
        ),
        types: {
          list: ({value, context}) => ({
            _type: 'list',
            _key: context.keyGenerator(),
            kind: value.kind,
            items: value.items,
          }),
        },
        block: {normal: () => undefined},
        onDegradation,
      })

      expect(result).toEqual([
        {
          _type: 'list',
          _key: 'k5',
          kind: 'bullet',
          items: [
            {
              _type: 'list-item',
              _key: 'k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k1',
                  children: [
                    {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'k3',
                  children: [
                    {_type: 'span', _key: 'k4', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])

      // Two paragraphs in the same list item, one style-fallback event
      // each, since the structural-list `paragraph_open` path used to fall
      // back to the literal `'normal'` without reporting.
      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'style-fallback',
          message: 'Fell back to `normal` style: `normal` not in schema',
          line: 1,
        },
        {
          type: 'style-fallback',
          message: 'Fell back to `normal` style: `normal` not in schema',
          line: 3,
        },
      ])
    })

    test('style fallback: standalone inline image in a structural list with `normal` undeclared', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      const result = markdownToPortableText('- ![alt](src.png)', {
        keyGenerator,
        schema: compileSchema(
          defineSchema({
            blockObjects: [
              {name: 'list', fields: [{name: 'items', type: 'array'}]},
            ],
          }),
        ),
        types: {
          list: ({value, context}) => ({
            _type: 'list',
            _key: context.keyGenerator(),
            kind: value.kind,
            items: value.items,
          }),
          image: ({value, isInline}) =>
            isInline
              ? {_type: 'image', _key: 'img', src: value.src, alt: value.alt}
              : undefined,
        },
        block: {normal: () => undefined},
        onDegradation,
      })

      expect(result).toEqual([
        {
          _type: 'list',
          _key: 'k2',
          kind: 'bullet',
          items: [
            {
              _type: 'list-item',
              _key: 'k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k1',
                  children: [
                    {_type: 'image', _key: 'img', src: 'src.png', alt: 'alt'},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'style-fallback',
          message: 'Fell back to `normal` style: `normal` not in schema',
          line: 1,
        },
        {
          type: 'image-block-to-inline',
          message:
            'The image became inline: the schema has no block-level `image`',
          line: 1,
          snippet: 'alt',
        },
      ])
    })

    test('lossless structural list decline: schema has every list kind the content needs, nothing reported', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {name: 'list', fields: [{name: 'items', type: 'array'}]},
          ],
          lists: [{name: 'bullet'}, {name: 'task'}],
        }),
      )

      const declined = markdownToPortableText('- [x] foo', {
        keyGenerator: createTestKeyGenerator(),
        schema,
        types: {list: () => undefined},
        onDegradation,
      })

      const neverRegistered = markdownToPortableText('- [x] foo', {
        keyGenerator: createTestKeyGenerator(),
        schema,
      })

      // The decline's only visible effect is losing the `list` container
      // wrapper; every item still resolves through the schema's `task`
      // list, so the flat fallback is lossless and reports nothing.
      expect(omitKeys(declined)).toEqual(omitKeys(neverRegistered))
      expect(declined).toEqual([
        {
          _type: 'block',
          _key: 'k1',
          children: [{_type: 'span', _key: 'k2', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'task',
          level: 1,
          checked: true,
        },
      ])
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('structural list decline on a taskless schema mirrors the flat path: bullet fallback, not dropped structure', () => {
      const declineDegradation = vi.fn<(report: DegradationReport) => void>()
      const flatDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {name: 'list', fields: [{name: 'items', type: 'array'}]},
          ],
          lists: [{name: 'bullet'}],
        }),
      )

      const declined = markdownToPortableText('- [x] foo', {
        keyGenerator: createTestKeyGenerator(),
        schema,
        types: {list: () => undefined},
        onDegradation: declineDegradation,
      })

      const neverRegistered = markdownToPortableText('- [x] foo', {
        keyGenerator: createTestKeyGenerator(),
        schema,
        onDegradation: flatDegradation,
      })

      expect(omitKeys(declined)).toEqual(omitKeys(neverRegistered))
      expect(declined).toEqual([
        {
          _type: 'block',
          _key: 'k1',
          children: [{_type: 'span', _key: 'k2', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
      ])

      const expectedDegradations = [
        {
          type: 'task-checkbox-stripped',
          message:
            'Removed the `[x]` checkbox, kept a plain list item: the schema has no `task` list',
          line: 1,
          snippet: 'foo',
        },
      ]
      expect(declineDegradation.mock.calls[0]![0]!.degradations).toEqual(
        expectedDegradations,
      )
      expect(flatDegradation.mock.calls[0]![0]!.degradations).toEqual(
        expectedDegradations,
      )
    })

    test('structural list decline keeps a nested blockquote as its own block, mirrors the flat path style boundary', () => {
      // A bare style-equality gate would let the callout's `blockquote`
      // paragraph merge into the preceding `normal` paragraph just because
      // both resolved styles happen to already be resolved by the time the
      // merge runs; the flat path never merges across a style change, so
      // neither should the decline fallback.
      const schema = compileSchema(
        defineSchema({
          styles: [{name: 'normal'}, {name: 'blockquote'}],
          lists: [{name: 'bullet'}],
        }),
      )
      const markdown = ['- para one', '', '  > quoted inside item'].join('\n')

      const declined = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
        types: {list: () => undefined},
      })

      const neverRegistered = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
      })

      expect(omitKeys(declined)).toEqual(omitKeys(neverRegistered))
      expect(declined).toEqual([
        {
          _type: 'block',
          _key: 'k1',
          style: 'normal',
          children: [{_type: 'span', _key: 'k2', text: 'para one', marks: []}],
          markDefs: [],
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'block',
          _key: 'k3',
          style: 'blockquote',
          children: [
            {_type: 'span', _key: 'k4', text: 'quoted inside item', marks: []},
          ],
          markDefs: [],
          listItem: 'bullet',
          level: 1,
        },
      ])
    })

    test('structural list decline keeps a declined blockquote restyle stamped, mirrors the flat path', () => {
      // A declined `types.blockquote` restyles its content blocks by
      // spreading into a new object; a `plainParagraphBlocks` gate that
      // keys off object identity loses the block's provenance across that
      // clone, exactly like the fence's fallback-to-text block should never
      // regain it. The enclosing list decline's stampable check must still
      // recognize the restyled block as a plain paragraph.
      const schema = compileSchema(
        defineSchema({
          styles: [{name: 'normal'}, {name: 'blockquote'}],
          lists: [{name: 'bullet'}],
        }),
      )
      const markdown = ['- item text', '', '  > quoted inside item'].join('\n')

      const declined = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
        types: {list: () => undefined, blockquote: () => undefined},
      })

      const neverRegistered = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
      })

      expect(omitKeys(declined)).toEqual(omitKeys(neverRegistered))
      expect(declined).toEqual([
        {
          _type: 'block',
          _key: 'k1',
          style: 'normal',
          children: [{_type: 'span', _key: 'k2', text: 'item text', marks: []}],
          markDefs: [],
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'block',
          _key: 'k3',
          style: 'blockquote',
          children: [
            {_type: 'span', _key: 'k4', text: 'quoted inside item', marks: []},
          ],
          markDefs: [],
          listItem: 'bullet',
          level: 1,
        },
      ])
    })

    test('structural list decline keeps a degraded fence as its own unstamped block, mirrors the flat path', () => {
      // The paragraph and the fence's fallback-to-text both resolve to the
      // same `normal` style, so a style-only merge gate would still wrongly
      // combine them. The flat path never shares `currentBlock` across a
      // fence (it always flushes around one), and never stamps the fence's
      // fallback block with `listItem` at all.
      const schema = compileSchema(
        defineSchema({
          styles: [{name: 'normal'}],
          lists: [{name: 'bullet'}],
        }),
      )
      const markdown = ['- para one', '', '  ```', '  code here', '  ```'].join(
        '\n',
      )

      const declined = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
        types: {list: () => undefined},
      })

      const neverRegistered = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
      })

      expect(omitKeys(declined)).toEqual(omitKeys(neverRegistered))
      expect(declined).toEqual([
        {
          _type: 'block',
          _key: 'k1',
          style: 'normal',
          children: [{_type: 'span', _key: 'k2', text: 'para one', marks: []}],
          markDefs: [],
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'block',
          _key: 'k3',
          style: 'normal',
          children: [{_type: 'span', _key: 'k4', text: 'code here', marks: []}],
          markDefs: [],
        },
      ])
    })

    test('lossless structural blockquote decline: schema has a `blockquote` style, nothing reported', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {
              name: 'blockquote',
              fields: [{name: 'content', type: 'array'}],
            },
          ],
          styles: [{name: 'normal'}, {name: 'blockquote'}],
        }),
      )

      const declined = markdownToPortableText('> foo', {
        keyGenerator: createTestKeyGenerator(),
        schema,
        types: {blockquote: () => undefined},
        onDegradation,
      })

      const neverRegistered = markdownToPortableText('> foo', {
        keyGenerator: createTestKeyGenerator(),
        schema,
      })

      expect(omitKeys(declined)).toEqual(omitKeys(neverRegistered))
      expect(declined).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'blockquote',
        },
      ])
      expect(onDegradation).not.toHaveBeenCalled()
    })

    test('structural blockquote decline on a style-less schema mirrors the flat path, headings included', () => {
      const declineDegradation = vi.fn<(report: DegradationReport) => void>()
      const flatDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {
              name: 'blockquote',
              fields: [{name: 'content', type: 'array'}],
            },
          ],
          styles: [{name: 'normal'}, {name: 'h1'}],
        }),
      )
      const markdown = ['> # Title', '> body'].join('\n')

      const declined = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
        types: {blockquote: () => undefined},
        onDegradation: declineDegradation,
      })

      const neverRegistered = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
        onDegradation: flatDegradation,
      })

      // The flat path keeps the heading's own style; only the plain
      // paragraph picks up `blockquote`.
      expect(omitKeys(declined)).toEqual(omitKeys(neverRegistered))
      expect(declined).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'h1',
          children: [{_type: 'span', _key: 'k1', text: 'Title', marks: []}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          children: [{_type: 'span', _key: 'k3', text: 'body', marks: []}],
          markDefs: [],
        },
      ])

      const expectedDegradations = [
        {
          type: 'style-fallback',
          message:
            'Blockquote became normal paragraphs: the schema has no `blockquote` style',
          line: 1,
        },
      ]
      expect(declineDegradation.mock.calls[0]![0]!.degradations).toEqual(
        expectedDegradations,
      )
      expect(flatDegradation.mock.calls[0]![0]!.degradations).toEqual(
        expectedDegradations,
      )
    })

    test('structural blockquote decline on a schema without `h1`: a heading that already fell back to `normal` mirrors the flat path, not restyled to `blockquote`', () => {
      // The heading's own style resolution already declined to `normal`
      // before the blockquote fallback runs, so by resolved name alone it's
      // indistinguishable from a plain paragraph. The flat path never
      // restyles it (only paragraphs pick up `blockquote`), and neither
      // should the decline fallback: gated on `plainParagraphBlocks`
      // provenance, not the block's resolved style name.
      const schema = compileSchema(
        defineSchema({styles: [{name: 'normal'}, {name: 'blockquote'}]}),
      )
      const markdown = ['> # head', '> body one', '>', '> body two'].join('\n')

      const declined = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
        types: {blockquote: () => undefined},
      })

      const neverRegistered = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
      })

      expect(omitKeys(declined)).toEqual(omitKeys(neverRegistered))
      expect(declined).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [{_type: 'span', _key: 'k1', text: 'head', marks: []}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'blockquote',
          children: [{_type: 'span', _key: 'k3', text: 'body one', marks: []}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k4',
          style: 'blockquote',
          children: [{_type: 'span', _key: 'k5', text: 'body two', marks: []}],
          markDefs: [],
        },
      ])
    })

    test('structural blockquote decline on a codeless schema: a fence fallen back to text mirrors the flat path, not restyled to `blockquote`', () => {
      // The fence's fallback-to-text block resolves to `normal`, same as a
      // plain paragraph would, but the flat path never stamps it with
      // `blockquote` (only paragraphs pick that up), so neither does the
      // decline fallback.
      const schema = compileSchema(
        defineSchema({styles: [{name: 'normal'}, {name: 'blockquote'}]}),
      )
      const markdown = ['> before', '>', '> ```js', '> code()', '> ```'].join(
        '\n',
      )

      const declined = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
        types: {blockquote: () => undefined},
      })

      const neverRegistered = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
        schema,
      })

      expect(omitKeys(declined)).toEqual(omitKeys(neverRegistered))
      expect(declined).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'blockquote',
          children: [{_type: 'span', _key: 'k1', text: 'before', marks: []}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          children: [{_type: 'span', _key: 'k3', text: 'code()', marks: []}],
          markDefs: [],
        },
      ])
    })

    test('annotation dropped: link with an empty href', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('foo [bar]() baz', {
          keyGenerator,
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'annotation-dropped',
          message: 'Removed a link that has no URL, kept its text',
          line: 1,
          snippet: 'bar',
        },
      ])
    })

    test('annotation dropped: undeclared `link` annotation', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      expect(
        markdownToPortableText('foo [bar](https://example.com) baz', {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
          onDegradation,
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'annotation-dropped',
          message:
            'Removed the link, kept its text: the schema has no `link` annotation',
          line: 1,
          snippet: 'bar',
        },
      ])
    })

    test('a consumer throw enforces against lossy output, its message the canonical grouped text', () => {
      const degradingMarkdown = [
        '# foo',
        '',
        '**bar**',
        '',
        '```js',
        'code',
        '```',
      ].join('\n')
      const throwErrorMessage = [
        'Markdown could not be converted without loss:',
        '- line 1: `#` heading became a normal paragraph: the schema has no `h1` style ("foo")',
        '- line 3: Removed bold formatting, kept the text: the schema has no `strong` decorator ("bar")',
        '- line 5: `js` code block became plain text: the schema has no `code` block object ("code")',
      ].join('\n')

      const run = () =>
        markdownToPortableText(degradingMarkdown, {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({})),
          onDegradation: ({message}) => {
            throw new Error(message)
          },
        })

      expect(run).toThrow(Error)

      let thrown: unknown
      try {
        run()
      } catch (error) {
        thrown = error
      }

      expect(thrown).toBeInstanceOf(Error)
      expect((thrown as Error).message).toBe(throwErrorMessage)
    })

    test('a prior call is unaffected by a later call whose consumer throws', () => {
      const degradingMarkdown = ['# foo', '', '**bar**'].join('\n')
      const degradingSchema = compileSchema(defineSchema({}))

      const blocksBeforeThrow = markdownToPortableText(degradingMarkdown, {
        keyGenerator: createTestKeyGenerator(),
        schema: degradingSchema,
      })

      expect(() =>
        markdownToPortableText(degradingMarkdown, {
          keyGenerator: createTestKeyGenerator(),
          schema: degradingSchema,
          onDegradation: ({message}) => {
            throw new Error(message)
          },
        }),
      ).toThrow(Error)

      const blocksAfterThrow = markdownToPortableText(degradingMarkdown, {
        keyGenerator: createTestKeyGenerator(),
        schema: degradingSchema,
      })

      expect(blocksAfterThrow).toEqual(blocksBeforeThrow)
      expect(blocksBeforeThrow).toEqual([
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

    test('clean input never invokes the callback, even a throwing one', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        markdownToPortableText('foo', {
          keyGenerator,
          onDegradation: () => {
            throw new Error('should not run')
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
      ])
    })

    test('groups repeated same-type declines into one line in the canonical message', () => {
      const keyGenerator = createTestKeyGenerator()
      const schema = compileSchema(defineSchema({}))
      const markdown = [
        '**a**',
        '',
        '**b**',
        '',
        '**c**',
        '',
        '| x |',
        '| - |',
        '| y |',
      ].join('\n')

      expect(() =>
        markdownToPortableText(markdown, {
          keyGenerator,
          schema,
          onDegradation: ({message}) => {
            throw new Error(message)
          },
        }),
      ).toThrowError(
        [
          'Markdown could not be converted without loss:',
          '- Removed bold formatting, kept the text: the schema has no `strong` decorator (3\u00d7: "a", "b", "c")',
          '- line 7: Table became plain text blocks, rows and columns lost: the schema has no `table` block object',
        ].join('\n'),
      )
    })

    test('the `degradations` array stays ungrouped, one entry per occurrence, for the same repeated markdown', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const schema = compileSchema(defineSchema({}))
      const markdown = [
        '**a**',
        '',
        '**b**',
        '',
        '**c**',
        '',
        '| x |',
        '| - |',
        '| y |',
      ].join('\n')

      markdownToPortableText(markdown, {
        keyGenerator,
        schema,
        onDegradation,
      })

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'decorator-dropped',
          message:
            'Removed bold formatting, kept the text: the schema has no `strong` decorator',
          line: 1,
          snippet: 'a',
        },
        {
          type: 'decorator-dropped',
          message:
            'Removed bold formatting, kept the text: the schema has no `strong` decorator',
          line: 3,
          snippet: 'b',
        },
        {
          type: 'decorator-dropped',
          message:
            'Removed bold formatting, kept the text: the schema has no `strong` decorator',
          line: 5,
          snippet: 'c',
        },
        {
          type: 'table-flattened',
          message:
            'Table became plain text blocks, rows and columns lost: the schema has no `table` block object',
          line: 7,
        },
      ])
    })

    test('snippet truncation: exactly 40 characters, no ellipsis', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const text = 'x'.repeat(40)

      markdownToPortableText(`**${text}**`, {
        keyGenerator: createTestKeyGenerator(),
        schema: compileSchema(defineSchema({})),
        onDegradation,
      })

      expect(onDegradation.mock.calls[0]![0]!.degradations[0]!.snippet).toBe(
        text,
      )
    })

    test('snippet truncation: 41 characters, cut to 40 with an ellipsis', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const text = 'x'.repeat(41)

      markdownToPortableText(`**${text}**`, {
        keyGenerator: createTestKeyGenerator(),
        schema: compileSchema(defineSchema({})),
        onDegradation,
      })

      expect(onDegradation.mock.calls[0]![0]!.degradations[0]!.snippet).toBe(
        `${'x'.repeat(40)}...`,
      )
    })

    test('snippet truncation: a cut landing mid-surrogate-pair backs off instead of splitting it', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const text = `${'x'.repeat(39)}\u{1F44D}`

      markdownToPortableText(`**${text}**`, {
        keyGenerator: createTestKeyGenerator(),
        schema: compileSchema(defineSchema({})),
        onDegradation,
      })

      const snippet = onDegradation.mock.calls[0]![0]!.degradations[0]!.snippet!
      expect(snippet.isWellFormed()).toBe(true)
      expect(snippet).toBe(`${'x'.repeat(39)}...`)
    })

    test('snippet truncation: quoted content is not escaped, and reads oddly in the message (documented, not fixed)', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      markdownToPortableText('**say "hi" now**', {
        keyGenerator: createTestKeyGenerator(),
        schema: compileSchema(defineSchema({})),
        onDegradation,
      })

      expect(onDegradation.mock.calls[0]![0]!.degradations[0]!.snippet).toBe(
        'say "hi" now',
      )
      expect(onDegradation.mock.calls[0]![0]!.message).toBe(
        [
          'Markdown could not be converted without loss:',
          '- line 1: Removed bold formatting, kept the text: the schema has no `strong` decorator ("say "hi" now")',
        ].join('\n'),
      )
    })

    test('snippet with a hard break: the newline is escaped to literal `\\n`, in both the event and the message', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      markdownToPortableText('**foo  \nbar**', {
        keyGenerator: createTestKeyGenerator(),
        schema: compileSchema(defineSchema({})),
        onDegradation,
      })

      expect(onDegradation.mock.calls[0]![0]!.degradations[0]!.snippet).toBe(
        'foo\\nbar',
      )
      expect(onDegradation.mock.calls[0]![0]!.message).toBe(
        [
          'Markdown could not be converted without loss:',
          '- line 1: Removed bold formatting, kept the text: the schema has no `strong` decorator ("foo\\nbar")',
        ].join('\n'),
      )
    })

    test('empty snippet is omitted, not rendered as `("")`: link decline with no text', () => {
      const onDegradation = vi.fn<(report: DegradationReport) => void>()

      markdownToPortableText('foo [](http://example.com) bar', {
        keyGenerator: createTestKeyGenerator(),
        schema: compileSchema(defineSchema({})),
        onDegradation,
      })

      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'annotation-dropped',
          message:
            'Removed the link, kept its text: the schema has no `link` annotation',
          line: 1,
        },
      ])
      expect(onDegradation.mock.calls[0]![0]!.message).toBe(
        [
          'Markdown could not be converted without loss:',
          '- line 1: Removed the link, kept its text: the schema has no `link` annotation',
        ].join('\n'),
      )
    })

    test('grouped message: a lines-only suffix always leads with the count, like the snippet and none-of-the-above shapes', () => {
      // `types.list` always declines, and the schema has no `bullet` list,
      // so both the nested and the outer list report the same message: the
      // group has two entries with lines but no snippets.
      const markdown = ['- outer', '  - inner'].join('\n')

      expect(() =>
        markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {name: 'list', fields: [{name: 'items', type: 'array'}]},
              ],
            }),
          ),
          types: {list: () => undefined},
          onDegradation: ({message}) => {
            throw new Error(message)
          },
        }),
      ).toThrowError(
        [
          'Markdown could not be converted without loss:',
          '- Bullet list became plain paragraphs: the schema has no `bullet` list (2\u00d7: lines 1, 2)',
        ].join('\n'),
      )
    })

    test('grouped message: a lines-only suffix dedupes a line repeated by several entries, not just sorts it', () => {
      // All three cells' `fields-dropped` events pin to the same table start
      // line (inline tokens inside a cell carry no map of their own), so
      // the group's line list has one line repeated three times: the count
      // already says how many, the list should say which lines, once each.
      const markdown = [
        '| a |',
        '| - |',
        '| ![x](a.png) |',
        '| ![y](b.png) |',
        '| ![z](c.png) |',
      ].join('\n')

      expect(() =>
        markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {name: 'image', fields: [{name: 'src', type: 'string'}]},
                {
                  name: 'table',
                  fields: [
                    {name: 'headerRows', type: 'number'},
                    {name: 'rows', type: 'array'},
                  ],
                },
              ],
            }),
          ),
          onDegradation: ({message}) => {
            throw new Error(message)
          },
        }),
      ).toThrowError(
        [
          'Markdown could not be converted without loss:',
          "- Dropped `alt` from `image`: not in the schema's `image` fields (3\u00d7: lines 1)",
        ].join('\n'),
      )
    })

    test('grouped message: caps a per-group list at 5 entries, tailed with `and N more`', () => {
      const markdown = [
        '**a**',
        '',
        '**b**',
        '',
        '**c**',
        '',
        '**d**',
        '',
        '**e**',
        '',
        '**f**',
      ].join('\n')

      expect(() =>
        markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({})),
          onDegradation: ({message}) => {
            throw new Error(message)
          },
        }),
      ).toThrowError(
        [
          'Markdown could not be converted without loss:',
          '- Removed bold formatting, kept the text: the schema has no `strong` decorator (6\u00d7: "a", "b", "c", "d", "e", and 1 more)',
        ].join('\n'),
      )
    })

    test("grouped message: groups sort by their minimum line, not their first-encountered entry's", () => {
      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {
              name: 'blockquote',
              fields: [{name: 'content', type: 'array'}],
            },
          ],
        }),
      )
      // The outer blockquote (line 1) closes last, so its `style-fallback`
      // entry (line 1) arrives after the inner one's (line 4): the group's
      // first-encountered line is 4, but its minimum is 1. The unrelated
      // `**bar**` on line 3 falls strictly between the two, so sorting by
      // minimum (not first-encountered) line changes which group leads.
      const markdown = ['> foo', '>', '> **bar**', '>> baz'].join('\n')

      expect(() =>
        markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
          schema,
          types: {blockquote: () => undefined},
          onDegradation: ({message}) => {
            throw new Error(message)
          },
        }),
      ).toThrowError(
        [
          'Markdown could not be converted without loss:',
          '- Blockquote became normal paragraphs: the schema has no `blockquote` style (2\u00d7: lines 1, 4)',
          '- line 3: Removed bold formatting, kept the text: the schema has no `strong` decorator ("bar")',
        ].join('\n'),
      )
    })

    test('object carrier invalid: a `json:object` fence with malformed JSON falls back to a code block', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const markdown = ['```json:object', '{"_type": "product",', '```'].join(
        '\n',
      )

      expect(
        markdownToPortableText(markdown, {keyGenerator, onDegradation}),
      ).toEqual([
        {
          _type: 'code',
          _key: 'k0',
          code: '{"_type": "product",',
          language: 'json:object',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'object-carrier-invalid',
          message:
            '`json:object` fence fell back to a code block: the payload is not valid JSON',
          line: 1,
          snippet: '{"_type": "product",',
        },
      ])
    })

    test('object carrier invalid: a `json:object` fence missing `_type` falls back to a code block', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const markdown = ['```json:object', '{"sku": "abc-123"}', '```'].join(
        '\n',
      )

      expect(
        markdownToPortableText(markdown, {keyGenerator, onDegradation}),
      ).toEqual([
        {
          _type: 'code',
          _key: 'k0',
          code: '{"sku": "abc-123"}',
          language: 'json:object',
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'object-carrier-invalid',
          message:
            '`json:object` fence fell back to a code block: the payload has no string `_type`',
          line: 1,
          snippet: '{"sku": "abc-123"}',
        },
      ])
    })

    test('object carrier invalid: a `json:object`-tagged code span with malformed JSON stays a plain code span', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const markdown = 'json:object`{"_type":"stockTicker"`'

      expect(
        markdownToPortableText(markdown, {keyGenerator, onDegradation}),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 'k1', text: 'json:object', marks: []},
            {
              _type: 'span',
              _key: 'k2',
              text: '{"_type":"stockTicker"',
              marks: ['code'],
            },
          ],
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'object-carrier-invalid',
          message:
            '`json:object`-tagged code span fell back to a plain code span: the payload is not valid JSON',
          line: 1,
          snippet: '{"_type":"stockTicker"',
        },
      ])
    })

    test('object carrier invalid: a `json:object`-tagged code span missing `_type` stays a plain code span', () => {
      const keyGenerator = createTestKeyGenerator()
      const onDegradation = vi.fn<(report: DegradationReport) => void>()
      const markdown = 'json:object`{"symbol":"AAPL"}`'

      expect(
        markdownToPortableText(markdown, {keyGenerator, onDegradation}),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 'k1', text: 'json:object', marks: []},
            {
              _type: 'span',
              _key: 'k2',
              text: '{"symbol":"AAPL"}',
              marks: ['code'],
            },
          ],
        },
      ])

      expect(onDegradation).toHaveBeenCalledTimes(1)
      expect(onDegradation.mock.calls[0]![0]!.degradations).toEqual([
        {
          type: 'object-carrier-invalid',
          message:
            '`json:object`-tagged code span fell back to a plain code span: the payload has no string `_type`',
          line: 1,
          snippet: '{"symbol":"AAPL"}',
        },
      ])
    })
  })
})

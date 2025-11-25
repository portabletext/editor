import {
  compileSchema,
  defineSchema,
  type BlockObjectDefinition,
} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {defaultSchema} from './default-schema'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'
import {buildObjectMatcher} from './to-portable-text/matchers'

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
                {_type: 'span', _key: 'k3', text: 'bar\nbaz', marks: []},
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
                {_type: 'span', _key: 'k3', text: 'bar\nbaz', marks: []},
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
                {_type: 'span', _key: 'k3', text: 'bar\nbaz', marks: []},
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
            _type: 'code',
            _key: 'k0',
            code: `const foo = 'bar'\nconst bar = 'baz'`,
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

    test('no table matcher', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
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
  })
})

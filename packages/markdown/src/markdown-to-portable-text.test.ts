import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'

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

  test('hard breaks', () => {
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
          children: [{_type: 'span', _key: 'k1', text: 'foo  baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

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
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
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
    })
  })

  describe('horizontal rule', () => {
    test('default definition', () => {
      const keyGenerator = createTestKeyGenerator()
      expect(markdownToPortableText('---', {keyGenerator})).toEqual([
        {
          _type: 'break',
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
            defineSchema({blockObjects: [{name: 'horizontal rule'}]}),
          ),
          types: {
            horizontalRule: ({context}) => ({
              _key: context.keyGenerator(),
              _type: 'horizontal rule',
            }),
          },
        }),
      ).toEqual([
        {
          _type: 'horizontal rule',
          _key: 'k0',
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
      ).toEqual([])
    })
  })

  describe('code block', () => {
    test('default definition', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['```js', `const foo = 'bar'`, '```'].join('\n')
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'code',
          _key: 'k0',
          code: `const foo = 'bar'\n`,
          language: 'js',
        },
      ])
    })

    test('no language field', () => {
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
          code: `const foo = 'bar'\n`,
        },
      ])
    })

    test('no code block definition', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['```js', `const foo = 'bar'`, '```'].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          // Overriding the default schema with an empty one
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
              text: "const foo = 'bar'\n",
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('custom code block definition', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['```js', `const foo = 'bar'`, '```'].join('\n')
      expect(
        markdownToPortableText(markdown, {
          // Add an optional key generator
          keyGenerator,
          // Add a custom schema
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
          indhold: "const foo = 'bar'\n",
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
          code: 'const foo = "bar"\n',
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
        ).toEqual([])
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
    test('simple table', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = [
        '| Header 1 | Header 2 |',
        '|----------|----------|',
        '| Cell 1   | Cell 2   |',
        '| Cell 3   | Cell 4   |',
      ].join('\n')
      expect(markdownToPortableText(markdown, {keyGenerator})).toEqual([
        {
          _type: 'table',
          _key: 'k0',
          rows: [
            {cells: ['Header 1', 'Header 2']},
            {cells: ['Cell 1', 'Cell 2']},
            {cells: ['Cell 3', 'Cell 4']},
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
          _key: 'k0',
          data: [{cells: ['A', 'B']}, {cells: ['1', '2']}],
        },
      ])
    })

    test('no table definition', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdown = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n')
      expect(
        markdownToPortableText(markdown, {
          keyGenerator,
          schema: compileSchema(defineSchema({})),
        }),
      ).toEqual([])
    })
  })
})

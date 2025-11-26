import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {
  isPortableTextBlock,
  isPortableTextListItemBlock,
} from '@portabletext/toolkit'
import {describe, expect, test} from 'vitest'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {DefaultListItemRenderer} from './from-portable-text/renderers/list-item'
import {
  DefaultCodeBlockRenderer,
  DefaultTableRenderer,
} from './from-portable-text/renderers/type'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'
import {buildObjectMatcher} from './to-portable-text/matchers'

describe(portableTextToMarkdown.name, () => {
  test('empty array', () => {
    const markdown = ''
    const portableText = markdownToPortableText(markdown)
    expect(portableTextToMarkdown(portableText)).toBe(markdown)
  })

  describe('paragraph', () => {
    test('one paragraph', () => {
      const markdown = 'foo'
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('one paragraph with hard breaks', () => {
      const markdown = 'foo  \nbar  \nbaz'
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('multiple lines', () => {
      const markdown = ['foo', '', 'bar', '', 'baz'].join('')
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })
  })

  describe('block spacing', () => {
    const markdown = ['foo', '', 'bar', '', 'baz', '', '- fizz', '- buzz'].join(
      '\n',
    )
    const portableText = markdownToPortableText(markdown)

    test('default', () => {
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('custom list item spacing', () => {
      expect(
        portableTextToMarkdown(portableText, {
          blockSpacing: ({current, next}) => {
            if (
              isPortableTextListItemBlock(current) &&
              isPortableTextListItemBlock(next)
            ) {
              return '\n\n'
            }

            return undefined
          },
        }),
      ).toBe(
        ['foo', '', 'bar', '', 'baz', '', '- fizz', '', '- buzz'].join('\n'),
      )
    })

    test('custom blockquote spacing', () => {
      const markdown = ['foo', '', '> bar', '>', '> baz', '', 'fizz'].join('\n')
      const portableText = markdownToPortableText(markdown)
      expect(
        portableTextToMarkdown(portableText, {
          blockSpacing: ({current, next}) => {
            if (
              isPortableTextBlock(current) &&
              isPortableTextBlock(next) &&
              current.style === 'blockquote' &&
              next.style === 'blockquote'
            ) {
              return '\n\n'
            }

            return undefined
          },
        }),
      ).toBe(['foo', '', '> bar', '', '> baz', '', 'fizz'].join('\n'))
    })
  })

  describe('decorators', () => {
    describe('strong', () => {
      const markdown = 'foo **bar** baz'
      const portableText = markdownToPortableText(markdown)

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      test('custom renderer', () => {
        expect(
          portableTextToMarkdown(portableText, {
            marks: {
              strong: ({children}) => `*${children}*`,
            },
          }),
        ).toBe('foo *bar* baz')
      })
    })

    describe('emphasis', () => {
      const markdown = 'foo _bar_ baz'
      const portableText = markdownToPortableText(markdown)

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })
    })

    describe('strike-through', () => {
      const markdown = 'foo ~~bar~~ baz'
      const portableText = markdownToPortableText(markdown)

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })
    })
  })

  describe('link', () => {
    const markdown = 'foo [bar](https://example.com) baz'
    const portableText = markdownToPortableText(markdown)

    test('default renderer', () => {
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('custom renderer', () => {
      expect(
        portableTextToMarkdown(portableText, {
          marks: {
            link: ({children, value}) =>
              `<a href="${value.href}">${children}</a>`,
          },
        }),
      ).toBe('foo <a href="https://example.com">bar</a> baz')
    })

    test('with title', () => {
      const markdown = 'foo [bar](https://example.com "Link Title") baz'
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })
  })

  describe('hard breaks', () => {
    test('default', () => {
      const markdown = 'foo  \nbar  \nbaz'
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('trailing newline', () => {
      const markdownIn = 'foo\n'
      const markdownOut = 'foo'
      const portableText = markdownToPortableText(markdownIn)
      expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
    })

    test('custom renderer', () => {
      const markdownIn = 'foo  \nbar  \nbaz'
      const markdownOut = 'foo<br />bar<br />baz'
      const portableText = markdownToPortableText(markdownIn)
      expect(
        portableTextToMarkdown(portableText, {
          hardBreak: () => '<br />',
        }),
      ).toBe(markdownOut)
    })

    test('from explicit PT with newline in span', () => {
      const portableText = [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [{_type: 'span', _key: 'k1', text: 'foo\nbar', marks: []}],
          markDefs: [],
        },
      ]
      expect(portableTextToMarkdown(portableText)).toBe('foo  \nbar')
    })

    test('multiple hard breaks from explicit PT', () => {
      const portableText = [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo\nbar\nbaz', marks: []},
          ],
          markDefs: [],
        },
      ]
      expect(portableTextToMarkdown(portableText)).toBe('foo  \nbar  \nbaz')
    })

    test('hard break in list item from explicit PT', () => {
      const portableText = [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          listItem: 'bullet',
          level: 1,
          children: [{_type: 'span', _key: 'k1', text: 'foo\nbar', marks: []}],
          markDefs: [],
        },
      ]
      expect(portableTextToMarkdown(portableText)).toBe('- foo  \nbar')
    })
  })

  describe('paragraphs', () => {
    const markdown = 'foo\n\nbar\n\nbaz'

    test('default definition', () => {
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('custom definition', () => {
      const schema = compileSchema(
        defineSchema({styles: [{name: 'paragraph'}]}),
      )
      const portableText = markdownToPortableText(markdown, {
        schema,
        block: {
          normal: () => 'paragraph',
        },
      })
      expect(
        portableTextToMarkdown(portableText, {
          block: {
            paragraph: ({children}) => `${children}`,
          },
        }),
      ).toBe(markdown)
    })

    test('no definition', () => {
      const schema = compileSchema(defineSchema({}))
      const portableText = markdownToPortableText(markdown, {schema})
      expect(portableTextToMarkdown(portableText)).toBe('foo\n\nbar\n\nbaz')
    })
  })

  describe('style', () => {
    describe('blockquote', () => {
      describe('single', () => {
        const markdown = '> foo'

        test('default renderer', () => {
          const portableText = markdownToPortableText(markdown)
          expect(portableTextToMarkdown(portableText)).toBe(markdown)
        })

        test('custom renderer', () => {
          const portableText = markdownToPortableText(markdown)
          expect(
            portableTextToMarkdown(portableText, {
              block: {blockquote: ({children}) => `q:${children}`},
            }),
          ).toBe('q:foo')
        })
      })

      describe('single with hard break', () => {
        const markdown = '> foo  \n> bar'

        test('default renderer', () => {
          const portableText = markdownToPortableText(markdown)
          expect(portableTextToMarkdown(portableText)).toBe(markdown)
        })

        test('custom renderer', () => {
          const portableText = markdownToPortableText(markdown)
          expect(
            portableTextToMarkdown(portableText, {
              block: {blockquote: ({children}) => `q:${children}`},
            }),
          ).toBe('q:foo  \nbar')
        })
      })

      describe('multiple lines', () => {
        const markdown = '> foo\n>\n> bar'
        const portableText = markdownToPortableText(markdown)

        test('default renderer', () => {
          expect(portableTextToMarkdown(portableText)).toBe(markdown)
        })

        test('custom renderer', () => {
          expect(
            portableTextToMarkdown(portableText, {
              block: {
                blockquote: ({children}) => `q:${children}`,
              },
              blockSpacing: ({current, next}) => {
                if (
                  isPortableTextBlock(current) &&
                  isPortableTextBlock(next) &&
                  current.style === 'blockquote' &&
                  next.style === 'blockquote'
                ) {
                  return '\nq:\n'
                }

                return undefined
              },
            }),
          ).toBe('q:foo\nq:\nq:bar')
        })
      })

      describe('nested', () => {
        const markdown = '> foo\n>> bar'
        const portableText = markdownToPortableText(markdown)

        test('default renderer', () => {
          expect(portableTextToMarkdown(portableText)).toBe('> foo\n>\n> bar')
        })

        test('custom renderer', () => {
          expect(
            portableTextToMarkdown(portableText, {
              block: {
                blockquote: ({children}) => `q:${children}`,
              },
              blockSpacing: ({current, next}) => {
                if (
                  isPortableTextBlock(current) &&
                  isPortableTextBlock(next) &&
                  current.style === 'blockquote' &&
                  next.style === 'blockquote'
                ) {
                  return '\nq:\n'
                }

                return undefined
              },
            }),
          ).toBe('q:foo\nq:\nq:bar')
        })
      })
    })

    describe('h1', () => {
      const markdown = '# foo'
      const portableText = markdownToPortableText(markdown)

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      test('custom renderer', () => {
        expect(
          portableTextToMarkdown(portableText, {
            block: {h1: ({children}) => `h1:${children}`},
          }),
        ).toBe('h1:foo')
      })
    })

    describe('unknown style', () => {
      const markdown = '# foo'
      const portableText = markdownToPortableText(markdown, {
        schema: compileSchema(defineSchema({styles: [{name: 'heading 1'}]})),
        block: {h1: () => 'heading 1'},
      })

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe('foo')
      })

      test('custom renderer', () => {
        expect(
          portableTextToMarkdown(portableText, {
            block: {
              'heading 1': ({children}) => `# ${children}`,
            },
          }),
        ).toBe(markdown)
      })
    })
  })

  describe('list items', () => {
    describe('unordered', () => {
      const markdown = '- foo'

      test('default render', () => {
        const portableText = markdownToPortableText(markdown)
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      describe('unknown list item', () => {
        const schema = compileSchema(defineSchema({lists: [{name: 'dot'}]}))
        const portableText = markdownToPortableText(markdown, {
          schema,
          listItem: {bullet: () => 'dot'},
        })

        test('default renderer', () => {
          expect(portableTextToMarkdown(portableText)).toBe(markdown)
        })

        test('pluggable default renderer', () => {
          expect(
            portableTextToMarkdown(portableText, {
              listItem: {
                dot: DefaultListItemRenderer,
              },
            }),
          ).toBe(markdown)
        })
      })

      test('no definition', () => {
        const schema = compileSchema(defineSchema({}))
        const portableText = markdownToPortableText(markdown, {schema})
        expect(portableTextToMarkdown(portableText)).toBe('foo')
      })
    })
  })

  describe('lists', () => {
    const markdown = ['- foo', '   - bar', '      - baz'].join('\n')

    test('default definition', () => {
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('custom definition', () => {
      const markdownOut = ['• foo', '  • bar', '    • baz'].join('\n')
      const schema = compileSchema(defineSchema({lists: [{name: 'dot'}]}))
      const portableText = markdownToPortableText(markdown, {
        schema,
        listItem: {bullet: () => 'dot'},
      })
      expect(
        portableTextToMarkdown(portableText, {
          listItem: {
            dot: ({children, value}) => {
              const level = value.level || 1
              const indent = '  '.repeat(level - 1)
              return `${indent}• ${children}`
            },
          },
        }),
      ).toBe(markdownOut)
    })

    test('no definition', () => {
      const schema = compileSchema(defineSchema({}))
      const portableText = markdownToPortableText(markdown, {schema})
      expect(portableTextToMarkdown(portableText)).toBe('foo\n\nbar\n\nbaz')
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
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })
  })

  describe('block image', () => {
    const markdownIn =
      'foo\n\n![alt text](https://example.com/image.png)\n\nbar'

    describe('supported by deserializer', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('default renderer', () => {
        const markdownOut = [
          'foo',
          '',
          '```json',
          '{',
          '  "_key": "k3",',
          '  "_type": "image",',
          '  "src": "https://example.com/image.png",',
          '  "alt": "alt text"',
          '}',
          '```',
          '',
          'bar',
        ].join('\n')
        expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
      })

      test('custom renderer', () => {
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              image: ({value}) => `![${value.alt}](${value.src})`,
            },
          }),
        ).toBe(markdownIn)
      })
    })

    test('not supported by deserializer', () => {
      const portableText = markdownToPortableText(markdownIn, {
        schema: compileSchema(defineSchema({})),
      })
      expect(portableTextToMarkdown(portableText)).toBe(markdownIn)
    })
  })

  describe('inline image', () => {
    const keyGenerator = createTestKeyGenerator()
    const markdown = 'foo ![alt text](https://example.com/image.png) bar'

    describe('supported by deserializer', () => {
      const portableText = markdownToPortableText(markdown, {keyGenerator})

      test('default renderer', () => {
        const markdownOut = [
          'foo ',
          '```json',
          '{',
          '  "_key": "k2",',
          '  "_type": "image",',
          '  "src": "https://example.com/image.png",',
          '  "alt": "alt text"',
          '}',
          '```',
          ' bar',
        ].join('\n')
        expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
      })

      test('custom renderer', () => {
        const markdownOut = 'foo ![alt text](https://example.com/image.png) bar'
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              image: ({value}) => `![${value.alt}](${value.src})`,
            },
          }),
        ).toBe(markdownOut)
      })

      test('skip inline images by returning empty string', () => {
        const markdownOut = 'foo  bar'
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              image: () => '',
            },
          }),
        ).toBe(markdownOut)
      })

      test('render block images but skip inline images', () => {
        const blockAndInlineImages = [
          {
            _type: 'image',
            _key: 'block-img',
            src: 'https://example.com/block.png',
            alt: 'block image',
          },
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            children: [
              {_type: 'span', _key: 's1', text: 'text with ', marks: []},
              {
                _type: 'image',
                _key: 'inline-img',
                src: 'https://example.com/inline.png',
                alt: 'inline image',
              },
              {_type: 'span', _key: 's2', text: ' inside', marks: []},
            ],
            markDefs: [],
          },
        ]
        const markdownOut =
          '![block image](https://example.com/block.png)\n\ntext with  inside'
        expect(
          portableTextToMarkdown(blockAndInlineImages, {
            types: {
              image: ({value, isInline}) =>
                isInline ? '' : `![${value.alt}](${value.src})`,
            },
          }),
        ).toBe(markdownOut)
      })
    })

    test('not supported by deserializer', () => {
      const portableText = markdownToPortableText(markdown, {
        schema: compileSchema(defineSchema({})),
      })
      const markdownOut = 'foo ![alt text](https://example.com/image.png) bar'
      expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
    })
  })

  describe('code block', () => {
    describe('single line', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn = ['```js', `const foo = 'bar'`, '```'].join('\n')
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('default renderer', () => {
        const markdownOut = [
          '```json',
          '{',
          '  "_key": "k0",',
          '  "_type": "code",',
          '  "language": "js",',
          '  "code": "const foo = \'bar\'"',
          '}',
          '```',
        ].join('\n')
        expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
      })

      test('custom renderer', () => {
        const markdownOut = ['```js', `const foo = 'bar'`, '```'].join('\n')
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              code: ({value}) =>
                `\`\`\`${value.language}\n${value.code}\n\`\`\``,
            },
          }),
        ).toBe(markdownOut)
      })

      test('no language field', () => {
        const markdownOut = ['```', `const foo = 'bar'`, '```'].join('\n')
        const portableText = markdownToPortableText(markdownIn, {
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {name: 'code', fields: [{name: 'code', type: 'string'}]},
              ],
            }),
          ),
        })

        expect(
          portableTextToMarkdown(portableText, {
            types: {
              code: ({value}) => `\`\`\`\n${value.code}\n\`\`\``,
            },
          }),
        ).toBe(markdownOut)
      })

      test('no code field', () => {
        const markdownOut = "const foo = 'bar'"
        const portableText = markdownToPortableText(markdownIn, {
          schema: compileSchema(
            defineSchema({
              blockObjects: [
                {name: 'code', fields: [{name: 'language', type: 'string'}]},
              ],
            }),
          ),
        })

        expect(
          portableTextToMarkdown(portableText, {
            types: {
              code: ({value}) => `\`\`\`\n${value.code}\n\`\`\``,
            },
          }),
        ).toBe(markdownOut)
      })
    })

    describe('multiple lines', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn = [
        '```js',
        `const foo = 'bar'`,
        `const bar = 'baz'`,
        '```',
      ].join('\n')
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('default renderer', () => {
        const markdownOut = [
          '```json',
          '{',
          '  "_key": "k0",',
          '  "_type": "code",',
          '  "language": "js",',
          '  "code": "const foo = \'bar\'\\nconst bar = \'baz\'"',
          '}',
          '```',
        ].join('\n')
        expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
      })

      test('pluggable default renderer', () => {
        const markdownOut = [
          '```js',
          `const foo = 'bar'`,
          `const bar = 'baz'`,
          '```',
        ].join('\n')
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              code: DefaultCodeBlockRenderer,
            },
          }),
        ).toBe(markdownOut)
      })
    })
  })

  describe('tables', () => {
    describe('simple table', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn = [
        '| Header 1 | Header 2 |',
        '| -------- | -------- |',
        '| Cell 1   | Cell 2   |',
        '| Cell 3   | Cell 4   |',
      ].join('\n')
      const tableObjectDefinition = {
        name: 'table',
        fields: [
          {name: 'headerRows', type: 'number'},
          {name: 'rows', type: 'array'},
        ],
      } as const
      const schema = compileSchema(
        defineSchema({
          blockObjects: [tableObjectDefinition],
        }),
      )
      const portableText = markdownToPortableText(markdownIn, {
        keyGenerator,
        schema,
        types: {
          table: buildObjectMatcher(tableObjectDefinition),
        },
      })

      test('default renderer', () => {
        const markdownOut = [
          '```json',
          JSON.stringify(portableText.at(0), null, 2),
          '```',
        ].join('\n')

        expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
      })

      test('pluggable default renderer', () => {
        const markdownOut = [
          '| Header 1 | Header 2 |',
          '| --- | --- |',
          '| Cell 1 | Cell 2 |',
          '| Cell 3 | Cell 4 |',
        ].join('\n')

        expect(
          portableTextToMarkdown(portableText, {
            types: {
              table: DefaultTableRenderer,
            },
          }),
        ).toBe(markdownOut)
      })
    })
  })
})

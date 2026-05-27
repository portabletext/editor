import {
  compileSchema,
  defineSchema,
  type BlockObjectDefinition,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {
  isPortableTextBlock,
  isPortableTextListItemBlock,
} from '@portabletext/toolkit'
import {describe, expect, test} from 'vitest'
import {defaultSchema} from './default-schema'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {DefaultListItemRenderer} from './from-portable-text/renderers/list-item'
import {
  DefaultBlockquoteObjectRenderer,
  DefaultCalloutRenderer,
  DefaultCodeBlockRenderer,
  DefaultImageRenderer,
  DefaultListRenderer,
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

    test('with quote in title', () => {
      const keyGenerator = createTestKeyGenerator()
      const linkKey = keyGenerator()
      const portableText = [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'click here',
              marks: [linkKey],
            },
          ],
          style: 'normal',
          markDefs: [
            {
              _key: linkKey,
              _type: 'link',
              href: 'https://example.com',
              title: 'My "Cool" Page',
            },
          ],
        },
      ]
      expect(portableTextToMarkdown(portableText)).toBe(
        '[click here](https://example.com "My \\"Cool\\" Page")',
      )
    })

    test('escaped link', () => {
      const markdownIn = 'foo [b\\[ar](https://example.com) baz'
      const markdownOut = 'foo [b\\[ar](https://example.com) baz'
      const portableText = markdownToPortableText(markdownIn)
      expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
    })

    test('link with bracket in text', () => {
      const keyGenerator = createTestKeyGenerator()
      const linkKey = keyGenerator()
      const portableText = [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'foo ',
              marks: [],
            },
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'b[ar',
              marks: [linkKey],
            },
            {
              _key: keyGenerator(),
              _type: 'span',
              text: ' baz',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [
            {
              _key: linkKey,
              _type: 'link',
              href: 'https://example.com',
            },
          ],
        },
      ]
      expect(portableTextToMarkdown(portableText)).toBe(
        'foo [b\\[ar](https://example.com) baz',
      )
    })

    test('link with bracket in text and link', () => {
      const keyGenerator = createTestKeyGenerator()
      const linkKey = keyGenerator()
      const portableText = [
        {
          _type: 'block',
          _key: keyGenerator(),
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'foo ',
              marks: [],
            },
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'b[ar',
              marks: [linkKey],
            },
            {
              _type: 'span',
              _key: keyGenerator(),
              text: ' baz',
              marks: [],
            },
          ],
          markDefs: [
            {
              _key: linkKey,
              _type: 'link',
              href: 'https://en.wikipedia.org/wiki/Antenna_(radio)',
            },
          ],
        },
      ]
      expect(portableTextToMarkdown(portableText)).toBe(
        'foo [b\\[ar](https://en.wikipedia.org/wiki/Antenna_(radio)) baz',
      )
    })

    test('link with backslash in text', () => {
      const markdownIn = 'foo [b\\ar](https://example.com) baz'
      const markdownOut = 'foo [b\\\\ar](https://example.com) baz'
      const portableText = markdownToPortableText(markdownIn)
      expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
    })

    test('link with backslash before bracket in text', () => {
      const keyGenerator = createTestKeyGenerator()
      const linkKey = keyGenerator()
      const portableText = [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'foo ',
              marks: [],
            },
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'b\\]ar',
              marks: [linkKey],
            },
            {
              _key: keyGenerator(),
              _type: 'span',
              text: ' baz',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [
            {
              _key: linkKey,
              _type: 'link',
              href: 'https://example.com',
            },
          ],
        },
      ]
      // Should produce: click [a\\\]b](https://example.com) here
      // But currently produces: click [a\\]b](https://example.com) here
      // which parses as link text "a\" with "b](..." outside the link
      expect(portableTextToMarkdown(portableText)).toBe(
        'foo [b\\\\\\]ar](https://example.com) baz',
      )
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

    describe('task', () => {
      test('unchecked task round-trip', () => {
        const markdown = '- [ ] foo'
        const portableText = markdownToPortableText(markdown)
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      test('checked task round-trip', () => {
        const markdown = '- [x] foo'
        const portableText = markdownToPortableText(markdown)
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      test('mixed task and bullet round-trip', () => {
        const markdown = ['- [ ] todo', '- done', '- [x] also done'].join('\n')
        const portableText = markdownToPortableText(markdown)
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      test('task nested under bullet round-trip', () => {
        const markdown = ['- foo', '   - [x] bar'].join('\n')
        const portableText = markdownToPortableText(markdown)
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      test('renders unchecked task from explicit portable text', () => {
        expect(
          portableTextToMarkdown([
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
          ]),
        ).toBe('- [ ] foo')
      })

      test('missing checked field renders as unchecked', () => {
        expect(
          portableTextToMarkdown([
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
              listItem: 'task',
              level: 1,
            },
          ]),
        ).toBe('- [ ] foo')
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

    const inOpts = (keyGenerator: () => string) => ({
      keyGenerator,
      schema: schemaWithList,
      types: {
        list: buildObjectMatcher(listObjectDefinition),
      },
    })

    const outOpts = {
      types: {
        list: DefaultListRenderer,
      },
    }

    test('simple bullet list', () => {
      const markdown = ['- one', '- two'].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
    })

    test('ordered list', () => {
      const markdown = ['1. first', '2. second', '3. third'].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
    })

    test('task list with checked state', () => {
      const markdown = ['- [x] done', '- [ ] todo'].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
    })

    test('nested bullet list', () => {
      const markdown = ['- one', '  - nested', '- two'].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
    })

    test('list item with code block', () => {
      // A list item with multi-block content (text + code block) is "loose"
      // and needs blank lines between items in the canonical output. The
      // input also has the blank line so the round-trip is byte-identical.
      const markdown = [
        '- hello',
        '',
        '  ```js',
        "  console.log('hi')",
        '  ```',
        '',
        '- world',
      ].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(
        portableTextToMarkdown(portableText, {
          types: {
            list: DefaultListRenderer,
            code: DefaultCodeBlockRenderer,
          },
        }),
      ).toBe(markdown)
    })

    test('multi-paragraph item', () => {
      const markdown = ['- one', '', '  para two', '', '- three'].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
    })

    test('mixed nested types', () => {
      // The continuation indent under `1. ` is 3 columns, not 2. Without
      // matching the marker width the bullet child gets parsed as a
      // sibling list rather than a nested one.
      const markdown = ['1. ordered', '   - nested bullet', '2. second'].join(
        '\n',
      )
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
    })

    test('two-digit ordered marker uses 4-column continuation indent', () => {
      // Items 10 onwards have a 4-character marker (`10. `), so the
      // continuation indent grows accordingly. A second paragraph attached
      // to item 10 must indent 4 columns to bind to the same item.
      const markdown = [
        '1. item 1',
        '',
        '2. item 2',
        '',
        '3. item 3',
        '',
        '4. item 4',
        '',
        '5. item 5',
        '',
        '6. item 6',
        '',
        '7. item 7',
        '',
        '8. item 8',
        '',
        '9. item 9',
        '',
        '10. item 10',
        '',
        '    second paragraph under item 10',
        '',
        '11. item 11',
      ].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
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

    const inOpts = (keyGenerator: () => string) => ({
      keyGenerator,
      schema: schemaWithBlockquote,
      types: {
        blockquote: buildObjectMatcher(blockquoteObjectDefinition),
      },
    })

    const outOpts = {
      types: {
        blockquote: DefaultBlockquoteObjectRenderer,
      },
    }

    test('simple blockquote', () => {
      const markdown = '> one'
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
    })

    test('multi-paragraph blockquote', () => {
      const markdown = ['> one', '>', '> two'].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
    })

    test('nested blockquote', () => {
      const markdown = ['> outer', '>', '> > inner'].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(portableTextToMarkdown(portableText, outOpts)).toBe(markdown)
    })

    test('blockquote with code block', () => {
      const markdown = [
        '> intro',
        '>',
        '> ```js',
        "> console.log('hi')",
        '> ```',
      ].join('\n')
      const keyGenerator = createTestKeyGenerator()
      const portableText = markdownToPortableText(
        markdown,
        inOpts(keyGenerator),
      )
      expect(
        portableTextToMarkdown(portableText, {
          types: {
            blockquote: DefaultBlockquoteObjectRenderer,
            code: DefaultCodeBlockRenderer,
          },
        }),
      ).toBe(markdown)
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

    test('image with brackets in alt text', () => {
      const portableText = [
        {
          _type: 'image',
          _key: 'img1',
          src: 'https://example.com/image.png',
          alt: 'photo [1]',
        },
      ]
      expect(
        portableTextToMarkdown(portableText, {
          types: {
            image: DefaultImageRenderer,
          },
        }),
      ).toBe('![photo \\[1\\]](https://example.com/image.png)')
    })

    test('image with backslashes in alt text', () => {
      const portableText = [
        {
          _type: 'image',
          _key: 'img1',
          src: 'https://example.com/image.png',
          alt: 'path\\to\\file',
        },
      ]
      expect(
        portableTextToMarkdown(portableText, {
          types: {
            image: DefaultImageRenderer,
          },
        }),
      ).toBe('![path\\\\to\\\\file](https://example.com/image.png)')
    })

    test('image with backslash before bracket in alt text', () => {
      const portableText = [
        {
          _type: 'image',
          _key: 'img1',
          src: 'https://example.com/image.png',
          alt: 'a\\]b',
        },
      ]
      expect(
        portableTextToMarkdown(portableText, {
          types: {
            image: DefaultImageRenderer,
          },
        }),
      ).toBe('![a\\\\\\]b](https://example.com/image.png)')
    })

    test('image with backslash in title', () => {
      const portableText = [
        {
          _type: 'image',
          _key: 'img1',
          src: 'https://example.com/image.png',
          alt: 'example image',
          title: 'example\\image',
        },
      ]
      expect(
        portableTextToMarkdown(portableText, {
          types: {
            image: DefaultImageRenderer,
          },
        }),
      ).toBe(
        '![example image](https://example.com/image.png "example\\\\image")',
      )
    })

    test('image with backslash in title roundtrip', () => {
      const markdown =
        '![example image](https://example.com/image.png "example\\\\image")'
      const portableText = markdownToPortableText(markdown)
      expect(
        portableTextToMarkdown(portableText, {
          types: {
            image: DefaultImageRenderer,
          },
        }),
      ).toBe(markdown)
    })

    test('image with escaped bracket in alt text roundtrip', () => {
      const markdown = '![photo \\[1\\]](https://example.com/image.png)'
      const portableText = markdownToPortableText(markdown)
      expect(
        portableTextToMarkdown(portableText, {
          types: {
            image: DefaultImageRenderer,
          },
        }),
      ).toBe(markdown)
    })

    test('image with escaped backslash in alt text roundtrip', () => {
      const markdown = '![path\\\\to\\\\file](https://example.com/image.png)'
      const portableText = markdownToPortableText(markdown)
      expect(
        portableTextToMarkdown(portableText, {
          types: {
            image: DefaultImageRenderer,
          },
        }),
      ).toBe(markdown)
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

    describe('table without designated header row', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          rows: [
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Cell 1',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Cell 2',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Cell 3',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Cell 4',
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
      ]

      test('headerRows undefined promotes the first row to header', () => {
        const markdownOut = [
          '| Cell 1 | Cell 2 |',
          '| --- | --- |',
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

      test('headerRows 0 promotes the first row to header', () => {
        const table = portableText.at(0)
        if (!table) {
          throw new Error('expected a table block')
        }
        const withZeroHeaderRows = [{...table, headerRows: 0}]
        const markdownOut = [
          '| Cell 1 | Cell 2 |',
          '| --- | --- |',
          '| Cell 3 | Cell 4 |',
        ].join('\n')

        expect(
          portableTextToMarkdown(withZeroHeaderRows, {
            types: {
              table: DefaultTableRenderer,
            },
          }),
        ).toBe(markdownOut)
      })
    })

    describe('table with multiple header rows', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          headerRows: 2,
          rows: [
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Header 1',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Header 2',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Subheader 1',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Subheader 2',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Cell 1',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Cell 2',
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
      ]

      test('only the first row becomes the header, the rest are body rows', () => {
        const markdownOut = [
          '| Header 1 | Header 2 |',
          '| --- | --- |',
          '| Subheader 1 | Subheader 2 |',
          '| Cell 1 | Cell 2 |',
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

    describe('table with no rows', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          rows: [],
        },
      ]

      test('emits nothing', () => {
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              table: DefaultTableRenderer,
            },
          }),
        ).toBe('')
      })
    })

    describe('table with a single row', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          rows: [
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Cell 1',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Cell 2',
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
      ]

      test('emits header + delimiter, no body', () => {
        const markdownOut = ['| Cell 1 | Cell 2 |', '| --- | --- |'].join('\n')

        expect(
          portableTextToMarkdown(portableText, {
            types: {
              table: DefaultTableRenderer,
            },
          }),
        ).toBe(markdownOut)
      })
    })

    describe('asymmetric table with a wider body row', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          rows: [
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Header 1',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Body 1',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Body 2',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Body 3',
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
      ]

      test('the header row is padded so no body cells are dropped', () => {
        const markdownOut = [
          '| Header 1 |  |  |',
          '| --- | --- | --- |',
          '| Body 1 | Body 2 | Body 3 |',
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

    describe('asymmetric table with a wider header row', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          rows: [
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Header 1',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Header 2',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Header 3',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Body 1',
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
      ]

      test('the body row is padded so it lines up under the header', () => {
        const markdownOut = [
          '| Header 1 | Header 2 | Header 3 |',
          '| --- | --- | --- |',
          '| Body 1 |  |  |',
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

    describe('table with a pipe in cell text', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          rows: [
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'a | b',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'c',
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
      ]

      test('escapes the pipe so it stays inside the cell', () => {
        const markdownOut = ['| a \\| b | c |', '| --- | --- |'].join('\n')

        expect(
          portableTextToMarkdown(portableText, {
            types: {
              table: DefaultTableRenderer,
            },
          }),
        ).toBe(markdownOut)
      })
    })

    describe('table with a multi-line block-object in a cell', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          rows: [
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'Header',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'code',
                      _key: keyGenerator(),
                      language: 'js',
                      code: 'const x = 1\nconst y = 2',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]

      test('replaces newlines with <br> so the row stays intact', () => {
        const result = portableTextToMarkdown(portableText, {
          types: {
            table: DefaultTableRenderer,
            code: DefaultCodeBlockRenderer,
          },
        })

        expect(result).toBe(
          [
            '| Header |',
            '| --- |',
            '| ```js<br>const x = 1<br>const y = 2<br>``` |',
          ].join('\n'),
        )
      })
    })

    describe('table with column alignment', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          alignment: ['left', 'center', 'right', null],
          rows: [
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'L',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'C',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'R',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'D',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: '1',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: '2',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: '3',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: '4',
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
      ]

      test('encodes column alignment as colons on the delimiter row', () => {
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              table: DefaultTableRenderer,
            },
          }),
        ).toBe(
          [
            '| L | C | R | D |',
            '| :--- | :---: | ---: | --- |',
            '| 1 | 2 | 3 | 4 |',
          ].join('\n'),
        )
      })
    })

    describe('table with only one aligned column', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          alignment: [null, null, 'right'],
          rows: [
            {
              _type: 'row',
              _key: keyGenerator(),
              cells: [
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'A',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'B',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: keyGenerator(),
                  value: [
                    {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'C',
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
      ]

      test('emits `---` for unaligned columns and `---:` for the right-aligned column', () => {
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              table: DefaultTableRenderer,
            },
          }),
        ).toBe(['| A | B | C |', '| --- | --- | ---: |'].join('\n'))
      })
    })
  })

  describe('callouts', () => {
    describe('basic callout', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn = '> [!NOTE]\n> This is a note'
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('default renderer', () => {
        const markdownOut = [
          '```json',
          JSON.stringify(portableText.at(0), null, 2),
          '```',
        ].join('\n')

        expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
      })

      test('pluggable default renderer', () => {
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              callout: DefaultCalloutRenderer,
            },
          }),
        ).toBe(markdownIn)
      })
    })

    describe('callout with formatting', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn = '> [!TIP]\n> This is **bold** and *italic*'
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('pluggable default renderer', () => {
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              callout: DefaultCalloutRenderer,
            },
          }),
        ).toBe('> [!TIP]\n> This is **bold** and _italic_')
      })
    })

    describe('callout with multiple paragraphs', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn =
        '> [!IMPORTANT]\n> First paragraph\n>\n> Second paragraph'
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('pluggable default renderer', () => {
        expect(
          portableTextToMarkdown(portableText, {
            types: {
              callout: DefaultCalloutRenderer,
            },
          }),
        ).toBe(markdownIn)
      })
    })

    describe('all supported callout types', () => {
      const types = ['NOTE', 'TIP', 'WARNING', 'CAUTION', 'IMPORTANT']

      for (const type of types) {
        test(`\`${type}\` callout`, () => {
          const keyGenerator = createTestKeyGenerator()
          const markdownIn = `> [!${type}]\n> Content`
          const portableText = markdownToPortableText(markdownIn, {
            keyGenerator,
          })

          expect(
            portableTextToMarkdown(portableText, {
              types: {
                callout: DefaultCalloutRenderer,
              },
            }),
          ).toBe(markdownIn)
        })
      }
    })
  })
})

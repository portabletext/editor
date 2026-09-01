import {
  compileSchema,
  defineSchema,
  type BlockObjectDefinition,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {
  isPortableTextBlock,
  isPortableTextListItemBlock,
  isPortableTextSpan,
} from '@portabletext/toolkit'
import type {PortableTextBlock, TypedObject} from '@portabletext/types'
import {describe, expect, test} from 'vitest'
import {defaultSchema} from './default-schema'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {DefaultListItemRenderer} from './from-portable-text/renderers/list-item'
import {
  DefaultBlockquoteObjectRenderer,
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

    test('link label containing "](" round-trips instead of double-escaping into a lost label and destination', () => {
      // The label's own `]` is already escaped once by
      // `escapeLinkLabelBrackets`; the line-level `]`-before-`(` rule must
      // skip it too, or the second backslash reopens the label early on
      // reparse.
      const inKeys = createTestKeyGenerator()
      const linkKey = inKeys()
      const portableText = [
        {
          _type: 'block',
          _key: inKeys(),
          style: 'normal',
          children: [
            {_type: 'span', _key: inKeys(), text: 'a](b', marks: [linkKey]},
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
        },
      ]

      const markdown = portableTextToMarkdown(portableText)
      expect(markdown).toBe('[a\\](b](https://example.com)')

      const outKeys = createTestKeyGenerator()
      const outBlockKey = outKeys()
      const outLinkKey = outKeys()
      const outSpanKey = outKeys()
      const reparsed = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })
      expect(reparsed).toEqual([
        {
          _type: 'block',
          _key: outBlockKey,
          style: 'normal',
          markDefs: [
            {_key: outLinkKey, _type: 'link', href: 'https://example.com'},
          ],
          children: [
            {
              _type: 'span',
              _key: outSpanKey,
              text: 'a](b',
              marks: [outLinkKey],
            },
          ],
        },
      ])
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

    test('an emphasis run spanning a custom hard break with no newline of its own round-trips instead of turning into markup', () => {
      // `<br />` carries no newline: the leaves on either side land on the
      // same rendered line, so the two `_` can pair up into an `em` on
      // reparse unless the plan walls the break off instead of treating it
      // as a real line boundary.
      const portableText = [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [{_type: 'span', _key: 'k1', text: 'a _\n_ b', marks: []}],
          markDefs: [],
        },
      ]

      const markdown = portableTextToMarkdown(portableText, {
        hardBreak: () => '<br />',
      })
      expect(markdown).toBe('a \\_<br />\\_ b')

      const reparsed = markdownToPortableText(markdown, {
        html: {inline: 'text'},
      })
      const block = reparsed.at(0)
      if (!block || !isPortableTextBlock(block)) {
        throw new Error('Expected the first node to be a portable text block')
      }
      expect(
        block.children
          .filter(isPortableTextSpan)
          .map((span) => span.text)
          .join(''),
      ).toBe('a _<br />_ b')
    })

    test('the same underscore shape stays unescaped and round-trips with the default hard break, unaffected by the sentinel fix', () => {
      // markdown-it itself never pairs a delimiter run across a `hardbreak`
      // token, so the default renderer (a real newline) never needed
      // escaping here; the sentinel only changes behavior for a renderer
      // whose hard-break output carries no newline.
      const portableText = [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          children: [{_type: 'span', _key: 'k1', text: 'a _\n_ b', marks: []}],
          markDefs: [],
        },
      ]

      const markdown = portableTextToMarkdown(portableText)
      expect(markdown).toBe('a _  \n_ b')

      const reparsed = markdownToPortableText(markdown)
      const block = reparsed.at(0)
      if (!block || !isPortableTextBlock(block)) {
        throw new Error('Expected the first node to be a portable text block')
      }
      expect(
        block.children
          .filter(isPortableTextSpan)
          .map((span) => span.text)
          .join(''),
      ).toBe('a _\n_ b')
      expect(
        block.children.every(
          (child) => !isPortableTextSpan(child) || !child.marks?.includes('em'),
        ),
      ).toBe(true)
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

      test('a bullet item whose own content starts with a checkbox-shaped run after leading whitespace round-trips instead of losing it to a GFM task marker', () => {
        // The parser's own checkbox pre-pass reads a list item's inline
        // content *after* CommonMark's leading-whitespace trim, same as
        // every other line-start hazard - so a checkbox-shaped run has to
        // be found (and escaped) there too, not only at column 0.
        const keyGenerator = createTestKeyGenerator()
        const text = ' [x] y'
        const portableText = [
          {
            _type: 'block',
            _key: keyGenerator(),
            style: 'normal',
            listItem: 'bullet',
            level: 1,
            markDefs: [],
            children: [{_type: 'span', _key: keyGenerator(), text, marks: []}],
          },
        ]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('-  \\[x] y')

        const reparsed = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })
        const block = reparsed.at(0)
        if (!block || !isPortableTextBlock(block)) {
          throw new Error('Expected the first node to be a portable text block')
        }
        expect(isPortableTextListItemBlock(block)).toBe(true)
        expect(
          block.children
            .filter(isPortableTextSpan)
            .map((span) => span.text)
            .join(''),
        ).toBe('[x] y')
      })

      test('a checkbox-shaped run at the start of a styled (non-normal) list item survives instead of being eaten as a checkbox', () => {
        // A styled list item's first block is rendered through the same
        // block-style renderer (`DefaultH1Renderer` here) as a non-list
        // block, so it has to keep its list-item escaping context on that
        // path too, not just for a `normal`-style item.
        const keyGenerator = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: keyGenerator(),
            style: 'h1',
            listItem: 'bullet',
            level: 1,
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keyGenerator(),
                text: '[ ] todo',
                marks: [],
              },
            ],
          },
        ]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('- # \\[ ] todo')

        const reparsed = markdownToPortableText(markdown)
        const combinedText = reparsed
          .map((node) =>
            isPortableTextBlock(node)
              ? node.children
                  .filter(isPortableTextSpan)
                  .map((span) => span.text)
                  .join('')
              : '',
          )
          .join('')
        expect(combinedText).toBe('[ ] todo')
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

  describe('lists with skipped levels', () => {
    const listItem = (text: string, level: number, style = 'bullet') => ({
      _type: 'block',
      _key: text,
      style: 'normal',
      listItem: style,
      level,
      children: [{_type: 'span', _key: `s-${text}`, text, marks: []}],
      markDefs: [],
    })

    test('a list starting deeper than level 1 is not indented into a code block', () => {
      expect(portableTextToMarkdown([listItem('foo', 3)])).toBe('- foo')
    })

    test('a jump of more than one level indents a single step', () => {
      expect(
        portableTextToMarkdown([
          listItem('foo', 1),
          listItem('bar', 4),
          listItem('baz', 1),
        ]),
      ).toBe(['- foo', '   - bar', '- baz'].join('\n'))
    })

    test('numbered lists starting deep keep their marker', () => {
      expect(
        portableTextToMarkdown([
          listItem('foo', 3, 'number'),
          listItem('bar', 1, 'number'),
        ]),
      ).toBe(['1. foo', '2. bar'].join('\n'))
    })

    test('intermediate levels still nest one step at a time', () => {
      expect(
        portableTextToMarkdown([
          listItem('foo', 1),
          listItem('bar', 2),
          listItem('baz', 5),
          listItem('qux', 2),
        ]),
      ).toBe(['- foo', '   - bar', '      - baz', '   - qux'].join('\n'))
    })

    test('round-trips back to portable text with the same structure', () => {
      const markdown = portableTextToMarkdown([
        listItem('foo', 3),
        listItem('bar', 1),
        listItem('baz', 4),
      ])
      const portableText = markdownToPortableText(markdown)

      expect(
        portableText.map((block) => ({
          listItem: 'listItem' in block ? block.listItem : undefined,
          level: 'level' in block ? block.level : undefined,
          text:
            'children' in block && Array.isArray(block.children)
              ? block.children.map((child) => child.text).join('')
              : undefined,
        })),
      ).toEqual([
        {listItem: 'bullet', level: 1, text: 'foo'},
        {listItem: 'bullet', level: 1, text: 'bar'},
        {listItem: 'bullet', level: 2, text: 'baz'},
      ])
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

    test('nested content that falls back to fenced JSON is not polluted with the injected `style`', () => {
      const keyGenerator = createTestKeyGenerator()
      const malformedCode = {_type: 'code', _key: keyGenerator(), code: 42}
      const value = {
        _type: 'blockquote',
        _key: keyGenerator(),
        content: [malformedCode],
      }

      const jsonLines = JSON.stringify(malformedCode, null, 2).split('\n')
      expect(portableTextToMarkdown([value], outOpts)).toBe(
        ['> ```json', ...jsonLines.map((line) => `> ${line}`), '> ```'].join(
          '\n',
        ),
      )
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
        expect(portableTextToMarkdown(portableText)).toBe(markdownIn)
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
      // Unsupported by the schema, the image syntax survives as literal
      // paragraph text instead of an image node, so it goes through the
      // same leaf escaping as any other text and gains the same
      // `]`-before-`(` protection a literal link pattern would.
      const portableText = markdownToPortableText(markdownIn, {
        schema: compileSchema(defineSchema({})),
      })
      expect(portableTextToMarkdown(portableText)).toBe(
        'foo\n\n![alt text\\](https://example.com/image.png)\n\nbar',
      )
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
      expect(portableTextToMarkdown(portableText)).toBe(
        '![photo \\[1\\]](https://example.com/image.png)',
      )
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
      expect(portableTextToMarkdown(portableText)).toBe(
        '![path\\\\to\\\\file](https://example.com/image.png)',
      )
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
      expect(portableTextToMarkdown(portableText)).toBe(
        '![a\\\\\\]b](https://example.com/image.png)',
      )
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
      expect(portableTextToMarkdown(portableText)).toBe(
        '![example image](https://example.com/image.png "example\\\\image")',
      )
    })

    test('image with backslash in title roundtrip', () => {
      const markdown =
        '![example image](https://example.com/image.png "example\\\\image")'
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('image with escaped bracket in alt text roundtrip', () => {
      const markdown = '![photo \\[1\\]](https://example.com/image.png)'
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('image with escaped backslash in alt text roundtrip', () => {
      const markdown = '![path\\\\to\\\\file](https://example.com/image.png)'
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('malformed image value (no `src` field) falls back to fenced JSON', () => {
      const keyGenerator = createTestKeyGenerator()
      const value = {_type: 'image', _key: keyGenerator(), alt: 'foo'}

      expect(portableTextToMarkdown([value])).toBe(
        ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
      )
    })

    test.each([
      ['`src` is not a string', {src: 42}],
      ['`alt` is not a string', {src: 'foo.png', alt: 42}],
      ['`title` is not a string', {src: 'foo.png', title: 42}],
    ])('malformed image value (%s) falls back to fenced JSON', (_, image) => {
      const keyGenerator = createTestKeyGenerator()
      const value = {_type: 'image', _key: keyGenerator(), ...image}

      expect(portableTextToMarkdown([value])).toBe(
        ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
      )
    })

    test('`null` in the optional `alt`/`title` fields is treated as absent', () => {
      const keyGenerator = createTestKeyGenerator()
      const value = {
        _type: 'image',
        _key: keyGenerator(),
        src: 'https://example.com/image.png',
        alt: null,
        title: null,
      }

      expect(portableTextToMarkdown([value])).toBe(
        '![](https://example.com/image.png)',
      )
    })
  })

  describe('inline image', () => {
    const keyGenerator = createTestKeyGenerator()
    const markdown = 'foo ![alt text](https://example.com/image.png) bar'

    describe('supported by deserializer', () => {
      const portableText = markdownToPortableText(markdown, {keyGenerator})

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
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
      // Same fallback-to-literal-text path as the block-image case above.
      const portableText = markdownToPortableText(markdown, {
        schema: compileSchema(defineSchema({})),
      })
      const markdownOut = 'foo ![alt text\\](https://example.com/image.png) bar'
      expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
    })
  })

  describe('code block', () => {
    describe('single line', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn = ['```js', `const foo = 'bar'`, '```'].join('\n')
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe(markdownIn)
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
        expect(portableTextToMarkdown(portableText)).toBe(markdownIn)
      })
    })

    test('malformed code value (no `code` field) falls back to fenced JSON', () => {
      const keyGenerator = createTestKeyGenerator()
      const value = {_type: 'code', _key: keyGenerator(), language: 'js'}

      expect(portableTextToMarkdown([value])).toBe(
        ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
      )
    })

    test('malformed code value (`code` is not a string) falls back to fenced JSON', () => {
      const keyGenerator = createTestKeyGenerator()
      const value = {_type: 'code', _key: keyGenerator(), code: 42}

      expect(portableTextToMarkdown([value])).toBe(
        ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
      )
    })

    test('non-string `language` normalizes to a plain fence, code body intact', () => {
      const keyGenerator = createTestKeyGenerator()
      const value = {
        _type: 'code',
        _key: keyGenerator(),
        code: "const foo = 'bar'",
        language: {foo: 1},
      }

      expect(portableTextToMarkdown([value])).toBe(
        ['```', "const foo = 'bar'", '```'].join('\n'),
      )
    })

    test('`language` containing newlines does not inject a line into the code body', () => {
      const keyGenerator = createTestKeyGenerator()
      const value = {
        _type: 'code',
        _key: keyGenerator(),
        code: "const foo = 'bar'",
        language: 'js\nalert(1)',
      }

      expect(portableTextToMarkdown([value])).toBe(
        ['```', "const foo = 'bar'", '```'].join('\n'),
      )
    })
  })

  describe('horizontal rule', () => {
    test('renders as `---` by default', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [{_type: 'horizontal-rule', _key: keyGenerator()}]

      expect(portableTextToMarkdown(portableText)).toBe('---')
    })

    test('MD -> PT -> MD round-trip is stable', () => {
      const markdown = 'foo\n\n---\n\nbar'
      const portableText = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })

      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })
  })

  describe('html', () => {
    test('renders the raw HTML by default', () => {
      const markdown = '<div class="note">hello</div>'
      const portableText = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })

      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('malformed html value (no `html` field) falls back to fenced JSON', () => {
      const keyGenerator = createTestKeyGenerator()
      const value = {_type: 'html', _key: keyGenerator()}

      expect(portableTextToMarkdown([value])).toBe(
        ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
      )
    })

    test('malformed html value (`html` is not a string) falls back to fenced JSON', () => {
      const keyGenerator = createTestKeyGenerator()
      const value = {_type: 'html', _key: keyGenerator(), html: 42}

      expect(portableTextToMarkdown([value])).toBe(
        ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
      )
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

      test('renders as GFM by default', () => {
        const markdownOut = [
          '| Header 1 | Header 2 |',
          '| --- | --- |',
          '| Cell 1 | Cell 2 |',
          '| Cell 3 | Cell 4 |',
        ].join('\n')

        expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
      })

      test('`types: {table: undefined}` opts out and falls back to fenced JSON', () => {
        const markdownOut = [
          '```json',
          JSON.stringify(portableText.at(0), null, 2),
          '```',
        ].join('\n')

        expect(
          portableTextToMarkdown(portableText, {types: {table: undefined}}),
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

      test('headerRows undefined renders headerless, same as headerRows 0', () => {
        const markdownOut = [
          '|  |  |',
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

      test('headerRows 0 emits an empty header row and keeps every row in the body', () => {
        const table = portableText.at(0)
        if (!table) {
          throw new Error('expected a table block')
        }
        const withZeroHeaderRows = [{...table, headerRows: 0}]
        const markdownOut = [
          '|  |  |',
          '| --- | --- |',
          '| Cell 1 | Cell 2 |',
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
          headerRows: 1,
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
          headerRows: 1,
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
          headerRows: 1,
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
          headerRows: 1,
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
          headerRows: 1,
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
        const result = portableTextToMarkdown(portableText)

        expect(result).toBe(
          [
            '| Header |',
            '| --- |',
            '| ```js<br>const x = 1<br>const y = 2<br>``` |',
          ].join('\n'),
        )
      })
    })

    describe('table with an image in a cell', () => {
      const keyGenerator = createTestKeyGenerator()
      const portableText = [
        {
          _type: 'table',
          _key: keyGenerator(),
          headerRows: 1,
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
                      _type: 'image',
                      _key: keyGenerator(),
                      src: 'https://example.com/image.png',
                      alt: 'alt text',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]

      test('renders `![alt](src)` inline in the GFM cell', () => {
        const result = portableTextToMarkdown(portableText)

        expect(result).toBe(
          [
            '| Header |',
            '| --- |',
            '| ![alt text](https://example.com/image.png) |',
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
          headerRows: 1,
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
          headerRows: 1,
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

    describe('zero-config default table', () => {
      test('renders a canonical table object as GFM', () => {
        const keyGenerator = createTestKeyGenerator()
        const cell = (text: string) => ({
          _type: 'cell',
          _key: keyGenerator(),
          value: [
            {
              _type: 'block',
              _key: keyGenerator(),
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keyGenerator(), text, marks: []},
              ],
            },
          ],
        })
        const portableText = [
          {
            _type: 'table',
            _key: keyGenerator(),
            headerRows: 1,
            rows: [
              {_type: 'row', _key: keyGenerator(), cells: [cell('foo')]},
              {_type: 'row', _key: keyGenerator(), cells: [cell('bar')]},
            ],
          },
        ]

        expect(portableTextToMarkdown(portableText)).toBe(
          ['| foo |', '| --- |', '| bar |'].join('\n'),
        )
      })

      test('MD -> PT -> MD round-trip is stable for a table with alignment', () => {
        const markdown = ['| L | R |', '| :--- | ---: |', '| foo | bar |'].join(
          '\n',
        )

        const portableText = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })

        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      test('malformed table value (no `rows` array) falls back to fenced JSON', () => {
        const keyGenerator = createTestKeyGenerator()
        const value = {_type: 'table', _key: keyGenerator(), headerRows: 1}

        expect(portableTextToMarkdown([value])).toBe(
          ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
        )
      })

      test.each([
        ['cell without `value`', {rows: [{cells: [{_key: 'foo'}]}]}],
        ['cell `value` is not an array', {rows: [{cells: [{value: 'foo'}]}]}],
        ['`cells` contains `null`', {rows: [{cells: [null]}]}],
        ['cell `value` contains `null`', {rows: [{cells: [{value: [null]}]}]}],
      ])('malformed table value (%s) falls back to fenced JSON', (_, table) => {
        const keyGenerator = createTestKeyGenerator()
        const value = {_type: 'table', _key: keyGenerator(), ...table}

        expect(portableTextToMarkdown([value])).toBe(
          ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
        )
      })

      test('non-array `alignment` is ignored, the table still renders', () => {
        const keyGenerator = createTestKeyGenerator()
        const value = {
          _type: 'table',
          _key: keyGenerator(),
          headerRows: 1,
          alignment: {},
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
                      children: [
                        {_type: 'span', _key: keyGenerator(), text: 'foo'},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }

        expect(portableTextToMarkdown([value])).toBe(
          ['| foo |', '| --- |'].join('\n'),
        )
      })
    })
  })

  describe('callouts', () => {
    describe('basic callout', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn = '> [!NOTE]\n> This is a note'
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe(markdownIn)
      })
    })

    describe('callout with formatting', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn = '> [!TIP]\n> This is **bold** and *italic*'
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe(
          '> [!TIP]\n> This is **bold** and _italic_',
        )
      })
    })

    describe('callout with multiple paragraphs', () => {
      const keyGenerator = createTestKeyGenerator()
      const markdownIn =
        '> [!IMPORTANT]\n> First paragraph\n>\n> Second paragraph'
      const portableText = markdownToPortableText(markdownIn, {keyGenerator})

      test('default renderer', () => {
        expect(portableTextToMarkdown(portableText)).toBe(markdownIn)
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

          expect(portableTextToMarkdown(portableText)).toBe(markdownIn)
        })
      }
    })

    test('malformed callout value (no `tone`) falls back to fenced JSON', () => {
      const keyGenerator = createTestKeyGenerator()
      const value = {_type: 'callout', _key: keyGenerator(), content: []}

      expect(portableTextToMarkdown([value])).toBe(
        ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
      )
    })

    test.each([
      ['`tone` is not a string', {tone: 42, content: []}],
      ['no `content` array', {tone: 'note'}],
      [
        '`content` contains a non-typed-object',
        {tone: 'note', content: [null]},
      ],
    ])(
      'malformed callout value (%s) falls back to fenced JSON',
      (_, callout) => {
        const keyGenerator = createTestKeyGenerator()
        const value = {_type: 'callout', _key: keyGenerator(), ...callout}

        expect(portableTextToMarkdown([value])).toBe(
          ['```json', JSON.stringify(value, null, 2), '```'].join('\n'),
        )
      },
    )

    test('nested content that falls back to fenced JSON is not polluted with the injected `style`', () => {
      const keyGenerator = createTestKeyGenerator()
      const malformedCode = {_type: 'code', _key: keyGenerator(), code: 42}
      const value = {
        _type: 'callout',
        _key: keyGenerator(),
        tone: 'note',
        content: [malformedCode],
      }

      const jsonLines = JSON.stringify(malformedCode, null, 2).split('\n')
      expect(portableTextToMarkdown([value])).toBe(
        [
          '> [!NOTE]',
          '> ```json',
          ...jsonLines.map((line) => `> ${line}`),
          '> ```',
        ].join('\n'),
      )
    })
  })

  describe('plain text escaping', () => {
    // Each string round-trips as the sole text of a single span in a
    // `normal` block: PT -> MD -> PT should reproduce the same block, with
    // the span text byte-identical to what went in.
    const roundTripCorpus = [
      '*bar*',
      '_bar_',
      '`code`',
      '~~bar~~',
      '<tag>foo</tag>',
      '&amp;',
      '\\*bar\\*',
      '# heading',
      '> quote',
      '- item',
      '1. item',
      '1) item',
      '---',
      '```js',
      '~~~',
      '    indented',
      '> [!NOTE]',
      '-',
      '+',
      '*',
      '\tx',
      // Non-ASCII neighbors: markdown-it's emphasis-flanking rule classifies
      // punctuation using Unicode's `P`/`S` categories, not ASCII alone, so
      // a `_` run flanked by an emoji, an em dash, or a CJK character has to
      // stay escaped exactly like one flanked by ASCII punctuation does.
      '😀_a_😀',
      '—_a_—',
      '中_a_中',
    ]

    function normalBlock(blockKey: string, spanKey: string, text: string) {
      return {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text, marks: []}],
      }
    }

    // An unrendered, schema-less mark on every span but the last stands in
    // for the annotation/decorator that splices the leaves together
    // without introducing markup of its own.
    function leavesBlock(
      texts: Array<string>,
      overrides: {style?: string; listItem?: string; level?: number} = {},
    ) {
      const keyGenerator = createTestKeyGenerator()
      return {
        _type: 'block',
        _key: keyGenerator(),
        style: overrides.style ?? 'normal',
        ...(overrides.listItem
          ? {listItem: overrides.listItem, level: overrides.level ?? 1}
          : {}),
        markDefs: [],
        children: texts.map((text, index) => ({
          _type: 'span',
          _key: keyGenerator(),
          text,
          marks: index < texts.length - 1 ? ['unrenderedAnnotation'] : [],
        })),
      }
    }

    function firstBlock(blocks: Array<PortableTextBlock | TypedObject>) {
      const block = blocks.at(0)
      if (block === undefined || !isPortableTextBlock(block)) {
        throw new Error('Expected the first block to be a portable text block')
      }
      return block
    }

    function blockText(block: PortableTextBlock): string {
      return block.children
        .filter(isPortableTextSpan)
        .map((span) => span.text)
        .join('')
    }

    test.each(roundTripCorpus)('%s round-trips byte-identical', (text) => {
      const inKeys = createTestKeyGenerator()
      const portableText = [normalBlock(inKeys(), inKeys(), text)]

      const markdown = portableTextToMarkdown(portableText)

      const reparsed = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })
      const outKeys = createTestKeyGenerator()

      expect(reparsed).toEqual([normalBlock(outKeys(), outKeys(), text)])
    })

    test('a link pattern in plain text round-trips, with the bare URL inside it gaining a link mark', () => {
      const text = '[bar](https://example.com)'
      const inKeys = createTestKeyGenerator()
      const portableText = [normalBlock(inKeys(), inKeys(), text)]

      const markdown = portableTextToMarkdown(portableText)
      expect(markdown).toBe('[bar\\](https://example.com)')

      const reparsed = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })
      const outKeys = createTestKeyGenerator()
      const blockKey = outKeys()
      const firstSpanKey = outKeys()
      const linkKey = outKeys()
      expect(reparsed).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          children: [
            {_type: 'span', _key: firstSpanKey, text: '[bar](', marks: []},
            {
              _type: 'span',
              _key: outKeys(),
              text: 'https://example.com',
              marks: [linkKey],
            },
            {_type: 'span', _key: outKeys(), text: ')', marks: []},
          ],
        },
      ])
      expect(blockText(firstBlock(reparsed))).toBe(text)
    })

    test('an autolink-shaped literal round-trips, with the bare URL inside it gaining a link mark', () => {
      const text = '<https://example.com>'
      const inKeys = createTestKeyGenerator()
      const portableText = [normalBlock(inKeys(), inKeys(), text)]

      const markdown = portableTextToMarkdown(portableText)
      expect(markdown).toBe('\\<https://example.com>')

      const reparsed = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })
      expect(blockText(firstBlock(reparsed))).toBe(text)
    })

    test('a link reference definition round-trips, with its bare URL gaining a link mark', () => {
      const text = '[id]: https://example.com'
      const inKeys = createTestKeyGenerator()
      const portableText = [normalBlock(inKeys(), inKeys(), text)]

      const markdown = portableTextToMarkdown(portableText)
      expect(markdown).toBe('\\[id]: https://example.com')

      const reparsed = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })
      const outKeys = createTestKeyGenerator()
      const blockKey = outKeys()
      const firstSpanKey = outKeys()
      const linkKey = outKeys()
      expect(reparsed).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          children: [
            {_type: 'span', _key: firstSpanKey, text: '[id]: ', marks: []},
            {
              _type: 'span',
              _key: outKeys(),
              text: 'https://example.com',
              marks: [linkKey],
            },
          ],
        },
      ])
    })

    test('a setext-underline-shaped line after a hard break round-trips instead of becoming a heading underline', () => {
      const text = 'text\n==='
      const inKeys = createTestKeyGenerator()
      const portableText = [normalBlock(inKeys(), inKeys(), text)]

      const markdown = portableTextToMarkdown(portableText)
      expect(markdown).toBe('text  \n\\===')

      const reparsed = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })
      const outKeys = createTestKeyGenerator()
      expect(reparsed).toEqual([normalBlock(outKeys(), outKeys(), text)])
    })

    test('a bare URL round-trips byte-identical and gains a link mark (linkify carve-out)', () => {
      const text = 'https://example.com'
      const inKeys = createTestKeyGenerator()
      const portableText = [normalBlock(inKeys(), inKeys(), text)]

      const markdown = portableTextToMarkdown(portableText)
      expect(markdown).toBe(text)

      const reparsed = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })
      const outKeys = createTestKeyGenerator()
      const blockKey = outKeys()
      const linkKey = outKeys()
      const spanKey = outKeys()
      expect(reparsed).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [{_key: linkKey, _type: 'link', href: text}],
          children: [{_type: 'span', _key: spanKey, text, marks: [linkKey]}],
        },
      ])
    })

    describe('leading spaces before a block marker', () => {
      // CommonMark allows up to 3 leading spaces before a block marker
      // without affecting how the line is parsed.
      test.each([
        [' > q', ' \\> q', '> q'],
        [' # head', ' \\# head', '# head'],
        [' - item', ' \\- item', '- item'],
        [' [x]: y', ' \\[x]: y', '[x]: y'],
        [' ---', ' \\---', '---'],
        ['  ***', '  \\***', '***'],
        [' ===', ' \\===', '==='],
        [' 1. item', ' 1\\. item', '1. item'],
        ['  1) item', '  1\\) item', '1) item'],
      ])(
        '%s round-trips instead of losing its text to the block marker',
        (text, expectedMarkdown, expectedBlockText) => {
          const inKeys = createTestKeyGenerator()
          const portableText = [normalBlock(inKeys(), inKeys(), text)]

          const markdown = portableTextToMarkdown(portableText)
          expect(markdown).toBe(expectedMarkdown)

          const reparsed = markdownToPortableText(markdown, {
            keyGenerator: createTestKeyGenerator(),
          })
          // The leading space is block indentation, which CommonMark's own
          // paragraph parsing trims; it isn't part of the fixpoint claim.
          expect(blockText(firstBlock(reparsed))).toBe(expectedBlockText)
        },
      )
    })

    describe('a heading ending in a space and a hash run', () => {
      test("the trailing hash run round-trips instead of being read as the heading's closing sequence", () => {
        const keyGenerator = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: keyGenerator(),
            style: 'h1',
            markDefs: [],
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'x #', marks: []},
            ],
          },
        ]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('# x \\#')

        const reparsed = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })
        const outKeys = createTestKeyGenerator()
        expect(reparsed).toEqual([
          {
            _type: 'block',
            _key: outKeys(),
            style: 'h1',
            markDefs: [],
            children: [
              {_type: 'span', _key: outKeys(), text: 'x #', marks: []},
            ],
          },
        ])
      })
    })

    describe('a dash-underline-shaped line', () => {
      test('after a hard break round-trips instead of becoming a setext h2 underline', () => {
        const text = 'a\n--'
        const inKeys = createTestKeyGenerator()
        const portableText = [normalBlock(inKeys(), inKeys(), text)]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('a  \n\\--')

        const reparsed = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })
        const outKeys = createTestKeyGenerator()
        expect(reparsed).toEqual([normalBlock(outKeys(), outKeys(), text)])
      })

      test('a single trailing dash with a space round-trips as plain text, not a bullet or an underline', () => {
        const text = '- '
        const inKeys = createTestKeyGenerator()
        const portableText = [normalBlock(inKeys(), inKeys(), text)]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\- ')

        const reparsed = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })
        const block = firstBlock(reparsed)
        expect(isPortableTextListItemBlock(block)).toBe(false)
        // The trailing space is trimmed by CommonMark's own paragraph
        // parsing; it isn't part of the fixpoint claim.
        expect(blockText(block)).toBe('-')
      })
    })

    describe('linkify mask boundaries', () => {
      // markdown-it's linkify pass runs *after* inline tokenization and
      // entity decoding, over whatever text and marks those steps already
      // produced - not over this line's raw, undecoded source. A probe run
      // against the raw text can claim a range the real reparse won't.

      test('an entity reference immediately before an email-shaped run round-trips instead of leaking through the linkify claim', () => {
        const text = '&amp;x@y.co'
        const inKeys = createTestKeyGenerator()
        const portableText = [normalBlock(inKeys(), inKeys(), text)]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\&amp;x@y.co')

        const reparsed = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })
        expect(blockText(firstBlock(reparsed))).toBe(text)
      })

      test('a backtick immediately after a URL-shaped run round-trips instead of losing text to a code span', () => {
        const text = '//a.co`>x`'
        const inKeys = createTestKeyGenerator()
        const portableText = [normalBlock(inKeys(), inKeys(), text)]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('//a.co\\`>x\\`')

        const reparsed = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })
        expect(blockText(firstBlock(reparsed))).toBe(text)
      })

      test('a linkify claim spliced by a rendered mark boundary round-trips instead of masking the delimiters it would corrupt', () => {
        const keyGenerator = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: keyGenerator(),
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'www.exa', marks: []},
              {
                _type: 'span',
                _key: keyGenerator(),
                text: 'mple.co/a*b*c',
                marks: ['strong'],
              },
            ],
          },
        ]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('www.exa**mple.co/a\\*b\\*c**')

        const reparsed = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })
        expect(blockText(firstBlock(reparsed))).toBe('www.example.co/a*b*c')
      })
    })

    describe('custom renderers', () => {
      test("a synthetic text node from a custom type renderer does not steal a sibling leaf's escaped text", () => {
        const keyGenerator = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: keyGenerator(),
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'a', marks: []},
              {_type: 'inlineMarker', _key: keyGenerator()},
              {_type: 'span', _key: keyGenerator(), text: '*bar*', marks: []},
            ],
          },
        ]

        const markdown = portableTextToMarkdown(portableText, {
          types: {
            inlineMarker: ({renderNode}) =>
              renderNode({
                node: {_type: '@text', text: 'TICK'},
                isInline: true,
                index: 0,
                renderNode,
              }),
          },
        })

        expect(markdown).toBe('aTICK\\*bar\\*')
      })
    })

    describe('cross-leaf hazards', () => {
      test('an unrendered annotation cannot splice a digit and ". item" into an ordered-list marker', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const firstSpanKey = keyGenerator()
        const secondSpanKey = keyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: firstSpanKey,
                text: '1',
                marks: ['unrenderedAnnotation'],
              },
              {_type: 'span', _key: secondSpanKey, text: '. item', marks: []},
            ],
          },
        ]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('1\\. item')

        const reparsed = markdownToPortableText(markdown)
        const block = firstBlock(reparsed)
        expect(block.style).toBe('normal')
        expect(isPortableTextListItemBlock(block)).toBe(false)
        expect(blockText(block)).toBe('1. item')
      })

      test('an unrendered annotation cannot splice "[foo]" and "(bar)" into a link', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const firstSpanKey = keyGenerator()
        const secondSpanKey = keyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: firstSpanKey,
                text: '[foo]',
                marks: ['unrenderedAnnotation'],
              },
              {_type: 'span', _key: secondSpanKey, text: '(bar)', marks: []},
            ],
          },
        ]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('[foo\\](bar)')

        const reparsed = markdownToPortableText(markdown)
        const block = firstBlock(reparsed)
        expect(block.markDefs).toEqual([])
        expect(blockText(block)).toBe('[foo](bar)')
      })

      test('an unrendered annotation cannot splice "[x]" and ": y" into a link reference definition', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const firstSpanKey = keyGenerator()
        const secondSpanKey = keyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: firstSpanKey,
                text: '[x]',
                marks: ['unrenderedAnnotation'],
              },
              {_type: 'span', _key: secondSpanKey, text: ': y', marks: []},
            ],
          },
        ]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\[x]: y')

        const reparsed = markdownToPortableText(markdown)
        const block = firstBlock(reparsed)
        expect(block.markDefs).toEqual([])
        expect(blockText(block)).toBe('[x]: y')
      })

      test('a ref-def label split anywhere before the colon round-trips (label and colon in one leaf)', () => {
        const portableText = [leavesBlock(['[', 'x]: y'])]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\[x]: y')

        const reparsed = markdownToPortableText(markdown)
        const block = firstBlock(reparsed)
        expect(block.markDefs).toEqual([])
        expect(blockText(block)).toBe('[x]: y')
      })

      test('a ref-def label split anywhere before the colon round-trips (colon and destination split again)', () => {
        const portableText = [leavesBlock(['[', 'x]:', 'y'])]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\[x]:y')

        const reparsed = markdownToPortableText(markdown)
        const block = firstBlock(reparsed)
        expect(block.markDefs).toEqual([])
        expect(blockText(block)).toBe('[x]:y')
      })

      test('a bullet marker split before its own space round-trips instead of becoming a list item', () => {
        const portableText = [leavesBlock(['-', ' x'])]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\- x')

        const reparsed = markdownToPortableText(markdown)
        const block = firstBlock(reparsed)
        expect(isPortableTextListItemBlock(block)).toBe(false)
        expect(blockText(block)).toBe('- x')
      })

      test('an entity reference split across leaves round-trips instead of decoding to the bare character', () => {
        const portableText = [leavesBlock(['&', 'amp;'])]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\&amp;')

        const reparsed = markdownToPortableText(markdown)
        expect(blockText(firstBlock(reparsed))).toBe('&amp;')
      })

      test('an HTML/autolink-shaped `<` split across leaves round-trips instead of opening a tag', () => {
        const portableText = [leavesBlock(['<', 'p'])]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\<p')

        const reparsed = markdownToPortableText(markdown)
        expect(blockText(firstBlock(reparsed))).toBe('<p')
      })

      test('a literal backslash split from the punctuation it precedes round-trips instead of escaping that punctuation', () => {
        const portableText = [leavesBlock(['\\', '*'])]

        const markdown = portableTextToMarkdown(portableText)

        const reparsed = markdownToPortableText(markdown)
        expect(blockText(firstBlock(reparsed))).toBe('\\*')
      })

      test('an emphasis run split across leaves round-trips instead of turning into markup', () => {
        const portableText = [leavesBlock(['*', 'm', '*'])]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\*m\\*')

        const reparsed = markdownToPortableText(markdown)
        const block = firstBlock(reparsed)
        expect(block.markDefs).toEqual([])
        expect(blockText(block)).toBe('*m*')
      })

      test('a strikethrough run split across leaves round-trips instead of turning into markup', () => {
        const portableText = [leavesBlock(['a~', '~b~', '~c'])]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('a\\~\\~b\\~\\~c')

        const reparsed = markdownToPortableText(markdown)
        expect(blockText(firstBlock(reparsed))).toBe('a~~b~~c')
      })

      test('a setext-underline run accumulated across a hard break and a second leaf round-trips instead of turning the preceding line into a heading', () => {
        const portableText = [leavesBlock(['x\n=', '='])]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('x  \n\\==')

        const reparsed = markdownToPortableText(markdown)
        const block = firstBlock(reparsed)
        expect(block.style).toBe('normal')
        expect(blockText(block)).toBe('x\n==')
      })

      test('a thematic-break run accumulated across leaves round-trips instead of becoming a thematic break', () => {
        const portableText = [leavesBlock(['-', '--'])]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('\\---')

        const reparsed = markdownToPortableText(markdown)
        expect(blockText(firstBlock(reparsed))).toBe('---')
      })
    })

    test.each(roundTripCorpus)(
      '%s stays unescaped inside a widened code span',
      (text) => {
        const inKeys = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: inKeys(),
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: inKeys(), text, marks: ['code']}],
          },
        ]

        const markdown = portableTextToMarkdown(portableText)

        const reparsed = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })
        const outKeys = createTestKeyGenerator()

        expect(reparsed).toEqual([
          {
            _type: 'block',
            _key: outKeys(),
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: outKeys(), text, marks: ['code']}],
          },
        ])
      },
    )

    describe('code span padding', () => {
      test('content padded with a space on both sides round-trips instead of losing one space per side', () => {
        const text = '  x  '
        const inKeys = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: inKeys(),
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: inKeys(), text, marks: ['code']}],
          },
        ]

        const markdown = portableTextToMarkdown(portableText)
        expect(markdown).toBe('`   x   `')

        const reparsed = markdownToPortableText(markdown, {
          keyGenerator: createTestKeyGenerator(),
        })
        const outKeys = createTestKeyGenerator()
        expect(reparsed).toEqual([
          {
            _type: 'block',
            _key: outKeys(),
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: outKeys(), text, marks: ['code']}],
          },
        ])
      })
    })

    describe('canonical output bytes', () => {
      test.each([
        ['foo # bar', 'foo # bar'],
        ['foo - bar', 'foo - bar'],
        ['foo > bar', 'foo > bar'],
        ['a * b', 'a * b'],
      ])('%s stays bare', (text, expectedMarkdown) => {
        const keyGenerator = createTestKeyGenerator()
        const portableText = [normalBlock(keyGenerator(), keyGenerator(), text)]

        expect(portableTextToMarkdown(portableText)).toBe(expectedMarkdown)
      })
    })

    describe('single-span grammar fixes', () => {
      describe('thematic breaks with interior spaces or tabs', () => {
        test.each(['-- -', '_ _ _'])(
          '%s round-trips instead of becoming a thematic break',
          (text) => {
            const portableText = [leavesBlock([text])]

            const markdown = portableTextToMarkdown(portableText)
            expect(markdown).toBe(`\\${text}`)

            const reparsed = markdownToPortableText(markdown)
            expect(blockText(firstBlock(reparsed))).toBe(text)
          },
        )
      })

      describe('a heading whose text is only a hash run', () => {
        test.each(['#', '##'])(
          '%s round-trips instead of reparsing as an empty heading',
          (text) => {
            const portableText = [leavesBlock([text], {style: 'h1'})]

            const markdown = portableTextToMarkdown(portableText)
            expect(markdown).toBe(`# \\${text}`)

            const reparsed = markdownToPortableText(markdown)
            const block = firstBlock(reparsed)
            expect(block.style).toBe('h1')
            expect(blockText(block)).toBe(text)
          },
        )

        test('a hash immediately followed by other text is not over-escaped', () => {
          const portableText = [leavesBlock(['#', 'x'], {style: 'h1'})]

          const markdown = portableTextToMarkdown(portableText)
          expect(markdown).toBe('# #x')

          const reparsed = markdownToPortableText(markdown)
          const block = firstBlock(reparsed)
          expect(block.style).toBe('h1')
          expect(blockText(block)).toBe('#x')
        })

        test('a hash run after real heading text and a space still round-trips', () => {
          const portableText = [leavesBlock(['x  #'], {style: 'h1'})]

          const markdown = portableTextToMarkdown(portableText)
          expect(markdown).toBe('# x  \\#')

          const reparsed = markdownToPortableText(markdown)
          const block = firstBlock(reparsed)
          expect(block.style).toBe('h1')
          expect(blockText(block)).toBe('x  #')
        })
      })

      describe('a heading with a hard break in its text', () => {
        test("only the first line is inside the heading's `# ` prefix", () => {
          const portableText = [leavesBlock(['a\n- b'], {style: 'h1'})]

          const markdown = portableTextToMarkdown(portableText)
          expect(markdown).toBe('# a  \n\\- b')

          const reparsed = markdownToPortableText(markdown)
          expect(reparsed).toHaveLength(2)
          const [heading, continuation] = reparsed
          if (
            heading === undefined ||
            continuation === undefined ||
            !isPortableTextBlock(heading) ||
            !isPortableTextBlock(continuation)
          ) {
            throw new Error('Expected two portable text blocks')
          }
          expect(heading.style).toBe('h1')
          expect(blockText(heading)).toBe('a')
          // The second raw line is no longer inside the heading's `# `
          // prefix, so it's an ordinary line: it must not misparse as a
          // bullet list item, and its text (the hard break's continuation)
          // must survive.
          expect(isPortableTextListItemBlock(continuation)).toBe(false)
          expect(blockText(continuation)).toBe('- b')
        })
      })

      describe('a GFM task-list checkbox at the start of list-item content', () => {
        test.each(['[x] done', '[X] done', '[ ] done'])(
          '%s round-trips instead of being consumed as a checkbox',
          (text) => {
            const portableText = [
              leavesBlock([text], {listItem: 'bullet', level: 1}),
            ]

            const markdown = portableTextToMarkdown(portableText)
            expect(markdown).toBe(`- \\${text}`)

            const reparsed = markdownToPortableText(markdown)
            const block = firstBlock(reparsed)
            expect(block.listItem).toBe('bullet')
            expect('checked' in block).toBe(false)
            expect(blockText(block)).toBe(text)
          },
        )

        test('a list item that already is a task keeps its own checkbox and its content bare', () => {
          const keyGenerator = createTestKeyGenerator()
          const portableText = [
            {
              _type: 'block',
              _key: keyGenerator(),
              style: 'normal',
              listItem: 'task',
              level: 1,
              checked: true,
              markDefs: [],
              children: [
                {_type: 'span', _key: keyGenerator(), text: 'done', marks: []},
              ],
            },
          ]

          expect(portableTextToMarkdown(portableText)).toBe('- [x] done')
        })
      })
    })

    describe('linkify awareness', () => {
      test.each([
        ['www.a.com/a*b*c', 'www.a.com/a\\*b\\*c'],
        ['www.a.com/_b_', 'www.a.com/\\_b\\_'],
        ['www.a.com/~~x~~', 'www.a.com/\\~\\~x\\~\\~'],
      ])(
        'fuzzy claim %s escapes normally: emphasis beats fuzzy linkify on reparse, so masking would lose the characters',
        (text, expectedMarkdown) => {
          const portableText = [leavesBlock([text])]

          const markdown = portableTextToMarkdown(portableText)
          expect(markdown).toBe(expectedMarkdown)

          const reparsed = markdownToPortableText(markdown)
          expect(blockText(firstBlock(reparsed))).toBe(text)
        },
      )

      test.each([
        'https://e.co#~~',
        'https://e.co#_',
        'www.e.co/a_b',
        'foo@e.co',
      ])(
        '%s round-trips byte-identical, not escaped inside the linkified range',
        (text) => {
          const portableText = [leavesBlock([text])]

          const markdown = portableTextToMarkdown(portableText)
          expect(markdown).toBe(text)

          const reparsed = markdownToPortableText(markdown)
          const block = firstBlock(reparsed)
          expect(blockText(block)).toBe(text)
          const linkSpan = block.children.find(isPortableTextSpan)
          expect(linkSpan?.marks).toHaveLength(1)
          const linkKey = linkSpan?.marks?.at(0)
          const markDef = (block.markDefs ?? []).find(
            (def) => def._key === linkKey,
          )
          expect(markDef?._type).toBe('link')
        },
      )
    })

    describe('context', () => {
      test('heading', () => {
        const keyGenerator = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: keyGenerator(),
            style: 'h1',
            markDefs: [],
            children: [
              {_type: 'span', _key: keyGenerator(), text: '*bar*', marks: []},
            ],
          },
        ]

        expect(portableTextToMarkdown(portableText)).toBe('# \\*bar\\*')
      })

      test('list item', () => {
        const keyGenerator = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: keyGenerator(),
            style: 'normal',
            listItem: 'bullet',
            level: 1,
            markDefs: [],
            children: [
              {_type: 'span', _key: keyGenerator(), text: '*bar*', marks: []},
            ],
          },
        ]

        expect(portableTextToMarkdown(portableText)).toBe('- \\*bar\\*')
      })

      test('blockquote', () => {
        const keyGenerator = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'block',
            _key: keyGenerator(),
            style: 'blockquote',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keyGenerator(),
                text: '# heading text',
                marks: [],
              },
            ],
          },
        ]

        expect(portableTextToMarkdown(portableText)).toBe('> \\# heading text')
      })

      test('table cell, including a literal backslash before a pipe', () => {
        const keyGenerator = createTestKeyGenerator()
        const cellBlock = (text: string) => ({
          _type: 'block',
          _key: keyGenerator(),
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keyGenerator(), text, marks: []}],
        })
        const table = {
          _type: 'table',
          _key: keyGenerator(),
          headerRows: 0,
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  value: [cellBlock('*bar*')],
                },
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  value: [cellBlock('a\\|b')],
                },
              ],
            },
          ],
        }

        expect(portableTextToMarkdown([table])).toBe(
          ['|  |', '| --- |', '| \\*bar\\* |', '| a\\\\\\|b |'].join('\n'),
        )
      })

      test('callout', () => {
        const keyGenerator = createTestKeyGenerator()
        const portableText = [
          {
            _type: 'callout',
            _key: keyGenerator(),
            tone: 'note',
            content: [
              {
                _type: 'block',
                _key: keyGenerator(),
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keyGenerator(),
                    text: '*bar*',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ]

        expect(portableTextToMarkdown(portableText)).toBe(
          '> [!NOTE]\n> \\*bar\\*',
        )
      })
    })
  })

  describe('zero-config round-trip', () => {
    test('MD -> PT -> MD round-trip is stable for a document exercising code, image, horizontal rule, HTML, and a callout', () => {
      const markdown = [
        'Some text with `inline code`.',
        '',
        '```js',
        "console.log('hi')",
        '```',
        '',
        '![alt text](https://example.com/image.png)',
        '',
        '---',
        '',
        '<div class="note">Raw HTML</div>',
        '',
        '> [!NOTE]',
        '> A callout',
      ].join('\n')

      const portableText = markdownToPortableText(markdown, {
        keyGenerator: createTestKeyGenerator(),
      })

      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })
  })
})

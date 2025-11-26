import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {markdownToPortableText} from './to-portable-text'
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
  })

  describe('hard breaks', () => {
    test('default', () => {
      const markdown = 'foo  \nbar  \nbaz'
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('custom renderer', () => {
      const markdownIn = 'foo  \nbar  \nbaz'
      const markdownOut = 'foo<br />bar<br />baz'
      const portableText = markdownToPortableText(markdownIn)
      expect(
        portableTextToMarkdown(portableText, {
          components: {
            hardBreak: () => '<br />',
          },
        }),
      ).toBe(markdownOut)
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
          components: {
            block: {
              paragraph: ({children}) => `${children}`,
            },
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

        test('default definition', () => {
          const portableText = markdownToPortableText(markdown)
          expect(portableTextToMarkdown(portableText)).toBe(markdown)
        })

        test('custom definition', () => {
          const schema = compileSchema(
            defineSchema({styles: [{name: 'quote'}]}),
          )
          const portableText = markdownToPortableText(markdown, {
            schema,
            block: {
              blockquote: () => 'quote',
            },
          })
          expect(
            portableTextToMarkdown(portableText, {
              components: {
                block: {
                  quote: ({children}) => `> ${children}`,
                },
              },
            }),
          ).toBe(markdown)
        })

        test('no definition', () => {
          const schema = compileSchema(
            defineSchema({styles: [{name: 'quote'}]}),
          )
          const portableText = markdownToPortableText(markdown, {
            schema,
            block: {blockquote: () => 'quote'},
          })
          expect(portableTextToMarkdown(portableText)).toBe('foo')
        })
      })

      describe('nested', () => {
        test('default definition', () => {
          const markdownIn = '> foo\n>> bar\n\n'
          const portableText = markdownToPortableText(markdownIn)
          // Two separate blockquote blocks in PT result in two separate blockquotes
          const markdownOut = '> foo\n\n> bar'
          expect(portableTextToMarkdown(portableText)).toBe(markdownOut)
        })

        test('custom definition', () => {
          const markdownIn = '> foo\n>> bar\n\n'
          const schema = compileSchema(
            defineSchema({styles: [{name: 'quote'}]}),
          )
          const portableText = markdownToPortableText(markdownIn, {
            schema,
            block: {
              blockquote: () => 'quote',
            },
          })
          const markdownOut = '> foo\n\n> bar'
          expect(
            portableTextToMarkdown(portableText, {
              components: {
                block: {
                  quote: ({children}) => `> ${children}`,
                },
              },
            }),
          ).toBe(markdownOut)
        })

        test('no definition', () => {
          const markdownIn = '> foo\n>> bar\n\n'
          const schema = compileSchema(defineSchema({}))
          const portableText = markdownToPortableText(markdownIn, {schema})
          expect(portableTextToMarkdown(portableText)).toBe('foo\n\nbar')
        })
      })
    })

    describe('h1', () => {
      test('default definition', () => {
        const markdown = '# foo'
        const portableText = markdownToPortableText(markdown)
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      test('custom definition', () => {
        const markdown = '# foo'
        const portableText = markdownToPortableText(markdown, {
          schema: compileSchema(defineSchema({styles: [{name: 'heading 1'}]})),
          block: {h1: () => 'heading 1'},
        })
        expect(
          portableTextToMarkdown(portableText, {
            components: {
              block: {
                'heading 1': ({children}) => `# ${children}`,
              },
            },
          }),
        ).toBe(markdown)
      })

      test('no definition', () => {
        const markdown = '# foo'
        const schema = compileSchema(defineSchema({}))
        const portableText = markdownToPortableText(markdown, {schema})
        expect(portableTextToMarkdown(portableText)).toBe('foo')
      })
    })
  })

  describe('list items', () => {
    describe('unordered', () => {
      const markdown = '- foo\n'

      test('default definition', () => {
        const portableText = markdownToPortableText(markdown)
        expect(portableTextToMarkdown(portableText)).toBe(markdown)
      })

      test('custom definition', () => {
        const schema = compileSchema(defineSchema({lists: [{name: 'dot'}]}))
        const portableText = markdownToPortableText(markdown, {
          schema,
          listItem: {bullet: () => 'dot'},
        })
        expect(
          portableTextToMarkdown(portableText, {
            components: {
              listItem: {
                dot: ({children}) => `- ${children}\n`,
              },
            },
          }),
        ).toBe(markdown)
      })

      test('no definition', () => {
        const schema = compileSchema(defineSchema({}))
        const portableText = markdownToPortableText(markdown, {schema})
        expect(portableTextToMarkdown(portableText)).toBe('foo')
      })
    })
  })

  describe('lists', () => {
    const markdown = ['- foo', '  - bar', '    - baz', ''].join('\n')

    test('default definition', () => {
      const portableText = markdownToPortableText(markdown)
      expect(portableTextToMarkdown(portableText)).toBe(markdown)
    })

    test('custom definition', () => {
      const schema = compileSchema(defineSchema({lists: [{name: 'dot'}]}))
      const portableText = markdownToPortableText(markdown, {
        schema,
        listItem: {bullet: () => 'dot'},
      })
      expect(
        portableTextToMarkdown(portableText, {
          components: {
            listItem: {
              dot: ({children, value}) => {
                const level = value.level || 1
                const indent = '  '.repeat(level - 1)
                const hasTrailingNewline = children?.endsWith('\n') || false
                const trailingNewline = hasTrailingNewline ? '' : '\n'
                return `${indent}- ${children}${trailingNewline}`
              },
            },
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

  describe('code block', () => {
    test('default definition', () => {
      const markdown = ['```js', `const foo = 'bar'`, '```'].join('\n')
      const portableText = markdownToPortableText(markdown)

      expect(
        portableTextToMarkdown(portableText, {
          components: {
            types: {
              code: ({value}) => `\`\`\`${value.language}\n${value.code}\`\`\``,
            },
          },
        }),
      ).toBe(markdown)
    })

    test('no language field', () => {
      const markdownIn = ['```js', `const foo = 'bar'`, '```'].join('\n')
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
          components: {
            types: {
              code: ({value}) => `\`\`\`\n${value.code}\`\`\``,
            },
          },
        }),
      ).toBe(markdownOut)
    })
  })

  describe('tables', () => {
    test('simple table', () => {
      const markdownIn = [
        '| Header 1 | Header 2 |',
        '|----------|----------|',
        '| Cell 1   | Cell 2   |',
        '| Cell 3   | Cell 4   |',
      ].join('\n')
      const markdownOut = [
        '| Header 1 | Header 2 |',
        '|----------|----------|',
        '| Cell 1 | Cell 2 |',
        '| Cell 3 | Cell 4 |',
      ].join('\n')

      // Schema with table support
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
        schema,
        types: {
          table: buildObjectMatcher(tableObjectDefinition),
        },
      })

      expect(
        portableTextToMarkdown(portableText, {
          components: {
            types: {
              table: ({value, renderNode}) => {
                const headerRows = value.headerRows || 0
                const rows = value.rows as Array<{
                  _key: string
                  _type: 'row'
                  cells: Array<{
                    _type: 'cell'
                    _key: string
                    value: Array<{_type: string; children?: Array<unknown>}>
                  }>
                }>
                const lines: string[] = []

                // Helper to extract text from cell blocks
                const getCellText = (
                  cellBlocks: Array<{_type: string; children?: Array<unknown>}>,
                ): string => {
                  return cellBlocks
                    .map((block, index) =>
                      renderNode({
                        node: block as {_type: string},
                        index,
                        isInline: false,
                        renderNode,
                      }),
                    )
                    .join(' ')
                    .trim()
                }

                // Add header rows
                for (let i = 0; i < headerRows; i++) {
                  const row = rows[i]
                  if (row) {
                    const cellTexts = row.cells.map((cell) =>
                      getCellText(cell.value),
                    )
                    lines.push(`| ${cellTexts.join(' | ')} |`)
                  }
                }

                // Add separator line if there are headers
                if (headerRows > 0 && rows[0]) {
                  const separators = rows[0].cells.map(() => '----------')
                  lines.push(`|${separators.join('|')}|`)
                }

                // Add body rows
                for (let i = headerRows; i < rows.length; i++) {
                  const row = rows[i]
                  if (row) {
                    const cellTexts = row.cells.map((cell) =>
                      getCellText(cell.value),
                    )
                    lines.push(`| ${cellTexts.join(' | ')} |`)
                  }
                }

                return lines.join('\n')
              },
            },
          },
        }),
      ).toBe(markdownOut)
    })
  })
})

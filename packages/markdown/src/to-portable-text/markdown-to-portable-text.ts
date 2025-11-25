import {
  isSpan,
  type PortableTextBlock,
  type PortableTextObject,
  type PortableTextTextBlock,
  type Schema,
} from '@portabletext/schema'
import markdownit from 'markdown-it'
import {
  blockquoteStyleDefinition,
  defaultCodeDecoratorDefinition,
  defaultCodeObjectDefinition,
  defaultEmDecoratorDefinition,
  defaultHorizontalRuleObjectDefinition,
  defaultHtmlObjectDefinition,
  defaultImageObjectDefinition,
  defaultLinkObjectDefinition,
  defaultOrderedListItemDefinition,
  defaultSchema,
  defaultStrikeThroughDecoratorDefinition,
  defaultStrongDecoratorDefinition,
  defaultTableObjectDefinition,
  defaultUnorderedListItemDefinition,
  h1StyleDefinition,
  h2StyleDefinition,
  h3StyleDefinition,
  h4StyleDefinition,
  h5StyleDefinition,
  h6StyleDefinition,
  normalStyleDefinition,
} from '../default-schema'
import {defaultKeyGenerator} from '../key-generator'
import {
  buildAnnotationMatcher,
  buildDecoratorMatcher,
  buildListItemMatcher,
  buildObjectMatcher,
  buildStyleMatcher,
  type AnnotationMatcher,
  type DecoratorMatcher,
  type ListItemMatcher,
  type ObjectMatcher,
  type StyleMatcher,
} from './matchers'

type Options = {
  schema?: Schema
  keyGenerator?: () => string
  marks?: {
    strong?: DecoratorMatcher
    em?: DecoratorMatcher
    code?: DecoratorMatcher
    strikeThrough?: DecoratorMatcher
    link?: AnnotationMatcher<{href: string; title: string | undefined}>
  }
  block?: {
    normal?: StyleMatcher
    blockquote?: StyleMatcher
    h1?: StyleMatcher
    h2?: StyleMatcher
    h3?: StyleMatcher
    h4?: StyleMatcher
    h5?: StyleMatcher
    h6?: StyleMatcher
  }
  listItem?: {
    number?: ListItemMatcher
    bullet?: ListItemMatcher
  }
  types?: {
    code?: ObjectMatcher<{language: string | undefined; code: string}>
    horizontalRule?: ObjectMatcher
    html?: ObjectMatcher<{html: string}>
    table?: ObjectMatcher<{rows: Array<{cells: string[]}>}>
    image?: ObjectMatcher<{src: string; alt: string}>
  }
  html?: {
    /**
     * How to handle inline HTML.
     * - 'skip': Ignore inline HTML (default)
     * - 'text': Convert inline HTML to plain text
     *
     * @defaultValue 'skip'
     */
    inline?: 'skip' | 'text'
  }
}

const defaultOptions = {
  schema: defaultSchema,
  keyGenerator: defaultKeyGenerator,
  html: {
    inline: 'skip',
  },
  block: {
    normal: buildStyleMatcher(normalStyleDefinition),
    blockquote: buildStyleMatcher(blockquoteStyleDefinition),
    h1: buildStyleMatcher(h1StyleDefinition),
    h2: buildStyleMatcher(h2StyleDefinition),
    h3: buildStyleMatcher(h3StyleDefinition),
    h4: buildStyleMatcher(h4StyleDefinition),
    h5: buildStyleMatcher(h5StyleDefinition),
    h6: buildStyleMatcher(h6StyleDefinition),
  },
  listItem: {
    number: buildListItemMatcher(defaultOrderedListItemDefinition),
    bullet: buildListItemMatcher(defaultUnorderedListItemDefinition),
  },
  marks: {
    strong: buildDecoratorMatcher(defaultStrongDecoratorDefinition),
    em: buildDecoratorMatcher(defaultEmDecoratorDefinition),
    code: buildDecoratorMatcher(defaultCodeDecoratorDefinition),
    strikeThrough: buildDecoratorMatcher(
      defaultStrikeThroughDecoratorDefinition,
    ),
    link: buildAnnotationMatcher(defaultLinkObjectDefinition),
  },
  types: {
    code: buildObjectMatcher(defaultCodeObjectDefinition),
    horizontalRule: buildObjectMatcher(defaultHorizontalRuleObjectDefinition),
    html: buildObjectMatcher(defaultHtmlObjectDefinition),
    table: buildObjectMatcher(defaultTableObjectDefinition),
    image: buildObjectMatcher(defaultImageObjectDefinition),
  },
} as const satisfies Options

/**
 * Converts a markdown string to an array of Portable Text blocks.
 *
 * @public
 */
export function markdownToPortableText(
  markdown: string,
  options?: Options,
): Array<PortableTextBlock> {
  const consolidatedOptions = {
    schema: options?.schema ?? defaultSchema,
    keyGenerator: options?.keyGenerator ?? defaultKeyGenerator,
    html: {
      inline: options?.html?.inline ?? 'skip',
    },
    marks: {
      ...defaultOptions.marks,
      ...options?.marks,
    },
    block: {
      ...defaultOptions.block,
      ...options?.block,
    },
    listItem: {
      ...defaultOptions.listItem,
      ...options?.listItem,
    },
    types: {
      ...defaultOptions.types,
      ...options?.types,
    },
  }

  const md = markdownit({
    html: true,
    linkify: true,
    typographer: false,
  }).enable(['strikethrough', 'table'])

  const tokens = md.parse(markdown, {})

  const portableText: Array<PortableTextBlock> = []

  // State
  let currentBlock: PortableTextTextBlock | null = null
  const currentListStack: Array<string | null> = []
  const markDefRefs: Array<string> = [] // mark keys: 'strong', 'em', 'code', or link keys
  let currentMarkDefs: Array<PortableTextObject> = []
  let blockNestingDepth = 0 // Track nesting depth for blockquotes, lists, etc.

  // Table state
  let currentTable: {rows: Array<{cells: string[]}>} | null = null
  let currentTableRow: string[] | null = null
  let currentTableCell: string = ''

  const startBlock = (style: string) => {
    flushBlock()
    currentBlock = {
      _type: 'block' as const,
      style,
      children: [],
      _key: consolidatedOptions.keyGenerator(),
      markDefs: [],
    }
    currentMarkDefs = []
  }

  const flushBlock = () => {
    if (!currentBlock) {
      return
    }

    // Text blocks must have at least one child span
    if (currentBlock.children.length === 0) {
      currentBlock.children.push({
        _type: consolidatedOptions.schema.span.name,
        _key: consolidatedOptions.keyGenerator(),
        text: '',
        marks: [],
      })
    }

    // Assign accumulated markDefs to the block
    currentBlock.markDefs = currentMarkDefs

    portableText.push(currentBlock)

    currentBlock = null
    currentMarkDefs = []
  }

  const addSpan = (text: string) => {
    if (text.length === 0) {
      return
    }

    // if (!currentBlock) {
    //   startBlock(defaultStyle)
    // }

    if (!currentBlock) {
      throw new Error('Expected current block')
    }

    const lastChild = currentBlock.children.at(-1)

    if (
      isSpan({schema: consolidatedOptions.schema}, lastChild) &&
      lastChild.marks?.every((mark) => markDefRefs.includes(mark)) &&
      markDefRefs.every((mark) => lastChild.marks?.includes(mark))
    ) {
      // Merge with previous span if marks match
      lastChild.text += text
    } else {
      currentBlock.children.push({
        _type: consolidatedOptions.schema.span.name,
        _key: consolidatedOptions.keyGenerator(),
        text: text,
        marks: [...markDefRefs],
      })
    }
  }

  // Helpers for lists
  const listLevel = () => currentListStack.length
  const ensureListBlock = (listItem: string) => {
    if (!currentBlock) {
      const style = consolidatedOptions.block.normal({
        context: {schema: consolidatedOptions.schema},
      })

      if (!style) {
        console.warn('No default style found, using "normal"')
        startBlock('normal')
      } else {
        startBlock(style)
      }
    }

    if (!currentBlock) {
      throw new Error('Expected current block')
    }

    if (
      currentBlock.listItem !== listItem ||
      currentBlock.level !== listLevel()
    ) {
      currentBlock.listItem = listItem
      currentBlock.level = listLevel()
    }
  }

  // Walk tokens
  for (const token of tokens) {
    switch (token.type) {
      // Paragraphs
      case 'paragraph_open': {
        // Skip creating a new block if we're inside a blockquote or other container
        if (blockNestingDepth > 0) {
          break
        }

        const style = consolidatedOptions.block.normal({
          context: {schema: consolidatedOptions.schema},
        })

        if (!style) {
          console.warn('No default style found, using "normal"')
          startBlock('normal')
          break
        }

        startBlock(style)
        break
      }
      case 'paragraph_close':
        // Skip flushing if we're inside a blockquote or other container
        if (blockNestingDepth > 0) {
          break
        }
        flushBlock()
        break

      // Headings
      case 'heading_open': {
        const level = Number(token?.tag?.slice(1))

        // Map level to the appropriate heading matcher
        const headingMatchers = {
          1: consolidatedOptions.block.h1,
          2: consolidatedOptions.block.h2,
          3: consolidatedOptions.block.h3,
          4: consolidatedOptions.block.h4,
          5: consolidatedOptions.block.h5,
          6: consolidatedOptions.block.h6,
        } as const

        const headingMatcher =
          headingMatchers[level as keyof typeof headingMatchers]

        const style =
          headingMatcher?.({
            context: {schema: consolidatedOptions.schema},
          }) ??
          consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

        if (!style) {
          console.warn('No heading style found, using "normal"')
          startBlock('normal')
          break
        }

        startBlock(style)
        break
      }
      case 'heading_close':
        flushBlock()
        break

      // Blockquote
      case 'blockquote_open': {
        blockNestingDepth++
        const style =
          consolidatedOptions.block.blockquote({
            context: {schema: consolidatedOptions.schema},
          }) ??
          consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

        if (!style) {
          console.warn('No blockquote style found, using "normal"')
          startBlock('normal')
          break
        }

        startBlock(style)
        break
      }
      case 'blockquote_close': {
        blockNestingDepth--
        flushBlock()
        break
      }
      // Lists
      case 'bullet_list_open': {
        const listItem = consolidatedOptions.listItem.bullet({
          context: {schema: consolidatedOptions.schema},
        })

        if (!listItem) {
          // No list definition in schema, push null to indicate we should skip list properties
          currentListStack.push(null)
          break
        }

        currentListStack.push(listItem)
        break
      }
      case 'ordered_list_open': {
        const listItem = consolidatedOptions.listItem.number({
          context: {schema: consolidatedOptions.schema},
        })

        if (!listItem) {
          // No list definition in schema, push null to indicate we should skip list properties
          currentListStack.push(null)
          break
        }

        currentListStack.push(listItem)
        break
      }
      case 'bullet_list_close':
      case 'ordered_list_close':
        currentListStack.pop()
        break
      case 'list_item_open': {
        blockNestingDepth++

        const listType = currentListStack.at(-1)

        if (listType === undefined) {
          throw new Error('Expected an open list')
        }

        // Flush any previous list item block before starting a new one
        // This is needed for proper separation of list items
        if (currentBlock) {
          flushBlock()
        }

        // If listType is null, it means there's no list definition in the schema
        // Just create a normal block without list properties
        if (listType === null) {
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            console.warn('No default style found, using "normal"')
            startBlock('normal')
          } else {
            startBlock(style)
          }
          break
        }

        ensureListBlock(listType)

        break
      }
      case 'list_item_close':
        blockNestingDepth--
        flushBlock()
        break

      // Code fences / blocks
      case 'fence': {
        flushBlock()

        const language = token.info.trim() || undefined

        const codeObject = consolidatedOptions.types.code({
          context: {
            schema: consolidatedOptions.schema,
            keyGenerator: consolidatedOptions.keyGenerator,
          },
          value: {language, code: token.content},
          isInline: false,
        })

        if (!codeObject) {
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            console.warn('No default style found, using "normal"')
            startBlock('normal')
          } else {
            startBlock(style)
          }

          addSpan(token.content)

          break
        }

        portableText.push(codeObject)

        break
      }

      // Horizontal rule
      case 'hr': {
        flushBlock()

        const hrObject = consolidatedOptions.types.horizontalRule({
          context: {
            schema: consolidatedOptions.schema,
            keyGenerator: consolidatedOptions.keyGenerator,
          },
          value: {},
          isInline: false,
        })

        if (!hrObject) {
          break
        }

        portableText.push(hrObject)

        break
      }

      // HTML block
      case 'html_block': {
        flushBlock()

        const htmlContent = token.content.trim()

        if (!htmlContent) {
          break
        }

        const htmlObject = consolidatedOptions.types.html({
          context: {
            schema: consolidatedOptions.schema,
            keyGenerator: consolidatedOptions.keyGenerator,
          },
          value: {html: htmlContent},
          isInline: false,
        })

        if (!htmlObject) {
          break
        }

        portableText.push(htmlObject)

        break
      }

      case 'code_block': {
        flushBlock()

        const codeObject = consolidatedOptions.types.code({
          context: {
            schema: consolidatedOptions.schema,
            keyGenerator: consolidatedOptions.keyGenerator,
          },
          value: {language: undefined, code: token.content},
          isInline: false,
        })

        if (!codeObject) {
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            console.warn('No default style found, using "normal"')
            startBlock('normal')
          } else {
            startBlock(style)
          }

          addSpan(token.content)
        } else {
          portableText.push(codeObject)
        }

        break
      }

      // Tables
      case 'table_open':
        flushBlock()
        currentTable = {rows: []}
        break

      case 'table_close': {
        if (!currentTable) {
          break
        }

        const tableObject = consolidatedOptions.types.table({
          context: {
            schema: consolidatedOptions.schema,
            keyGenerator: consolidatedOptions.keyGenerator,
          },
          value: {rows: currentTable.rows},
          isInline: false,
        })

        if (tableObject) {
          portableText.push(tableObject)
        }

        currentTable = null
        break
      }

      case 'thead_open':
      case 'tbody_open':
        // Just markers, no action needed
        break

      case 'thead_close':
      case 'tbody_close':
        // Just markers, no action needed
        break

      case 'tr_open':
        currentTableRow = []
        break

      case 'tr_close':
        if (currentTable && currentTableRow) {
          currentTable.rows.push({cells: currentTableRow})
        }
        currentTableRow = null
        break

      case 'th_open':
      case 'td_open':
        currentTableCell = ''
        break

      case 'th_close':
      case 'td_close':
        if (currentTableRow !== null) {
          currentTableRow.push(currentTableCell)
        }
        currentTableCell = ''
        break

      // Inline container
      case 'inline': {
        // If we're in a table cell, accumulate text there instead
        const inTableCell = currentTableRow !== null

        // Check if this is a standalone image (paragraph with only an image)
        if (
          !inTableCell &&
          token.children?.length === 1 &&
          token.children[0]?.type === 'image'
        ) {
          const imageToken = token.children[0]
          if (!imageToken) {
            break
          }

          const src =
            imageToken.attrs?.find(([name]) => name === 'src')?.at(1) || ''
          const alt = imageToken.content || ''

          const blockImageObject = consolidatedOptions.types.image({
            context: {
              schema: consolidatedOptions.schema,
              keyGenerator: consolidatedOptions.keyGenerator,
            },
            value: {src, alt},
            isInline: false,
          })

          if (blockImageObject) {
            // Discard the empty paragraph block that was created by paragraph_open
            currentBlock = null
            currentMarkDefs = []
            portableText.push(blockImageObject)
          }
          break
        }

        // Walk its children for text/marks/links
        for (const childToken of token.children ?? []) {
          switch (childToken.type) {
            case 'text':
              if (inTableCell) {
                currentTableCell += childToken.content
              } else {
                addSpan(childToken.content)
              }
              break
            case 'softbreak':
            case 'hardbreak':
              if (inTableCell) {
                currentTableCell += '\n'
              } else {
                addSpan('\n')
              }
              break
            case 'code_inline': {
              if (inTableCell) {
                currentTableCell += childToken.content
                break
              }

              const decorator = consolidatedOptions.marks.code({
                context: {schema: consolidatedOptions.schema},
              })

              if (!decorator) {
                // No code decorator defined, just add the content without marks
                addSpan(childToken.content)
                break
              }

              markDefRefs.push(decorator)
              addSpan(childToken.content)

              // code_inline is self-contained, so we need to pop the decorator
              const index = markDefRefs.lastIndexOf(decorator)

              if (index !== -1) {
                markDefRefs.splice(index, 1)
              }

              break
            }
            case 'strong_open': {
              const decorator = consolidatedOptions.marks.strong({
                context: {schema: consolidatedOptions.schema},
              })

              if (!decorator) {
                break
              }

              markDefRefs.push(decorator)
              break
            }
            case 'strong_close': {
              const decorator = consolidatedOptions.marks.strong({
                context: {schema: consolidatedOptions.schema},
              })

              if (!decorator) {
                break
              }

              const index = markDefRefs.lastIndexOf(decorator)

              if (index !== -1) {
                markDefRefs.splice(index, 1)
              }

              break
            }
            case 'em_open': {
              const decorator = consolidatedOptions.marks.em({
                context: {schema: consolidatedOptions.schema},
              })

              if (!decorator) {
                break
              }

              markDefRefs.push(decorator)

              break
            }
            case 'em_close': {
              const decorator = consolidatedOptions.marks.em({
                context: {schema: consolidatedOptions.schema},
              })

              if (!decorator) {
                break
              }

              const index = markDefRefs.lastIndexOf(decorator)

              if (index !== -1) {
                markDefRefs.splice(index, 1)
              }

              break
            }
            case 's_open': {
              const decorator = consolidatedOptions.marks.strikeThrough({
                context: {schema: consolidatedOptions.schema},
              })

              if (!decorator) {
                break
              }

              markDefRefs.push(decorator)

              break
            }
            case 's_close': {
              const decorator = consolidatedOptions.marks.strikeThrough({
                context: {schema: consolidatedOptions.schema},
              })

              if (!decorator) {
                break
              }

              const index = markDefRefs.lastIndexOf(decorator)

              if (index !== -1) {
                markDefRefs.splice(index, 1)
              }

              break
            }
            case 'link_open': {
              const href = childToken.attrs
                ?.find(([name]) => name === 'href')
                ?.at(1)

              if (!href) {
                break
              }

              const title = childToken.attrs
                ?.find(([name]) => name === 'title')
                ?.at(1)

              const linkObject = consolidatedOptions.marks.link({
                context: {
                  schema: consolidatedOptions.schema,
                  keyGenerator: consolidatedOptions.keyGenerator,
                },
                value: {href, title},
              })

              if (!linkObject) {
                break
              }

              currentMarkDefs.push(linkObject)
              markDefRefs.push(linkObject._key)
              break
            }
            case 'link_close': {
              // remove the last link key
              const markDefKeys = new Set(currentMarkDefs.map((d) => d._key))
              let lastLinkIndex: number | undefined

              for (const markDefRef of markDefRefs.reverse()) {
                if (markDefKeys.has(markDefRef)) {
                  lastLinkIndex = markDefRefs.indexOf(markDefRef)
                  break
                }
              }

              if (lastLinkIndex !== undefined) {
                const realIndex = markDefRefs.length - 1 - lastLinkIndex
                markDefRefs.splice(realIndex, 1)
              }
              break
            }
            case 'image': {
              const src =
                childToken.attrs?.find(([name]) => name === 'src')?.at(1) || ''
              const alt = childToken.content || ''

              const imageObject = consolidatedOptions.types.image({
                context: {
                  schema: consolidatedOptions.schema,
                  keyGenerator: consolidatedOptions.keyGenerator,
                },
                value: {src, alt},
                isInline: true,
              })

              if (!imageObject) {
                break
              }

              if (!currentBlock) {
                const style = consolidatedOptions.block.normal({
                  context: {schema: consolidatedOptions.schema},
                })

                if (!style) {
                  console.warn('No default style found, using "normal"')
                  startBlock('normal')
                } else {
                  startBlock(style)
                }
              }

              // At this point currentBlock should exist
              if (!currentBlock) {
                throw new Error('Expected current block after startBlock')
              }

              // Add the image as an inline object (TypeScript assertion needed for type narrowing)
              ;(currentBlock as PortableTextTextBlock).children.push(
                imageObject as PortableTextObject,
              )

              break
            }
            case 'html_inline': {
              // Handle inline HTML based on configuration
              if (consolidatedOptions.html.inline === 'text') {
                addSpan(childToken.content)
              }
              // 'skip' - do nothing, ignore the HTML
              break
            }
            default:
              // Ignore other inline token types by default
              break
          }
        }
        break
      }

      default:
        break
    }
  }

  flushBlock()

  return portableText
}

import {alert} from '@mdit/plugin-alert'
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
  defaultCalloutObjectDefinition,
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
  defaultTaskListItemDefinition,
  defaultUnorderedListItemDefinition,
  h1StyleDefinition,
  h2StyleDefinition,
  h3StyleDefinition,
  h4StyleDefinition,
  h5StyleDefinition,
  h6StyleDefinition,
  normalStyleDefinition,
} from '../default-schema'
import {unescapeImageAndLinkText} from '../escape'
import {defaultKeyGenerator} from '../key-generator'
import {
  buildAnnotationMatcher,
  buildDecoratorMatcher,
  buildListItemMatcher,
  buildObjectMatcher,
  buildStyleMatcher,
  type AnnotationMatcher,
  type DecoratorMatcher,
  type ExtractValue,
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
    task?: ListItemMatcher
  }
  types?: {
    code?: ObjectMatcher<{language: string | undefined; code: string}>
    horizontalRule?: ObjectMatcher
    html?: ObjectMatcher<{html: string}>
    table?: ObjectMatcher<{
      headerRows: number | undefined
      rows: Array<{
        _key: string
        _type: 'row'
        cells: Array<{
          _type: 'cell'
          _key: string
          value: Array<PortableTextBlock>
        }>
      }>
    }>
    image?: ObjectMatcher<{src: string; alt: string; title: string | undefined}>
    callout?: ObjectMatcher<{tone: string; content: Array<PortableTextBlock>}>
    list?: ObjectMatcher<{
      kind: 'bullet' | 'number' | 'task'
      items: Array<{
        _type: 'list-item'
        _key: string
        checked?: boolean
        content: Array<PortableTextBlock | PortableTextObject>
      }>
    }>
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

const codeBlockMatcher: ObjectMatcher<
  ExtractValue<typeof defaultCodeObjectDefinition>
> = ({context, value, isInline}) => {
  const defaultMatcher = buildObjectMatcher(defaultCodeObjectDefinition)
  const codeObject = defaultMatcher({context, value, isInline})

  if (!codeObject) {
    return undefined
  }

  if (!('code' in codeObject)) {
    return undefined
  }

  return codeObject
}

const imageBlockMatcher: ObjectMatcher<
  ExtractValue<typeof defaultImageObjectDefinition>
> = ({context, value, isInline}) => {
  const defaultMatcher = buildObjectMatcher(defaultImageObjectDefinition)
  const imageObject = defaultMatcher({context, value, isInline})

  if (!imageObject) {
    return undefined
  }

  if (!('src' in imageObject)) {
    return undefined
  }

  return imageObject
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
    task: buildListItemMatcher(defaultTaskListItemDefinition),
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
    code: codeBlockMatcher,
    horizontalRule: buildObjectMatcher(defaultHorizontalRuleObjectDefinition),
    html: buildObjectMatcher(defaultHtmlObjectDefinition),
    image: imageBlockMatcher,
    callout: buildObjectMatcher(defaultCalloutObjectDefinition),
  },
} as const satisfies Options

/**
 * Flattens a table structure by lifting all blocks from all cells.
 */
function flattenTable(
  table: {
    rows: Array<{
      _key: string
      _type: 'row'
      cells: Array<{
        _type: 'cell'
        _key: string
        value: Array<PortableTextBlock>
      }>
    }>
    headerRows: number
  },
  portableText: Array<PortableTextBlock>,
): void {
  // Flatten the table by lifting all blocks from all cells
  for (const row of table.rows) {
    for (const cell of row.cells) {
      for (const block of cell.value) {
        portableText.push(block)
      }
    }
  }
}

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
    typographer: true,
  })
    .enable(['strikethrough', 'table'])
    .use(alert)

  const tokens = md.parse(markdown, {})

  // Pre-pass: detect GFM task-list checkbox prefixes (`[ ]`, `[x]`, `[X]`)
  // on the first inline content of each list item. Strip the prefix from the
  // inline content and remember which list items are tasks (and their checked
  // state) so the main walk can apply `listItem: 'task'` and `checked` when
  // processing the corresponding `list_item_open` token.
  const taskCheckedByListItemIndex = new Map<number, boolean>()
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token?.type !== 'list_item_open') {
      continue
    }
    // Find the first inline token within this list item.
    let inlineIndex = -1
    for (let j = i + 1; j < tokens.length; j++) {
      const candidate = tokens[j]
      if (!candidate) {
        continue
      }
      if (candidate.type === 'list_item_close') {
        break
      }
      if (candidate.type === 'inline') {
        inlineIndex = j
        break
      }
    }
    if (inlineIndex === -1) {
      continue
    }
    const inlineToken = tokens[inlineIndex]
    if (!inlineToken) {
      continue
    }
    const match = inlineToken.content.match(/^\[([ xX])\] /)
    if (!match) {
      continue
    }
    const checked = match[1] !== ' '
    taskCheckedByListItemIndex.set(i, checked)
    // Strip the prefix from the content and the first child text token so the
    // resulting span doesn't include the checkbox marker.
    inlineToken.content = inlineToken.content.slice(match[0].length)
    const firstChild = inlineToken.children?.[0]
    if (firstChild && typeof firstChild.content === 'string') {
      firstChild.content = firstChild.content.slice(match[0].length)
    }
  }

  const portableText: Array<PortableTextBlock> = []

  // State
  let currentBlock: PortableTextTextBlock | null = null
  const currentListStack: Array<string | null> = []
  const markDefRefs: Array<string> = [] // mark keys: 'strong', 'em', 'code', or link keys
  let currentMarkDefs: Array<PortableTextObject> = []
  let currentBlockquoteStyle: string | null = null // Track blockquote style when inside blockquote
  let inListItem = false // Track if we're inside a list item

  // Callout state
  let calloutStartIndex: number | null = null
  let calloutStartTarget: Array<PortableTextBlock | PortableTextObject> | null =
    null
  let calloutType: string | null = null

  // Table state
  let currentTable: {
    rows: Array<{
      _key: string
      _type: 'row'
      cells: Array<{
        _type: 'cell'
        _key: string
        value: Array<PortableTextBlock>
      }>
    }>
    headerRows: number
  } | null = null
  let currentTableRow: Array<{
    _type: 'cell'
    _key: string
    value: Array<PortableTextBlock>
  }> | null = null
  let inTableHead = false

  // List container state. When `types.list` is defined and the parser enters
  // a `bullet_list_open` / `ordered_list_open`, a structural-list frame is
  // pushed here. Block emissions inside the surrounding `list_item_open` /
  // `list_item_close` pair are diverted into the item's `content` array
  // instead of the top-level `portableText`. At list-close, the matcher is
  // called to materialize a `list` block-object, which is pushed into the
  // enclosing target (parent list item's content if nested, else top-level).
  type ListContainerItem = {
    _type: 'list-item'
    _key: string
    checked?: boolean
    content: Array<PortableTextBlock | PortableTextObject>
  }
  type ListContainerFrame = {
    kind: 'bullet' | 'number' | 'task'
    items: Array<ListContainerItem>
    currentItem: ListContainerItem | null
  }
  // A null entry marks a list that is being handled by the flat path (either
  // because `types.list` is undefined, or because a nested list inside a
  // flat-path list should also stay flat). Parallel to `currentListStack`.
  const listContainerStack: Array<ListContainerFrame | null> = []

  /**
   * Returns the array that block emissions should land in. If the innermost
   * structural list frame has an open `currentItem`, blocks land in that
   * item's `content`. Otherwise blocks land at the top level.
   */
  const blockTarget = (): Array<PortableTextBlock | PortableTextObject> => {
    for (let i = listContainerStack.length - 1; i >= 0; i--) {
      const frame = listContainerStack[i]
      if (frame && frame.currentItem) {
        return frame.currentItem.content
      }
    }
    return portableText
  }

  /**
   * Pushes a block into the current target (innermost open list item, or
   * top-level `portableText` if none). Use instead of direct
   * `portableText.push(...)` for any block emission that should be captured
   * by an enclosing list container.
   */
  const pushBlock = (block: PortableTextBlock | PortableTextObject): void => {
    blockTarget().push(block as PortableTextBlock)
  }

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

    pushBlock(currentBlock)

    currentBlock = null
    currentMarkDefs = []
  }

  const addSpan = (text: string) => {
    if (text.length === 0) {
      return
    }

    if (!currentBlock) {
      const style =
        currentBlockquoteStyle ??
        consolidatedOptions.block.normal({
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
  const ensureListBlock = (listItem: string, checked?: boolean) => {
    if (!currentBlock) {
      // Use blockquote style if inside a blockquote, otherwise use normal style
      const style =
        currentBlockquoteStyle ??
        consolidatedOptions.block.normal({
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

    if (checked !== undefined) {
      ;(currentBlock as PortableTextTextBlock & {checked?: boolean}).checked =
        checked
    }
  }

  // Walk tokens
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    const token = tokens[tokenIndex]
    if (!token) {
      continue
    }

    switch (token.type) {
      // Paragraphs
      case 'paragraph_open': {
        // If we're in a list item but have no current block (e.g., after a code block),
        // we need to create a new list item block
        if (inListItem) {
          // Structural list path: start a plain text block; the paragraph
          // lands in the current list item's `content` via `pushBlock`.
          if (listContainerStack.at(-1)) {
            if (!currentBlock) {
              // Use blockquote style if inside a blockquote, otherwise use normal style
              const style =
                currentBlockquoteStyle ??
                consolidatedOptions.block.normal({
                  context: {schema: consolidatedOptions.schema},
                }) ??
                'normal'
              startBlock(style)
            }
            break
          }

          // Flat list path: ensure the current text block carries
          // `listItem` + `level` fields.
          if (!currentBlock) {
            const listType = currentListStack.at(-1)

            if (listType) {
              ensureListBlock(listType)
            }
          }

          break
        }

        // Use blockquote style if inside a blockquote, otherwise use normal style
        const style =
          currentBlockquoteStyle ??
          consolidatedOptions.block.normal({
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
        // In a flat list item: skip flushing, list_item_close will flush.
        // In a structural list item: flush so multiple paragraphs in one
        // item land as separate text blocks.
        if (inListItem) {
          if (listContainerStack.at(-1)) {
            flushBlock()
          }
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
        // Flush any current block before entering blockquote
        flushBlock()

        // Set the blockquote style for paragraphs inside the blockquote
        const style =
          consolidatedOptions.block.blockquote({
            context: {schema: consolidatedOptions.schema},
          }) ??
          consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

        currentBlockquoteStyle = style ?? 'normal'
        break
      }
      case 'blockquote_close': {
        // Flush any blockquote content before exiting
        flushBlock()
        currentBlockquoteStyle = null
        break
      }
      // Lists
      case 'bullet_list_open': {
        flushBlock()

        // Structural-container path: when the consumer registers a
        // `types.list` matcher, lists become block-objects with explicit
        // `items` arrays. Block emissions inside list items are diverted
        // into `currentItem.content` via `blockTarget()`. Mirrors the
        // `types.table` pattern.
        if (consolidatedOptions.types.list) {
          listContainerStack.push({
            kind: 'bullet',
            items: [],
            currentItem: null,
          })
          currentListStack.push(null)
          break
        }

        // Flat path: lists are reconstructed from text blocks with
        // `listItem` + `level` fields at render time.
        const listItem = consolidatedOptions.listItem.bullet({
          context: {schema: consolidatedOptions.schema},
        })

        listContainerStack.push(null)
        if (!listItem) {
          currentListStack.push(null)
          break
        }
        currentListStack.push(listItem)
        break
      }
      case 'ordered_list_open': {
        flushBlock()

        if (consolidatedOptions.types.list) {
          listContainerStack.push({
            kind: 'number',
            items: [],
            currentItem: null,
          })
          currentListStack.push(null)
          break
        }

        const listItem = consolidatedOptions.listItem.number({
          context: {schema: consolidatedOptions.schema},
        })

        listContainerStack.push(null)
        if (!listItem) {
          currentListStack.push(null)
          break
        }
        currentListStack.push(listItem)
        break
      }
      case 'bullet_list_close':
      case 'ordered_list_close': {
        const frame = listContainerStack.pop()
        currentListStack.pop()

        // Structural close: materialize the list block-object and push it
        // into the enclosing target (parent list item's content if nested,
        // else top-level).
        if (frame && consolidatedOptions.types.list) {
          // Promote `kind` to 'task' if any item carries a checked state.
          const kind: 'bullet' | 'number' | 'task' = frame.items.some(
            (item) => 'checked' in item,
          )
            ? 'task'
            : frame.kind

          const listObject = consolidatedOptions.types.list({
            context: {
              schema: consolidatedOptions.schema,
              keyGenerator: consolidatedOptions.keyGenerator,
            },
            value: {kind, items: frame.items},
            isInline: false,
          })

          if (listObject) {
            pushBlock(listObject)
          } else {
            // Matcher returned undefined: fall back to the flat path by
            // re-emitting each item's content. Text blocks get the same
            // `listItem` + `level` fields the flat path would produce so
            // adjacent blocks form a list at render time. Non-text-block
            // content (code blocks, etc.) gets pushed as-is, mirroring
            // how the flat path handles those when they appear inside a
            // list item.
            const flatListItem =
              (kind === 'task'
                ? consolidatedOptions.listItem.task?.({
                    context: {schema: consolidatedOptions.schema},
                  })
                : kind === 'number'
                  ? consolidatedOptions.listItem.number({
                      context: {schema: consolidatedOptions.schema},
                    })
                  : consolidatedOptions.listItem.bullet({
                      context: {schema: consolidatedOptions.schema},
                    })) ?? null
            // The just-popped list was nested at depth = remaining stack
            // length + 1 (since we already popped).
            const level = listContainerStack.length + 1
            for (const item of frame.items) {
              for (const block of item.content) {
                if (
                  block._type === 'block' &&
                  flatListItem !== null &&
                  !('listItem' in block)
                ) {
                  const flatBlock = {
                    ...(block as PortableTextTextBlock),
                    listItem: flatListItem,
                    level,
                    ...(item.checked === undefined
                      ? {}
                      : {checked: item.checked}),
                  }
                  pushBlock(flatBlock)
                } else {
                  pushBlock(block)
                }
              }
            }
          }
        }
        break
      }
      case 'list_item_open': {
        const frame = listContainerStack.at(-1)

        // Flush any previous list item block before starting a new one
        // This is needed for proper separation of list items
        if (currentBlock) {
          flushBlock()
        }

        // Structural path: start a new `list-item` whose `content` becomes
        // the divert target for subsequent block emissions until
        // `list_item_close`.
        if (frame) {
          const taskChecked = taskCheckedByListItemIndex.get(tokenIndex)
          frame.currentItem = {
            _type: 'list-item',
            _key: consolidatedOptions.keyGenerator(),
            ...(taskChecked === undefined ? {} : {checked: taskChecked}),
            content: [],
          }
          inListItem = true
          break
        }

        // Flat path
        const baseListType = currentListStack.at(-1)

        if (baseListType === undefined) {
          throw new Error('Expected an open list')
        }

        // Resolve task list type and checked state for this specific item.
        // If the schema declares a `task` list definition, GFM checkboxes
        // (`- [ ]` / `- [x]`) override the surrounding list's type for this
        // item. Otherwise the prefix has already been stripped by the
        // pre-pass and we render as the surrounding list type.
        const taskChecked = taskCheckedByListItemIndex.get(tokenIndex)
        let listType = baseListType
        let checked: boolean | undefined
        if (taskChecked !== undefined) {
          const taskListType = consolidatedOptions.listItem.task?.({
            context: {schema: consolidatedOptions.schema},
          })
          if (taskListType) {
            listType = taskListType
            checked = taskChecked
          }
        }

        // If listType is null, it means there's no list definition in the schema
        // Just create a normal block without list properties
        if (listType === null) {
          // Use blockquote style if inside a blockquote, otherwise use normal style
          const style =
            currentBlockquoteStyle ??
            consolidatedOptions.block.normal({
              context: {schema: consolidatedOptions.schema},
            })

          if (!style) {
            console.warn('No default style found, using "normal"')
            startBlock('normal')
          } else {
            startBlock(style)
          }
          inListItem = true
          break
        }

        ensureListBlock(listType, checked)
        inListItem = true
        break
      }
      case 'list_item_close': {
        const frame = listContainerStack.at(-1)

        // Structural path: flush any current block into the item's content,
        // then push the completed item onto the frame.
        if (frame && frame.currentItem) {
          flushBlock()
          frame.items.push(frame.currentItem)
          frame.currentItem = null
          inListItem = false
          break
        }

        // Flat path
        inListItem = false
        flushBlock()
        break
      }

      // Code fences / blocks
      case 'fence': {
        flushBlock()

        const language = token.info.trim() || undefined
        // Remove trailing newline from code content
        const code = token.content.replace(/\n$/, '')

        const codeObject = consolidatedOptions.types.code({
          context: {
            schema: consolidatedOptions.schema,
            keyGenerator: consolidatedOptions.keyGenerator,
          },
          value: {language, code},
          isInline: false,
        })

        if (!codeObject) {
          // Code block not in schema, fall back to text block
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            console.warn('No default style found, using "normal"')
            startBlock('normal')
          } else {
            startBlock(style)
          }

          addSpan(code)
          flushBlock()
          break
        }

        pushBlock(codeObject)

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
          // If there's no break definition in the schema, parse as text
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            console.warn('No default style found, using "normal"')
            startBlock('normal')
          } else {
            startBlock(style)
          }

          addSpan('---')
          flushBlock()
          break
        }

        pushBlock(hrObject)

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
          // If there's no HTML block definition in the schema, parse as text
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            console.warn('No default style found, using "normal"')
            startBlock('normal')
          } else {
            startBlock(style)
          }

          addSpan(htmlContent)
          flushBlock()
          break
        }

        pushBlock(htmlObject)

        break
      }

      case 'code_block': {
        flushBlock()

        // Remove trailing newline from code content
        const code = token.content.replace(/\n$/, '')

        const codeObject = consolidatedOptions.types.code({
          context: {
            schema: consolidatedOptions.schema,
            keyGenerator: consolidatedOptions.keyGenerator,
          },
          value: {language: undefined, code},
          isInline: false,
        })

        if (!codeObject) {
          // Code block not in schema, fall back to text block
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            console.warn('No default style found, using "normal"')
            startBlock('normal')
          } else {
            startBlock(style)
          }

          addSpan(code)
          flushBlock()
        } else {
          pushBlock(codeObject)
        }

        break
      }

      // Tables
      case 'table_open':
        flushBlock()
        currentTable = {rows: [], headerRows: 0}
        break

      case 'table_close': {
        if (!currentTable) {
          break
        }

        // Only create table object if table type is defined
        if (consolidatedOptions.types.table) {
          const tableObject = consolidatedOptions.types.table({
            context: {
              schema: consolidatedOptions.schema,
              keyGenerator: consolidatedOptions.keyGenerator,
            },
            value: {
              rows: currentTable.rows,
              headerRows:
                currentTable.headerRows > 0
                  ? currentTable.headerRows
                  : undefined,
            },
            isInline: false,
          })

          if (tableObject) {
            pushBlock(tableObject)
          } else {
            // If table object couldn't be created, flatten the table
            flattenTable(
              currentTable,
              blockTarget() as Array<PortableTextBlock>,
            )
          }
        } else {
          // If there's no table definition in the schema, flatten the table
          flattenTable(currentTable, blockTarget() as Array<PortableTextBlock>)
        }

        currentTable = null
        break
      }

      case 'thead_open':
        inTableHead = true
        break

      case 'thead_close':
        inTableHead = false
        break

      case 'tbody_open':
      case 'tbody_close':
        // Just markers, no action needed
        break

      case 'tr_open':
        currentTableRow = []
        break

      case 'tr_close':
        if (currentTable && currentTableRow) {
          currentTable.rows.push({
            _key: consolidatedOptions.keyGenerator(),
            _type: 'row',
            cells: currentTableRow,
          })
          if (inTableHead) {
            currentTable.headerRows++
          }
        }
        currentTableRow = null
        break

      case 'th_open':
      case 'td_open': {
        // Start a new block for the table cell
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

      case 'th_close':
      case 'td_close': {
        // Flush the current block into the cell
        flushBlock()

        // Get all blocks that were added since this cell started
        // We need to extract them from the current target array
        const cellBlocks: Array<PortableTextBlock> = []
        const target = blockTarget()

        // Check if we have blocks to extract (added after table_open)
        if (target.length > 0) {
          const lastBlock = target.at(-1)
          if (lastBlock && lastBlock._type === 'block') {
            cellBlocks.push(target.pop()! as PortableTextBlock)
          }
        }

        // If no blocks were created (empty cell), create an empty block
        if (cellBlocks.length === 0) {
          cellBlocks.push({
            _type: 'block' as const,
            style:
              consolidatedOptions.block.normal({
                context: {schema: consolidatedOptions.schema},
              }) || 'normal',
            children: [
              {
                _type: consolidatedOptions.schema.span.name,
                _key: consolidatedOptions.keyGenerator(),
                text: '',
                marks: [],
              },
            ],
            _key: consolidatedOptions.keyGenerator(),
            markDefs: [],
          })
        }

        // Check if the cell contains a single block with a single image child
        // If so, extract the image as a block-level image
        const firstBlock = cellBlocks[0]
        if (
          cellBlocks.length === 1 &&
          firstBlock &&
          firstBlock._type === 'block' &&
          'children' in firstBlock &&
          Array.isArray(firstBlock.children) &&
          firstBlock.children.length === 1
        ) {
          const onlyChild = firstBlock.children[0]
          // Check if it's an image object (not a span)
          if (
            typeof onlyChild === 'object' &&
            onlyChild !== null &&
            '_type' in onlyChild &&
            onlyChild._type !== consolidatedOptions.schema.span.name &&
            onlyChild._type === 'image'
          ) {
            // Replace the block with just the image
            cellBlocks[0] = onlyChild as PortableTextBlock
          }
        }

        if (currentTableRow !== null) {
          currentTableRow.push({
            _type: 'cell',
            _key: consolidatedOptions.keyGenerator(),
            value: cellBlocks,
          })
        }
        break
      }

      // Inline container
      case 'inline': {
        // Check if we're in a table cell
        const inTableCell = currentTableRow !== null

        // Check if this is a standalone image (paragraph with only an image)
        if (
          token.children?.length === 1 &&
          token.children[0]?.type === 'image'
        ) {
          const imageToken = token.children[0]
          if (!imageToken) {
            break
          }

          const src =
            imageToken.attrs?.find(([name]) => name === 'src')?.at(1) || ''
          const alt = unescapeImageAndLinkText(imageToken.content || '')
          const title =
            imageToken.attrs?.find(([name]) => name === 'title')?.at(1) ||
            undefined

          const blockImageObject = consolidatedOptions.types.image({
            context: {
              schema: consolidatedOptions.schema,
              keyGenerator: consolidatedOptions.keyGenerator,
            },
            value: {src, alt, title},
            isInline: false,
          })

          if (blockImageObject) {
            if (inTableCell) {
              // In table cells, we can't push to portableText directly
              // The block image will be handled in th_close/td_close extraction logic
              // For now, add it as a child of the current block
              if (currentBlock && 'children' in currentBlock) {
                ;(currentBlock as PortableTextTextBlock).children.push(
                  blockImageObject as PortableTextObject,
                )
              }
            } else {
              // If the current block has content, flush it before adding the block image
              // Otherwise, discard the empty block that was created by paragraph_open
              const hasContent =
                currentBlock &&
                'children' in currentBlock &&
                (currentBlock as PortableTextTextBlock).children.length > 0

              if (hasContent) {
                flushBlock()
              } else {
                currentBlock = null
                currentMarkDefs = []
              }
              pushBlock(blockImageObject)
            }
            break
          }

          // Block image not supported, try inline image as fallback
          const inlineImageObject = consolidatedOptions.types.image({
            context: {
              schema: consolidatedOptions.schema,
              keyGenerator: consolidatedOptions.keyGenerator,
            },
            value: {src, alt, title},
            isInline: true,
          })

          if (inlineImageObject) {
            // Ensure we have a block to add the inline image to
            if (!currentBlock) {
              if (inListItem) {
                // Structural list: start a plain text block; the image
                // lands in the current item's content via flushBlock.
                if (listContainerStack.at(-1)) {
                  const style =
                    consolidatedOptions.block.normal({
                      context: {schema: consolidatedOptions.schema},
                    }) ?? 'normal'
                  startBlock(style)
                } else {
                  const listType = currentListStack.at(-1)

                  if (listType) {
                    ensureListBlock(listType)
                  }
                }
              } else {
                const style = consolidatedOptions.block.normal({
                  context: {schema: consolidatedOptions.schema},
                })

                if (style) {
                  startBlock(style)
                }
              }
            }

            if (currentBlock && 'children' in currentBlock) {
              ;(currentBlock as PortableTextTextBlock).children.push(
                inlineImageObject as PortableTextObject,
              )
            }
            break
          }

          // Neither block nor inline image supported, fall back to text
          addSpan(`![${alt}](${src})`)
          break
        }

        // Walk its children for text/marks/links
        for (const childToken of token.children ?? []) {
          switch (childToken.type) {
            case 'text':
              addSpan(childToken.content)
              break
            case 'softbreak':
            case 'hardbreak':
              addSpan('\n')
              break
            case 'code_inline': {
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
              const alt = unescapeImageAndLinkText(childToken.content || '')

              // Try to create an inline image first
              const inlineImageObject = consolidatedOptions.types.image({
                context: {
                  schema: consolidatedOptions.schema,
                  keyGenerator: consolidatedOptions.keyGenerator,
                },
                value: {src, alt, title: undefined},
                isInline: true,
              })

              if (inlineImageObject) {
                // Inline image is supported - add it to current block
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
                  inlineImageObject as PortableTextObject,
                )
                break
              }

              // Inline image not supported - try block image as fallback
              const blockImageObject = consolidatedOptions.types.image({
                context: {
                  schema: consolidatedOptions.schema,
                  keyGenerator: consolidatedOptions.keyGenerator,
                },
                value: {src, alt, title: undefined},
                isInline: false,
              })

              if (!blockImageObject) {
                // Neither inline nor block image supported
                addSpan(`![${alt}](${src})`)
                break
              }

              // Block image supported - flush current block and add as block-level
              // Skip if we're in a table cell (images in cells are handled differently)
              if (inTableCell) {
                // In table cells, add the image to current block (will be extracted later)
                if (currentBlock && 'children' in currentBlock) {
                  ;(currentBlock as PortableTextTextBlock).children.push(
                    blockImageObject as PortableTextObject,
                  )
                }
                break
              }

              // Not in table - flush current block, add image as block, start new block
              flushBlock()
              pushBlock(blockImageObject)

              // Start a new block for any remaining content
              const style = consolidatedOptions.block.normal({
                context: {schema: consolidatedOptions.schema},
              })

              if (style) {
                startBlock(style)
              }

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

      // Callouts (GFM alerts)
      case 'alert_open': {
        flushBlock()
        calloutStartTarget = blockTarget()
        calloutStartIndex = calloutStartTarget.length
        calloutType = token.markup

        // Set blockquote style so content blocks inside the callout
        // get blockquote styling (used in fallback when callout type
        // is not in the schema)
        const style =
          consolidatedOptions.block.blockquote({
            context: {schema: consolidatedOptions.schema},
          }) ??
          consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

        currentBlockquoteStyle = style ?? 'normal'
        break
      }

      case 'alert_title': {
        // Type is already captured via alert_open's markup
        break
      }

      case 'alert_close': {
        flushBlock()

        if (
          calloutStartIndex !== null &&
          calloutType !== null &&
          calloutStartTarget !== null
        ) {
          const contentBlocks = calloutStartTarget.splice(
            calloutStartIndex,
          ) as Array<PortableTextBlock>

          const calloutObject = consolidatedOptions.types.callout?.({
            context: {
              schema: consolidatedOptions.schema,
              keyGenerator: consolidatedOptions.keyGenerator,
            },
            value: {tone: calloutType, content: contentBlocks},
            isInline: false,
          })

          if (calloutObject) {
            pushBlock(calloutObject)
          } else {
            for (const block of contentBlocks) {
              pushBlock(block)
            }
          }
        }

        calloutStartIndex = null
        calloutStartTarget = null
        calloutType = null
        currentBlockquoteStyle = null
        break
      }

      default:
        break
    }
  }

  flushBlock()

  return portableText
}

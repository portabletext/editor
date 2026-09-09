import {alert} from '@mdit/plugin-alert'
import {
  isSpan,
  isTextBlock,
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
  defaultTableObjectDefinition,
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
import {degradationMessage} from './degradation-messages'
import {
  buildAnnotationMatcher,
  buildDecoratorMatcher,
  buildListItemMatcher,
  buildObjectMatcher,
  buildStyleMatcher,
  readDroppedFields,
  type AnnotationMatcher,
  type DecoratorMatcher,
  type ExtractValue,
  type ListItemMatcher,
  type ObjectMatcher,
  type StyleMatcher,
} from './matchers'

/**
 * The classification of a lossy conversion encountered while converting
 * markdown to Portable Text: a markdown construct the conversion couldn't
 * carry through losslessly, whether because the target schema (or the
 * active matchers) doesn't represent it, or because the surrounding
 * structure (a table cell, for instance) can't hold the shape markdown
 * expressed, so the conversion fell back to a lossier representation
 * instead of failing.
 *
 * @public
 */
export type DegradationType =
  | 'decorator-dropped'
  | 'annotation-dropped'
  | 'style-fallback'
  | 'list-flattened'
  | 'task-checkbox-stripped'
  | 'table-flattened'
  | 'code-block-to-text'
  | 'horizontal-rule-to-text'
  | 'html-block-to-text'
  | 'inline-html-dropped'
  | 'image-block-to-inline'
  | 'image-inline-to-block'
  | 'image-to-text'
  | 'callout-fallback'
  | 'fields-dropped'
  | 'object-carrier-invalid'

/**
 * Reports a single lossy conversion, in encounter order: as the conversion
 * walks the markdown, that's the order nested constructs close in, not
 * necessarily top-to-bottom document order. `line` is the 1-based markdown
 * source line: usually the line of the token that degraded, but for a
 * token without its own line (an inline construct inside a table cell, for
 * instance) the enclosing construct's line instead; absent when no token
 * carries a usable line at all. `snippet` is the offending construct's
 * text, truncated to 40 characters with an ellipsis, present whenever the
 * degradation has a specific piece of source text to quote (a dropped
 * decorator's span, an unsupported image's alt text) and absent when the
 * construct has nothing to quote (a table with no `table` block object, a
 * callout whose type isn't in the schema). `message` is human-readable and
 * may change between releases; match on `type`, not `message`. The set of
 * `type` values grows in minor releases as new degradation sites report, so
 * compare against the values you handle rather than switching exhaustively.
 *
 * @public
 */
export type Degradation = {
  type: DegradationType
  message: string
  line?: number
  snippet?: string
}

type Options = {
  /**
   * Compiled schema deciding which Portable Text constructs the
   * conversion may build; pairs with the same option on
   * `portableTextToMarkdown` to keep the round trip consistent.
   */
  schema?: Schema
  keyGenerator?: () => string
  /**
   * Called at most once, after the conversion has walked the whole
   * document, only when at least one construct degraded. Left unset, the
   * conversion stays silent and returns the lossiest representation it can
   * build. Passed a function, observe every degradation via
   * `report.degradations`, in encounter order. Enforce against lossy output by
   * throwing your own error from inside the callback, using
   * `report.message` (the canonical grouped text) as its message; the
   * throw propagates out of `markdownToPortableText`.
   *
   * ```ts
   * markdownToPortableText(markdown, {onDegradation: ({message}) => { throw new Error(message) }})
   * ```
   *
   * `report` is a single object, not positional parameters, so it can gain
   * fields later without a breaking change.
   */
  onDegradation?: (report: {
    degradations: Array<Degradation>
    message: string
  }) => void
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
      alignment: Array<'left' | 'center' | 'right' | null> | undefined
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
    blockquote?: ObjectMatcher<{content: Array<PortableTextBlock>}>
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

const tableBlockMatcher: ObjectMatcher<
  ExtractValue<typeof defaultTableObjectDefinition>
> = ({context, value, isInline}) => {
  const defaultMatcher = buildObjectMatcher(defaultTableObjectDefinition)
  const tableObject = defaultMatcher({context, value, isInline})

  if (!tableObject) {
    return undefined
  }

  if (!('rows' in tableObject)) {
    return undefined
  }

  return tableObject
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
    table: tableBlockMatcher,
  },
} as const satisfies Options

/**
 * Reads GFM column alignment from a markdown-it cell token's `style`
 * attribute. Tolerates other CSS declarations sharing the value.
 */
export function extractAlignmentFromStyleAttr(
  styleAttr: string | null,
): 'left' | 'center' | 'right' | null {
  if (!styleAttr) {
    return null
  }
  const match = styleAttr.match(/text-align\s*:\s*(left|center|right)/)
  if (!match) {
    return null
  }
  return match[1] as 'left' | 'center' | 'right'
}

/**
 * A table row is empty when every cell holds only blank spans, no non-empty
 * text, no inline objects, no non-text blocks. Used to detect a headerless
 * GFM table: `portableTextToMarkdown` emits an empty header row for
 * `headerRows: 0`, and an empty header must round-trip back to
 * `headerRows: 0` rather than a phantom header row.
 */
function isEmptyTableRow(
  cells: Array<{value: Array<PortableTextBlock>}>,
  context: {schema: Schema},
): boolean {
  return cells.every((cell) =>
    cell.value.every(
      (block) =>
        isTextBlock(context, block) &&
        block.children.every(
          (child) => isSpan(context, child) && (child.text ?? '').trim() === '',
        ),
    ),
  )
}

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
 * Truncates a degradation message's snippet to keep the thrown/reported
 * message readable. Truncates on character count, not word boundaries: the
 * snippet is a diagnostic pointer back to the source, not prose. Undefined
 * for empty input, so a construct with nothing to quote (an empty link's
 * text, say) omits `snippet` entirely instead of reporting `""`. Backs the
 * cut off by one unit when it would land on a lead surrogate, so a snippet
 * ending mid-emoji doesn't produce an unpaired surrogate. A literal newline
 * surviving into the snippet is escaped to `\n`, since the reported message
 * is one line per finding.
 */
function truncateSnippet(text: string, maxLength = 40): string | undefined {
  if (text.length === 0) {
    return undefined
  }

  if (text.length <= maxLength) {
    return text.replace(/\n/g, '\\n')
  }

  let cut = maxLength
  const codeUnit = text.charCodeAt(cut - 1)
  if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
    cut -= 1
  }

  return `${text.slice(0, cut).replace(/\n/g, '\\n')}...`
}

/**
 * Concatenates the plain text between an inline open token (`strong_open`,
 * `em_open`, `s_open`, `link_open`) and its matching close, for use as a
 * degradation message snippet. Tracks nesting depth so a same-type token
 * nested inside itself doesn't stop the scan at the wrong close.
 */
function collectInlineText(
  children: ReadonlyArray<{type: string; content: string}>,
  openIndex: number,
  openType: string,
  closeType: string,
): string {
  let depth = 1
  let text = ''
  for (let i = openIndex + 1; i < children.length; i++) {
    const child = children[i]
    if (!child) {
      continue
    }
    if (child.type === openType) {
      depth++
    } else if (child.type === closeType) {
      depth--
      if (depth === 0) {
        break
      }
    } else if (child.type === 'text') {
      text += child.content
    } else if (child.type === 'softbreak') {
      text += ' '
    } else if (child.type === 'hardbreak') {
      text += '\n'
    }
  }
  return text
}

// A per-group snippet/line list longer than this is truncated with an
// `and N more` tail: the grouped message is a one-line-per-finding summary,
// not a full dump of every occurrence (that's what `degradations` is for).
const MAX_LISTED_PER_GROUP = 5

function capList(values: ReadonlyArray<string>): string {
  if (values.length <= MAX_LISTED_PER_GROUP) {
    return values.join(', ')
  }
  const shown = values.slice(0, MAX_LISTED_PER_GROUP)
  const more = values.length - MAX_LISTED_PER_GROUP
  return `${shown.join(', ')}, and ${more} more`
}

/**
 * Builds the canonical grouped message reported alongside a non-empty
 * `degradations` array: identical (`type`, `message`) pairs collapse into one
 * line, so a document with the same missing decorator on three spans
 * doesn't repeat the same sentence three times. Groups sort by their
 * earliest-lined entry so the message reads top-to-bottom regardless of walk
 * order: nested constructs (a blockquote inside a blockquote, say) report
 * the innermost closing first even though it opened last, and that line may
 * arrive after another entry already in the group. Groups without any lined
 * entry sort last, in their relative encounter order.
 */
function buildDegradationMessage(degradations: Array<Degradation>): string {
  const groups: Array<{
    base: string
    entries: Array<Degradation>
  }> = []
  const groupIndexByKey = new Map<string, number>()

  for (const degradation of degradations) {
    const key = `${degradation.type}\u0000${degradation.message}`
    let groupIndex = groupIndexByKey.get(key)
    if (groupIndex === undefined) {
      groupIndex = groups.length
      groupIndexByKey.set(key, groupIndex)
      groups.push({base: degradation.message, entries: []})
    }
    groups[groupIndex]!.entries.push(degradation)
  }

  const minLine = (entries: Array<Degradation>): number | undefined => {
    const definedLines = entries
      .map((entry) => entry.line)
      .filter((line): line is number => line !== undefined)
    return definedLines.length > 0 ? Math.min(...definedLines) : undefined
  }

  const sortedGroups = [...groups].sort((a, b) => {
    const lineA = minLine(a.entries)
    const lineB = minLine(b.entries)
    if (lineA === undefined) {
      return lineB === undefined ? 0 : 1
    }
    if (lineB === undefined) {
      return -1
    }
    return lineA - lineB
  })

  const lines = sortedGroups.map((group) => {
    if (group.entries.length === 1) {
      const event = group.entries[0]!
      const snippetPart =
        event.snippet === undefined ? '' : ` ("${event.snippet}")`
      return event.line === undefined
        ? `- ${event.message}${snippetPart}`
        : `- line ${event.line}: ${event.message}${snippetPart}`
    }

    const snippets = group.entries
      .map((entry) => entry.snippet)
      .filter((snippet): snippet is string => snippet !== undefined)

    // Read top-to-bottom regardless of encounter order, same reasoning as
    // the group sort above. Entries without a line are counted but never
    // printed: joining a maybe-`undefined` would put the literal word
    // `undefined` in the message. Deduped: several entries in the group can
    // share one line (a table's cells, all pinned to the table's start
    // line), and the count already carries how many there were.
    const linesAscending = [
      ...new Set(
        group.entries
          .map((entry) => entry.line)
          .filter((line): line is number => line !== undefined)
          .sort((a, b) => a - b),
      ),
    ]

    const count = group.entries.length
    const suffix =
      snippets.length === count
        ? `(${count}\u00d7: ${capList(snippets.map((snippet) => `"${snippet}"`))})`
        : linesAscending.length > 0
          ? `(${count}\u00d7: lines ${capList(linesAscending.map(String))})`
          : `(${count}\u00d7)`

    return `- ${group.base} ${suffix}`
  })

  return ['Markdown could not be converted without loss:', ...lines].join('\n')
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

  const degradationEvents: Array<Degradation> = []

  const report = (event: Degradation): void => {
    degradationEvents.push(event)
  }

  // A markdown-it token's `map` is `[startLine, endLine)`, 0-based. Degradation
  // events report the 1-based start line for readability.
  const lineOf = (
    candidateToken: {map?: [number, number] | null} | null | undefined,
  ): number | undefined =>
    candidateToken?.map ? candidateToken.map[0] + 1 : undefined

  const reportStyleFallback = (
    name: string,
    line?: number,
    snippet?: string,
  ): void => {
    if (/^h[1-6]$/.test(name)) {
      const truncated =
        snippet === undefined ? undefined : truncateSnippet(snippet)
      report({
        type: 'style-fallback',
        message: degradationMessage['style-fallback'](name),
        line,
        snippet: truncated,
      })
      return
    }

    if (name === 'blockquote') {
      report({
        type: 'style-fallback',
        message: degradationMessage['style-fallback'](name),
        line,
      })
      return
    }

    report({
      type: 'style-fallback',
      message: degradationMessage['style-fallback'](name),
      line,
    })
  }

  // Only a default matcher (`buildObjectMatcher`, `buildAnnotationMatcher`)
  // tags its return value this way; a consumer-supplied matcher's output
  // passes through untouched, since its own filtering is its own business.
  const reportFieldsDropped = (
    object: PortableTextObject | undefined,
    line: number | undefined,
  ): void => {
    const dropped = readDroppedFields(object)
    if (!dropped) {
      return
    }
    const names = dropped.keys.map((key) => `\`${key}\``).join(', ')
    report({
      type: 'fields-dropped',
      message: degradationMessage['fields-dropped'](names, dropped.construct),
      line,
    })
  }

  const md = markdownit({
    html: true,
    linkify: true,
    typographer: false,
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
  // The item's text (after the checkbox prefix is stripped below), for the
  // `task-checkbox-stripped` degradation message's snippet.
  const taskItemTextByListItemIndex = new Map<number, string>()
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
    taskItemTextByListItemIndex.set(i, inlineToken.content)
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
  // Provenance for `currentBlock`, set by `startBlock`'s caller: whether the
  // block's style was actually resolved through `currentBlockquoteStyle`
  // (a paragraph, say) rather than independently landing on the same value
  // by coincidence (a heading whose own style declined to the same
  // `normal` fallback). `flushBlock`'s callout gate reads this instead of
  // comparing styles, since two independent declines can resolve to the
  // same style name without either one being the other.
  let currentBlockTookBlockquoteStyle = false
  // Provenance for `currentBlock`: whether it was created to accumulate
  // paragraph text (a `paragraph_open`, or inline content starting a block
  // with no wrapper) as opposed to a dedicated single-purpose block (a
  // heading, a table cell, a code/HTML/hr fallback-to-text). A structural
  // list's decline fallback merges adjacent item content back into the flat
  // path's shape, and the flat path only ever merges accumulated paragraph
  // blocks: a fallback-to-text block always flushes and starts its own
  // block explicitly, never sharing `currentBlock` with surrounding text.
  let currentBlockIsPlainParagraph = false
  const plainParagraphBlocks = new WeakSet<PortableTextTextBlock>()

  // Callout state
  let calloutStartIndex: number | null = null
  let calloutStartTarget: Array<PortableTextBlock | PortableTextObject> | null =
    null
  let calloutType: string | null = null
  let calloutStartLine: number | undefined
  // Style names that declined while setting up the callout's content style,
  // reported once `alert_title` supplies the callout's own first line (the
  // marker, not the first content line `alert_open`'s map starts at).
  let calloutPendingStyleFallbacks: Array<string> = []

  // Blockquote container state. When `types.blockquote` is defined and the
  // parser enters a `blockquote_open`, a frame is pushed here. Block
  // emissions inside the surrounding open/close pair are captured and
  // spliced out at close to wrap them in a `blockquote` block-object.
  // Nested blockquotes push additional frames; `blockTarget()` already
  // routes correctly because the splice happens against the same target.
  const blockquoteStack: Array<{
    startTarget: Array<PortableTextBlock | PortableTextObject>
    startIndex: number
    line: number | undefined
  }> = []

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
    emptyHeaderDropped: boolean
    alignment: Array<'left' | 'center' | 'right' | null>
    line: number | undefined
  } | null = null
  let currentTableRow: Array<{
    _type: 'cell'
    _key: string
    value: Array<PortableTextBlock>
  }> | null = null
  let inTableHead = false
  // Images demoted from block-level to inline while pushed into a table
  // cell (see the `inline` case). `td_close`/`th_close` may lift a sole
  // image child back to block-level losslessly; membership here lets that
  // lift decide whether to report the demotion, and the value carries which
  // cause to report it with (a schema-declared block image forced inline by
  // the cell vs. no block image in the schema at all).
  const demotedTableImages = new WeakMap<
    PortableTextObject,
    'table-cell' | 'no-block-image'
  >()

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
    line: number | undefined
  }
  // A null entry marks a list that is being handled by the flat path (either
  // because `types.list` is undefined, or because a nested list inside a
  // flat-path list should also stay flat). Parallel to `currentListStack`.
  const listContainerStack: Array<ListContainerFrame | null> = []

  // Flat-path `list-flattened` verdicts, parallel to `currentListStack`: a
  // list whose own kind (`bullet`/`number`) isn't in the schema doesn't
  // necessarily degrade, since every item might still resolve through a
  // `task` checkbox override. The verdict is deferred to the first item
  // that actually needs the fallback (`list_item_open`'s `listType === null`
  // branch), so a schema with only a `task` list and an all-checkbox list
  // reports nothing. `null` marks a list whose own kind resolved fine, so no
  // verdict is pending.
  const pendingListFlattenedStack: Array<{
    line: number | undefined
    kindName: 'bullet' | 'number'
    reported: boolean
  } | null> = []

  // Per-item task-checkbox metadata for structural list items (line + text
  // snippet), keyed by item object identity. Not stored on the item itself:
  // `frame.items` is handed verbatim to a consumer's `types.list` matcher,
  // and this bookkeeping is only needed if that matcher declines and the
  // fallback needs to reproduce the flat path's `task-checkbox-stripped`
  // report for the item.
  const taskInfoByListItem = new WeakMap<
    ListContainerItem,
    {line: number | undefined; snippet: string | undefined}
  >()

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

  const startBlock = (
    style: string,
    provenance?: {tookBlockquoteStyle?: boolean; isPlainParagraph?: boolean},
  ) => {
    flushBlock()
    currentBlock = {
      _type: 'block' as const,
      style,
      children: [],
      _key: consolidatedOptions.keyGenerator(),
      markDefs: [],
    }
    currentMarkDefs = []
    currentBlockTookBlockquoteStyle = provenance?.tookBlockquoteStyle ?? false
    currentBlockIsPlainParagraph = provenance?.isPlainParagraph ?? false
  }

  const flushBlock = () => {
    if (!currentBlock) {
      return
    }

    // A callout with pending style fallbacks (its own style resolution
    // declined) only actually degrades once a text block actually commits
    // needing that resolved style. A heading inside a callout commits with
    // its own heading style and never touches the callout's content style,
    // so it doesn't count; a plain paragraph does, since paragraphs adopt
    // `currentBlockquoteStyle` directly. A callout holding nothing but,
    // say, a standalone image discards its placeholder block without ever
    // reaching here (see the `inline` case's standalone-image branch), and
    // never degraded.
    if (
      calloutPendingStyleFallbacks.length > 0 &&
      currentBlockTookBlockquoteStyle
    ) {
      for (const name of calloutPendingStyleFallbacks) {
        reportStyleFallback(name, calloutStartLine)
      }
      calloutPendingStyleFallbacks = []
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

    if (currentBlockIsPlainParagraph) {
      plainParagraphBlocks.add(currentBlock)
    }

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
        reportStyleFallback('normal')
        startBlock('normal', {isPlainParagraph: true})
      } else {
        startBlock(style, {
          tookBlockquoteStyle: currentBlockquoteStyle !== null,
          isPlainParagraph: true,
        })
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
        reportStyleFallback('normal')
        startBlock('normal')
      } else {
        startBlock(style, {
          tookBlockquoteStyle: currentBlockquoteStyle !== null,
        })
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
                })

              if (!style) {
                reportStyleFallback('normal', lineOf(token))
              }

              startBlock(style ?? 'normal', {
                tookBlockquoteStyle: currentBlockquoteStyle !== null,
                isPlainParagraph: true,
              })
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
          reportStyleFallback('normal', lineOf(token))
          startBlock('normal', {isPlainParagraph: true})
          break
        }

        startBlock(style, {
          tookBlockquoteStyle: currentBlockquoteStyle !== null,
          isPlainParagraph: true,
        })
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

        const headingStyle = headingMatcher?.({
          context: {schema: consolidatedOptions.schema},
        })

        if (!headingStyle) {
          reportStyleFallback(
            `h${level}`,
            lineOf(token),
            tokens[tokenIndex + 1]?.content,
          )
        }

        const style =
          headingStyle ??
          consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

        if (!style) {
          reportStyleFallback('normal', lineOf(token))
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

        // Structural-blockquote path: when the consumer registers a
        // `types.blockquote` matcher, plain blockquotes (NOT GFM alerts -
        // those use separate `alert_open`/`alert_close` tokens) become
        // block-objects with an explicit `content` array. Block emissions
        // inside the open/close pair are spliced out at close time and
        // wrapped in a `blockquote` block-object.
        if (consolidatedOptions.types.blockquote) {
          const startTarget = blockTarget()
          blockquoteStack.push({
            startTarget,
            startIndex: startTarget.length,
            line: lineOf(token),
          })
          break
        }

        // Flat path: set the blockquote style for paragraphs inside the
        // blockquote so they emit text blocks with `style: 'blockquote'`.
        const blockquoteStyle = consolidatedOptions.block.blockquote({
          context: {schema: consolidatedOptions.schema},
        })

        if (!blockquoteStyle) {
          reportStyleFallback('blockquote', lineOf(token))
        }

        const style =
          blockquoteStyle ??
          consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

        if (!style) {
          reportStyleFallback('normal', lineOf(token))
        }

        currentBlockquoteStyle = style ?? 'normal'
        break
      }
      case 'blockquote_close': {
        // Flush any blockquote content before exiting
        flushBlock()

        // Structural path: pop the topmost frame and splice its captured
        // content into a `blockquote` block-object via the matcher. If the
        // matcher returns undefined, fall back to flat-style by re-emitting
        // the content blocks with `style: 'blockquote'`.
        if (
          consolidatedOptions.types.blockquote &&
          blockquoteStack.length > 0
        ) {
          const frame = blockquoteStack.pop()
          if (frame) {
            const contentBlocks = frame.startTarget.splice(
              frame.startIndex,
            ) as Array<PortableTextBlock>

            const blockquoteObject = consolidatedOptions.types.blockquote({
              context: {
                schema: consolidatedOptions.schema,
                keyGenerator: consolidatedOptions.keyGenerator,
              },
              value: {content: contentBlocks},
              isInline: false,
            })

            if (blockquoteObject) {
              pushBlock(blockquoteObject)
            } else {
              // Matcher returned undefined: fall back to exactly what the
              // flat path would have produced (never registering
              // `types.blockquote` at all), including which events it would
              // have reported. Only plain paragraphs pick up the blockquote
              // style there; headings and fallback-to-text blocks (a
              // degraded code fence, say) keep whatever style they already
              // resolved to, so restyling is gated on `plainParagraphBlocks`
              // provenance, not the block's resolved style name.
              const blockquoteStyle = consolidatedOptions.block.blockquote({
                context: {schema: consolidatedOptions.schema},
              })

              if (!blockquoteStyle) {
                reportStyleFallback('blockquote', frame.line)
              }

              const resolvedStyle =
                blockquoteStyle ??
                consolidatedOptions.block.normal({
                  context: {schema: consolidatedOptions.schema},
                })

              if (!resolvedStyle) {
                reportStyleFallback('normal', frame.line)
              }

              const fallbackStyle = resolvedStyle ?? 'blockquote'
              for (const block of contentBlocks) {
                if (
                  block._type === 'block' &&
                  plainParagraphBlocks.has(block as PortableTextTextBlock)
                ) {
                  const restyledBlock: PortableTextTextBlock = {
                    ...(block as PortableTextTextBlock),
                    style: fallbackStyle,
                  }
                  // The spread above makes a new object, so the enclosing
                  // structural list's stampable gate (keyed on
                  // `plainParagraphBlocks` object identity) would otherwise
                  // lose this block's provenance across the restyle.
                  plainParagraphBlocks.add(restyledBlock)
                  pushBlock(restyledBlock)
                } else {
                  pushBlock(block)
                }
              }
            }
          }
          break
        }

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
            line: lineOf(token),
          })
          currentListStack.push(null)
          pendingListFlattenedStack.push(null)
          break
        }

        // Flat path: lists are reconstructed from text blocks with
        // `listItem` + `level` fields at render time.
        const listItem = consolidatedOptions.listItem.bullet({
          context: {schema: consolidatedOptions.schema},
        })

        listContainerStack.push(null)
        if (!listItem) {
          pendingListFlattenedStack.push({
            line: lineOf(token),
            kindName: 'bullet',
            reported: false,
          })
          currentListStack.push(null)
          break
        }
        pendingListFlattenedStack.push(null)
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
            line: lineOf(token),
          })
          currentListStack.push(null)
          pendingListFlattenedStack.push(null)
          break
        }

        const listItem = consolidatedOptions.listItem.number({
          context: {schema: consolidatedOptions.schema},
        })

        listContainerStack.push(null)
        if (!listItem) {
          pendingListFlattenedStack.push({
            line: lineOf(token),
            kindName: 'number',
            reported: false,
          })
          currentListStack.push(null)
          break
        }
        pendingListFlattenedStack.push(null)
        currentListStack.push(listItem)
        break
      }
      case 'bullet_list_close':
      case 'ordered_list_close': {
        const frame = listContainerStack.pop()
        currentListStack.pop()
        pendingListFlattenedStack.pop()

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
            // Matcher returned undefined: fall back to exactly what the
            // flat path would have produced for this same content (never
            // registering `types.list` at all), including which events it
            // would have reported. A decline whose mirrored flat form is
            // lossless (the schema has every list kind this list needs)
            // reports nothing: going structural and being declined isn't
            // itself a degradation, only losing information is.
            const kindListItem =
              (frame.kind === 'number'
                ? consolidatedOptions.listItem.number
                : consolidatedOptions.listItem.bullet)({
                context: {schema: consolidatedOptions.schema},
              }) ?? null
            const taskListItemType =
              consolidatedOptions.listItem.task?.({
                context: {schema: consolidatedOptions.schema},
              }) ?? null
            const kindName = frame.kind === 'number' ? 'number' : 'bullet'

            // The just-popped list was nested at depth = remaining stack
            // length + 1 (since we already popped).
            const level = listContainerStack.length + 1
            let flattenedReported = false

            for (const item of frame.items) {
              let itemListType: string | null = kindListItem
              let itemChecked: boolean | undefined

              if (item.checked !== undefined) {
                if (taskListItemType) {
                  itemListType = taskListItemType
                  itemChecked = item.checked
                } else if (kindListItem !== null) {
                  const info = taskInfoByListItem.get(item)
                  report({
                    type: 'task-checkbox-stripped',
                    message: degradationMessage['task-checkbox-stripped'](
                      item.checked,
                    ),
                    line: info?.line,
                    snippet: info?.snippet,
                  })
                }
              }

              if (itemListType === null && !flattenedReported) {
                report({
                  type: 'list-flattened',
                  message: degradationMessage['list-flattened'](kindName),
                  line: frame.line,
                })
                flattenedReported = true
              }

              // Adjacent plain-paragraph blocks within one item merge into
              // a single block, mirroring the flat path: consecutive
              // `paragraph_open`/`paragraph_close` pairs inside a flat list
              // item share one `currentBlock`, since only non-paragraph
              // content (headings, code blocks, ...) flushes it. Resets per
              // item: `list_item_close` always flushes in the flat path, so
              // a merge never crosses an item boundary. Gated on
              // `plainParagraphBlocks` (provenance, not shape): a
              // fallback-to-text block (a degraded code fence, say) never
              // shares `currentBlock` with surrounding text in the flat
              // path either, even when its style happens to match, and the
              // flat path never stamps it with `listItem` at all.
              let mergeTarget: PortableTextTextBlock | null = null

              for (const block of item.content) {
                const isStampable =
                  itemListType !== null &&
                  block._type === 'block' &&
                  !('listItem' in block) &&
                  !/^h[1-6]$/.test(
                    (block as PortableTextTextBlock).style ?? '',
                  ) &&
                  plainParagraphBlocks.has(block as PortableTextTextBlock)

                if (!isStampable) {
                  mergeTarget = null
                  pushBlock(block)
                  continue
                }

                const textBlock = block as PortableTextTextBlock
                if (mergeTarget && mergeTarget.style === textBlock.style) {
                  mergeTarget.children.push(...textBlock.children)
                  mergeTarget.markDefs = [
                    ...(mergeTarget.markDefs ?? []),
                    ...(textBlock.markDefs ?? []),
                  ]
                  continue
                }

                mergeTarget = {
                  ...textBlock,
                  listItem: itemListType as string,
                  level,
                  ...(itemChecked === undefined ? {} : {checked: itemChecked}),
                }
                pushBlock(mergeTarget)
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
          if (taskChecked !== undefined) {
            taskInfoByListItem.set(frame.currentItem, {
              line: lineOf(token),
              snippet: truncateSnippet(
                taskItemTextByListItemIndex.get(tokenIndex) ?? '',
              ),
            })
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
          const pendingFlattened = pendingListFlattenedStack.at(-1)
          if (pendingFlattened && !pendingFlattened.reported) {
            report({
              type: 'list-flattened',
              message: degradationMessage['list-flattened'](
                pendingFlattened.kindName,
              ),
              line: pendingFlattened.line,
            })
            pendingFlattened.reported = true
          }

          // Use blockquote style if inside a blockquote, otherwise use normal style
          const style =
            currentBlockquoteStyle ??
            consolidatedOptions.block.normal({
              context: {schema: consolidatedOptions.schema},
            })

          if (!style) {
            reportStyleFallback('normal', lineOf(token))
            startBlock('normal')
          } else {
            startBlock(style, {
              tookBlockquoteStyle: currentBlockquoteStyle !== null,
            })
          }
          inListItem = true
          break
        }

        if (taskChecked !== undefined && checked === undefined) {
          const itemText = taskItemTextByListItemIndex.get(tokenIndex) ?? ''
          const snippet = truncateSnippet(itemText)
          report({
            type: 'task-checkbox-stripped',
            message: degradationMessage['task-checkbox-stripped'](taskChecked),
            line: lineOf(token),
            snippet,
          })
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

        if (language === 'json:object') {
          const objectValue = parseJsonObjectFence(code)

          if (objectValue) {
            pushBlock(objectValue as PortableTextObject)
            break
          }

          report({
            type: 'object-carrier-invalid',
            message: degradationMessage['object-carrier-invalid'](
              'fence',
              code,
            ),
            line: lineOf(token),
            snippet: truncateSnippet(code),
          })
        }

        const codeObject = consolidatedOptions.types.code({
          context: {
            schema: consolidatedOptions.schema,
            keyGenerator: consolidatedOptions.keyGenerator,
          },
          value: {language, code},
          isInline: false,
        })

        if (!codeObject) {
          const snippet = truncateSnippet(code.split('\n')[0] ?? '')
          report({
            type: 'code-block-to-text',
            message: degradationMessage['code-block-to-text'](language),
            line: lineOf(token),
            snippet,
          })

          // Code block not in schema, fall back to text block
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            reportStyleFallback('normal', lineOf(token))
            startBlock('normal')
          } else {
            startBlock(style)
          }

          addSpan(code)
          flushBlock()
          break
        }

        reportFieldsDropped(codeObject, lineOf(token))
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
          report({
            type: 'horizontal-rule-to-text',
            message: degradationMessage['horizontal-rule-to-text'],
            line: lineOf(token),
          })

          // If there's no break definition in the schema, parse as text
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            reportStyleFallback('normal', lineOf(token))
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
          const snippet = truncateSnippet(htmlContent)
          report({
            type: 'html-block-to-text',
            message: degradationMessage['html-block-to-text'],
            line: lineOf(token),
            snippet,
          })

          // If there's no HTML block definition in the schema, parse as text
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            reportStyleFallback('normal', lineOf(token))
            startBlock('normal')
          } else {
            startBlock(style)
          }

          addSpan(htmlContent)
          flushBlock()
          break
        }

        reportFieldsDropped(htmlObject, lineOf(token))
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
          const snippet = truncateSnippet(code.split('\n')[0] ?? '')
          report({
            type: 'code-block-to-text',
            message: degradationMessage['code-block-to-text'](undefined),
            line: lineOf(token),
            snippet,
          })

          // Code block not in schema, fall back to text block
          const style = consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

          if (!style) {
            reportStyleFallback('normal', lineOf(token))
            startBlock('normal')
          } else {
            startBlock(style)
          }

          addSpan(code)
          flushBlock()
        } else {
          reportFieldsDropped(codeObject, lineOf(token))
          pushBlock(codeObject)
        }

        break
      }

      // Tables
      case 'table_open':
        flushBlock()
        currentTable = {
          rows: [],
          headerRows: 0,
          emptyHeaderDropped: false,
          alignment: [],
          line: lineOf(token),
        }
        break

      case 'table_close': {
        if (!currentTable) {
          break
        }

        // Only create table object if table type is defined
        if (consolidatedOptions.types.table) {
          const hasAlignment = currentTable.alignment.some((a) => a !== null)
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
                  : currentTable.emptyHeaderDropped
                    ? 0
                    : undefined,
              alignment: hasAlignment ? currentTable.alignment : undefined,
            },
            isInline: false,
          })

          if (tableObject) {
            reportFieldsDropped(tableObject, currentTable.line)
            pushBlock(tableObject)
          } else {
            report({
              type: 'table-flattened',
              message: degradationMessage['table-flattened'],
              line: currentTable.line,
            })
            // If table object couldn't be created, flatten the table
            flattenTable(
              currentTable,
              blockTarget() as Array<PortableTextBlock>,
            )
          }
        } else {
          report({
            type: 'table-flattened',
            message: degradationMessage['table-flattened'],
            line: currentTable.line,
          })
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
          if (
            inTableHead &&
            isEmptyTableRow(currentTableRow, {
              schema: consolidatedOptions.schema,
            })
          ) {
            // An all-empty header row means "no header": drop it and leave
            // `headerRows` at 0 (recorded so `table_close` emits an explicit
            // 0, not `undefined`), so `portableTextToMarkdown`'s headerless
            // output round-trips back to `headerRows: 0`.
            currentTable.emptyHeaderDropped = true
          } else {
            currentTable.rows.push({
              _key: consolidatedOptions.keyGenerator(),
              _type: 'row',
              cells: currentTableRow,
            })
            if (inTableHead) {
              currentTable.headerRows++
            }
          }
        }
        currentTableRow = null
        break

      case 'th_open':
      case 'td_open': {
        // Alignment is per-column, set on every cell of that column. Read
        // from the header so each column contributes exactly one entry.
        if (currentTable && inTableHead && token.type === 'th_open') {
          currentTable.alignment.push(
            extractAlignmentFromStyleAttr(token.attrGet('style')),
          )
        }

        // Start a new block for the table cell
        const style = consolidatedOptions.block.normal({
          context: {schema: consolidatedOptions.schema},
        })

        if (!style) {
          reportStyleFallback('normal', currentTable?.line)
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

        // Images pushed as inline children during this cell (see the
        // `inline` case below) were demoted from block-level at push time,
        // before it was known whether the sole-image lift below would
        // recover them losslessly. Collect them so the lift's verdict can
        // decide whether the demotion actually degraded anything.
        const demotedInlineImages: Array<PortableTextObject> = []
        for (const block of cellBlocks) {
          if (
            block._type === 'block' &&
            'children' in block &&
            Array.isArray(block.children)
          ) {
            for (const child of block.children) {
              if (
                typeof child === 'object' &&
                child !== null &&
                demotedTableImages.has(child as PortableTextObject)
              ) {
                demotedInlineImages.push(child as PortableTextObject)
              }
            }
          }
        }

        // A cell holding one block whose only child is an object (not a
        // span) lifts that object to block position, unless the schema
        // declares the type inline-only: that type has a legal inline home,
        // so the block reading would manufacture a placement the schema
        // forbids. Everything else (declared block, declared both, or
        // undeclared) reads as block, matching PT's table model where
        // `cell.value` is an array of blocks.
        const firstBlock = cellBlocks[0]
        let liftedObject: PortableTextObject | undefined
        if (
          cellBlocks.length === 1 &&
          firstBlock &&
          firstBlock._type === 'block' &&
          'children' in firstBlock &&
          Array.isArray(firstBlock.children) &&
          firstBlock.children.length === 1
        ) {
          const onlyChild = firstBlock.children[0]
          if (
            typeof onlyChild === 'object' &&
            onlyChild !== null &&
            '_type' in onlyChild &&
            onlyChild._type !== consolidatedOptions.schema.span.name
          ) {
            const declaredInline =
              consolidatedOptions.schema.inlineObjects.some(
                (inlineObject) => inlineObject.name === onlyChild._type,
              )
            const declaredBlock = consolidatedOptions.schema.blockObjects.some(
              (blockObject) => blockObject.name === onlyChild._type,
            )
            if (!(declaredInline && !declaredBlock)) {
              cellBlocks[0] = onlyChild as PortableTextBlock
              liftedObject = onlyChild as PortableTextObject
            }
          }
        }

        // A demoted image the lift didn't recover is stuck as an inline
        // child of the cell's text block: report it now that the verdict is
        // known, instead of at demotion time.
        for (const demotedImage of demotedInlineImages) {
          if (demotedImage !== liftedObject) {
            const {alt, src} = demotedImage as {alt?: string; src?: string}
            report({
              type: 'image-block-to-inline',
              message: degradationMessage['image-block-to-inline'](
                demotedTableImages.get(demotedImage) ?? 'table-cell',
              ),
              line: currentTable?.line,
              snippet: truncateSnippet(alt || src || ''),
            })
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

        // `inline` tokens inside table cells carry no `map` of their own;
        // fall back to the enclosing table's line.
        const inlineLine = (): number | undefined =>
          lineOf(token) ?? currentTable?.line

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
            reportFieldsDropped(blockImageObject, inlineLine())
            if (inTableCell) {
              demotedTableImages.set(
                blockImageObject as PortableTextObject,
                'table-cell',
              )

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
            reportFieldsDropped(inlineImageObject, inlineLine())
            if (inTableCell) {
              // Defer to the `td_close` sole-image lift: a standalone image
              // that's the cell's only content round-trips back to
              // block-level losslessly, and reporting here would be a false
              // positive for that case.
              demotedTableImages.set(
                inlineImageObject as PortableTextObject,
                'no-block-image',
              )
            } else {
              report({
                type: 'image-block-to-inline',
                message:
                  degradationMessage['image-block-to-inline']('no-block-image'),
                line: inlineLine(),
                snippet: truncateSnippet(alt || src),
              })
            }
            // Ensure we have a block to add the inline image to
            if (!currentBlock) {
              if (inListItem) {
                // Structural list: start a plain text block; the image
                // lands in the current item's content via flushBlock.
                if (listContainerStack.at(-1)) {
                  const style = consolidatedOptions.block.normal({
                    context: {schema: consolidatedOptions.schema},
                  })

                  if (!style) {
                    reportStyleFallback('normal', inlineLine())
                  }

                  startBlock(style ?? 'normal')
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
          const standaloneImageSnippet = truncateSnippet(alt || src)
          report({
            type: 'image-to-text',
            message: degradationMessage['image-to-text'],
            line: inlineLine(),
            snippet: standaloneImageSnippet,
          })
          addSpan(`![${alt}](${src})`)
          break
        }

        // Walk its children for text/marks/links
        const inlineChildren = token.children ?? []
        for (
          let childIndex = 0;
          childIndex < inlineChildren.length;
          childIndex++
        ) {
          const childToken = inlineChildren[childIndex]
          if (!childToken) {
            continue
          }

          switch (childToken.type) {
            case 'text': {
              const nextToken = inlineChildren[childIndex + 1]

              if (
                childToken.content.endsWith('json:object') &&
                nextToken?.type === 'code_inline' &&
                currentBlock &&
                'children' in currentBlock
              ) {
                const objectValue = parseJsonObjectFence(nextToken.content)

                if (objectValue) {
                  const prefix = childToken.content.slice(
                    0,
                    -'json:object'.length,
                  )

                  if (prefix.length > 0) {
                    addSpan(prefix)
                  }

                  ;(currentBlock as PortableTextTextBlock).children.push(
                    objectValue as PortableTextObject,
                  )

                  childIndex++
                  break
                }

                report({
                  type: 'object-carrier-invalid',
                  message: degradationMessage['object-carrier-invalid'](
                    'code-span',
                    nextToken.content,
                  ),
                  line: inlineLine(),
                  snippet: truncateSnippet(nextToken.content),
                })
              }

              addSpan(childToken.content)
              break
            }
            case 'softbreak':
              addSpan(' ')
              break
            case 'hardbreak':
              addSpan('\n')
              break
            case 'code_inline': {
              const decorator = consolidatedOptions.marks.code({
                context: {schema: consolidatedOptions.schema},
              })

              if (!decorator) {
                const codeSnippet = truncateSnippet(childToken.content)
                report({
                  type: 'decorator-dropped',
                  message: degradationMessage['decorator-dropped']('code'),
                  line: inlineLine(),
                  snippet: codeSnippet,
                })
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
                const strongSnippet = truncateSnippet(
                  collectInlineText(
                    inlineChildren,
                    childIndex,
                    'strong_open',
                    'strong_close',
                  ),
                )
                report({
                  type: 'decorator-dropped',
                  message: degradationMessage['decorator-dropped']('strong'),
                  line: inlineLine(),
                  snippet: strongSnippet,
                })
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
                const emSnippet = truncateSnippet(
                  collectInlineText(
                    inlineChildren,
                    childIndex,
                    'em_open',
                    'em_close',
                  ),
                )
                report({
                  type: 'decorator-dropped',
                  message: degradationMessage['decorator-dropped']('em'),
                  line: inlineLine(),
                  snippet: emSnippet,
                })
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
                const strikeSnippet = truncateSnippet(
                  collectInlineText(
                    inlineChildren,
                    childIndex,
                    's_open',
                    's_close',
                  ),
                )
                report({
                  type: 'decorator-dropped',
                  message:
                    degradationMessage['decorator-dropped']('strikeThrough'),
                  line: inlineLine(),
                  snippet: strikeSnippet,
                })
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
                const missingHrefSnippet = truncateSnippet(
                  collectInlineText(
                    inlineChildren,
                    childIndex,
                    'link_open',
                    'link_close',
                  ),
                )
                report({
                  type: 'annotation-dropped',
                  message:
                    degradationMessage['annotation-dropped']('missing-url'),
                  line: inlineLine(),
                  snippet: missingHrefSnippet,
                })
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
                const linkSnippet = truncateSnippet(
                  collectInlineText(
                    inlineChildren,
                    childIndex,
                    'link_open',
                    'link_close',
                  ),
                )
                report({
                  type: 'annotation-dropped',
                  message:
                    degradationMessage['annotation-dropped']('no-annotation'),
                  line: inlineLine(),
                  snippet: linkSnippet,
                })
                break
              }

              reportFieldsDropped(linkObject, inlineLine())
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
                reportFieldsDropped(inlineImageObject, inlineLine())
                // Inline image is supported - add it to current block
                if (!currentBlock) {
                  const style = consolidatedOptions.block.normal({
                    context: {schema: consolidatedOptions.schema},
                  })

                  if (!style) {
                    reportStyleFallback('normal', inlineLine())
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
                const inlineImageSnippet = truncateSnippet(alt || src)
                report({
                  type: 'image-to-text',
                  message: degradationMessage['image-to-text'],
                  line: inlineLine(),
                  snippet: inlineImageSnippet,
                })
                addSpan(`![${alt}](${src})`)
                break
              }

              // Block image supported - flush current block and add as block-level
              // Skip if we're in a table cell (images in cells are handled differently)
              if (inTableCell) {
                reportFieldsDropped(blockImageObject, inlineLine())
                demotedTableImages.set(
                  blockImageObject as PortableTextObject,
                  'table-cell',
                )

                // In table cells, add the image to current block (will be extracted later)
                if (currentBlock && 'children' in currentBlock) {
                  ;(currentBlock as PortableTextTextBlock).children.push(
                    blockImageObject as PortableTextObject,
                  )
                }
                break
              }

              // Not in table - flush current block, add image as block, start new block
              reportFieldsDropped(blockImageObject, inlineLine())
              report({
                type: 'image-inline-to-block',
                message: degradationMessage['image-inline-to-block'],
                line: inlineLine(),
                snippet: truncateSnippet(alt || src),
              })
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
              } else if (childToken.content) {
                const htmlInlineSnippet = truncateSnippet(childToken.content)
                report({
                  type: 'inline-html-dropped',
                  message: degradationMessage['inline-html-dropped'],
                  line: inlineLine(),
                  snippet: htmlInlineSnippet,
                })
              }
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
        calloutStartLine = lineOf(token)

        // Set blockquote style so content blocks inside the callout
        // get blockquote styling (used in fallback when callout type
        // is not in the schema)
        const blockquoteStyle = consolidatedOptions.block.blockquote({
          context: {schema: consolidatedOptions.schema},
        })

        calloutPendingStyleFallbacks = []
        if (!blockquoteStyle) {
          calloutPendingStyleFallbacks.push('blockquote')
        }

        const style =
          blockquoteStyle ??
          consolidatedOptions.block.normal({
            context: {schema: consolidatedOptions.schema},
          })

        if (!style) {
          calloutPendingStyleFallbacks.push('normal')
        }

        currentBlockquoteStyle = style ?? 'normal'
        break
      }

      case 'alert_title': {
        // `alert_open`'s own map starts at the first content line; the
        // marker line (`> [!NOTE]`) is `alert_title`'s. Any pending style
        // fallbacks flush lazily, from `flushBlock`, once a text block
        // actually commits needing the style.
        calloutStartLine = lineOf(token)
        break
      }

      case 'alert_close': {
        flushBlock()

        // Nothing ever needed the pending style: no text block materialized
        // inside the callout, so nothing degraded.
        calloutPendingStyleFallbacks = []

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
            reportFieldsDropped(calloutObject, calloutStartLine)
            pushBlock(calloutObject)
          } else {
            report({
              type: 'callout-fallback',
              message: degradationMessage['callout-fallback'](
                calloutType,
                currentBlockquoteStyle ?? 'normal',
              ),
              line: calloutStartLine,
            })
            for (const block of contentBlocks) {
              pushBlock(block)
            }
          }
        }

        calloutStartIndex = null
        calloutStartTarget = null
        calloutType = null
        calloutStartLine = undefined
        currentBlockquoteStyle = null
        break
      }

      default:
        break
    }
  }

  flushBlock()

  if (degradationEvents.length > 0) {
    options?.onDegradation?.({
      degradations: degradationEvents,
      message: buildDegradationMessage(degradationEvents),
    })
  }

  return portableText
}

/**
 * A `json:object` fence always reconstructs its object, schema or no
 * schema: the fence carries its own `_type`, and degrading it to a code
 * block would reintroduce the loss the syntax exists to remove. Returns
 * `undefined` instead of throwing, so an unusable fence falls through to
 * the regular code path.
 */
function parseJsonObjectFence(
  code: string,
): (Record<string, unknown> & {_type: string}) | undefined {
  let parsed: unknown

  try {
    parsed = JSON.parse(code)
  } catch {
    return undefined
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined
  }

  const objectValue = parsed as Record<string, unknown>

  if (
    typeof objectValue['_type'] !== 'string' ||
    objectValue['_type'].length === 0
  ) {
    return undefined
  }

  return objectValue as Record<string, unknown> & {_type: string}
}

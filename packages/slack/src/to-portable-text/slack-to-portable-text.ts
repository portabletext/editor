import {
  type PortableTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
  type Schema,
} from '@portabletext/schema'
import {codeLinesSchema, defaultCodeLineStyle} from '../code-lines-schema'
import {
  blockquoteStyleDefinition,
  defaultCodeDecoratorDefinition,
  defaultEmDecoratorDefinition,
  defaultLinkObjectDefinition,
  defaultOrderedListItemDefinition,
  defaultSchema,
  defaultStrikeThroughDecoratorDefinition,
  defaultStrongDecoratorDefinition,
  defaultUnorderedListItemDefinition,
  normalStyleDefinition,
} from '../default-schema'
import {buildDegradationMessage, truncateSnippet} from '../degradation-report'
import {defaultKeyGenerator, uniqueKeyGenerator} from '../key-generator'
import {isUnsafeUrl} from '../unsafe-url'
import {degradationMessage} from './degradation-messages'
import {
  buildAnnotationMatcher,
  buildDecoratorMatcher,
  buildListItemMatcher,
  buildStyleMatcher,
  readDroppedFields,
  type AnnotationMatcher,
  type DecoratorMatcher,
  type ListItemMatcher,
  type ObjectMatcher,
  type StyleMatcher,
} from './matchers'
import {
  isRecord,
  parseDelta,
  type DeltaAttributes,
  type DeltaItem,
  type DeltaLine,
} from './parse-delta'

/**
 * The classification of a lossy conversion encountered while converting
 * Slack content to Portable Text: a Slack construct the target schema (or
 * the active matchers) has no place for, so the conversion fell back to a
 * lossier representation instead of failing.
 *
 * @public
 */
export type DegradationType =
  | 'decorator-dropped'
  | 'annotation-dropped'
  | 'style-fallback'
  | 'list-flattened'
  | 'code-block-to-text'
  | 'fields-dropped'
  | 'embed-to-text'
  | 'embed-dropped'

/**
 * Reports a single lossy conversion, in document order. `line` is the
 * 1-based line of the Slack content the construct sits on. `snippet` is the
 * offending construct's text, truncated to 40 characters with an ellipsis,
 * present whenever there is a specific piece of text to quote. `message` is
 * human-readable and may change between releases. Match on `type`, not
 * `message`. The set of `type` values grows in minor releases as new
 * degradation sites report, so compare against the values you handle
 * rather than switching exhaustively.
 *
 * @public
 */
export type Degradation = {
  type: DegradationType
  message: string
  line?: number
  snippet?: string
}

/**
 * Matcher function for mapping a Slack mention, channel link or emoji to
 * Portable Text. Return an inline object to insert in place of the embed,
 * an array of spans to insert as text (they keep the embed's surrounding
 * formatting), or `undefined` to fall back to the embed's display text,
 * reported as an `embed-to-text` degradation.
 *
 * @public
 */
export type EmbedMatcher<TValue extends Record<string, unknown>> = ({
  context,
  value,
}: {
  context: {schema: Schema; keyGenerator: () => string}
  value: TValue
}) => PortableTextObject | Array<PortableTextSpan> | undefined

type SlackToPortableTextOptions = {
  /**
   * Compiled schema deciding which Portable Text constructs the conversion
   * may build. Defaults to the same schema `@portabletext/markdown` uses.
   */
  schema?: Schema
  keyGenerator?: () => string
  /**
   * Called at most once, after the conversion has walked the whole
   * content, only when at least one construct degraded. Observe every
   * degradation via `report.degradations`, in document order. Enforce
   * against lossy output by throwing your own error from inside the
   * callback, using `report.message` (the canonical grouped text) as its
   * message. The throw propagates out of `slackToPortableText`.
   *
   * ```ts
   * slackToPortableText(texty, {onDegradation: ({message}) => { throw new Error(message) }})
   * ```
   */
  onDegradation?: (report: {
    degradations: Array<Degradation>
    message: string
  }) => void
  marks?: {
    strong?: DecoratorMatcher
    em?: DecoratorMatcher
    strikeThrough?: DecoratorMatcher
    code?: DecoratorMatcher
    link?: AnnotationMatcher<{href: string; title: string | undefined}>
  }
  block?: {
    normal?: StyleMatcher
    blockquote?: StyleMatcher
  }
  listItem?: {
    bullet?: ListItemMatcher
    number?: ListItemMatcher
  }
  types?: {
    /**
     * Builds one block object from a run of Slack code-block lines. The
     * default builds the schema's `code` block object: a `lines` array field
     * (one text block per line, of the block type the field declares) when
     * the schema declares one that holds text blocks, a `code` string field
     * otherwise, and `undefined` when it declares neither. `language`
     * is always `undefined`, since Slack code blocks carry none, and is
     * there so a matcher written for `@portabletext/markdown` fits.
     */
    code?: ObjectMatcher<{language: string | undefined; code: string}>
  }
  embeds?: {
    /**
     * A user mention. `id` is the Slack user id and `text` is Slack's
     * display text, such as `@foo`. Broadcasts (`@here`, `@channel`) and
     * user groups never reach the matcher and stay their display text.
     */
    mention?: EmbedMatcher<{id: string; text: string}>
    /**
     * A channel link. `text` is Slack's display text, such as `#foo`.
     */
    channel?: EmbedMatcher<{id: string; text: string}>
    /**
     * An emoji. `text` is Slack's colon code, such as `:foo:`, and `name`
     * is the same code without the colons.
     */
    emoji?: EmbedMatcher<{name: string; text: string}>
  }
}

const codeBlockMatcher: ObjectMatcher<{
  language: string | undefined
  code: string
}> = ({context, value}) => {
  const definition = context.schema.blockObjects.find(
    (blockObject) => blockObject.name === 'code',
  )

  if (!definition) {
    return undefined
  }

  const fieldNames = definition.fields.map((field) => field.name)
  const language =
    value.language !== undefined && fieldNames.includes('language')
      ? {language: value.language}
      : {}

  const linesSchema = codeLinesSchema(context.schema)

  if (linesSchema) {
    const style = defaultCodeLineStyle(linesSchema)

    return {
      _key: context.keyGenerator(),
      _type: definition.name,
      ...language,
      lines: value.code.split('\n').map((text) => ({
        _type: linesSchema.block.name,
        _key: context.keyGenerator(),
        ...(style ? {style} : {}),
        markDefs: [],
        children: [
          {
            _type: linesSchema.span.name,
            _key: context.keyGenerator(),
            text,
            marks: [],
          },
        ],
      })),
    }
  }

  const codeField = definition.fields.find((field) => field.name === 'code')

  if (codeField?.type === 'string') {
    return {
      _key: context.keyGenerator(),
      _type: definition.name,
      ...language,
      code: value.code,
    }
  }

  return undefined
}

const defaultOptions = {
  marks: {
    strong: buildDecoratorMatcher(defaultStrongDecoratorDefinition),
    em: buildDecoratorMatcher(defaultEmDecoratorDefinition),
    strikeThrough: buildDecoratorMatcher(
      defaultStrikeThroughDecoratorDefinition,
    ),
    code: buildDecoratorMatcher(defaultCodeDecoratorDefinition),
    link: buildAnnotationMatcher(defaultLinkObjectDefinition),
  },
  block: {
    normal: buildStyleMatcher(normalStyleDefinition),
    blockquote: buildStyleMatcher(blockquoteStyleDefinition),
  },
  listItem: {
    bullet: buildListItemMatcher(defaultUnorderedListItemDefinition),
    number: buildListItemMatcher(defaultOrderedListItemDefinition),
  },
  types: {
    code: codeBlockMatcher,
  },
} as const satisfies SlackToPortableTextOptions

const decoratorAttributes = [
  ['bold', 'strong'],
  ['italic', 'em'],
  ['strike', 'strikeThrough'],
  ['code', 'code'],
] as const

/**
 * Converts the `slack/texty` clipboard payload, a JSON string holding a
 * Quill Delta, to an array of Portable Text blocks. Returns `[]` when
 * `texty` isn't a Delta, so a caller can fall back to `text/plain`.
 *
 * @public
 */
export function slackToPortableText(
  texty: string,
  options?: SlackToPortableTextOptions,
): Array<PortableTextBlock> {
  const lines = parseDelta(texty)

  if (!lines) {
    return []
  }

  const schema = options?.schema ?? defaultSchema
  const matcherKeys = new Set<string>()
  const keyGenerator = uniqueKeyGenerator(
    options?.keyGenerator ?? defaultKeyGenerator,
    matcherKeys,
  )
  const marks = {...defaultOptions.marks, ...options?.marks}
  const block = {...defaultOptions.block, ...options?.block}
  const listItem = {...defaultOptions.listItem, ...options?.listItem}
  const types = {...defaultOptions.types, ...options?.types}
  const embeds = options?.embeds ?? {}
  const context = {schema, keyGenerator}

  const degradations: Array<Degradation & {line: number}> = []
  const report = (degradation: Degradation & {line: number}) => {
    degradations.push(degradation)
  }

  // Only spans built here merge with a neighbour. A span an embed matcher
  // returned keeps its own key and shape.
  const builtSpans = new WeakSet<BuiltSpan>()
  const buildSpan = (text: string, spanMarks: Array<string>) => {
    const span: BuiltSpan = {
      _type: schema.span.name,
      _key: keyGenerator(),
      text,
      marks: spanMarks,
    }
    builtSpans.add(span)
    return span
  }

  const blocks: Array<PortableTextBlock> = []
  let previousLine: DeltaLine | undefined

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    const lineNumber = index + 1

    if (line.attributes['code-block']) {
      const runEnd = findCodeBlockRunEnd(lines, index)
      blocks.push(...buildCodeBlock(lines.slice(index, runEnd), lineNumber))
      previousLine = lines[runEnd - 1]
      index = runEnd - 1
      continue
    }

    blocks.push(buildTextBlock(line, lineNumber, previousLine))
    previousLine = line
  }

  if (degradations.length > 0) {
    options?.onDegradation?.({
      degradations,
      message: buildDegradationMessage(
        'Slack content could not be converted without loss:',
        'line',
        degradations.map((degradation) => ({
          ...degradation,
          position: degradation.line,
        })),
      ),
    })
  }

  return blocks

  function resolveNormalStyle(lineNumber: number): string {
    const style = block.normal({context: {schema}})

    if (style === undefined) {
      report({
        type: 'style-fallback',
        message: degradationMessage['style-fallback']('normal'),
        line: lineNumber,
      })
      return 'normal'
    }

    return style
  }

  function buildCodeBlock(
    codeLines: Array<DeltaLine>,
    lineNumber: number,
  ): Array<PortableTextBlock> {
    // The run's own report precedes what its lines lost, in document order.
    const lineDegradations: typeof degradations = []
    const lineTexts = codeLines.map((codeLine, index) =>
      codeLine.items
        .map((item) =>
          codeLineText(item, lineNumber + index, (degradation) => {
            lineDegradations.push(degradation)
          }),
        )
        .join(''),
    )
    const code = lineTexts.join('\n')

    const codeObject = types.code({
      context,
      value: {language: undefined, code},
      isInline: false,
    })

    if (codeObject) {
      matcherKeys.add(codeObject._key)

      const dropped = readDroppedFields(codeObject)

      if (dropped) {
        report({
          type: 'fields-dropped',
          message: degradationMessage['fields-dropped'](
            dropped.keys.map((key) => `\`${key}\``).join(', '),
            dropped.construct,
          ),
          line: lineNumber,
        })
      }

      degradations.push(...lineDegradations)

      return [codeObject]
    }

    report({
      type: 'code-block-to-text',
      message: degradationMessage['code-block-to-text'],
      line: lineNumber,
      ...snippetOf(lineTexts[0] ?? ''),
    })
    degradations.push(...lineDegradations)

    return [
      {
        _type: schema.block.name,
        _key: keyGenerator(),
        style: resolveNormalStyle(lineNumber),
        markDefs: [],
        children: [
          {
            _type: schema.span.name,
            _key: keyGenerator(),
            text: code,
            marks: [],
          },
        ],
      },
    ]
  }

  function codeLineText(
    item: DeltaItem,
    lineNumber: number,
    reportLine: typeof report,
  ): string {
    const embed = readEmbed(item)

    if (embed?.kind === 'unknown') {
      reportLine({
        type: 'embed-dropped',
        message: degradationMessage['embed-dropped'],
        line: lineNumber,
        ...snippetOf(JSON.stringify(embed.value)),
      })
      return ''
    }

    const text = embed ? embed.value.text : (item as {text: string}).text

    reportDroppedMarks(
      item.attributes,
      text,
      lineNumber,
      'code-block',
      reportLine,
    )

    if (embed && embed.kind !== 'broadcast') {
      reportLine({
        type: 'embed-to-text',
        message: degradationMessage['embed-to-text-in-code-block'](
          embed.kind === 'mention' && !isUserId(embed.value.id)
            ? 'group-mention'
            : embed.kind,
        ),
        line: lineNumber,
        ...snippetOf(text),
      })
    }

    return text
  }

  function buildTextBlock(
    line: DeltaLine,
    lineNumber: number,
    previousLine: DeltaLine | undefined,
  ): PortableTextTextBlock {
    const textBlock: PortableTextTextBlock = {
      _type: schema.block.name,
      _key: keyGenerator(),
      children: [],
      markDefs: [],
      style: resolveLineStyle(line, lineNumber, previousLine),
    }

    const listKind = listKindOf(line.attributes)

    if (listKind) {
      const listName = listItem[listKind]({context: {schema}})

      if (listName === undefined) {
        // A Slack list is a run of list lines: report the run once.
        if (listKindOf(previousLine?.attributes ?? {}) !== listKind) {
          report({
            type: 'list-flattened',
            message: degradationMessage['list-flattened'](listKind),
            line: lineNumber,
          })
        }
      } else {
        const indent = line.attributes['indent']
        textBlock.listItem = listName
        textBlock.level =
          typeof indent === 'number' && indent > 0 ? indent + 1 : 1
      }
    }

    const linkKeysByHref = new Map<string, string>()

    for (const item of line.items) {
      for (const child of buildChildren(
        item,
        lineNumber,
        textBlock,
        linkKeysByHref,
      )) {
        appendChild(textBlock, child)
      }
    }

    if (textBlock.children.length === 0) {
      textBlock.children.push({
        _type: schema.span.name,
        _key: keyGenerator(),
        text: '',
        marks: [],
      })
    }

    return textBlock
  }

  function resolveLineStyle(
    line: DeltaLine,
    lineNumber: number,
    previousLine: DeltaLine | undefined,
  ): string {
    if (!line.attributes['blockquote']) {
      return resolveNormalStyle(lineNumber)
    }

    const style = block.blockquote({context: {schema}})

    if (style !== undefined) {
      return style
    }

    // A Slack blockquote is a run of quoted lines: report the run once.
    if (!previousLine?.attributes['blockquote']) {
      report({
        type: 'style-fallback',
        message: degradationMessage['style-fallback']('blockquote'),
        line: lineNumber,
      })
    }

    return resolveNormalStyle(lineNumber)
  }

  function buildChildren(
    item: DeltaItem,
    lineNumber: number,
    textBlock: PortableTextTextBlock,
    linkKeysByHref: Map<string, string>,
  ): Array<PortableTextSpan | PortableTextObject> {
    const embed = readEmbed(item)

    if (embed?.kind === 'unknown') {
      report({
        type: 'embed-dropped',
        message: degradationMessage['embed-dropped'],
        line: lineNumber,
        ...snippetOf(JSON.stringify(embed.value)),
      })
      return []
    }

    const text = embed ? embed.value.text : (item as {text: string}).text
    const buildItemMarks = () =>
      buildMarks(item.attributes, text, lineNumber, textBlock, linkKeysByHref)

    // A broadcast's display text is all it carries, so nothing is lost.
    if (!embed || embed.kind === 'broadcast') {
      return [buildSpan(text, buildItemMarks())]
    }

    const matched = matchEmbed(embed)

    for (const child of Array.isArray(matched) ? matched : [matched]) {
      if (child) {
        matcherKeys.add(child._key)
      }
    }

    if (Array.isArray(matched)) {
      const spanMarks = buildItemMarks()

      return matched.map((span) => ({
        ...span,
        marks: [...(span.marks ?? []), ...spanMarks],
      }))
    }

    if (matched) {
      reportDroppedMarks(
        item.attributes,
        text,
        lineNumber,
        'inline-object',
        report,
      )
      return [matched]
    }

    const spanMarks = buildItemMarks()

    report({
      type: 'embed-to-text',
      message: degradationMessage['embed-to-text'](
        embed.kind === 'mention' && !isUserId(embed.value.id)
          ? 'group-mention'
          : embed.kind,
      ),
      line: lineNumber,
      ...snippetOf(text),
    })

    return [buildSpan(text, spanMarks)]
  }

  function matchEmbed(
    embed: Exclude<Embed, {kind: 'unknown'} | {kind: 'broadcast'}>,
  ) {
    switch (embed.kind) {
      case 'mention':
        // A host mapping user ids would misread any other id.
        return isUserId(embed.value.id)
          ? embeds.mention?.({context, value: embed.value})
          : undefined
      case 'channel':
        return embeds.channel?.({context, value: embed.value})
      case 'emoji':
        return embeds.emoji?.({context, value: embed.value})
    }
  }

  function reportDroppedMarks(
    attributes: DeltaAttributes,
    text: string,
    lineNumber: number,
    cause: 'code-block' | 'inline-object',
    reportDropped: typeof report,
  ) {
    for (const [attribute, matcherName] of decoratorAttributes) {
      if (attributes[attribute]) {
        reportDropped({
          type: 'decorator-dropped',
          message:
            cause === 'code-block'
              ? degradationMessage['decorator-dropped-in-code-block'](
                  matcherName,
                )
              : degradationMessage['decorator-dropped-from-embed'](matcherName),
          line: lineNumber,
          ...snippetOf(text),
        })
      }
    }

    const link = readLink(attributes)

    if (link !== undefined) {
      reportDropped({
        type: 'annotation-dropped',
        message: link.cause
          ? degradationMessage['annotation-dropped'](link.cause)
          : cause === 'code-block'
            ? degradationMessage['annotation-dropped-in-code-block']
            : degradationMessage['annotation-dropped-from-embed'],
        line: lineNumber,
        ...snippetOf(text),
      })
    }
  }

  function buildMarks(
    attributes: DeltaAttributes,
    text: string,
    lineNumber: number,
    textBlock: PortableTextTextBlock,
    linkKeysByHref: Map<string, string>,
  ): Array<string> {
    const spanMarks: Array<string> = []

    for (const [attribute, matcherName] of decoratorAttributes) {
      if (!attributes[attribute]) {
        continue
      }

      const decorator = marks[matcherName]({context: {schema}})

      if (decorator === undefined) {
        report({
          type: 'decorator-dropped',
          message: degradationMessage['decorator-dropped'](matcherName),
          line: lineNumber,
          ...snippetOf(text),
        })
        continue
      }

      spanMarks.push(decorator)
    }

    const link = readLink(attributes)

    if (link === undefined) {
      return spanMarks
    }

    if (link.href === undefined) {
      report({
        type: 'annotation-dropped',
        message: degradationMessage['annotation-dropped'](link.cause),
        line: lineNumber,
        ...snippetOf(text),
      })
      return spanMarks
    }

    // Quill splits a link into several runs when part of it carries other
    // formatting, so runs sharing an href share one mark definition.
    const existingKey = linkKeysByHref.get(link.href)

    if (existingKey) {
      spanMarks.push(existingKey)
      return spanMarks
    }

    const markDefinition = marks.link({
      context,
      value: {href: link.href, title: undefined},
    })

    if (!markDefinition) {
      report({
        type: 'annotation-dropped',
        message: degradationMessage['annotation-dropped']('no-annotation'),
        line: lineNumber,
        ...snippetOf(text),
      })
      return spanMarks
    }

    matcherKeys.add(markDefinition._key)
    const dropped = readDroppedFields(markDefinition)

    if (dropped) {
      report({
        type: 'fields-dropped',
        message: degradationMessage['fields-dropped'](
          dropped.keys.map((key) => `\`${key}\``).join(', '),
          dropped.construct,
        ),
        line: lineNumber,
      })
    }

    textBlock.markDefs = [...(textBlock.markDefs ?? []), markDefinition]
    linkKeysByHref.set(link.href, markDefinition._key)
    spanMarks.push(markDefinition._key)

    return spanMarks
  }

  function appendChild(
    textBlock: PortableTextTextBlock,
    child: PortableTextSpan | PortableTextObject,
  ) {
    const previous = textBlock.children.at(-1)

    // A decorator the schema dropped can leave two neighbouring runs with
    // the same marks.
    if (
      isBuiltSpan(previous) &&
      isBuiltSpan(child) &&
      sameMarks(previous.marks, child.marks)
    ) {
      previous.text += child.text
      return
    }

    // A matcher can return a key a sibling already has. Like the editor,
    // every repeat of a key gets a new one.
    const isSiblingKey = (key: string) =>
      textBlock.children.some((sibling) => sibling._key === key)

    if (isSiblingKey(child._key)) {
      let key = keyGenerator()

      while (isSiblingKey(key)) {
        key = keyGenerator()
      }

      textBlock.children.push({...child, _key: key})
      return
    }

    textBlock.children.push(child)
  }

  function isBuiltSpan(child: unknown): child is BuiltSpan {
    return (
      typeof child === 'object' &&
      child !== null &&
      builtSpans.has(child as BuiltSpan)
    )
  }
}

/**
 * A span the conversion built. Its `_type` is the schema's span name, which
 * `PortableTextSpan` narrows to `'span'`.
 */
type BuiltSpan = {
  _type: string
  _key: string
  text: string
  marks: Array<string>
}

type Embed =
  | {kind: 'mention' | 'channel'; value: {id: string; text: string}}
  | {kind: 'broadcast'; value: {text: string}}
  | {kind: 'emoji'; value: {name: string; text: string}}
  | {kind: 'unknown'; value: Record<string, unknown>}

/**
 * Slack writes mentions, channel links and broadcasts (`@here`,
 * `@channel`) as text runs carrying a `slackmention` attribute, and emoji
 * as `slackemoji` embed inserts holding the colon code in `text`.
 * `mention: false` marks a channel, and the id prefix tells a user (`U`,
 * `W`) from a broadcast (`BK`). Any other prefix, such as a user group, is
 * a mention no matcher sees.
 */
function readEmbed(item: DeltaItem): Embed | undefined {
  if (item.type === 'embed') {
    const emoji = item.embed['slackemoji']

    if (!isRecord(emoji) || typeof emoji['text'] !== 'string') {
      return {kind: 'unknown', value: item.embed}
    }

    return {
      kind: 'emoji',
      value: {name: emoji['text'].replace(/^:|:$/g, ''), text: emoji['text']},
    }
  }

  const mention = item.attributes['slackmention']

  if (!isRecord(mention)) {
    return undefined
  }

  const id = typeof mention['id'] === 'string' ? mention['id'] : ''

  if (mention['mention'] === false) {
    return {kind: 'channel', value: {id, text: item.text}}
  }

  if (id.startsWith('BK')) {
    return {kind: 'broadcast', value: {text: item.text}}
  }

  return {kind: 'mention', value: {id, text: item.text}}
}

function readLink(
  attributes: DeltaAttributes,
):
  | {href: string; cause?: undefined}
  | {href: undefined; cause: 'missing-url' | 'unsafe-url'}
  | undefined {
  const slug = attributes['slackslug']
  const candidate =
    attributes['link'] !== undefined
      ? attributes['link']
      : isRecord(slug) && slug['type'] === 'link'
        ? slug['url']
        : undefined

  if (candidate === undefined) {
    return undefined
  }

  if (typeof candidate !== 'string' || candidate.trim() === '') {
    return {href: undefined, cause: 'missing-url'}
  }

  const href = candidate.trim()

  if (isUnsafeUrl(href)) {
    return {href: undefined, cause: 'unsafe-url'}
  }

  return {href}
}

function listKindOf(
  attributes: DeltaAttributes,
): 'bullet' | 'number' | undefined {
  switch (attributes['list']) {
    case 'bullet':
      return 'bullet'
    case 'ordered':
      return 'number'
    default:
      return undefined
  }
}

function findCodeBlockRunEnd(lines: Array<DeltaLine>, start: number): number {
  let end = start

  while (end < lines.length && lines[end]!.attributes['code-block']) {
    end++
  }

  return end
}

function isUserId(id: string): boolean {
  return id.startsWith('U') || id.startsWith('W')
}

function snippetOf(text: string): {snippet?: string} {
  const snippet = truncateSnippet(text)

  return snippet === undefined ? {} : {snippet}
}

function sameMarks(a: Array<string>, b: Array<string>): boolean {
  return a.length === b.length && a.every((mark, index) => mark === b[index])
}

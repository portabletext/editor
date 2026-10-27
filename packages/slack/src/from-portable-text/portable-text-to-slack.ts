import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextObject,
  type PortableTextTextBlock,
  type Schema,
} from '@portabletext/schema'
import {codeLinesSchema, defaultCodeLineStyle} from '../code-lines-schema'
import {defaultSchema} from '../default-schema'
import {buildDegradationMessage, truncateSnippet} from '../degradation-report'
import {isUnsafeUrl} from '../unsafe-url'
import {serializeDegradationMessage} from './degradation-messages'

/**
 * The classification of a lossy conversion encountered while converting
 * Portable Text to Slack's clipboard format: a construct Slack's message
 * box can't show, so the conversion wrote a lossier representation.
 *
 * @public
 */
export type SerializeDegradationType =
  | 'annotation-dropped'
  | 'decorator-dropped'
  | 'style-fallback'
  | 'list-item-fallback'
  | 'object-to-text'
  | 'object-dropped'

/**
 * Reports a single lossy conversion, in document order. `path` addresses
 * the node the loss occurred on, read from the top-level `blocks` array
 * down: an array position is `{_key: node._key}` when the node has a
 * `_key`, the numeric index otherwise. `snippet` is the offending text,
 * truncated to 40 characters with an ellipsis, present whenever there's a
 * specific piece of text to quote. `message` is human-readable and may
 * change between releases. Match on `type`, not `message`. The set of
 * `type` values grows in minor releases as new degradation sites report,
 * so compare against the values you handle rather than switching
 * exhaustively.
 *
 * @public
 */
export type SerializeDegradation = {
  type: SerializeDegradationType
  message: string
  path: Array<string | number | {_key: string}>
  snippet?: string
}

/**
 * Matcher function for writing a Portable Text inline object to Slack.
 * Return `{mention: {id, text}}` to write a user mention,
 * `{channel: {id, text}}` to write a channel link, `{emoji: {text}}` to
 * write an emoji from its colon code, such as `:foo:`, a string to write
 * as plain text, or `undefined` to remove the object, reported as an
 * `object-dropped` degradation.
 *
 * @public
 */
export type InlineObjectMatcher<
  TValue extends PortableTextObject = PortableTextObject,
> = ({
  context,
  value,
}: {
  context: {schema: Schema | undefined}
  value: TValue
}) =>
  | {mention: {id: string; text: string}}
  | {channel: {id: string; text: string}}
  | {emoji: {text: string}}
  | string
  | undefined

type PortableTextToSlackOptions = {
  /**
   * Compiled schema that gates the `code` block object: a block of `_type`
   * `code` is written as a Slack code block only when the schema declares
   * a `code` block object, and is treated like any other object otherwise.
   * Its code lines are then the text blocks of the block type the `lines`
   * field declares. Omitted, every `code` block is written as a Slack code
   * block.
   */
  schema?: Schema
  /**
   * Inline object matchers keyed by `_type`. An inline object without a
   * matcher is removed and reported. Inline objects in a code block's
   * `lines` never reach a matcher, since a Slack code line is plain text.
   */
  types?: Record<string, InlineObjectMatcher<any>>
  /**
   * Called at most once, after the conversion has walked every block, only
   * when at least one construct degraded. Observe every degradation via
   * `report.degradations`, in document order, and the same degradations
   * grouped and sorted by block via `report.message`. Enforce against
   * lossy output by throwing your own error from inside the callback. The
   * throw propagates out of `portableTextToSlack`.
   */
  onDegradation?: (report: {
    degradations: Array<SerializeDegradation>
    message: string
  }) => void
}

type DeltaOp = {
  insert: string | Record<string, unknown>
  attributes?: Record<string, unknown>
}

type PathSegment = SerializeDegradation['path'][number]

type Line = {
  ops: Array<DeltaOp>
  attributes: Record<string, unknown>
  text: string
  prefix: {
    kind: 'bullet' | 'number' | 'blockquote' | 'code' | 'none'
    level: number
  }
}

const decoratorAttributes: Record<string, string> = {
  'strong': 'bold',
  'em': 'italic',
  'strike-through': 'strike',
  'code': 'code',
}

/**
 * Converts Portable Text blocks to the two payloads Slack reads from the
 * clipboard: `texty`, the `slack/texty` Quill Delta, and `text`, a
 * `text/plain` fallback that writes lists, quotes and code blocks out as
 * text.
 *
 * @public
 */
export function portableTextToSlack(
  blocks: Array<PortableTextBlock>,
  options?: PortableTextToSlackOptions,
): {texty: string; text: string} {
  const degradations: Array<SerializeDegradation & {position: number}> = []
  const lines: Array<Line> = []
  // Paste writes spans and text blocks with the default schema's names
  // when no schema is given, so copy reads them back by the same names.
  const guardContext = {schema: options?.schema ?? defaultSchema}
  const linesSchema = options?.schema
    ? codeLinesSchema(options.schema)
    : undefined
  const isCodeLine = (value: unknown): value is PortableTextTextBlock =>
    options?.schema
      ? linesSchema !== undefined && isTextBlock({schema: linesSchema}, value)
      : isTextBlock(guardContext, value)
  const defaultLineStyle = linesSchema
    ? defaultCodeLineStyle(linesSchema)
    : 'normal'

  const types = options?.types ?? {}
  const matchInlineObject = (child: PortableTextObject) =>
    Object.hasOwn(types, child._type)
      ? types[child._type]?.({
          context: {schema: options?.schema},
          value: child,
        })
      : undefined

  blocks.forEach((block, index) => {
    const topSegment: PathSegment =
      typeof block._key === 'string' ? {_key: block._key} : index
    const report = (
      degradation: Omit<SerializeDegradation, 'path' | 'snippet'> & {
        path: Array<PathSegment>
        snippet: string | undefined
      },
    ) => {
      const {snippet, ...rest} = degradation
      degradations.push({
        ...rest,
        path: [topSegment, ...degradation.path],
        ...(snippet === undefined ? {} : {snippet}),
        position: index,
      })
    }

    if (isTextBlock(guardContext, block)) {
      lines.push(
        ...textBlockLines(block, guardContext, matchInlineObject, report),
      )
      return
    }

    if (isCodeBlock(block, options?.schema)) {
      lines.push(
        ...codeBlockLines(
          block,
          guardContext,
          isCodeLine,
          defaultLineStyle,
          report,
        ),
      )
      return
    }

    const nestedText = collectNestedText(block, guardContext)

    if (nestedText.length === 0) {
      report({
        type: 'object-dropped',
        message: serializeDegradationMessage['object-dropped'](block._type),
        path: [],
        snippet: undefined,
      })
      return
    }

    report({
      type: 'object-to-text',
      message: serializeDegradationMessage['object-to-text'](block._type),
      path: [],
      snippet: truncateSnippet(nestedText.join(' ')),
    })

    for (const text of nestedText) {
      lines.push(plainLine([{insert: text}], text))
    }
  })

  if (degradations.length > 0 && options?.onDegradation) {
    options.onDegradation({
      degradations: degradations.map(
        ({position: _position, ...degradation}) => degradation,
      ),
      message: buildDegradationMessage(
        'Portable Text could not be serialized to Slack without loss:',
        'block',
        degradations,
      ),
    })
  }

  return {
    texty: JSON.stringify({ops: composeOps(lines)}),
    text: plainTextOf(lines),
  }
}

function textBlockLines(
  block: PortableTextTextBlock,
  guardContext: {schema: Schema},
  matchInlineObject: (
    child: PortableTextObject,
  ) => ReturnType<InlineObjectMatcher>,
  report: (degradation: {
    type: SerializeDegradationType
    message: string
    path: Array<PathSegment>
    snippet: string | undefined
  }) => void,
): Array<Line> {
  const attributes: Record<string, unknown> = {}
  const style = block.style ?? 'normal'
  const isHeading = /^h[1-6]$/.test(style)
  let prefix: Line['prefix'] = {kind: 'none', level: 0}

  if (style === 'blockquote') {
    attributes['blockquote'] = true
    prefix = {kind: 'blockquote', level: 0}
  } else if (style !== 'normal' && !isHeading) {
    report({
      type: 'style-fallback',
      message: serializeDegradationMessage['style-fallback'](style),
      path: [],
      snippet: truncateSnippet(blockText(block, guardContext)),
    })
  }

  if (block.listItem !== undefined) {
    const level = Math.max(1, block.level ?? 1)

    if (block.listItem !== 'bullet' && block.listItem !== 'number') {
      report({
        type: 'list-item-fallback',
        message: serializeDegradationMessage['list-item-fallback'](
          block.listItem,
        ),
        path: [],
        snippet: truncateSnippet(blockText(block, guardContext)),
      })
    }

    attributes['list'] = block.listItem === 'number' ? 'ordered' : 'bullet'
    prefix = {kind: block.listItem === 'number' ? 'number' : 'bullet', level}

    if (level > 1) {
      attributes['indent'] = level - 1
    }
  }

  const markDefs = block.markDefs ?? []
  const lines: Array<Line> = []
  let ops: Array<DeltaOp> = []
  let text = ''

  // A `\n` inside a span ends a Quill line, so the block's line formatting
  // has to repeat on every line it spans.
  const pushText = (
    childText: string,
    textAttributes: Record<string, unknown>,
  ) => {
    childText.split('\n').forEach((segment, segmentIndex) => {
      if (segmentIndex > 0) {
        lines.push({ops, attributes, text, prefix})
        ops = []
        text = ''
      }

      if (segment.length > 0) {
        ops.push(
          Object.keys(textAttributes).length > 0
            ? {insert: segment, attributes: textAttributes}
            : {insert: segment},
        )
        text += segment
      }
    })
  }

  for (const [childIndex, child] of block.children.entries()) {
    const childPath: Array<PathSegment> = [
      'children',
      typeof child._key === 'string' ? {_key: child._key} : childIndex,
    ]

    if (!isSpan(guardContext, child)) {
      const match = matchInlineObject(child)

      if (typeof match === 'string') {
        pushText(match, {})
        continue
      }

      if (match !== undefined && 'mention' in match) {
        const op = mentionOp(match.mention, true)
        ops.push(op)
        text += op.insert
        continue
      }

      if (match !== undefined && 'channel' in match) {
        const op = mentionOp(match.channel, false)
        ops.push(op)
        text += op.insert
        continue
      }

      if (match !== undefined && 'emoji' in match) {
        ops.push({insert: {slackemoji: {text: match.emoji.text}}})
        text += match.emoji.text
        continue
      }

      report({
        type: 'object-dropped',
        message: serializeDegradationMessage['object-dropped'](child._type),
        path: childPath,
        snippet: undefined,
      })
      continue
    }

    const spanAttributes: Record<string, unknown> = isHeading
      ? {bold: true}
      : {}

    for (const mark of child.marks ?? []) {
      const decoratorAttribute = decoratorAttributes[mark]

      if (decoratorAttribute) {
        spanAttributes[decoratorAttribute] = true
        continue
      }

      const markDefinition = markDefs.find(
        (definition) => definition._key === mark,
      )

      if (
        markDefinition?._type === 'link' &&
        typeof markDefinition['href'] === 'string'
      ) {
        if (isUnsafeUrl(markDefinition['href'])) {
          report({
            type: 'annotation-dropped',
            message: serializeDegradationMessage['unsafe-link'],
            path: childPath,
            snippet: truncateSnippet(child.text),
          })
          continue
        }

        spanAttributes['link'] = markDefinition['href']
        continue
      }

      report(
        markDefinition
          ? {
              type: 'annotation-dropped',
              message: serializeDegradationMessage['annotation-dropped'](
                markDefinition._type,
              ),
              path: childPath,
              snippet: truncateSnippet(child.text),
            }
          : {
              type: 'decorator-dropped',
              message: serializeDegradationMessage['decorator-dropped'](mark),
              path: childPath,
              snippet: truncateSnippet(child.text),
            },
      )
    }

    pushText(child.text, spanAttributes)
  }

  if (isHeading) {
    report({
      type: 'style-fallback',
      message: serializeDegradationMessage['style-fallback'](style),
      path: [],
      snippet: truncateSnippet(blockText(block, guardContext)),
    })
  }

  lines.push({ops, attributes, text, prefix})

  return lines
}

/**
 * A Slack code block line is plain text, so every construct a `lines` text
 * block carries besides its span text is reported where it sits, and so is
 * every `lines` entry that isn't a text block.
 */
function codeBlockLines(
  block: PortableTextObject,
  guardContext: {schema: Schema},
  isCodeLine: (value: unknown) => value is PortableTextTextBlock,
  defaultLineStyle: string | undefined,
  report: (degradation: {
    type: SerializeDegradationType
    message: string
    path: Array<PathSegment>
    snippet: string | undefined
  }) => void,
): Array<Line> {
  const lines = block['lines']
  const lineTexts = Array.isArray(lines)
    ? lines.flatMap((line: unknown, index) => {
        const linePath: Array<PathSegment> = [
          'lines',
          isRecord(line) && typeof line['_key'] === 'string'
            ? {_key: line['_key']}
            : index,
        ]

        if (!isCodeLine(line)) {
          report({
            type: 'object-dropped',
            message: serializeDegradationMessage['object-dropped'](
              isRecord(line) && typeof line['_type'] === 'string'
                ? line['_type']
                : typeof line,
            ),
            path: linePath,
            snippet: undefined,
          })
          return []
        }
        const text = blockText(line, guardContext)
        const snippet = truncateSnippet(text)

        if (line.style !== undefined && line.style !== defaultLineStyle) {
          report({
            type: 'style-fallback',
            message: serializeDegradationMessage['code-line-style'](line.style),
            path: linePath,
            snippet,
          })
        }

        if (line.listItem !== undefined) {
          report({
            type: 'list-item-fallback',
            message: serializeDegradationMessage['code-line-list-item'](
              line.listItem,
            ),
            path: linePath,
            snippet,
          })
        }

        line.children.forEach((child, childIndex) => {
          const childPath: Array<PathSegment> = [
            ...linePath,
            'children',
            typeof child._key === 'string' ? {_key: child._key} : childIndex,
          ]

          if (!isSpan(guardContext, child)) {
            report({
              type: 'object-dropped',
              message: serializeDegradationMessage['object-dropped'](
                child._type,
              ),
              path: childPath,
              snippet: undefined,
            })
            return
          }

          for (const mark of child.marks ?? []) {
            const markDefinition = line.markDefs?.find(
              (definition) => definition._key === mark,
            )

            report(
              markDefinition
                ? {
                    type: 'annotation-dropped',
                    message: serializeDegradationMessage[
                      'code-line-annotation'
                    ](markDefinition._type),
                    path: childPath,
                    snippet: truncateSnippet(child.text),
                  }
                : {
                    type: 'decorator-dropped',
                    message:
                      serializeDegradationMessage['code-line-decorator'](mark),
                    path: childPath,
                    snippet: truncateSnippet(child.text),
                  },
            )
          }
        })

        return [text]
      })
    : typeof block['code'] === 'string'
      ? block['code'].split('\n')
      : []

  // An empty `lines` array writes one empty line, as an empty `code` string
  // does. A `\n` inside a line's text ends a Quill line, so each part needs
  // the `code-block` attribute too.
  return (lineTexts.length > 0 ? lineTexts : [''])
    .flatMap((lineText) => lineText.split('\n'))
    .map((text) => ({
      ops: text.length > 0 ? [{insert: text}] : [],
      attributes: {'code-block': true},
      text,
      prefix: {kind: 'code', level: 0},
    }))
}

/**
 * Slack writes a user mention or a channel link as a text run carrying a
 * `slackmention` attribute, `mention: false` marking a channel. A `\n` in
 * the run would end the Quill line without the line's formatting, so line
 * breaks become spaces.
 */
function mentionOp(
  value: {id: string; text: string},
  mention: boolean,
): DeltaOp & {insert: string} {
  const label = value.text.replace(/\r\n|[\r\n]/g, ' ')

  return {
    attributes: {
      slackmention: {
        id: value.id,
        label,
        mention,
        unverified: false,
      },
    },
    insert: label,
  }
}

function plainLine(ops: Array<DeltaOp>, text: string): Line {
  return {ops, attributes: {}, text, prefix: {kind: 'none', level: 0}}
}

/**
 * Quill ends each line with a `\n` carrying the line's formatting and
 * merges neighbouring inserts with equal attributes, which is the form
 * Slack writes too.
 */
function composeOps(lines: Array<Line>): Array<DeltaOp> {
  const ops: Array<DeltaOp> = []

  const push = (op: DeltaOp) => {
    const previous = ops.at(-1)

    // Each `slackmention` run is one mention, so two equal neighbours
    // stay apart.
    if (
      previous &&
      typeof previous.insert === 'string' &&
      typeof op.insert === 'string' &&
      op.attributes?.['slackmention'] === undefined &&
      JSON.stringify(previous.attributes ?? {}) ===
        JSON.stringify(op.attributes ?? {})
    ) {
      previous.insert += op.insert
      return
    }

    ops.push({...op})
  }

  for (const line of lines) {
    for (const op of line.ops) {
      push(op)
    }

    push(
      Object.keys(line.attributes).length > 0
        ? {insert: '\n', attributes: line.attributes}
        : {insert: '\n'},
    )
  }

  return ops
}

function plainTextOf(lines: Array<Line>): string {
  const output: Array<string> = []
  const numberCounters: Array<number> = []

  lines.forEach((line, index) => {
    const previous = lines[index - 1]

    if (line.prefix.kind === 'code' && previous?.prefix.kind !== 'code') {
      output.push('```')
    }

    if (line.prefix.kind === 'number') {
      numberCounters.length = line.prefix.level
      numberCounters[line.prefix.level - 1] =
        (numberCounters[line.prefix.level - 1] ?? 0) + 1
    } else if (line.prefix.kind === 'bullet') {
      numberCounters.length = line.prefix.level - 1
    } else {
      numberCounters.length = 0
    }

    const indent = '    '.repeat(Math.max(0, line.prefix.level - 1))

    switch (line.prefix.kind) {
      case 'bullet':
        output.push(`${indent}• ${line.text}`)
        break
      case 'number':
        output.push(
          `${indent}${numberCounters[line.prefix.level - 1]}. ${line.text}`,
        )
        break
      case 'blockquote':
        output.push(`> ${line.text}`)
        break
      default:
        output.push(line.text)
    }

    if (
      line.prefix.kind === 'code' &&
      lines[index + 1]?.prefix.kind !== 'code'
    ) {
      output.push('```')
    }
  })

  return output.join('\n')
}

/**
 * The text an object Slack can't show still carries: every text block
 * nested in its fields, such as a table's cells or a callout's content,
 * one line each, a `src` or `url` it points at, and a `code` string.
 */
function collectNestedText(
  value: unknown,
  guardContext: {schema: Schema},
): Array<string> {
  const texts: Array<string> = []

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }

    if (typeof node !== 'object' || node === null) {
      return
    }

    // A custom object can hold spans directly, the way a text block does.
    const children = (node as {children?: unknown}).children

    if (
      isTextBlock(guardContext, node) ||
      (Array.isArray(children) &&
        children.some((child) => isSpan(guardContext, child)))
    ) {
      const text = blockText(node as PortableTextTextBlock, guardContext)

      if (text.length > 0) {
        texts.push(text)
      }
      return
    }

    for (const [field, fieldValue] of Object.entries(node)) {
      if (!textFields.includes(field)) {
        visit(fieldValue)
        continue
      }

      if (typeof fieldValue === 'string' && fieldValue.length > 0) {
        texts.push(...fieldValue.split('\n'))
      }
    }
  }

  visit(value)

  return texts
}

const textFields = ['src', 'url', 'code']

function isCodeBlock(
  block: PortableTextObject,
  schema: Schema | undefined,
): boolean {
  if (block._type !== 'code') {
    return false
  }

  if (!Array.isArray(block['lines']) && typeof block['code'] !== 'string') {
    return false
  }

  return schema
    ? schema.blockObjects.some((blockObject) => blockObject.name === 'code')
    : true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function blockText(
  block: PortableTextTextBlock,
  guardContext: {schema: Schema},
): string {
  return block.children
    .map((child) => (isSpan(guardContext, child) ? child.text : ''))
    .join('')
}

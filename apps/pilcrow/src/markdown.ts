/**
 * Pilcrow's markdown round-trip configuration.
 *
 * Shapes the parser/serializer to round-trip cleanly against pilcrow's
 * schema. The default `@portabletext/markdown` matchers produce shapes
 * that match the editor's default schema; pilcrow uses different field
 * names and a richer code-block structure so we wire matchers per type.
 *
 *   - code: parser emits `{language, code: string}` flat. Pilcrow stores
 *     code as `code-block.lines: textBlock[]` where each line is its own
 *     block. We split the source on newlines and synthesize one block
 *     per line so caret navigation works line-by-line.
 *
 *   - table: parser emits `cells[i].value`. Pilcrow's cell schema uses
 *     `content`. Rename on the way in.
 *
 *   - horizontalRule: parser emits type name `horizontalRule`. Pilcrow
 *     uses `horizontal-rule` to mirror the markdown spec wording.
 *
 *   - callout: parser stamps `style: 'blockquote'` on every text block
 *     inside an alert because GFM alerts reuse blockquote syntax. The
 *     blockquote rendering would stack inside the callout chrome, so we
 *     strip the style back to normal.
 */

import type {ObjectMatcher} from '@portabletext/markdown'
import type {PortableTextBlock} from '@portabletext/schema'

type AnyValue = Record<string, unknown>

const codeMatcher: ObjectMatcher<AnyValue> = ({context, value, isInline}) => {
  if (isInline) {
    return undefined
  }
  const code = typeof value.code === 'string' ? value.code : ''
  const sourceLines = code.split('\n')
  if (sourceLines.length > 0 && sourceLines[sourceLines.length - 1] === '') {
    sourceLines.pop()
  }
  const lines = sourceLines.map((text) => ({
    _type: 'block',
    _key: context.keyGenerator(),
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: context.keyGenerator(),
        text,
        marks: [],
      },
    ],
    markDefs: [],
  }))
  const language =
    typeof value.language === 'string' ? value.language : undefined
  return {
    _type: 'code-block',
    _key: context.keyGenerator(),
    ...(language ? {language} : {}),
    lines,
  }
}

const tableMatcher: ObjectMatcher<AnyValue> = ({context, value}) => {
  const rows = (
    value.rows as Array<{
      _key: string
      cells: Array<{_key: string; value: unknown}>
    }>
  ).map((row) => ({
    _type: 'row',
    _key: row._key,
    cells: row.cells.map((cell) => ({
      _type: 'cell',
      _key: cell._key,
      content: cell.value,
    })),
  }))
  return {
    _type: 'table',
    _key: context.keyGenerator(),
    ...(value.headerRows !== undefined ? {headerRows: value.headerRows} : {}),
    rows,
  }
}

const horizontalRuleMatcher: ObjectMatcher<AnyValue> = ({context}) => ({
  _type: 'horizontal-rule',
  _key: context.keyGenerator(),
})

const calloutMatcher: ObjectMatcher<AnyValue> = ({context, value}) => ({
  _type: 'callout',
  _key: context.keyGenerator(),
  tone: value.tone,
  content: (value.content as PortableTextBlock[]).map((block) =>
    block._type === 'block' &&
    (block as {style?: string}).style === 'blockquote'
      ? {...block, style: 'normal'}
      : block,
  ),
})

/**
 * Matchers wired into `markdownToPortableText({types: ...})`. Pass the
 * editor's `schema` + `keyGenerator` alongside.
 */
export const pilcrowMatchers = {
  code: codeMatcher,
  table: tableMatcher,
  horizontalRule: horizontalRuleMatcher,
  callout: calloutMatcher,
}

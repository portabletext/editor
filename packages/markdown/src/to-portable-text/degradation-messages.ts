import type {DegradationType} from './markdown-to-portable-text'

/**
 * The full catalog of `Degradation['message']` prose, one entry per
 * `DegradationType`, grouped and ordered to match the union in
 * `markdown-to-portable-text.ts`. Kept apart from the conversion's
 * formatting mechanism (`buildDegradationMessage` and friends, in
 * `markdown-to-portable-text.ts`) so the catalog reads as one list instead
 * of being scattered across the walk that triggers it.
 *
 * `satisfies Record<DegradationType, ...>` makes the catalog exhaustive: a
 * new `DegradationType` member without a matching entry here is a type
 * error, caught at compile time instead of surfacing as an `undefined`
 * message at runtime.
 *
 * Style rule for every message here: a declarative statement of what
 * happened, never a verb that can parse as an imperative. A verb whose past
 * and imperative forms coincide ("split", "set", "cut", ...) never leads a
 * message, since the reader can't tell "X was split" from an instruction to
 * split X. State the effect first, the cause second, naming the schema
 * declaration that's missing.
 *
 * Not exported from the package entry: `message` is unstable by contract
 * (see `Degradation['message']`'s doc comment), so the catalog producing it
 * stays internal too.
 */
export const degradationMessage = {
  'decorator-dropped': (
    decorator: 'code' | 'strong' | 'em' | 'strikeThrough',
  ): string => {
    switch (decorator) {
      case 'code':
        return 'Removed inline-code formatting, kept the text: the schema has no `code` decorator'
      case 'strong':
        return 'Removed bold formatting, kept the text: the schema has no `strong` decorator'
      case 'em':
        return 'Removed italic formatting, kept the text: the schema has no `em` decorator'
      case 'strikeThrough':
        return 'Removed strikethrough formatting, kept the text: the schema has no `strike-through` decorator'
    }
  },

  'annotation-dropped': (cause: 'missing-url' | 'no-annotation'): string =>
    cause === 'missing-url'
      ? 'Removed a link that has no URL, kept its text'
      : 'Removed the link, kept its text: the schema has no `link` annotation',

  'style-fallback': (name: string): string => {
    if (/^h[1-6]$/.test(name)) {
      const hashes = '#'.repeat(Number(name.slice(1)))
      return `\`${hashes}\` heading became a normal paragraph: the schema has no \`${name}\` style`
    }

    if (name === 'blockquote') {
      return 'Blockquote became normal paragraphs: the schema has no `blockquote` style'
    }

    return `Fell back to \`normal\` style: \`${name}\` not in schema`
  },

  'list-flattened': (kind: 'bullet' | 'number'): string => {
    const label = kind === 'number' ? 'Numbered' : 'Bullet'
    return `${label} list became plain paragraphs: the schema has no \`${kind}\` list`
  },

  'task-checkbox-stripped': (checked: boolean): string => {
    const checkbox = checked ? '[x]' : '[ ]'
    return `Removed the \`${checkbox}\` checkbox, kept a plain list item: the schema has no \`task\` list`
  },

  'table-flattened':
    'Table became plain text blocks, rows and columns lost: the schema has no `table` block object',

  'code-block-to-text': (language: string | undefined): string =>
    language
      ? `\`${language}\` code block became plain text: the schema has no \`code\` block object`
      : `Code block became plain text: the schema has no \`code\` block object`,

  'horizontal-rule-to-text':
    'Horizontal rule became the text `---`: the schema has no `horizontal-rule` block object',

  'html-block-to-text':
    'HTML block became plain text: the schema has no `html` block object',

  'inline-html-dropped':
    'Removed inline HTML tags, kept nothing: `html.inline` is `skip` (the default)',

  'image-block-to-inline': (cause: 'table-cell' | 'no-block-image'): string =>
    cause === 'table-cell'
      ? "The image became inline: a table cell can't hold a block-level `image`"
      : 'The image became inline: the schema has no block-level `image`',

  'image-inline-to-block':
    'The image became its own block, splitting the paragraph: the schema has no inline `image`',

  'image-to-text':
    'Image became its markdown source as plain text: the schema has no `image` object',

  'callout-fallback': (calloutType: string, style: string): string =>
    `\`[!${calloutType.toUpperCase()}]\` callout became ${style}-styled text: the schema has no \`callout\` block object`,

  'fields-dropped': (names: string, construct: string): string =>
    `Dropped ${names} from \`${construct}\`: not in the schema's \`${construct}\` fields`,

  'object-carrier-invalid': (
    kind: 'fence' | 'code-span',
    payload: string,
  ): string =>
    kind === 'fence'
      ? `\`json:object\` fence fell back to a code block: ${describeObjectCarrierFailure(payload)}`
      : `\`json:object\`-tagged code span fell back to a plain code span: ${describeObjectCarrierFailure(payload)}`,
} satisfies Record<DegradationType, string | ((...args: never[]) => string)>

/**
 * Names why a `json:object` payload failed to parse as an object carrier:
 * a payload that isn't a JSON object at all reads differently from one
 * that is but has no usable `_type`.
 */
function describeObjectCarrierFailure(payload: string): string {
  let parsed: unknown

  try {
    parsed = JSON.parse(payload)
  } catch {
    return 'the payload is not valid JSON'
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return 'the payload is not a JSON object'
  }

  return 'the payload has no string `_type`'
}

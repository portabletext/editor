import type {SerializeDegradationType} from './portable-text-to-slack'

/**
 * The full catalog of `SerializeDegradation['message']` prose, one entry
 * per `SerializeDegradationType`. Not exported from the package entry,
 * since `message` is unstable by contract.
 */
export const serializeDegradationMessage = {
  'annotation-dropped': (markType: string): string =>
    `Removed the \`${markType}\` annotation, kept its text: Slack only shows links`,

  'unsafe-link':
    'Removed a link with a `javascript:`, `vbscript:`, `file:` or `data:` URL, kept its text',

  'code-line-style': (style: string): string =>
    `Dropped the \`${style}\` style, kept the text: a Slack code block has no formatting`,

  'code-line-list-item': (listItem: string): string =>
    `Dropped the \`${listItem}\` list item, kept the text: a Slack code block has no formatting`,

  'code-line-decorator': (markType: string): string =>
    `Removed the \`${markType}\` decorator, kept the text: a Slack code block has no formatting`,

  'code-line-annotation': (markType: string): string =>
    `Removed the \`${markType}\` annotation, kept its text: a Slack code block has no formatting`,

  'decorator-dropped': (markType: string): string =>
    `Removed the \`${markType}\` decorator, kept the text: Slack has no matching formatting`,

  'style-fallback': (style: string): string =>
    /^h[1-6]$/.test(style)
      ? `The \`${style}\` heading became a bold line: Slack has no headings`
      : `Dropped the \`${style}\` style, kept the text: Slack has no matching formatting`,

  'list-item-fallback': (listItem: string): string =>
    `Wrote the \`${listItem}\` list item as a bullet, kept the text: Slack only has bullet and numbered lists`,

  'object-to-text': (objectType: string): string =>
    `The \`${objectType}\` object became plain text: Slack can't show it`,

  'object-dropped': (objectType: string): string =>
    `Removed the \`${objectType}\` object: Slack can't show it and it holds no text`,
} satisfies Record<
  SerializeDegradationType | `${'unsafe' | 'code-line'}-${string}`,
  string | ((...args: never[]) => string)
>

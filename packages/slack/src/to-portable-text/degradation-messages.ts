import type {DegradationType} from './slack-to-portable-text'

/**
 * The full catalog of `Degradation['message']` prose, one entry per
 * `DegradationType` and per context that changes its cause. Mirrors `packages/markdown/src/to-portable-text/degradation-messages.ts`:
 * a declarative statement of what happened, the effect first and the
 * missing schema declaration second. Not exported from the package entry,
 * since `message` is unstable by contract.
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

  'decorator-dropped-in-code-block': (
    decorator: 'code' | 'strong' | 'em' | 'strikeThrough',
  ): string => {
    switch (decorator) {
      case 'code':
        return 'Removed inline-code formatting, kept the text: a code block holds plain text'
      case 'strong':
        return 'Removed bold formatting, kept the text: a code block holds plain text'
      case 'em':
        return 'Removed italic formatting, kept the text: a code block holds plain text'
      case 'strikeThrough':
        return 'Removed strikethrough formatting, kept the text: a code block holds plain text'
    }
  },

  'decorator-dropped-from-embed': (
    decorator: 'code' | 'strong' | 'em' | 'strikeThrough',
  ): string => {
    switch (decorator) {
      case 'code':
        return 'Removed inline-code formatting from an embed: the inline object its matcher built carries no marks'
      case 'strong':
        return 'Removed bold formatting from an embed: the inline object its matcher built carries no marks'
      case 'em':
        return 'Removed italic formatting from an embed: the inline object its matcher built carries no marks'
      case 'strikeThrough':
        return 'Removed strikethrough formatting from an embed: the inline object its matcher built carries no marks'
    }
  },

  'annotation-dropped': (
    cause: 'missing-url' | 'unsafe-url' | 'no-annotation',
  ): string => {
    switch (cause) {
      case 'missing-url':
        return 'Removed a link that has no URL, kept its text'
      case 'unsafe-url':
        return 'Removed a link with a `javascript:`, `vbscript:`, `file:` or `data:` URL, kept its text'
      case 'no-annotation':
        return 'Removed the link, kept its text: the schema has no `link` annotation'
    }
  },

  'annotation-dropped-in-code-block':
    'Removed the link, kept its text: a code block holds plain text',

  'annotation-dropped-from-embed':
    'Removed the link from an embed: the inline object its matcher built carries no marks',

  'style-fallback': (name: string): string =>
    name === 'blockquote'
      ? 'Blockquote became normal paragraphs: the schema has no `blockquote` style'
      : `Fell back to \`normal\` style: \`${name}\` not in schema`,

  'list-flattened': (kind: 'bullet' | 'number'): string =>
    kind === 'number'
      ? 'Numbered list became plain paragraphs: the schema has no `number` list'
      : 'Bullet list became plain paragraphs: the schema has no `bullet` list',

  'code-block-to-text':
    'Code block became plain text: the schema has no `code` block object with a `lines` field of text blocks or a `code` string field',

  'fields-dropped': (names: string, construct: string): string =>
    `Dropped ${names} from \`${construct}\`: not in the schema's \`${construct}\` fields`,

  'embed-to-text': (
    embed: 'mention' | 'group-mention' | 'channel' | 'emoji',
  ): string => {
    switch (embed) {
      case 'mention':
        return 'Mention became its display text: no `embeds.mention` matcher built it'
      case 'group-mention':
        return 'Mention became its display text: `embeds.mention` only receives user mentions'
      case 'channel':
        return 'Channel link became its display text: no `embeds.channel` matcher built it'
      case 'emoji':
        return 'Emoji became its display text: no `embeds.emoji` matcher built it'
    }
  },

  'embed-to-text-in-code-block': (
    embed: 'mention' | 'group-mention' | 'channel' | 'emoji',
  ): string => {
    switch (embed) {
      case 'mention':
      case 'group-mention':
        return 'Mention became its display text: a code block holds plain text'
      case 'channel':
        return 'Channel link became its display text: a code block holds plain text'
      case 'emoji':
        return 'Emoji became its display text: a code block holds plain text'
    }
  },

  'embed-dropped':
    'Removed an embed with no display text: the conversion does not recognize its shape',
} satisfies Record<
  DegradationType | `${string}-${'in-code-block' | 'from-embed'}`,
  string | ((...args: never[]) => string)
>

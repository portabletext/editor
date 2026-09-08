import {defineSchema, type BlockObjectDefinition} from '@portabletext/editor'
import * as markdownPackage from '@portabletext/markdown'
import type {
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'
import {compileSchema, type Schema} from '@portabletext/schema'
import {createKeyGenerator} from '../key-generator'

export type ToPortableTextOptions = NonNullable<
  Parameters<typeof markdownToPortableText>[1]
>
export type ToMarkdownOptions = NonNullable<
  Parameters<typeof portableTextToMarkdown>[1]
>

export type CompiledCodeOptions = {
  toPortableText: Partial<ToPortableTextOptions>
  toMarkdown: Partial<ToMarkdownOptions>
  schemaTypes?: {
    blockObjects?: ReadonlyArray<BlockObjectDefinition>
  }
}

export const emptyCodeOptions: CompiledCodeOptions = {
  toPortableText: {},
  toMarkdown: {},
}

const codePaneHelpers = {
  ...markdownPackage,
  defineSchema,
  compileSchema,
  createKeyGenerator,
}

/**
 * Evaluates the options pane source. The contract: the source is an
 * expression (usually an object literal) evaluated with `helpers` in
 * scope, optionally a function of `helpers` returning the options object,
 * shaped `{toPortableText?, toMarkdown?, schemaTypes?}`.
 */
export function evaluateOptionsSource(source: string): CompiledCodeOptions {
  const factory = new Function('helpers', `return (${source})`) as (
    helpers: typeof codePaneHelpers,
  ) => unknown
  const result = factory(codePaneHelpers)
  const options =
    typeof result === 'function'
      ? (result as (helpers: typeof codePaneHelpers) => unknown)(
          codePaneHelpers,
        )
      : result

  if (options === null || typeof options !== 'object') {
    throw new Error(
      'Options source must evaluate to an object (or a function of `helpers` returning one).',
    )
  }

  const candidate = options as {
    toPortableText?: Partial<ToPortableTextOptions>
    toMarkdown?: Partial<ToMarkdownOptions>
    schemaTypes?: {blockObjects?: ReadonlyArray<BlockObjectDefinition>}
  }

  return {
    toPortableText: candidate.toPortableText ?? {},
    toMarkdown: candidate.toMarkdown ?? {},
    schemaTypes: candidate.schemaTypes,
  }
}

export function buildToPortableTextOptions(args: {
  schema: Schema
  htmlInlineMode: 'skip' | 'text'
  code: CompiledCodeOptions
}): ToPortableTextOptions {
  return {
    schema: args.schema,
    html: {inline: args.htmlInlineMode},
    ...args.code.toPortableText,
  }
}

export function buildToMarkdownOptions(
  code: CompiledCodeOptions,
): ToMarkdownOptions {
  return {...code.toMarkdown}
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

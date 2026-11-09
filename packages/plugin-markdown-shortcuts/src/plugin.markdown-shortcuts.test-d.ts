import {test} from 'vitest'
import type {MarkdownShortcutsPluginProps} from './plugin.markdown-shortcuts'

type Args<T extends (...args: any) => any> = Parameters<T>[0]

test('config callbacks take no deprecated `schema` argument', () => {
  const blockquoteStyle = {} as Args<
    NonNullable<MarkdownShortcutsPluginProps['blockquoteStyle']>
  >
  const defaultStyle = {} as Args<
    NonNullable<MarkdownShortcutsPluginProps['defaultStyle']>
  >
  const headingStyle = {} as Args<
    NonNullable<MarkdownShortcutsPluginProps['headingStyle']>
  >
  const unorderedList = {} as Args<
    NonNullable<MarkdownShortcutsPluginProps['unorderedList']>
  >
  const orderedList = {} as Args<
    NonNullable<MarkdownShortcutsPluginProps['orderedList']>
  >
  const boldDecorator = {} as Args<
    NonNullable<MarkdownShortcutsPluginProps['boldDecorator']>
  >
  const codeDecorator = {} as Args<
    NonNullable<MarkdownShortcutsPluginProps['codeDecorator']>
  >
  const italicDecorator = {} as Args<
    NonNullable<MarkdownShortcutsPluginProps['italicDecorator']>
  >
  const strikeThroughDecorator = {} as Args<
    NonNullable<MarkdownShortcutsPluginProps['strikeThroughDecorator']>
  >

  // @ts-expect-error `schema` was removed, use `context.schema`
  blockquoteStyle.schema
  // @ts-expect-error `schema` was removed, use `context.schema`
  defaultStyle.schema
  // @ts-expect-error `schema` was removed, use `context.schema`
  headingStyle.schema
  // @ts-expect-error `level` was removed, use `props.level`
  headingStyle.level
  // @ts-expect-error `schema` was removed, use `context.schema`
  unorderedList.schema
  // @ts-expect-error `schema` was removed, use `context.schema`
  orderedList.schema
  // @ts-expect-error `schema` was removed, use `context.schema`
  boldDecorator.schema
  // @ts-expect-error `schema` was removed, use `context.schema`
  codeDecorator.schema
  // @ts-expect-error `schema` was removed, use `context.schema`
  italicDecorator.schema
  // @ts-expect-error `schema` was removed, use `context.schema`
  strikeThroughDecorator.schema
})

import type {EditorContext} from '@portabletext/editor'
import {useEditor} from '@portabletext/editor'
import {CharacterPairDecoratorPlugin} from '@portabletext/plugin-character-pair-decorator'
import {InputRulePlugin} from '@portabletext/plugin-input-rule'
import {useEffect, useMemo} from 'react'
import {
  createMarkdownBehaviors,
  type MarkdownBehaviorsConfig,
  type ObjectWithOptionalKey,
} from './behavior.markdown-shortcuts'
import {createBlockquoteRule} from './rule.blockquote'
import {createHeadingRule} from './rule.heading'
import {createHorizontalRuleRule} from './rule.horizontal-rule'
import {createMarkdownLinkRule} from './rule.markdown-link'
import {createOrderedListRule} from './rule.ordered-list'
import {createUnorderedListRule} from './rule.unordered-list'

/**
 * @public
 */
export type MarkdownShortcutsPluginProps = MarkdownBehaviorsConfig & {
  blockquoteStyle?: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
  defaultStyle?: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
  headingStyle?: ({
    context,
    schema,
    props,
    level,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
    props: {level: number}
    /**
     * @deprecated Use `props.level` instead
     */
    level: number
  }) => string | undefined
  linkObject?: ({
    context,
    props,
  }: {
    context: Pick<EditorContext, 'schema' | 'keyGenerator'>
    props: {href: string}
  }) => ObjectWithOptionalKey | undefined
  unorderedList?: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
  orderedList?: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
  boldDecorator?: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
  codeDecorator?: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
  italicDecorator?: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
  strikeThroughDecorator?: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
}

/**
 * @public
 */
export function MarkdownShortcutsPlugin({
  blockquoteStyle,
  boldDecorator,
  codeDecorator,
  defaultStyle,
  headingStyle,
  horizontalRuleObject,
  linkObject,
  italicDecorator,
  orderedList,
  strikeThroughDecorator,
  unorderedList,
}: MarkdownShortcutsPluginProps) {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createMarkdownBehaviors({
      defaultStyle,
    })

    const unregisterBehaviors = behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [defaultStyle, editor])

  const inputRules = useMemo(() => {
    const rules = []
    if (blockquoteStyle) {
      rules.push(createBlockquoteRule({blockquoteStyle}))
    }
    if (headingStyle) {
      rules.push(createHeadingRule({headingStyle}))
    }
    if (horizontalRuleObject) {
      rules.push(createHorizontalRuleRule({horizontalRuleObject}))
    }
    if (linkObject) {
      rules.push(createMarkdownLinkRule({linkObject}))
    }
    if (orderedList) {
      rules.push(createOrderedListRule({orderedList}))
    }
    if (unorderedList) {
      rules.push(createUnorderedListRule({unorderedList}))
    }
    return rules.length > 0 ? rules : null
  }, [
    blockquoteStyle,
    headingStyle,
    horizontalRuleObject,
    linkObject,
    orderedList,
    unorderedList,
  ])

  return (
    <>
      {boldDecorator ? (
        <>
          <CharacterPairDecoratorPlugin
            decorator={boldDecorator}
            pair={{char: '*', amount: 2}}
          />
          <CharacterPairDecoratorPlugin
            decorator={boldDecorator}
            pair={{char: '_', amount: 2}}
          />
        </>
      ) : null}
      {codeDecorator ? (
        <CharacterPairDecoratorPlugin
          decorator={codeDecorator}
          pair={{char: '`', amount: 1}}
        />
      ) : null}
      {italicDecorator ? (
        <>
          <CharacterPairDecoratorPlugin
            decorator={italicDecorator}
            pair={{char: '*', amount: 1}}
          />
          <CharacterPairDecoratorPlugin
            decorator={italicDecorator}
            pair={{char: '_', amount: 1}}
          />
        </>
      ) : null}
      {strikeThroughDecorator ? (
        <CharacterPairDecoratorPlugin
          decorator={strikeThroughDecorator}
          pair={{char: '~', amount: 2}}
        />
      ) : null}
      {inputRules ? <InputRulePlugin rules={inputRules} /> : null}
    </>
  )
}

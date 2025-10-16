import type {EditorSchema} from '@portabletext/editor'
import {useEditor} from '@portabletext/editor'
import {CharacterPairDecoratorPlugin} from '@portabletext/plugin-character-pair-decorator'
import {InputRulePlugin} from '@portabletext/plugin-input-rule'
import {useEffect} from 'react'
import {
  createMarkdownBehaviors,
  type MarkdownBehaviorsConfig,
} from './behavior.markdown-shortcuts'
import {createBlockquoteRule} from './rule.blockquote'
import {createHeadingRule} from './rule.heading'
import {createHorizontalRuleRule} from './rule.horizontal-rule'
import {createMarkdownLinkRule} from './rule.markdown-link'
import {createOrderedListRule} from './rule.ordered-list'
import {createUnorderedListRule} from './rule.unordered-list'

/**
 * @beta
 */
export type MarkdownShortcutsPluginProps = MarkdownBehaviorsConfig & {
  blockquoteStyle?: (context: {schema: EditorSchema}) => string | undefined
  defaultStyle?: (context: {schema: EditorSchema}) => string | undefined
  headingStyle?: (context: {
    schema: EditorSchema
    level: number
  }) => string | undefined
  linkObject?: (context: {
    schema: EditorSchema
    href: string
  }) => {name: string; value?: {[prop: string]: unknown}} | undefined
  unorderedList?: (context: {schema: EditorSchema}) => string | undefined
  orderedList?: (context: {schema: EditorSchema}) => string | undefined
  boldDecorator?: ({schema}: {schema: EditorSchema}) => string | undefined
  codeDecorator?: ({schema}: {schema: EditorSchema}) => string | undefined
  italicDecorator?: ({schema}: {schema: EditorSchema}) => string | undefined
  strikeThroughDecorator?: ({
    schema,
  }: {
    schema: EditorSchema
  }) => string | undefined
}

/**
 * @beta
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
  }, [defaultStyle, editor, horizontalRuleObject])

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
      {blockquoteStyle ? (
        <InputRulePlugin rules={[createBlockquoteRule({blockquoteStyle})]} />
      ) : null}
      {headingStyle ? (
        <InputRulePlugin rules={[createHeadingRule({headingStyle})]} />
      ) : null}
      {horizontalRuleObject ? (
        <InputRulePlugin
          rules={[createHorizontalRuleRule({horizontalRuleObject})]}
        />
      ) : null}
      {linkObject ? (
        <InputRulePlugin rules={[createMarkdownLinkRule({linkObject})]} />
      ) : null}
      {orderedList ? (
        <InputRulePlugin rules={[createOrderedListRule({orderedList})]} />
      ) : null}
      {unorderedList ? (
        <InputRulePlugin rules={[createUnorderedListRule({unorderedList})]} />
      ) : null}
    </>
  )
}

import {useEditor} from '@portabletext/editor'
import type {EditorSchema} from '@portabletext/editor'
import {CharacterPairDecoratorPlugin} from '@portabletext/plugin-character-pair-decorator'
import {useEffect} from 'react'
import {
  createMarkdownBehaviors,
  type MarkdownBehaviorsConfig,
} from './behavior.markdown-shortcuts'

/**
 * @beta
 */
export type MarkdownShortcutsPluginProps = MarkdownBehaviorsConfig & {
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
  italicDecorator,
  orderedList,
  strikeThroughDecorator,
  unorderedList,
}: MarkdownShortcutsPluginProps) {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createMarkdownBehaviors({
      blockquoteStyle,
      defaultStyle,
      headingStyle,
      horizontalRuleObject,
      orderedList,
      unorderedList,
    })

    const unregisterBehaviors = behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [
    blockquoteStyle,
    defaultStyle,
    editor,
    headingStyle,
    horizontalRuleObject,
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
    </>
  )
}

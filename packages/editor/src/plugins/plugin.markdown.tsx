import {useEffect} from 'react'
import {
  createMarkdownBehaviors,
  type MarkdownBehaviorsConfig,
} from '../behaviors/behavior.markdown'
import {
  useMarkdownEmphasisBehaviors,
  type MarkdownEmphasisBehaviorsConfig,
} from '../behaviors/behavior.markdown-emphasis'
import {useEditor} from '../editor/editor-provider'

/**
 * @beta
 */
export type MarkdownPluginConfig = MarkdownBehaviorsConfig &
  MarkdownEmphasisBehaviorsConfig

/**
 * @beta
 * Add markdown behaviors for common markdown actions such as converting ### to headings, --- to HRs, and more.
 *
 * @example
 * Configure the bundled markdown behaviors
 * ```ts
 * import {EditorProvider} from '@portabletext/editor'
 * import {MarkdownPlugin} from '@portabletext/editor/plugins'
 *
 * function App() {
 *   return (
 *    <EditorProvider>
 *      <MarkdownPlugin
 *        config={{
 *          boldDecorator: ({schema}) =>
 *            schema.decorators.find((decorator) => decorator.value === 'strong')?.value,
 *          italicDecorator: ({schema}) =>
 *            schema.decorators.find((decorator) => decorator.value === 'em')?.value,
 *          horizontalRuleObject: ({schema}) => {
 *            const name = schema.blockObjects.find(
 *              (object) => object.name === 'break',
 *            )?.name
 *            return name ? {name} : undefined
 *          },
 *          defaultStyle: ({schema}) => schema.styles[0].value,
 *          headingStyle: ({schema, level}) =>
 *            schema.styles.find((style) => style.value === `h${level}`)
 *              ?.value,
 *          blockquoteStyle: ({schema}) =>
 *            schema.styles.find((style) => style.value === 'blockquote')
 *              ?.value,
 *          unorderedListStyle: ({schema}) =>
 *            schema.lists.find((list) => list.value === 'bullet')?.value,
 *          orderedListStyle: ({schema}) =>
 *            schema.lists.find((list) => list.value === 'number')?.value,
 *        }}
 *      />
 *      {...}
 *    </EditorProvider>
 *  )
 * }
 */
export function MarkdownPlugin(props: {config: MarkdownPluginConfig}) {
  const editor = useEditor()
  useMarkdownEmphasisBehaviors({config: props.config})

  useEffect(() => {
    const behaviors = createMarkdownBehaviors(props.config)

    const unregisterBehaviors = behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor, props.config])

  return null
}

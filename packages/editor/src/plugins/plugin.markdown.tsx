import {useEffect} from 'react'
import {
  createMarkdownBehaviors,
  type MarkdownBehaviorsConfig,
} from '../behaviors/behavior.markdown'
import type {EditorSchema} from '../editor/editor-schema'
import {useEditor} from '../editor/use-editor'
import {DecoratorShortcutPlugin} from './plugin.decorator-shortcut'

/**
 * @beta
 */
export type MarkdownPluginConfig = MarkdownBehaviorsConfig & {
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
 *          codeDecorator: ({schema}) =>
 *            schema.decorators.find((decorator) => decorator.value === 'code')?.value,
 *          italicDecorator: ({schema}) =>
 *            schema.decorators.find((decorator) => decorator.value === 'em')?.value,
 *          strikeThroughDecorator: ({schema}) =>
 *            schema.decorators.find((decorator) => decorator.value === 'strike-through')?.value,
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
 * ```
 *
 * @deprecated Install the plugin from `@portabletext/plugin-markdown-shortcuts`
 */
export function MarkdownPlugin(props: {config: MarkdownPluginConfig}) {
  const editor = useEditor()

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

  return (
    <>
      {props.config.boldDecorator ? (
        <>
          <DecoratorShortcutPlugin
            decorator={props.config.boldDecorator}
            pair={{char: '*', amount: 2}}
          />
          <DecoratorShortcutPlugin
            decorator={props.config.boldDecorator}
            pair={{char: '_', amount: 2}}
          />
        </>
      ) : null}
      {props.config.codeDecorator ? (
        <DecoratorShortcutPlugin
          decorator={props.config.codeDecorator}
          pair={{char: '`', amount: 1}}
        />
      ) : null}
      {props.config.italicDecorator ? (
        <>
          <DecoratorShortcutPlugin
            decorator={props.config.italicDecorator}
            pair={{char: '*', amount: 1}}
          />
          <DecoratorShortcutPlugin
            decorator={props.config.italicDecorator}
            pair={{char: '_', amount: 1}}
          />
        </>
      ) : null}
      {props.config.strikeThroughDecorator ? (
        <DecoratorShortcutPlugin
          decorator={props.config.strikeThroughDecorator}
          pair={{char: '~', amount: 2}}
        />
      ) : null}
    </>
  )
}

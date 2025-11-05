import type {EditorContext} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

export function createHeadingRule(config: {
  headingStyle: ({
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
}) {
  return defineInputRule({
    on: /^#+ /,
    guard: ({snapshot, event}) => {
      const previousInlineObject = getPreviousInlineObject(snapshot)

      if (previousInlineObject) {
        return false
      }

      const match = event.matches.at(0)

      if (!match) {
        return false
      }

      const level = match.text.length - 1

      const style = config.headingStyle({
        context: {schema: snapshot.context.schema},
        schema: snapshot.context.schema,
        props: {level},
        level,
      })

      if (!style) {
        return false
      }

      return {match, style}
    },
    actions: [
      ({event}, {match, style}) => [
        raise({
          type: 'block.unset',
          props: ['listItem', 'level'],
          at: event.focusTextBlock.path,
        }),
        raise({
          type: 'block.set',
          props: {style},
          at: event.focusTextBlock.path,
        }),
        raise({
          type: 'delete',
          at: match.targetOffsets,
        }),
      ],
    ],
  })
}

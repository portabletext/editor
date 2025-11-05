import type {EditorContext} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

export function createBlockquoteRule(config: {
  blockquoteStyle: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
}) {
  return defineInputRule({
    on: /^> /,
    guard: ({snapshot, event}) => {
      const style = config.blockquoteStyle({
        context: {schema: snapshot.context.schema},
        schema: snapshot.context.schema,
      })

      if (!style) {
        return false
      }

      const previousInlineObject = getPreviousInlineObject(snapshot)

      if (previousInlineObject) {
        return false
      }

      const match = event.matches.at(0)

      if (!match) {
        return false
      }

      return {style, match}
    },
    actions: [
      ({event}, {style, match}) => [
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

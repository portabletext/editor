import type {EditorContext} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

export function createOrderedListRule(config: {
  orderedList: ({
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
    on: /^1\. /,
    guard: ({snapshot, event}) => {
      const orderedList = config.orderedList({
        context: {schema: snapshot.context.schema},
        schema: snapshot.context.schema,
      })

      if (!orderedList) {
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

      return {match, orderedList}
    },
    actions: [
      ({event}, {match, orderedList}) => [
        raise({
          type: 'block.unset',
          props: ['style'],
          at: event.focusTextBlock.path,
        }),
        raise({
          type: 'block.set',
          props: {
            listItem: orderedList,
            level: event.focusTextBlock.node.level ?? 1,
          },
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

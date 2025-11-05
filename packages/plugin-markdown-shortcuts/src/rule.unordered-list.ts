import type {EditorContext} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

export function createUnorderedListRule(config: {
  unorderedList: ({
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
    on: /^(-|\*) /,
    guard: ({snapshot, event}) => {
      const unorderedList = config.unorderedList({
        context: {schema: snapshot.context.schema},
        schema: snapshot.context.schema,
      })

      if (!unorderedList) {
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

      return {match, unorderedList}
    },
    actions: [
      ({event}, {match, unorderedList}) => [
        raise({
          type: 'block.unset',
          props: ['style'],
          at: event.focusTextBlock.path,
        }),
        raise({
          type: 'block.set',
          props: {
            listItem: unorderedList,
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

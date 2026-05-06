import type {EditorContext} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {getPathSubSchema} from '@portabletext/editor/traversal'
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
      const subSchema = getPathSubSchema(snapshot, event.focusBlock.path)
      const unorderedList = config.unorderedList({
        context: {schema: subSchema},
        schema: subSchema,
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
          at: event.focusBlock.path,
        }),
        raise({
          type: 'block.set',
          props: {
            listItem: unorderedList,
            level: event.focusBlock.node.level ?? 1,
          },
          at: event.focusBlock.path,
        }),
        raise({
          type: 'delete',
          at: match.targetOffsets,
        }),
      ],
    ],
  })
}

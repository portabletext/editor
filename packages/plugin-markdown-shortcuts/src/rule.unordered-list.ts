import type {EditorSchema} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

export function createUnorderedListRule(config: {
  defaultStyle: (context: {schema: EditorSchema}) => string | undefined
  unorderedList: (context: {schema: EditorSchema}) => string | undefined
}) {
  return defineInputRule({
    on: /^(-|\*) /,
    guard: ({snapshot, event}) => {
      const unorderedList = config.unorderedList({
        schema: snapshot.context.schema,
      })
      const defaultStyle = config.defaultStyle({
        schema: snapshot.context.schema,
      })

      if (!unorderedList || !defaultStyle) {
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

      return {defaultStyle, match, unorderedList}
    },
    actions: [
      ({event}, {defaultStyle, match, unorderedList}) => [
        raise({
          type: 'block.set',
          props: {
            listItem: unorderedList,
            style: defaultStyle,
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

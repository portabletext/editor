import type {EditorSchema} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

export function createOrderedListRule(config: {
  defaultStyle: (context: {schema: EditorSchema}) => string | undefined
  orderedList: (context: {schema: EditorSchema}) => string | undefined
}) {
  return defineInputRule({
    on: /^1\. /,
    guard: ({snapshot, event}) => {
      const orderedList = config.orderedList({
        schema: snapshot.context.schema,
      })
      const defaultStyle = config.defaultStyle({
        schema: snapshot.context.schema,
      })

      if (!orderedList || !defaultStyle) {
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

      return {defaultStyle, match, orderedList}
    },
    actions: [
      ({event}, {defaultStyle, match, orderedList}) => [
        raise({
          type: 'block.set',
          props: {
            listItem: orderedList,
            style: defaultStyle,
            level: 1,
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

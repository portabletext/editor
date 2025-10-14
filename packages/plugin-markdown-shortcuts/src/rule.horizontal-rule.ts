import type {EditorSchema} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

export function createHorizontalRuleRule(config: {
  horizontalRuleObject: (context: {
    schema: EditorSchema
  }) => {name: string; value?: {[prop: string]: unknown}} | undefined
}) {
  return defineInputRule({
    on: /^(---)|^(—-)|^(___)|^(\*\*\*)/,
    guard: ({snapshot, event}) => {
      const hrObject = config.horizontalRuleObject({
        schema: snapshot.context.schema,
      })

      if (!hrObject) {
        // If no horizontal rule object is provided, then we can safely skip
        // this rule.
        return false
      }

      const previousInlineObject = getPreviousInlineObject(snapshot)

      if (previousInlineObject) {
        // Input Rules only look at the plain text of the text block. This
        // means that the RegExp is matched even if there is a leading inline
        // object.
        return false
      }

      // In theory, an Input Rule could return multiple matches. But in this
      // case we only expect one match.
      const match = event.matches.at(0)

      if (!match) {
        return false
      }

      return {hrObject, match}
    },
    actions: [
      (_, {hrObject, match}) => [
        raise({
          type: 'insert.block',
          block: {
            _type: hrObject.name,
            ...(hrObject.value ?? {}),
          },
          placement: 'before',
          select: 'none',
        }),
        raise({
          type: 'delete',
          at: match.targetOffsets,
        }),
      ],
    ],
  })
}

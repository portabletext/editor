import type {EditorSchema} from '@portabletext/editor'
import {raise, type BehaviorAction} from '@portabletext/editor/behaviors'
import {defineInputRule} from './input-rule'

export function createMarkdownLinkRule(config: {
  linkObject: (context: {
    schema: EditorSchema
    href: string
  }) => {name: string; value?: {[prop: string]: unknown}} | undefined
}) {
  return defineInputRule({
    on: /\[(.+)]\((.+)\)/,
    actions: [
      ({snapshot, event}) => {
        const newText = event.textBefore + event.textInserted
        let textLengthDelta = 0
        const actions: Array<BehaviorAction> = []

        for (const match of event.matches.reverse()) {
          const textMatch = match.groupMatches.at(0)
          const hrefMatch = match.groupMatches.at(1)

          if (textMatch === undefined || hrefMatch === undefined) {
            continue
          }

          textLengthDelta =
            textLengthDelta -
            (match.targetOffsets.focus.offset -
              match.targetOffsets.anchor.offset -
              textMatch.text.length)

          const linkObject = config.linkObject({
            schema: snapshot.context.schema,
            href: hrefMatch.text,
          })

          if (!linkObject) {
            continue
          }

          const leftSideOffsets = {
            anchor: match.targetOffsets.anchor,
            focus: textMatch.targetOffsets.anchor,
          }
          const rightSideOffsets = {
            anchor: textMatch.targetOffsets.focus,
            focus: match.targetOffsets.focus,
          }

          actions.push(
            raise({
              type: 'select',
              at: textMatch.targetOffsets,
            }),
          )
          actions.push(
            raise({
              type: 'annotation.add',
              annotation: {
                name: linkObject.name,
                value: linkObject.value ?? {},
              },
            }),
          )
          actions.push(
            raise({
              type: 'delete',
              at: rightSideOffsets,
            }),
          )
          actions.push(
            raise({
              type: 'delete',
              at: leftSideOffsets,
            }),
          )
        }

        const endCaretPosition = {
          path: event.focusTextBlock.path,
          offset: newText.length - textLengthDelta * -1,
        }

        return [
          ...actions,
          raise({
            type: 'select',
            at: {
              anchor: endCaretPosition,
              focus: endCaretPosition,
            },
          }),
        ]
      },
    ],
  })
}

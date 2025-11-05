import type {EditorContext} from '@portabletext/editor'
import {raise, type BehaviorAction} from '@portabletext/editor/behaviors'
import {defineInputRule} from '@portabletext/plugin-input-rule'
import type {ObjectWithOptionalKey} from './behavior.markdown-shortcuts'

export function createMarkdownLinkRule(config: {
  linkObject: ({
    context,
    props,
  }: {
    context: Pick<EditorContext, 'schema' | 'keyGenerator'>
    props: {href: string}
  }) => ObjectWithOptionalKey | undefined
}) {
  return defineInputRule({
    on: /\[([^[\]]+)]\((.+)\)/,
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
            context: {
              schema: snapshot.context.schema,
              keyGenerator: snapshot.context.keyGenerator,
            },
            props: {href: hrefMatch.text},
          })

          if (!linkObject) {
            continue
          }

          const {_type, _key, ...value} = linkObject

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
                name: _type,
                _key,
                value,
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

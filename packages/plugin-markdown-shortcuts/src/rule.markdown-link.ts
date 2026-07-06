import type {EditorContext} from '@portabletext/editor'
import {raise, type BehaviorAction} from '@portabletext/editor/behaviors'
import {getPathSubSchema} from '@portabletext/editor/traversal'
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
    on: /\[(?<text>[^[\]]+)]\((?<href>.+)\)/,
    // The rule annotates the text and deletes only the markers and the href
    // region, so an inline object inside the link TEXT is harmless and the
    // link must fire. The unlisted `href` group stays protected: deleting
    // `](href)` across an inline object would destroy it, and the captured
    // href text would silently omit it.
    inlineObjects: {allow: ['text']},
    actions: [
      ({snapshot, event}) => {
        const newText = event.textBefore + event.textInserted
        let textLengthDelta = 0
        const actions: Array<BehaviorAction> = []

        for (const match of event.matches.reverse()) {
          const textMatch = match.groups['text']
          const hrefMatch = match.groups['href']

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
              schema: getPathSubSchema(snapshot, event.focusBlock.path),
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

        if (actions.length === 0) {
          return []
        }

        const endCaretPosition = {
          path: event.focusBlock.path,
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

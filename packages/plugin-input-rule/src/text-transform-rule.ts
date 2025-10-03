import {raise} from '@portabletext/editor/behaviors'
import {getMarkState} from '@portabletext/editor/selectors'
import type {InputRule, InputRuleGuard} from './input-rule'

/**
 * @public
 */
export type TextTransformRule = {
  on: RegExp
  guard?: InputRuleGuard
  transform: () => string
}

/**
 * Define an `InputRule` specifically designed to transform matched text into
 * some other text.
 *
 * @example
 * ```tsx
 * const transformRule = defineTextTransformRule({
 *   on: /--/,
 *   transform: () => '—',
 * })
 * ```
 *
 * @public
 */
export function defineTextTransformRule(config: TextTransformRule): InputRule {
  return {
    on: config.on,
    guard: config.guard ?? (() => true),
    actions: [
      ({snapshot, event}) => {
        const matches = event.matches.flatMap((match) =>
          match.groupMatches.length === 0 ? [match] : match.groupMatches,
        )
        const textLengthDelta = matches.reduce((length, match) => {
          return (
            length -
            (config.transform().length -
              (match.targetOffsets.focus.offset -
                match.targetOffsets.anchor.offset))
          )
        }, 0)

        const newText = event.textBefore + event.textInserted
        const endCaretPosition = {
          path: event.focusTextBlock.path,
          offset: newText.length - textLengthDelta,
        }

        const actions = matches.reverse().flatMap((match) => [
          raise({type: 'select', at: match.targetOffsets}),
          raise({type: 'delete', at: match.targetOffsets}),
          raise({
            type: 'insert.child',
            child: {
              _type: snapshot.context.schema.span.name,
              text: config.transform(),
              marks:
                getMarkState({
                  ...snapshot,
                  context: {
                    ...snapshot.context,
                    selection: {
                      anchor: match.selection.anchor,
                      focus: {
                        path: match.selection.focus.path,
                        offset: Math.min(
                          match.selection.focus.offset,
                          event.textBefore.length,
                        ),
                      },
                    },
                  },
                })?.marks ?? [],
            },
          }),
        ])

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
  }
}

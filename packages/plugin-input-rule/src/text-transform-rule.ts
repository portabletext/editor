import {raise, type BehaviorAction} from '@portabletext/editor/behaviors'
import {getMarkState} from '@portabletext/editor/selectors'
import type {InputRule, InputRuleGuard} from './input-rule'

/**
 * @alpha
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
 * @alpha
 */
export function defineTextTransformRule(config: TextTransformRule): InputRule {
  return {
    on: config.on,
    guard: config.guard ?? (() => true),
    actions: [
      ({snapshot, event}) => {
        const locations = event.matches.flatMap((match) =>
          match.groupMatches.length === 0 ? [match] : match.groupMatches,
        )
        const newText = event.textBefore + event.textInserted

        let textLengthDelta = 0
        const actions: Array<BehaviorAction> = []

        for (const location of locations.reverse()) {
          const text = config.transform()

          textLengthDelta =
            textLengthDelta -
            (text.length -
              (location.targetOffsets.focus.offset -
                location.targetOffsets.anchor.offset))

          actions.push(raise({type: 'select', at: location.targetOffsets}))
          actions.push(raise({type: 'delete', at: location.targetOffsets}))
          actions.push(
            raise({
              type: 'insert.child',
              child: {
                _type: snapshot.context.schema.span.name,
                text,
                marks:
                  getMarkState({
                    ...snapshot,
                    context: {
                      ...snapshot.context,
                      selection: {
                        anchor: location.selection.anchor,
                        focus: {
                          path: location.selection.focus.path,
                          offset: Math.min(
                            location.selection.focus.offset,
                            event.textBefore.length,
                          ),
                        },
                      },
                    },
                  })?.marks ?? [],
              },
            }),
          )
        }

        const endCaretPosition = {
          path: event.focusTextBlock.path,
          offset: newText.length - textLengthDelta,
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
  }
}

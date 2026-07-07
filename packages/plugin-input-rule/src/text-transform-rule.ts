import {raise, type BehaviorAction} from '@portabletext/editor/behaviors'
import {getMarkState} from '@portabletext/editor/selectors'
import type {InputRule, InputRuleGuard} from './input-rule'
import type {InputRuleMatchLocation} from './input-rule-match-location'

/**
 * @public
 */
export type TextTransform<TGuardResponse = true> = (
  {location}: {location: InputRuleMatchLocation},
  guardResponse: TGuardResponse,
) => string

/**
 * @public
 */
export type TextTransformRule<TGuardResponse = true> = {
  on: RegExp
  guard?: InputRuleGuard<TGuardResponse>
  /**
   * What to replace, and with what.
   *
   * A function replaces the whole match, always, regardless of any capture
   * groups in the pattern. A record replaces only the spans of the named
   * capture groups given as keys, each with its own transform,
   * `/\d+\s?(?<operator>[*x])\s?\d+/` with
   * `transform: {operator: () => '×'}` turns `2x3` into `2×3` rather than
   * `×`. Use the record form when the pattern needs surrounding context to
   * decide *when* to fire but only part of the match should change; the
   * context must sit inside the match rather than in lookarounds, a rule
   * only fires when its match involves the just-inserted text.
   *
   * Every key must exist as a named capture group in `on`;
   * `defineTextTransformRule` throws otherwise. A match in which none of
   * the keys participated has nothing to replace and is skipped.
   */
  transform:
    | TextTransform<TGuardResponse>
    | Record<string, TextTransform<TGuardResponse>>
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
export function defineTextTransformRule<TGuardResponse = true>(
  config: TextTransformRule<TGuardResponse>,
): InputRule<TGuardResponse> {
  const transformRecord =
    typeof config.transform === 'function' ? undefined : config.transform

  if (transformRecord) {
    // The appended `|` adds an empty alternative that matches the empty
    // string, so `exec('')` always produces a match whose `groups` object
    // carries a key for every named capture group in the pattern. `g`/`y`/
    // `d` are dropped (irrelevant for the probe, and sticky would anchor
    // it); the remaining flags are kept because recompiling without them
    // can be a syntax error (`\u{...}` requires `u`).
    const probeFlags = config.on.flags.replace(/[gyd]/g, '')
    const namedGroups = Object.keys(
      new RegExp(`${config.on.source}|`, probeFlags).exec('')?.groups ?? {},
    )

    for (const groupName of Object.keys(transformRecord)) {
      if (!namedGroups.includes(groupName)) {
        throw new Error(
          `defineTextTransformRule: \`transform\` targets the group "${groupName}", but \`on\` (${config.on}) has no such named capture group` +
            (namedGroups.length > 0
              ? `. Named groups: ${namedGroups
                  .map((name) => `"${name}"`)
                  .join(', ')}`
              : `. The pattern has no named capture groups`),
        )
      }
    }
  }

  return {
    on: config.on,
    guard: config.guard ?? (() => true as TGuardResponse),
    actions: [
      ({snapshot, event}, guardResponse) => {
        const targets = event.matches
          .flatMap(
            (
              match,
            ): Array<{
              location: InputRuleMatchLocation
              transform: TextTransform<TGuardResponse>
            }> => {
              if (!transformRecord) {
                return [
                  {
                    location: match,
                    transform:
                      config.transform as TextTransform<TGuardResponse>,
                  },
                ]
              }

              // Only participating keyed groups are replaced; a match in
              // which none of them participated is skipped.
              return Object.entries(transformRecord).flatMap(
                ([groupName, groupTransform]) => {
                  const location = match.groups[groupName]

                  return location ? [{location, transform: groupTransform}] : []
                },
              )
            },
          )
          // Right-to-left processing below relies on document order, which
          // the `replace` array's order doesn't guarantee.
          .sort(
            (a, b) =>
              a.location.targetOffsets.anchor.offset -
              b.location.targetOffsets.anchor.offset,
          )
        const newText = event.textBefore + event.textInserted

        let textLengthDelta = 0
        const actions: Array<BehaviorAction> = []

        for (const {location, transform} of targets.reverse()) {
          const text = transform({location}, guardResponse)

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
          path: event.focusBlock.path,
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

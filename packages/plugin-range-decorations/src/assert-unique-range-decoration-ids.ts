/**
 * Keep in sync with `assertUniqueRangeDecorationIds` in
 * `@portabletext/editor`'s `src/editor/range-decorations-registration.ts`:
 * this plugin validates before core does, so its own diffing (`update`'s
 * pending-lost bookkeeping) never runs against a duplicate-id array that
 * core would otherwise reject after the fact.
 */
export function assertUniqueRangeDecorationIds(
  rangeDecorations: Array<{id: string}>,
): void {
  const seen = new Set<string>()

  for (const rangeDecoration of rangeDecorations) {
    if (seen.has(rangeDecoration.id)) {
      throw new Error(
        `\`registerRangeDecorations\` was given more than one range decoration with the id "${rangeDecoration.id}". Each range decoration must have a unique \`id\`.`,
      )
    }

    seen.add(rangeDecoration.id)
  }
}

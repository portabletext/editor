/**
 * Keep in sync with `assertUniqueDecorationIds` in `@portabletext/editor`'s
 * `src/editor/range-decorations-registration.ts`: this plugin validates before
 * core does, so its own diffing (`update`'s pending-lost bookkeeping)
 * never runs against a duplicate-id array that core would otherwise
 * reject after the fact.
 */
export function assertUniqueDecorationIds(
  decorations: Array<{id: string}>,
): void {
  const seen = new Set<string>()

  for (const decoration of decorations) {
    if (seen.has(decoration.id)) {
      throw new Error(
        `\`registerDecorations\` was given more than one decoration with the id "${decoration.id}". Each decoration must have a unique \`id\`.`,
      )
    }

    seen.add(decoration.id)
  }
}

import {
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  applyPatches as diffMatchPatchApplyPatches,
  parsePatch,
} from '@sanity/diff-match-patch'

/**
 * Apply a span-text `diffMatchPatch` onto the current editor string.
 *
 * Under same-span End typing, a peer's insert-at-shared-prefix DMP is often
 * authored against a shorter base (`A: ` → `A: deadline`, sometimes with
 * trailing EQUAL context for fuzzy match) while this client has already grown
 * past that base (`A: exclusive article re`). Naive `applyPatches` inserts at
 * the shared prefix and produces mid-word fragments (`deadlineexclusive`).
 * When the naive result would glue non-space characters together, append the
 * peer insert at End instead so both concurrent inserts survive as whole words.
 *
 * Spaced mid-prefix inserts on an unchanged base (`A: exclusive art` →
 * `A: deadline exclusive art`) still use the library apply path.
 *
 * @internal
 */
export function resolveRemoteSpanTextDmp(
  currentText: string,
  dmpPatch: string,
): string {
  const patches = parsePatch(dmpPatch)
  const [applied] = diffMatchPatchApplyPatches(patches, currentText, {
    allowExceedingIndices: true,
  })

  const insertAt = describePrefixInsertDmp(dmpPatch)
  if (!insertAt) {
    return applied
  }

  const {prefix, inserted} = insertAt
  if (!currentText.startsWith(prefix)) {
    return applied
  }

  const localSuffix = currentText.slice(prefix.length)
  if (localSuffix.length === 0) {
    return applied
  }
  // Naive apply kept the shared prefix, then injected the peer insert before
  // the local suffix (`A: ` + `deadline` + `exclusive...`).
  if (applied !== prefix + inserted + localSuffix) {
    return applied
  }
  // Spaced joins are readable mid-prefix inserts; only relocate mid-word glue.
  if (!/\S$/.test(inserted) || !/^\S/.test(localSuffix)) {
    return applied
  }

  return joinConcurrentSuffixes(currentText, inserted)
}

/**
 * A single insert after a shared prefix, with optional trailing EQUAL context
 * (common in DMP output) and no deletes.
 *
 * @internal
 */
export function describePrefixInsertDmp(dmpPatch: string): {
  prefix: string
  inserted: string
  trailingEqual: string
} | null {
  let prefix = ''
  let inserted = ''
  let trailingEqual = ''
  let sawInsert = false

  try {
    for (const patch of parsePatch(dmpPatch)) {
      for (const [op, text] of patch.diffs) {
        if (op === DIFF_DELETE) {
          return null
        }
        if (op === DIFF_EQUAL) {
          if (sawInsert) {
            trailingEqual += text
          } else {
            prefix += text
          }
          continue
        }
        if (op === DIFF_INSERT) {
          if (trailingEqual.length > 0) {
            // Insert after trailing equal is not a single prefix insert.
            return null
          }
          sawInsert = true
          inserted += text
        }
      }
    }
  } catch {
    return null
  }

  if (!sawInsert || inserted.length === 0) {
    return null
  }
  return {prefix, inserted, trailingEqual}
}

function joinConcurrentSuffixes(left: string, right: string): string {
  if (left.length === 0) {
    return right
  }
  if (right.length === 0) {
    return left
  }
  if (/\s$/.test(left) || /^\s/.test(right)) {
    return left + right
  }
  return `${left} ${right}`
}

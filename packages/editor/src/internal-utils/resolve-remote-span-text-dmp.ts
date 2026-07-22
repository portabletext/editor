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
 * Under same-span End typing, a peer's pure-append DMP is authored against a
 * short base (`A: ` → `A: deadline`) while this client has already grown that
 * base (`A: exclusive article re`). Naive `applyPatches` inserts at the shared
 * prefix and produces mid-word fragments (`deadlineexclusive`). When that
 * happens, append the peer insert at End instead.
 *
 * Only pure end-appends are relocated (EQUAL* INSERT, no trailing EQUAL, no
 * deletes). Inserts with trailing EQUAL context are intentional mid-document
 * inserts (for example typing at the start while a peer has local End growth)
 * and must keep the library apply path.
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

  const appendIntent = describePureAppendDmp(dmpPatch)
  if (!appendIntent) {
    return applied
  }

  const {from, inserted} = appendIntent
  // Empty-prefix appends are inserts at the start of the span (for example
  // typing "Welcome" before existing text). Never relocate those.
  if (from.length === 0 || !currentText.startsWith(from)) {
    return applied
  }

  const localSuffix = currentText.slice(from.length)
  if (localSuffix.length === 0) {
    return applied
  }
  // Naive apply kept the shared base, then injected the peer insert before
  // the local suffix (`A: ` + `deadline` + `exclusive...`).
  if (applied !== from + inserted + localSuffix) {
    return applied
  }
  // Spaced joins stay readable as mid-prefix inserts; only relocate mid-word glue.
  if (!/\S$/.test(inserted) || !/^\S/.test(localSuffix)) {
    return applied
  }

  return joinConcurrentSuffixes(currentText, inserted)
}

/**
 * EQUAL* + INSERT with no trailing EQUAL and no deletes.
 *
 * @internal
 */
export function describePureAppendDmp(
  dmpPatch: string,
): {from: string; inserted: string} | null {
  const described = describePrefixInsertDmp(dmpPatch)
  if (!described || described.trailingEqual.length > 0) {
    return null
  }
  return {from: described.prefix, inserted: described.inserted}
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

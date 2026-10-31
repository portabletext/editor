/**
 * A log that takes entries until `errors` holds one, so it ends at the page's first error and holds what
 * led up to a crash, not what React or the editor did after it.
 */
export function frozenLog<Entry>(errors: string[]): {
  entries: Entry[]
  record: (entry: Entry) => void
} {
  const entries: Entry[] = []
  return {
    entries,
    record: (entry) => {
      if (errors.length === 0) entries.push(entry)
    },
  }
}

import type {PortableTextBlock} from '@portabletext/editor'
import type {KeyDelta} from './loop-state'

/**
 * A `_key` that already existed anywhere in `before` was adopted, not
 * minted: `applyMarkdownEdit` and manual editor edits alike carry stored
 * keys forward rather than assigning fresh ones to unchanged content.
 */
export function computeKeyDelta(
  before: ReadonlyArray<PortableTextBlock>,
  after: ReadonlyArray<PortableTextBlock>,
): KeyDelta {
  const beforeKeys = new Set<string>()
  walkKeys(before, (key) => {
    beforeKeys.add(key)
  })

  const freshKeys = new Set<string>()
  let freshCount = 0
  let adoptedCount = 0
  walkKeys(after, (key) => {
    if (beforeKeys.has(key)) {
      adoptedCount++
    } else {
      freshKeys.add(key)
      freshCount++
    }
  })

  return {freshKeys, freshCount, adoptedCount}
}

/**
 * Every `_key` reachable from `node`, however deeply nested (block
 * children, mark definitions, and any custom object's own arrays):
 * fresh vs. adopted has to account for all of them, not just the
 * top-level blocks.
 */
function walkKeys(node: unknown, visit: (key: string) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      walkKeys(item, visit)
    }
    return
  }

  if (typeof node !== 'object' || node === null) {
    return
  }

  const record = node as Record<string, unknown>
  if (typeof record['_key'] === 'string') {
    visit(record['_key'])
  }

  for (const value of Object.values(record)) {
    walkKeys(value, visit)
  }
}

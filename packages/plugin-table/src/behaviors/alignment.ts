import type {Path} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import type {Table} from './types'

/**
 * Per-column `alignment` is positional, so structural column edits must
 * keep the array aligned with the columns. Tables without `alignment`
 * stay without it (matching the `@portabletext/markdown` round-trip), so
 * these helpers return `undefined` in that case and the caller raises
 * nothing.
 */

function setAlignment(tablePath: Path, alignment: Table['alignment']) {
  return raise({type: 'block.set', at: tablePath, props: {alignment}})
}

export function alignmentInsertAction(
  table: Table,
  tablePath: Path,
  columnIndex: number,
) {
  const alignment = table.alignment
  if (!alignment) {
    return undefined
  }
  return setAlignment(tablePath, [
    ...alignment.slice(0, columnIndex),
    null,
    ...alignment.slice(columnIndex),
  ])
}

export function alignmentRemoveAction(
  table: Table,
  tablePath: Path,
  columnIndex: number,
) {
  const alignment = table.alignment
  if (!alignment) {
    return undefined
  }
  return setAlignment(
    tablePath,
    alignment.filter((_, index) => index !== columnIndex),
  )
}

export function alignmentMoveAction(
  table: Table,
  tablePath: Path,
  fromIndex: number,
  toIndex: number,
) {
  const alignment = table.alignment
  if (!alignment) {
    return undefined
  }
  const next = [...alignment]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved ?? null)
  return setAlignment(tablePath, next)
}

import type {Path} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import type {Table} from './types'

/**
 * `alignment` is positional, so a column insert/remove must shift the array
 * in lockstep with the columns. A table with no `alignment` field returns
 * `undefined`: there is nothing to keep in sync.
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

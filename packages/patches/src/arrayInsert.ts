const BEFORE = 'before'
const AFTER = 'after'
const REPLACE = 'replace'

export default function insert(
  array: any[],
  position: string,
  index: number,
  ...args: any[]
) {
  if (position !== BEFORE && position !== AFTER && position !== REPLACE) {
    throw new Error(
      `Invalid position "${position}", must be either ${BEFORE}, ${AFTER} or ${REPLACE}`,
    )
  }

  const items = flatten(...args)

  if (array.length === 0) {
    return items
  }

  const len = array.length
  const idx = Math.abs((len + index) % len) % len

  const copy = array.slice()

  if (position === REPLACE) {
    copy.splice(idx, 1, ...items)
    return copy
  }

  const normalizedIdx = position === AFTER ? idx + 1 : idx

  copy.splice(normalizedIdx, 0, ...flatten(items))
  return copy
}

function flatten(...values: any[]) {
  return values.reduce((prev, item) => prev.concat(item), [])
}

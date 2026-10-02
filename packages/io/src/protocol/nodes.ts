import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'

export function keyOf(
  segment: Patch['path'][number] | undefined,
): string | undefined {
  return typeof segment === 'object' &&
    !Array.isArray(segment) &&
    typeof segment._key === 'string'
    ? segment._key
    : undefined
}

export function findBlock(
  value: Array<PortableTextBlock> | undefined,
  blockKey: string,
): PortableTextBlock | undefined {
  return value?.find((candidate) => candidate._key === blockKey)
}

export function childrenOf(block: PortableTextBlock): Array<unknown> {
  const children: unknown = Reflect.get(block, 'children')

  return Array.isArray(children) ? children : []
}

export function itemKey(item: unknown): Array<string> {
  if (typeof item !== 'object' || item === null || !('_key' in item)) {
    return []
  }

  return typeof item._key === 'string' && item._key !== '' ? [item._key] : []
}

export function isEqual(valueA: unknown, valueB: unknown): boolean {
  if (valueA === valueB) {
    return true
  }

  if (
    typeof valueA !== 'object' ||
    typeof valueB !== 'object' ||
    valueA === null ||
    valueB === null ||
    Array.isArray(valueA) !== Array.isArray(valueB)
  ) {
    return false
  }

  const keysA = Object.keys(valueA)
  const keysB = Object.keys(valueB)

  return (
    keysA.length === keysB.length &&
    keysA.every(
      (key) =>
        Object.hasOwn(valueB, key) &&
        isEqual(Reflect.get(valueA, key), Reflect.get(valueB, key)),
    )
  )
}

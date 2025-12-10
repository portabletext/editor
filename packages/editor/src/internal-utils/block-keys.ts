import type {PortableTextBlock} from '@portabletext/schema'

export function getBlockKeys(value: Array<PortableTextBlock> | undefined) {
  if (!value) {
    return []
  }

  return value.map((block) => block._key)
}

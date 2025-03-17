import type {PortableTextBlock} from '@sanity/types'

export function getBlockKeys(value: Array<PortableTextBlock> | undefined) {
  if (!value) {
    return []
  }

  return value.map((block) => block._key)
}

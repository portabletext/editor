import type {EditorSelector} from '../editor/editor-selector'
import debug from '../internal-utils/debug'

let KEY_TO_BLOCK_INDEX = new Map<string, number>()

export function resetBlockIndexCache() {
  KEY_TO_BLOCK_INDEX = new Map<string, number>()
}

export function setBlockIndex(key: string, index: number) {
  KEY_TO_BLOCK_INDEX.set(key, index)
}

export function getBlockIndex(key: string): EditorSelector<number | undefined> {
  return (snapshot) => {
    const cachedIndex = KEY_TO_BLOCK_INDEX.get(key)

    if (cachedIndex !== undefined) {
      const block = snapshot.context.value.at(cachedIndex)

      if (block?._key !== key) {
        console.error(`Block index ${cachedIndex} does not match _key ${key}`)

        KEY_TO_BLOCK_INDEX.delete(key)

        return getBlockIndex(key)(snapshot)
      }

      return cachedIndex
    }

    console.warn(
      `No cached block index for _key ${key}. Searching for it in the value.`,
    )

    const index = snapshot.context.value.findIndex((node) => node._key === key)

    if (index === -1) {
      console.warn(`Unable to find block index for key ${key}`)

      return undefined
    }

    console.warn(`Caching block index ${index} for _key ${key}`)

    KEY_TO_BLOCK_INDEX.set(key, index)

    return index
  }
}

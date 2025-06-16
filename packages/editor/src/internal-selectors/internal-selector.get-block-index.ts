import type {EditorSelector} from '../editor/editor-selector'

const KEY_TO_BLOCK_INDEX = new Map<string, number>()

export function setBlockIndex(key: string, index: number) {
  KEY_TO_BLOCK_INDEX.set(key, index)
}

export function getBlockIndex(key: string): EditorSelector<number | undefined> {
  return (snapshot) => {
    const cachedIndex = KEY_TO_BLOCK_INDEX.get(key)

    if (cachedIndex !== undefined) {
      return cachedIndex
    }

    const index = snapshot.context.value.findIndex((node) => node._key === key)

    return index === -1 ? undefined : index
  }
}

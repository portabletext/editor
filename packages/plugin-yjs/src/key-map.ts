import type * as Y from 'yjs'
import type {KeyMap} from './types'

/**
 * Create a bidirectional lookup between PT `_key` and `Y.XmlText`.
 *
 * @public
 */
export function createKeyMap(): KeyMap {
  const keyToYText = new Map<string, Y.XmlText>()
  const yTextToKey = new Map<Y.XmlText, string>()

  return {
    getYText(key: string): Y.XmlText | undefined {
      return keyToYText.get(key)
    },

    getKey(yText: Y.XmlText): string | undefined {
      return yTextToKey.get(yText)
    },

    set(key: string, yText: Y.XmlText): void {
      keyToYText.set(key, yText)
      yTextToKey.set(yText, key)
    },

    delete(key: string): void {
      const yText = keyToYText.get(key)
      if (yText) {
        yTextToKey.delete(yText)
      }
      keyToYText.delete(key)
    },
  }
}

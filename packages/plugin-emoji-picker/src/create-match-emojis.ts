import type {MatchEmojis} from './match-emojis'

/**
 * Proposed, but not required type, to represent an emoji match.
 *
 * @example
 * ```tsx nocheck
 * {
 *   type: 'exact',
 *   key: '😂-joy',
 *   emoji: '😂',
 *   keyword: 'joy',
 * }
 * ```
 * @example
 * ```tsx nocheck
 * {
 *   type: 'partial',
 *   key: '😹-joy-_cat',
 *   emoji: '😹',
 *   keyword: 'joy',
 *   startSlice: '',
 *   endSlice: '_cat',
 * }
 * ```
 *
 * @beta
 */
export type EmojiMatch =
  | {
      type: 'exact'
      key: string
      emoji: string
      keyword: string
    }
  | {
      type: 'partial'
      key: string
      emoji: string
      keyword: string
      startSlice: string
      endSlice: string
    }

/**
 * Proposed, but not required, function to create a `MatchEmojis` function.
 *
 * @example
 * ```ts
 * import {createMatchEmojis} from '@portabletext/plugin-emoji-picker'
 *
 * const matchEmojis = createMatchEmojis({
 *   emojis: {
 *     '😂': ['joy'],
 *     '😹': ['joy_cat'],
 *   },
 * })
 * ```
 *
 * @beta
 */
export function createMatchEmojis(config: {
  emojis: Record<string, ReadonlyArray<string>>
}): MatchEmojis<EmojiMatch> {
  return ({keyword}: {keyword: string}) => {
    const foundEmojis: Array<EmojiMatch> = []

    if (keyword.length < 1) {
      return foundEmojis
    }

    for (const emoji in config.emojis) {
      const emojiKeywords = config.emojis[emoji] ?? []

      for (const emojiKeyword of emojiKeywords) {
        const keywordIndex = emojiKeyword.indexOf(keyword)

        if (keywordIndex === -1) {
          continue
        }

        if (emojiKeyword === keyword) {
          foundEmojis.push({
            type: 'exact',
            key: `${emoji}-${keyword}`,
            emoji,
            keyword,
          })
        } else {
          const start = emojiKeyword.slice(0, keywordIndex)
          const end = emojiKeyword.slice(keywordIndex + keyword.length)

          foundEmojis.push({
            type: 'partial',
            key: `${emoji}-${start}${keyword}${end}`,
            emoji,
            keyword,
            startSlice: start,
            endSlice: end,
          })
        }
      }
    }

    return foundEmojis
  }
}

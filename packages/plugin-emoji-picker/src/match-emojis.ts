import {emojis} from './emojis'

/**
 * @beta
 */
export type EmojiMatch =
  | {
      type: 'exact'
      emoji: string
      keyword: string
    }
  | {
      type: 'partial'
      emoji: string
      keyword: string
      startSlice: string
      endSlice: string
    }

/**
 * @beta
 */
export type MatchEmojis = (keyword: string) => Array<EmojiMatch>

/**
 * @beta
 */
export const matchEmojis: MatchEmojis = createMatchEmojis({emojis})

/**
 * @beta
 */
export function createMatchEmojis(config: {
  emojis: Record<string, Array<string>>
}): MatchEmojis {
  return (keyword: string) => {
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
            emoji,
            keyword,
          })
        } else {
          const start = emojiKeyword.slice(0, keywordIndex)
          const end = emojiKeyword.slice(keywordIndex + keyword.length)

          foundEmojis.push({
            type: 'partial',
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

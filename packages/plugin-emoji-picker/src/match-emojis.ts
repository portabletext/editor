/**
 * The base type representing an emoji match.
 *
 * @beta
 */
export type BaseEmojiMatch =
  | {
      type: 'exact'
      emoji: string
    }
  | {
      type: 'partial'
      emoji: string
    }

/**
 * A function that returns an array of emoji matches for a given keyword.
 *
 * @beta
 */
export type MatchEmojis<TEmojiMatch extends BaseEmojiMatch = BaseEmojiMatch> =
  (query: {keyword: string}) => ReadonlyArray<TEmojiMatch>

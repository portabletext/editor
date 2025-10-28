---
'@portabletext/plugin-emoji-picker': patch
---

fix: require `MatchEmojis` to return a `BaseEmojiMatch`

The internals of the emoji picker requires a `type` `'exact'` or `'partial'` as
well as an `emoji` prop to pluck the emoji for insertion.

```ts
export type BaseEmojiMatch =
  | {
      type: 'exact'
      emoji: string
    }
  | {
      type: 'partial'
      emoji: string
    }
```

---
'@portabletext/plugin-emoji-picker': patch
---

fix: strip leading and trailing colons from returned `keyword`

It's confusing and contradicting if the `keyword` returned from
`useEmojiPicker` includes colons if the `keyword` passed to `MatchEmojis`
doesn't.

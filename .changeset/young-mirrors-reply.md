---
'@portabletext/plugin-emoji-picker': patch
---

fix: exclude default list of emojis

This potentially bloats the bundle of consumer apps, and there is no need to
include it when you can just install `emojilib` and use it from there.

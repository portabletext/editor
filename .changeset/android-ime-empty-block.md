---
'@portabletext/editor': patch
---

fix: keep the Android IME's text node when composing into an empty block

On Android, composing with a Japanese IME in an empty block no longer commits the first character on its own. Typing きょう and picking 今日 now gives 今日 instead of き今日, both in an empty editor and on a new line after pressing Enter.

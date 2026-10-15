---
'@portabletext/editor': patch
---

fix: keep the first character of an Android IME composition in an empty block

On Android, composing with a Japanese IME in an empty block no longer commits the first character on its own. Typing きょう and picking 今日 now gives 今日 instead of き今日, including on a new line after pressing Enter. While composing into an empty block on Android, the placeholder now stays visible until the composition ends.

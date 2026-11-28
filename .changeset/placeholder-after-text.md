---
'@portabletext/editor': patch
---

fix: render the placeholder after the empty span so Android keyboards capitalise the first word

Gboard on Android now capitalises the first word typed into an empty editor that uses `renderPlaceholder`. The placeholder used to come before the empty span, so Chrome counted its text as text before the caret and Gboard read the empty editor as mid-sentence.

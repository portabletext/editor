---
'@portabletext/editor': patch
---

fix: remove the native `insertText` fast path

Typing a character that a Behavior swallows no longer leaves the character visible in the editor: all text insertion now flows through the model, so a swallowed `insert.text` event never leaves a stray character stuck in the DOM.

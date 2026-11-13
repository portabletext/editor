---
'@portabletext/editor': patch
---

fix: handle Android input through `beforeinput`

On Android the editor now handles input the same way as on desktop. Composition text is applied at the browser's target range as it arrives, and when a composition ends the composed text is redrawn from the value, so the screen matches the value. The Android-only input manager, which kept input as text diffs and applied them on a timer, is removed.

Three things change on Android. Pressing Enter while a word is still composing keeps the word, where before it was lost. A delete the keyboard sends behind the caret changes the value at once. An edit from a collaborator or from code to the word being composed ends the composition, and the editor emits `blurred` then `focused`.

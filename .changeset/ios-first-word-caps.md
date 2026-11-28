---
'@portabletext/editor': patch
---

fix: leave the zero-width character out of empty lines on iOS

Typing into an empty block on iOS now gets the keyboard's automatic first-word capitalisation. Previously the keyboard turned Shift off, so typing "hello" into an empty block gave "hello".

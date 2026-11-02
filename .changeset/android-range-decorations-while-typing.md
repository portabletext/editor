---
'@portabletext/editor': patch
---

fix: keep Android input working when range decorations change while typing

On Android, a range decoration that appears, moves or disappears on or next to the text being typed no longer makes typed text vanish or appear twice, closes the keyboard, or crashes the editor with `NotFoundError: Failed to execute 'removeChild'`.

While a word is being composed on Android, decoration changes on that word and on the text joined to it appear when composing ends. Changes elsewhere appear at once. On every platform, remounting an editable no longer carries over an unfinished composition from before.

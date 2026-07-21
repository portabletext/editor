---
'@portabletext/plugin-sdk-value': patch
---

fix: only repair divergence that persists, never transient store states

With two users typing simultaneously (even in different blocks), a remote
transaction arriving interleaved with the listener echoes of this client's
own recent edits leaves the store value transiently wrong until the rebase
corrects it moments later. The whole-value repair used to fire inside that
window: it copied the transient into the editor (deleting real text) and a
follow-up repair restored the text at a drifted offset, scrambling words
the user typed in between.

The repair now confirms divergence before acting: it waits out the echo
round trip and only applies when the exact (editor, store) state pair is
unchanged, and never while local keystrokes are unflushed. Transients
self-correct and produce no editor writes; genuine divergence is stable
and gets repaired one beat later.

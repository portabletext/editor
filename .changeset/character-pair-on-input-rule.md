---
'@portabletext/plugin-character-pair-decorator': patch
---

fix: rebuild `CharacterPairDecoratorPlugin` on `plugin-input-rule`

`CharacterPairDecoratorPlugin` behaves as before, typing the closing half of a pair decorates the content, deletes the markers, and Backspace immediately after restores the literal text, but it is now implemented as an input rule on `@portabletext/plugin-input-rule` instead of carrying its own state machine. The package no longer depends on `xstate` or `@xstate/react` and instead depends on `@portabletext/plugin-input-rule`.

Net behavior is unchanged: a pair whose content spans an inline object still decorates, and a pair whose markers sit on either side of an inline object still stays literal, both now pinned by tests.

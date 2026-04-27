---
'@portabletext/plugin-markdown-shortcuts': patch
---

fix: do not consume Backspace when the default style is unavailable

The `clearStyleOnBackspace` shortcut consumed Backspace and reverted
the focused block to the default style. Inside a sub-schema that does
not declare the default style (for example, a `code-block` whose
lines only allow `code`), this turned a useful Backspace into a no-op
that swallowed the keystroke. The shortcut now no-ops only when there
is something useful to clear.

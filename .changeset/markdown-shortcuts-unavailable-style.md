---
'@portabletext/plugin-markdown-shortcuts': patch
---

fix: do not consume keystrokes when the resulting block change is unavailable

Three shortcuts previously consumed their keystroke and produced a
no-op when the focused block's sub-schema didn't allow the resulting
change: `clearStyleOnBackspace` reverting to a missing default style,
the ordered-list rule (`1. `) applying a missing list, and the
unordered-list rule (`- `) applying a missing list. Inside a
container whose sub-schema declares fewer styles or lists than the
root (for example, a `code-block` whose lines only allow
`monospace`), each of these turned a useful keystroke into a
swallowed no-op. The shortcuts now skip when there is nothing useful
to apply.

---
'@portabletext/editor': patch
---

fix: keep same-key siblings indexed when a duplicate `_key` is renamed

Pressing Backspace after the editor receives a new value that removes a block above the caret no longer deletes everything from the start of the document to the caret. For example, with the blocks "foo", "bar", "baz" and "qux", syncing a value without "bar" and then pressing Backspace at the end of "baz" now leaves "foo", "ba" and "qux". Previously it left a single empty block followed by "qux".

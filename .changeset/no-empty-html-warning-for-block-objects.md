---
'@portabletext/editor': patch
---

fix: don't warn when copying only block objects leaves `text/html` empty

Copying, cutting or dragging a selection that holds only block objects (an image, a table) no longer logs `Serialization of text/html failed with reason "Serialized HTML is empty"` to the console. Block objects have no HTML form, so an empty `text/html` entry is expected, and the clipboard still carries the selection as Portable Text, JSON and plain text. Other serialization failures still warn.

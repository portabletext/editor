---
'@portabletext/editor': patch
---

fix: delete to the line or paragraph edge on line delete input

Deleting to the start or end of a paragraph (the `deleteHardLineBackward` and `deleteHardLineForward` input types) now deletes from the caret to the paragraph edge instead of removing the whole block, and merges with the neighbouring block when the caret is already at that edge. Deleting forward to the end of a line (`deleteSoftLineForward`) now deletes to the end of the visual line instead of a single character. Deleting the entire line (`deleteEntireSoftLine`) on a line with content now deletes only that visual line, and never deletes an explicit `\n` before or after it. Deleting to the start or end of a paragraph from inside it now raises a `delete` event with a range instead of `delete.backward` or `delete.forward`. Deleting an entire line that has content does the same. Behaviors that intercept those keys should listen for `delete`. Deleting an empty line still raises `delete.backward` and `delete.forward`, as before, which can join it with the lines around it. A forward line delete can stop before an inline object at the end of the line and leave it behind, when the object is taller than the text, and in Safari when the line wraps.

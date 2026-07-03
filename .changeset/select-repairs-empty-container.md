---
'@portabletext/editor': patch
---

fix: repair an empty container when `select` resolves onto it

A behavior that removes every block inside an editable container child (like the table plugin's rectangle clear on a cell) and then selects it used to leave the selection parked on the container itself, since the replacement empty block only gets minted when normalization runs later. Typing in that state silently dropped the first character. The `select` operation now repairs the container the way normalization would and resolves again, so the caret lands inside the repaired container and typing works immediately.

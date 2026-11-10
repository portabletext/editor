---
'@portabletext/editor': patch
---

fix: map range decorations once per committed change

Range decorations now receive one final movement notification for an editor
change instead of intermediate notifications for each operation. Local and
remote edits use the same committed-change mapping path.


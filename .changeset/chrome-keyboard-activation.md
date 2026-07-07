---
'@portabletext/plugin-table': patch
---

fix: chrome buttons activate with `Space` and `Enter`

The extend lanes, boundary insert dots, row and column handles, the trash
chip, and the built-in menu trigger could be focused with the keyboard but
not activated: they acted on pointer presses only. They now activate on
`click`, which serves pointer and keyboard alike; a handle activation
selects its row or column, same as a press without a drag. For pointers
this moves the action from press to release, matching platform buttons and
allowing drag-off to cancel.

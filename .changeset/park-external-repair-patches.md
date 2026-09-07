---
'@portabletext/editor': patch
---

fix: park external repair patches until the first local edit

When remote patches deliver content the engine has to repair (a missing `_key`, missing children, a duplicate key), the repair patches are no longer published immediately from an untouched editor. They are held and published together with the first local edit, ahead of it, so the document always learns a repair before any edit references it. An editor the user never edits no longer writes repairs to the document, a read-only editor never publishes them, and a value sync or a conflicting remote patch discards held repairs that no longer apply.

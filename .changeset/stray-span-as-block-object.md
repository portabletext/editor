---
'@portabletext/editor': patch
---

fix: draw a span where a block belongs as a block object

A span where a block belongs no longer crashes the editor. This covers a span inside an editable container and a span a collaborator inserts at the root. The editor draws the span as a block object. Its text is hidden. It emits no correction patches for the span except to rename a duplicate `_key`. Missing and empty `_key` values stay as received. Backspace deletes the selected span with one `unset` patch.

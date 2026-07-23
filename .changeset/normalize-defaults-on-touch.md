---
'@portabletext/editor': patch
---

fix: normalize optional-field defaults only when a local edit touches the block

Loading a document (`initialValue`) or receiving an `update value` no longer fills in missing `style`, `marks`, or `markDefs` fields: adopted blocks stay exactly as the document has them, in the editor's value too, and no patches are held back for them. When a local edit touches such a block, its defaults are filled in and emitted as part of that edit.

Consumers reading `editor.getSnapshot().context.value` will see adopted blocks without these optional fields until the user edits them (renderers already default the fields at read time). The first edit after opening no longer flushes a document-wide wave of default writes; each block's defaults ride the edit that touches it. Validity-critical repairs (missing `_key`/`_type`/`text`, duplicate keys, empty blocks) still run on every path.

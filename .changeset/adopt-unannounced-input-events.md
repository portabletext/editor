---
'@portabletext/editor': patch
---

fix: adopt unannounced `insertText`/`delete` input events into the model

Text corrections applied by browser extensions (Grammarly, LanguageTool, Microsoft Editor, and similar) now persist. These tools replace text via `document.execCommand`, which fires no `beforeinput`, so the editor never saw the edit: the correction looked applied but produced no patches and silently reverted on the next value change. The editor now adopts such an edit by diffing the affected span's rendered text against the model and replaying the change as an ordinary text edit: patches are emitted, undo works, and behaviors observe it like typed input.

A correction spanning multiple differently-marked spans - Grammarly rewording a whole sentence across a bold word, say - now also persists, reconstructed from the block's corrected text rather than one span's. That correction is applied the same way a keystroke over the same selection would be, so any formatting inside the corrected range does not survive it: marks on the replaced words are gone, not preserved on a fragment of them. A correction that inserts rich content, or whose reconstructed text disagrees with what the browser reported inserting or deleting, still isn't adopted.

Previously, a correction that couldn't be adopted could also leave the block's DOM out of step with the model badly enough that the editor stopped responding to further input. The editor now recognizes when a correction (adopted or not) has left a block's DOM structurally different from the model and repairs it, so typing keeps working afterward - including when the damage reaches beyond the one block the correction started in.

A correction landing immediately before or after an inline object (a mention, an emoji) now adopts correctly, placed on the right side of it; a correction that reaches across one still isn't adopted. A correction whose new text shares characters with the text around it - replacing a word with a near-identical one, or just adding a letter to the end - now adopts correctly instead of being silently dropped.

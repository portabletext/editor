---
'@portabletext/editor': patch
---

fix: adopt unannounced `insertText`/`delete` input events into the model

Text corrections applied by browser extensions (Grammarly, LanguageTool, Microsoft Editor, and similar) now persist. These tools replace text via `document.execCommand`, which fires no `beforeinput`, so the editor never saw the edit: the correction looked applied but produced no patches and silently reverted on the next value change. The editor now adopts such an edit by diffing the affected span's rendered text against the model and replaying the change as an ordinary text edit: patches are emitted, undo works, and behaviors observe it like typed input.

One limit: a correction that inserts rich content or spans differently-marked text is not adopted and still reverts.

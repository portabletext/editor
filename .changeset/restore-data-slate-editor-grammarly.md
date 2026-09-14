---
'@portabletext/editor': patch
---

fix: restore `data-slate-editor` on the editable element so Grammarly recognizes it

Accepting a Grammarly correction persists again. Grammarly fingerprints editors by DOM attributes: with `data-slate-editor` present it applies corrections through synthetic `beforeinput` events, which the editor handles. Since v8.0.0 removed the Slate-era `data-slate-*` aliases, Grammarly fell back to a DOM-mutation channel the editor cannot observe, so corrections looked applied but never reached the document and reverted.

The attribute is a temporary workaround, not public API: it will be removed again, without warning, once the editor handles that fallback channel without it. Do not style or query against it.

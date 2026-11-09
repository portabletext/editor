---
'@portabletext/editor': patch
---

fix: deprecate the `selection` prop

The `selection` prop on `PortableTextEditable` is deprecated in favor of sending a `select` event when the editor emits `ready`. The prop keeps working.

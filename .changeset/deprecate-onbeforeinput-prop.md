---
'@portabletext/editor': patch
---

fix: deprecate the `onBeforeInput` prop

The `onBeforeInput` prop on `PortableTextEditable` is deprecated in favor of a Behavior on the event to intercept, or a `beforeinput` listener on a parent element. The prop keeps working.

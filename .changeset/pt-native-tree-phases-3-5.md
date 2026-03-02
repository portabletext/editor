---
'@portabletext/editor': patch
---

Remove void-child spans from the Slate tree. Block objects and inline objects are now ObjectNode leaf nodes without children arrays. The bridge code that maintained editor.value as a separate PT representation has been deleted - editor.value is now a getter over editor.children. The renderElement callback receives children: null for ObjectNodes.

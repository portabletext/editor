---
'@portabletext/editor': patch
---

fix: avoid thrown error if the editor has been unmounted

The editor attempts to validate its selection upon unexpected DOM changes. However, in some cases, this logic might run after the editor has been unmounted and removed from the DOM. In this case an error would be thrown because no editor DOM node could be found. This error has now been suppressed as there is no need to surface it to the user.

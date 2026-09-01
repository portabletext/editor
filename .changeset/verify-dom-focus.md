---
'@portabletext/editor': patch
---

fix: report `focus` honestly when something else holds the focus

`editor.send({type: 'focus'})` now confirms the browser actually moved focus onto the editable before treating the request as done. When a focus trap or an `inert` container claims focus back, the editor no longer reports itself as focused while the DOM disagrees.

A later `editor.send({type: 'focus'})` now works instead of being swallowed by that stale state, and a request that never lands gives up quietly instead of throwing.

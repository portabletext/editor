---
'@portabletext/editor': patch
---

fix: skip native character insertion while a decorator toggle is pending

Toggling a decorator on a collapsed cursor (e.g. Cmd/Ctrl+B) and then typing
no longer renders a duplicate, undecorated copy of the typed character before
the decorated one. The model was always correct; only the rendered DOM showed
the ghost, which cleared on the next re-render.

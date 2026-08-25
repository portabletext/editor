---
'@portabletext/editor': patch
---

fix: identify shadow roots by node type instead of a `host` property

The shadow DOM-aware DOM traversals treated any parent node carrying a `host` property as a shadow root. A `<form>` exposes its own controls as named properties, so `'host' in form` is true for any form containing an element with `id="host"` or `name="host"` — the form was mistaken for a shadow root and the upward walk stepped from the form to that control and back forever, hanging the tab.

This surfaced in editors rendered inside a form that has a field named `host`: moving the selection between two editors locked the browser, because rewriting the DOM selection runs one of these traversals from a layout effect. Shadow roots are document fragments, so the node type now separates them from a form.

---
'@portabletext/editor': patch
---

fix: read schema from editor instead of actor selector

The render components were each subscribing to the editor's xstate
machine to read the schema, even though the schema is effectively
static for the lifetime of an editor. For an insert of 1000 blocks
that meant ~3000 unnecessary subscriptions and corresponding
notifications. The schema is now threaded as a prop from the top of
the render tree so the inner components don't subscribe at all.

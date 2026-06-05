---
"@portabletext/editor": patch
---

fix: allow catch-all `defineX({type: '*'})` registrations across kinds

A `defineTextBlock({type: '*'})` registration no longer blocks subsequent `defineBlockObject({type: '*'})` and `defineInlineObject({type: '*'})` registrations. The `'*'` sentinel is a kind-specific catch-all and is not subject to the cross-kind exclusivity that applies to real `_type` identifiers.

---
'@portabletext/editor': patch
---

fix: make cross-container decorator, style, and list toggles round-trip

When a selection spans both root text blocks and an editable container whose sub-schema does not declare a given decorator, style, or list, toggling that mark previously got stuck after the first toggle: the in-scope blocks would receive the mark, but the toolbar's "is active" check then voted with out-of-scope blocks too, so a second toggle could not clear the mark.

The active-mark selectors now skip blocks and spans where the mark is out of scope, matching the rule already established for cross-container mark state: a mark is active when every in-scope position carries it. `block.set` likewise gates the `level` prop on the destination block's sub-schema, so cross-container range operations no longer attach list metadata to blocks that cannot carry list items.

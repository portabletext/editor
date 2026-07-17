---
'@portabletext/plugin-sdk-value': minor
---

Sync through operational patches instead of whole-value diffs when the SDK supports it.

`SDKValuePlugin` now subscribes to the SDK's `remote-patches` document events and applies patches from other clients directly to the editor, and pushes the editor's own patches back through `editDocument` with `preserveOperations`. This lets two people edit the same Portable Text field concurrently without overwriting each other. Whole-value sync remains as a fallback for SDK versions without the patch channel (`@sanity/sdk-react` < 2.17) and for patches that cannot be scoped to the field.

`ValueSyncPlugin` accepts optional `onRemotePatches` and `pushPatches` config to drive the same behavior with a custom store.

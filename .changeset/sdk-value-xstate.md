---
'@portabletext/plugin-sdk-value': patch
---

fix: replace boolean flags with XState machine

The plugin used boolean flags (`isLocalWrite`, `hasPendingWrites`, `pendingSync`) to coordinate sync between the editor and the SDK store. These flags were fragile: the `useEffect` that managed them re-ran whenever `setSdkValue` changed reference (every parent render), sending stale update value events that caused data loss during rapid typing.

---
'@portabletext/plugin-sdk-value': patch
---

fix: suppress echo callback on local writes in SDKValuePlugin

Add a local-write flag to prevent the SDK change subscriber from
sending spurious patches back to the editor after a local edit.
The entire chain from setSdkValue to onSdkValueChange is synchronous,
so the flag reliably distinguishes local writes from remote changes.

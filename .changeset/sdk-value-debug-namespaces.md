---
'@portabletext/plugin-sdk-value': patch
---

fix: route sync diagnostics through the `debug` library

The sync diagnostics channel is now enabled with `localStorage.debug = 'pte:plugin-sdk-value:*'` (before load) instead of the `globalThis.__PTE_SYNC_DEBUG` flag, which is removed. The log kinds become individually filterable namespaces (`pte:plugin-sdk-value:repair`, `:push`, `:remote`, `:mutation`), and enabling `pte:*` interleaves them with the editor's own debug output on one timeline. The channel stays free when disabled.

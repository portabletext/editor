---
'@portabletext/editor': patch
'@portabletext/plugin-sdk-value': patch
---

fix(deps): replace `debug` with `obug`

Both packages now pull in `obug`, an actively maintained ESM/TypeScript fork of `debug`, instead of `debug` itself. Debug output is unchanged: the same namespaces (`pte:*`, `pte:plugin-sdk-value:*`) are still enabled the same way, via the `DEBUG` environment variable in Node.js or `localStorage.debug` in browsers. `@types/debug` is no longer installed alongside it, since `obug` ships its own types.

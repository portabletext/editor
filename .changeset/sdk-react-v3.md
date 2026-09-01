---
'@portabletext/plugin-sdk-value': patch
---

fix: support `@sanity/sdk-react` 3 with normalized document handles

`@portabletext/plugin-sdk-value` now supports `@sanity/sdk-react` 3 in addition to 2.19 and later. The removed `source` document-handle alias is translated to `resource`, so existing integrations do not need code changes.

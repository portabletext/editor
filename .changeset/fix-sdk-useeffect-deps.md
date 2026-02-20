---
'@portabletext/plugin-sdk-value': patch
---

Fix `useEffect` dependency array in `SDKValuePlugin` — destructure `props` into primitive values (`documentId`, `documentType`, `path`) to prevent subscriptions from being torn down and re-created on every parent re-render.

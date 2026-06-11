---
"@portabletext/editor": patch
---

fix: a throwing `editor.on` listener no longer affects other listeners

When a listener registered via `editor.on(...)` threw, it prevented the remaining listeners from receiving that event and propagated the error into the editor flow that emitted it — a throwing `patch` listener, for example, could interrupt the mutation batcher mid-flush. Listener errors are now contained per listener and reported via `console.error`; delivery to the other listeners continues, and the emitting flow is unaffected.

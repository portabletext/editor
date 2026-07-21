---
'@portabletext/editor': patch
---

fix: prevent unbounded `annotation.add` raise recursion under concurrent editing

The `preventOverlappingAnnotations` Core Behavior raises `annotation.remove` followed by the original `annotation.add` whenever its guard considers the annotation active. The guard and the `annotation.remove` operation could disagree on the effective selection: the guard read the raw `at` while the operation resolved stale points to a fallback position. When they disagreed, the remove stripped nothing, the guard kept answering "active", and the raise chain recursed until the call stack overflowed, leaving the editor blank. Concurrent remote patches routinely produce such selections by splitting or consuming the spans an in-flight `at` points to.

The guard now resolves `at` through the same machinery as the operation before asking whether the annotation is active, so the two can no longer disagree and the chain terminates.

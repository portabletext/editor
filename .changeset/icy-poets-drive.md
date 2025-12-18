---
'@portabletext/editor': patch
---

fix: optimize internal logic that calculates `focused` and `selected` states

Before this change, each rendered block and child subscribed individually to
selection state using Slate's selector system. When deleting large selections,
hundreds of these subscriptions would clean up synchronously during React's
commit phase, blocking the main thread and causing the editor to freeze for
several seconds.

Now, selection state is computed once in a shared context and components
perform simple O(1) lookups. This eliminates per-component subscription
overhead and makes bulk deletions near-instant, even for documents with
hundreds of blocks.

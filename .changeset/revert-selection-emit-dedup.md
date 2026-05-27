---
'@portabletext/editor': patch
---

fix: revert `'selection'` emission dedup

Reverts the semantic equality guard introduced in 7.0.3. The guard correctly skipped duplicate `'selection'` emissions when only the underlying reference changed, but it also swallowed the deliberate "re-emit" used by `decorator.add` / `decorator.remove` to wake up consumers when toggling a decorator does not move the caret. That signal is what toolbars rely on to refresh their active-decorator state when:

- the caret is collapsed and the user toggles a decorator to take effect on the next typed character, or
- the selection already covers an entire span and the toggle marks the existing span without splitting it.

In both cases the selection's anchor, focus, and direction are unchanged across the operation, so the semantic guard skipped the re-emit and consumers saw stale state.

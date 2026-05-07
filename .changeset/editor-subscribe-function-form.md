---
'@portabletext/editor': minor
---

`Editor.subscribe` now accepts both the observer-form (`{next, error, complete}`) and the deprecated function-form (`subscribe(next, error?, complete?)`). The function-form satisfies xstate's wider `Subscribable<T>` constraint, so `useSelector(editor, selector)` from `@xstate/react` accepts the editor directly without a cast.

Internally the function-form re-routes to the observer-form. New code should prefer the observer-form; the function-form exists for structural compatibility with libraries that still type their constraints to include it.

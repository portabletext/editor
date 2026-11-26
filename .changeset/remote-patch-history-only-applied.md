---
'@portabletext/editor': patch
---

fix: rebase undo and redo only against remote patches that changed the value

Undo after a remote patch that didn't apply now undoes the local edit. Previously the editor recorded every incoming remote patch for undo and redo to rebase against, including one that changed nothing, such as a stale `diffMatchPatch` whose hunks don't match the current text. Undo then rebased the local edit over a change that never happened, and the edit could stay in place:

```ts
// The span reads 'foobar', and the user types 'x' at the end
editor.send({
  type: 'apply',
  patches: [diffMatchPatch('bazbazbaz', 'qbazbazbaz', textPath)],
})
editor.send({type: 'history.undo'})
// Previously the span still read 'foobarx'; it now reads 'foobar'
```

A remote whole-value `unset` still clears the undo and redo stacks.

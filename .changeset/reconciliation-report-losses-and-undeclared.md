---
'@portabletext/markdown': minor
---

feat: report what an edit loses or adds outside the schema in the reconciliation report

The `ReconciliationReport` that `applyMarkdownEdit` passes to `onReconciliation` now carries `markdownLosses` and `undeclaredObjects` next to `hiddenLosses`, on both the performed and the skipped variant. `markdownLosses` lists what the edited markdown said that the result does not hold (the same `Degradation` entries `deserialize.onDegradation` receives, except `object-type-undeclared`). `undeclaredObjects` lists the objects the edit added whose type the schema does not declare, each as an `UndeclaredObject` with its `_type`, `_key`, `position`, `path` into the returned value and a display `message`. An undeclared object is kept as written, so it is not lost, but the schema does not allow it. Together with `hiddenLosses`, the three lists say whether saving the result loses content or adds content the schema does not allow:

```ts
applyMarkdownEdit(stored, editedMarkdown, {
  onReconciliation: (report) => {
    if (
      report.hiddenLosses.length > 0 ||
      report.markdownLosses.length > 0 ||
      report.undeclaredObjects.length > 0
    ) {
      throw new Error('The edit cannot be saved as is')
    }
  },
})
```

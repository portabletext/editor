---
'@portabletext/markdown': minor
---

feat: report content an edit lost without the markdown showing it

Every `ReconciliationReport` passed to `applyMarkdownEdit`'s `onReconciliation` now carries `hiddenLosses`: one `SerializeDegradation` per annotation, decorator, block style, or list-item kind the `serialize` options could not express in markdown and that is missing from the returned value. Content `applyMarkdownEdit` restores is not listed, and neither are losses on blocks the edit deleted. A non-empty list means saving the result drops content whoever edited the markdown never saw, so a caller can refuse or retry the write:

```ts
import {applyMarkdownEdit} from '@portabletext/markdown'

const edited = applyMarkdownEdit(stored, editedMarkdown, {
  onReconciliation: (report) => {
    if (report.hiddenLosses.length > 0) {
      throw new Error(report.hiddenLosses.map((loss) => loss.message).join('; '))
    }
  },
})
```

Code that builds a `ReconciliationReport` by hand needs to add the field.

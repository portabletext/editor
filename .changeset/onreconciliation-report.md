---
'@portabletext/markdown': minor
---

feat: add `onReconciliation` report to `applyMarkdownEdit`

`applyMarkdownEdit` can now report exactly what it did with every key, through a new `onReconciliation` option on `ApplyMarkdownEditOptions`:

```ts
import {applyMarkdownEdit} from '@portabletext/markdown'

applyMarkdownEdit(storedPortableText, editedMarkdown, {
  onReconciliation: (report) => {
    console.log(report.restorations) // keys that kept their identity, and why
    console.log(report.refusals) // points where reconciliation gave up
    console.log(report.repairs) // keys rewritten to stay unique among siblings
  },
})
```

The callback fires at most once, and exactly once whenever the option is set, synchronously, right before `applyMarkdownEdit` returns, including when reconciliation refuses outright: that is when a caller needs the report most. `restorations` lists one entry per node whose stored key survived, tagged with the reason it did (`unchanged`, `moved`, `split`, `merged`, `positional`, or `similarity`); a node absent from the list got a fresh key, deliberately, whether that is new content or a `json:object` payload that carried its own key. `refusals` lists the points reconciliation gave up: a stored value that didn't round-trip, a document with too many distinct block forms to align, a gap whose evidence-gathering crossed the evidence pair cap, or a mark definition whose adopted key would have collided with a sibling. `repairs` lists every key rewritten to keep siblings unique, the `json:object`-duplicates-a-key case most commonly. Every `key` and `path` in the report matches the returned value exactly.

The two new exported types, `ReconciliationReport` and `ReconciliationKeyPath`, are diagnostic, not a contract: near the evidence caps, the reason for a given key varies with machine speed; never branch behavior on the report.

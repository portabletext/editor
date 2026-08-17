---
'@portabletext/editor': minor
---

feat: promote the applicable-schema and mark-state selectors from beta to public

`ApplicableSchema`, `getApplicableSchema`, `compareApplicableSchema`, `MarkState`, and `getMarkState` are now stable, public API. Their behavior is unchanged; only the stability guarantee changes.

```ts
import {useEditorSelector} from '@portabletext/editor'
import {getApplicableSchema, compareApplicableSchema} from '@portabletext/editor/selectors'

const applicableSchema = useEditorSelector(
  editor,
  getApplicableSchema,
  compareApplicableSchema,
)
```

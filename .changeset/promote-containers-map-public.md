---
'@portabletext/editor': minor
---

feat: promote the `containers` introspection map from alpha to public

`snapshot.context.containers` is no longer alpha. Its types are stable too: `Containers`, `RegisteredContainer`, `RegisteredSpan`, `RegisteredBlockObject`, `RegisteredInlineObject`, and `RegisteredPositional`. `OfDefinition` is now re-exported from the package root; it appears in `RegisteredContainer['field']`, whose shape is named via indexed access rather than a dedicated export.

The map is the read side of node registration: entries keyed by container `_type`, each carrying the array field that holds the container's editable children and any position-scoped child registrations.

```tsx
import {useEditorSelector} from '@portabletext/editor'

const tableRegistration = useEditorSelector(
  editor,
  (snapshot) => snapshot.context.containers.get('table'),
)
```

---
'@portabletext/editor': minor
---

feat: promote the traversal utils from beta to public

The traversal utilities are no longer beta: `getNode`, `getChildren`, `getParent`, `getSibling`, `getAncestor`, `getAncestors`, `getContainer`, `getFirstChild`, `getLastChild`, `getLeaf`, `getSpan`, `getText`, `getTextBlock`, `getAnnotation`, `getEnclosingBlock`, `getPathSubSchema`, `getUnionSchema`, `getBlock`, `isBlock`, `isInline`, `isLeafObject`, `isObject`, `hasNode`, `comparePoints`, `pathContains`, and `rangeIntersects` are all `@public` now and follow the package's normal semver guarantees.

```ts
import {getEnclosingBlock, getNode} from '@portabletext/editor/traversal'

const entry = getNode(snapshot, selection.anchor.path)
const block = entry ? getEnclosingBlock(snapshot, entry.path) : undefined
```

`getContainerChildren` stays `@beta`.

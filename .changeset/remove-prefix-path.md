---
'@portabletext/patches': major
---

feat!: remove `prefixPath`

`prefixPath` is no longer exported from `@portabletext/patches`. It was tagged `@internal` and was never meant to be part of the public API. The other exports (`applyAll`, `setIfMissing`, `diffMatchPatch`, `insert`, `set`, `unset` and the patch types) are unchanged. Code that imported `prefixPath` can build the prefixed patch inline:

```ts
import {set, type PathSegment} from '@portabletext/patches'

const patch = set('Hello', ['title'])
const segment: PathSegment = {_key: 'abc'}

const prefixed = {...patch, path: [segment, ...patch.path]}
```

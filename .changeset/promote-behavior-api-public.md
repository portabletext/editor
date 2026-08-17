---
'@portabletext/editor': minor
---

feat: promote the Behavior API from beta to public

The Behavior API is no longer beta. `defineBehavior`, the action creators (`execute`, `forward`, `raise`, `effect`), `editor.registerBehavior`, and `BehaviorPlugin` are stable. Their types are stable too: `Behavior`, `BehaviorAction`, `BehaviorActionSet`, `BehaviorEvent`, `SyntheticBehaviorEvent`, `NativeBehaviorEvent`, `CustomBehaviorEvent`, `BehaviorGuard`, and `InsertPlacement`.

```tsx
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getFocusTextBlock} from '@portabletext/editor/selectors'

const noBreakInTitles = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) =>
    snapshot.context.selection !== null &&
    getFocusTextBlock(snapshot)?.node.style === 'title',
  actions: [() => [raise({type: 'insert.soft break'})]],
})
```

The alpha primitive event forms stay alpha: `insert`, `remove.text`, `set`, `unset`, and the explicit `at`/`offset` form of `insert.text`.

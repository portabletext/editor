---
'@portabletext/editor': patch
---

fix: reduce overhead in behavior event pipeline

Guard `debug.behaviors` and `debug.operation` calls behind `.enabled` checks to avoid `JSON.stringify` when debug logging is off. Avoid spreading the behavior array on every `performEvent` call. Pre-compute the event namespace once instead of calling `String.includes` and `String.split` for every behavior in the filter. Create `EditorDom` once per `performEvent` instead of once per guard and once per action set. Reuse the guard snapshot for the first action set. Skip object spread in the unique-keys plugin when the inserted node already has a valid key. Cache `keyGenerator` reference in the unique-keys `normalizeNode`.

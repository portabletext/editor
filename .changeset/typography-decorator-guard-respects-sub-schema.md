---
'@portabletext/plugin-typography': patch
---

fix: respect the sub-schema at the focus when computing the decorator guard

`createDecoratorGuard` now resolves both the consumer's `decorators` callback and its disallowed-set against the focus block's sub-schema. Inside a registered editable container, the guard considers only the decorators that are declared in the applicable sub-schema, so typography rules don't get spuriously gated on decorators that aren't valid at the focus.

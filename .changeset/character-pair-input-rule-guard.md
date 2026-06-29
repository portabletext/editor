---
'@portabletext/plugin-character-pair-decorator': patch
---

fix: align the decorator-pair selection guard with `plugin-input-rule`

The detection of whether the caret has moved away from a just-applied character-pair decoration now matches `@portabletext/plugin-input-rule`: it compares block key and offset and falls back to a raw selection comparison when the caret lands somewhere block offsets can't be computed (such as an inline object). As a result the plugin no longer depends on `remeda`.

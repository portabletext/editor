---
'@portabletext/editor': patch
---

fix: keep a lone block repaired on intake instead of clearing the field

When the editor repairs content it is handed into a single empty block, for example a lone text block loaded with `children: []` or a remote `set` of a span without `text`, it now emits only the repair patches. Previously it also emitted `unset([])`, so the host cleared the field it had just been told to repair. Typing into a block repaired on load also no longer inserts that block a second time.

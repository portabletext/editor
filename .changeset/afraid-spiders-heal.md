---
'@portabletext/editor': minor
---

feat: improve `insert.text` composition

As part of the editors Core Behaviors, `insert.text` now triggers
`insert.child` whenever the `marks` on the given span should change. This
means, you can now `execute` `insert.text` events to circumvent that Behavior. Or `forward`/`execute` `insert.text` events from `insert.child` events.

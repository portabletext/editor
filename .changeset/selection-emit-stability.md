---
'@portabletext/editor': patch
---

fix: emit `'selection'` only when the selection actually moves

The `'selection'` event is now emitted only when an operation changes the
caret's anchor, focus, or direction. Previously, internal sync paths could
trigger redundant emits even when the selection was unchanged - for example,
when remote patches arrived for a different part of the value, or when the
sync machine re-ran on a value reference change.

Consumers can keep using `'selection'` as a signal for both real caret
movements and deliberate "active state changed" wake-ups (such as toggling a
decorator on a collapsed caret), and will no longer see spurious events on
unrelated value updates.

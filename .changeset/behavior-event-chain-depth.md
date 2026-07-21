---
'@portabletext/editor': patch
---

fix: depth-limit Behavior event chains so cycles fail loudly instead of overflowing the call stack

Behaviors can `raise`/`forward`/`execute` events recursively, and a Behavior whose guard never flips false recursed until the call stack overflowed, leaving the editor blank until reload. The event chain is now depth-limited: exceeding the limit drops the event with a single console error naming the event type, and the editor stays at its last consistent state. Legitimate event chains stay far below the limit, which measures nesting, not sequential fan-out.

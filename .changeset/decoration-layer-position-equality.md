---
'@portabletext/plugin-decorations': patch
---

fix: compare decoration positions by anchor and focus, ignoring extra selection keys

A decoration registered with a range captured from an editor selection (carrying `backward`, in particular) could spuriously report a `moved` event for a burst that never actually changed its position, such as an edit that moves it and moves it back, or a same-length edit inside it. `current` also churned in the same cases, handing out a new array even though nothing moved. Both now compare positions by anchor and focus alone, matching the shape a transformed range always has.

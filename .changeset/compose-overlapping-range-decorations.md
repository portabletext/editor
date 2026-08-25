---
'@portabletext/editor': patch
---

fix: render every overlapping range decoration instead of only the last

Overlapping range decorations now all render, nested in array order with the first outermost. Previously only the last decoration in the array rendered on the text where they overlapped.

One consequence rides along: a decoration that overlaps others renders one wrapper per overlap segment, so its component can mount multiple times for one decoration. Components with per-mount side effects or seam-sensitive CSS (borders, rounded corners) should expect fragmentation.

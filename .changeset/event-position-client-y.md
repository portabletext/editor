---
'@portabletext/editor': patch
---

fix: resolve drop and click positions in viewport coordinates

On a page where the window itself scrolls, dragging a block resolved every drop position to the hovered block's `end` edge once the page was scrolled: the drop indicator stuck to bottom edges and drops landed after the hovered block regardless of pointer position. The position math compared the event's page coordinates against viewport-relative element rects, so the scroll offset inflated every comparison; editors inside an inner scroll container (like Sanity Studio's panes) were unaffected because the two coordinate spaces coincide there. Positions now resolve from viewport coordinates in all cases. Block-boundary rect reads also now only happen when the pointer is over the editor's own surface rather than over a block, removing two layout reads per drag event.

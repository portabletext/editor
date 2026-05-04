---
'@portabletext/editor': patch
---

fix: do not unset editable containers when a delete range covers all of their text

Selecting all the text inside an editable container (such as a fact-box or
callout) and pressing Delete previously removed the container itself, since
the range fully covered it. The container is now preserved with an empty
placeholder block inside, matching what the user expects when emptying its
contents. Structural containers like tables continue to be removed when the
range covers them end-to-end.

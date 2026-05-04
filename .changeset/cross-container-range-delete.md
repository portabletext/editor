---
"@portabletext/editor": patch
---

fix: unify range-delete across container boundaries

Deleting a selection whose endpoints lie in different parents (root and inside a container, or two separate containers) now goes through the same range-delete primitive as same-parent deletes. The two paths used to disagree on which content survived; they now produce the same result modulo merge-on-delete (which only applies when both endpoints share a parent).

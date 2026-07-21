---
'@portabletext/sanity-bridge': patch
---

fix: reference root block objects by name at every nested position

Converting a Sanity schema whose types recurse back into the shared Portable Text array (containers, table cells, sidebars embedding `blockContent`) produced a definition that was cheap to build but factorially large as a tree: each type's single expansion inlined the expansions of every other type not on its first-visit path. Studios with wide mutually recursive schemas froze and ran out of memory on document open, not during the conversion itself but when the result was compiled, rendered, or serialized downstream.

Members that are root block objects now emit a bare `{type: name}` reference at every nested position, and their fields are materialized exactly once in the root `blockObjects`. The emitted definition is linear in the schema size, and `getSubSchema` (which has resolved bare references against root block objects since `@portabletext/schema` 2.2.3) resolves them as before. Inline declarations that merely share a name with a root type keep their own inline shape. Resolving these references requires `@portabletext/schema` 2.2.3 or later in the tree: guaranteed from `@portabletext/editor` 7.10.7, and satisfied by any fresh install of earlier 7.x releases (their `^2.2.2` range accepts it), so only lockfiles that pin `@portabletext/schema` at 2.2.2 or older need a refresh.

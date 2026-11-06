---
'@portabletext/steps': minor
---

feat: export `normalizeRangeBoundary` from steps

Use `normalizeRangeBoundary(value, range)` to represent an expanded range's
start at the end of the preceding sibling span when it lands at offset zero
of the next span. Pass `{representation: 'next'}` to recover the equivalent
next-span boundary before mapping another change.

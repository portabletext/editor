---
"@portabletext/sanity-bridge": minor
---

feat: add `getSanitySubSchema` walk

`getSanitySubSchema(rootPortableTextType, value, path)` returns the `PortableTextMemberSchemaTypes` view that applies at `path`. Sanity-side counterpart to `@portabletext/schema`'s `getSubSchema`. Walks the path against the Portable Text value to find the nearest container ancestor (or the root) and bucketizes its `of` declaration into the same shape as `createPortableTextMemberSchemaTypes`.

Studio integrations rendering Portable Text at container depth can resolve their schema view per-position instead of always reading from the root. `path`s that traverse only text blocks and their span children, stale `_key` references, and unregistered `_type`s all fall back to the root bucketization.

---
'@portabletext/editor': minor
---

feat: paste fits the incoming payload to the destination schema

Deserialized payloads used to be inserted unchanged. Pasting a `table` into a context that only accepts text blocks would silently no-op for the container block. The `deserialization.success → insert.blocks` handoff now reshapes the payload first: blocks whose `_type` is accepted at the destination are kept directly, container blocks whose `_type` is rejected are descended into for accepted descendants, and blocks that have no accepted descendants are dropped.

Each clipboard or drop payload is fitted in one place; consumer behaviors don't need to repeat the work.

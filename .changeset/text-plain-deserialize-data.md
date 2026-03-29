---
'@portabletext/editor': patch
---

fix: move `text/plain` inherit-formatting to `deserialize.data`

Consumer behaviors on `deserialize.data` can now override the default `text/plain` paste handling. Previously, the inherit-formatting logic ran on `deserialization.success`, which stripped structure from any blocks produced by consumer `deserialize.data` behaviors.

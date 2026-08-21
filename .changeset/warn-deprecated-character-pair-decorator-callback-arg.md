---
'@portabletext/plugin-character-pair-decorator': patch
---


fix: warn once when reading the deprecated `schema` callback argument

The `decorator` callback still receives the deprecated top-level `schema` argument, but reading it now logs a one-time console warning naming `context.schema` as the replacement. A callback that only reads `context.schema` sees no warning. The deprecated argument is removed in the next major.

Any read of the deprecated fields counts, including spreading the callback argument. The warning fires once per process; the deprecated fields are removed in the next major.

---
'@portabletext/sanity-bridge': patch
---

fix: preserve container block-member schema restrictions in `sanitySchemaToPortableTextSchema`

Converting a Sanity schema with a container (e.g. a code block) whose block member restricts decorators, annotations, styles, or lists now carries those restrictions into the resulting sub-schema. Previously every restricted list fell back to the root schema, so schema-driven plugins like `@portabletext/plugin-markdown-shortcuts` and `@portabletext/plugin-character-pair-decorator` would fire inside the container (turning `# ` into a heading, `**bold**` into bold) and produce schema-invalid content.

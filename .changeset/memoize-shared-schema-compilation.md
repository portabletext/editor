---
'@portabletext/schema': patch
---

fix: compile shared schema objects once per block inheritance

`compileSchema` no longer re-walks a field or array member it has already compiled under the same block inheritance. Schemas that reuse objects across positions, like the output of `sanitySchemaToPortableTextSchema`, now compile in linear time: a depth-24 binary shared schema that previously exhausted memory compiles in about 2ms.

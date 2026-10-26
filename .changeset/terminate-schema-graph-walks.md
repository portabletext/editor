---
'@portabletext/editor': patch
---

fix: terminate recursive editor walks over schema graphs

Container discovery and union-schema traversal now visit each schema object once when definitions contain shared references or cycles.

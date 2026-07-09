---
'@portabletext/editor': patch
---

fix: stop logging unresolvable marks and annotations

The two render warnings introduced in 7.10.4 are removed. Reporting
belongs to the host: the editor renders such values without effect and
stays silent.

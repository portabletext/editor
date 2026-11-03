---
'@portabletext/editor': patch
---

fix: emit the editor value at flush time as `mutation.value`, so remote changes applied before the flush are included

---
'@portabletext/editor': patch
---

fix: flush mutations one acknowledged batch at a time for hosts that echo patches

When a host feeds the editor's own patches back through the `patches` event (tagged `origin: 'local'`, the way a document patch stream does), the editor now treats those echoes as delivery confirmations: the next `mutation` event waits until every patch of the previous one has come back. A batch whose echoes never arrive is sent anyway after 5 seconds, with a console warning naming the unacknowledged patches, so a broken echo loop slows saving down and shows up in the console rather than stopping saves silently. Unmounting delivers a waiting batch immediately. Hosts that never feed patches back are unaffected and keep the existing cadence.

---
'@portabletext/editor': patch
---

fix: let the newest incoming value supersede a parked pending value

A newer document value arriving while an older one is still waiting to sync no longer loses to the older one. Previously, once a value was parked awaiting sync, a further incoming value was compared against the last value the editor had synced, not the parked one. A value that happened to match that older baseline (for example, the host unsetting a field back to its prior state) was dropped as "nothing new", so the stale parked value synced in instead of it. The editor could then treat that stale sync as persisted, which suppressed the usual rebuild on the next edit, leaving the edit targeting content the document no longer had.

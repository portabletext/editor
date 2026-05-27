---
'@portabletext/markdown': patch
---

fix: `DefaultTableRenderer` widens asymmetric tables to fit the widest row

When rows had different cell counts the delimiter row was sized to the header, so a GFM parser silently dropped cells from any body row that was wider than the header. The renderer now sizes the delimiter to the widest row and pads narrower rows with empty cells so all data survives the round-trip.

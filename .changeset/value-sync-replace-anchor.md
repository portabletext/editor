---
'@portabletext/editor': patch
---

fix: anchor replaced children on the incoming previous sibling during value sync

Updating the value of an editor whose document contains two or more
adjacent spans with identical marks (valid Portable Text, common after
CMS migrations) could crash the internal sync with `Cannot apply an
"insert" operation ... because the sibling was not found.` The editor
kept rendering and accepting keystrokes, but edits no longer reached the
consumer's patch stream until reload. Value updates on such documents
now sync correctly.

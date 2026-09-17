---
'@portabletext/markdown': patch
---

fix: upgrade markdown-it to v15, keeping fuzzy links and URL auth scanning on

Markdown parsing upgrades to markdown-it 15, which brings upstream fixes for pathological-input parsing performance (smartquotes, link scanning) and closer CommonMark conformance in a few edge cases. Bare-URL linkification is unchanged: bare domains (`www.example.com`) and URLs with an auth part (`http://user:pass@example.com/x`) still become links.

Also changed, at the extremes of what linkify accepts: unicode punctuation (for example an em dash) now ends a bare URL instead of being included in it, bare emails with `:`, `;`, or `,` in the local part no longer become links, and bare URLs stop matching past hard bounds (10,000 total characters, 10 subdomain labels, 100-character quoted path segments).

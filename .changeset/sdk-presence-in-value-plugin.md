---
'@portabletext/plugin-sdk-value': minor
---

feat: add presence, and `SDKPortableTextEditable`

Other people's carets now show up in a Portable Text field, and the local user's caret is reported so they show up elsewhere, including in the Studio.

`SDKPortableTextEditable` replaces `PortableTextEditable` and does all of it: value sync both ways, presence reporting, and drawing remote carets. It names the document and field once, so a separate `SDKValuePlugin` is no longer needed. Any `rangeDecorations` you pass are kept and merged with the presence carets rather than replaced.

Remote carets are drawn with a built-in caret component, so presence works without styling anything. Pass `renderCursor` to replace it, or `renderCursor={null}` to report presence without drawing carets.

`SDKPresencePlugin` and `useSDKPresenceCursors` are available for apps that render `PortableTextEditable` themselves.

The `@sanity/sdk-react` peer range moves to `^2.19.0`, which is where the presence hooks were added.

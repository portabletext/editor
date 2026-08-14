---
'@portabletext/editor': major
---

feat!: remove the built-in `text/markdown` converter

Copying no longer writes a `text/markdown` entry to the clipboard alongside `text/html` and `text/plain`, and pasting `text/markdown` data no longer auto-parses it into Portable Text blocks; the paste falls back to `text/html` or `text/plain` instead. Every editor stops bundling `markdown-it` (~123KB minified), whether or not it used Markdown paste. The built-in converter was also unconfigurable, no seam for renderers or type mappings, so it served default schemas only; consumers with real schemas had to wire `@portabletext/markdown` themselves regardless. This includes `@portabletext/plugin-table`: its rectangle copies delegated the `text/markdown` entry to the removed converter, so they lose it too. Copying and pasting between two Portable Text Editors is unaffected: it round-trips through `application/x-portable-text`, which stays.

To keep markdown interop, add [`@portabletext/markdown`](https://www.npmjs.com/package/@portabletext/markdown) as your own dependency and register two Behaviors (via `BehaviorPlugin` or `editor.registerBehavior`). The copy side is a faithful restore: `text/markdown` goes back on the clipboard. The paste side hooks `text/plain`, because `deserialize.data` never fires for `text/markdown` anymore; it therefore parses plain-text pastes as markdown, broader than what v7 did.

```tsx
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getFragment} from '@portabletext/editor/selectors'
import {
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'

const deserializeMarkdown = defineBehavior({
  on: 'deserialize.data',
  guard: ({snapshot, event}) => {
    if (event.mimeType !== 'text/plain') {
      return false
    }
    const blocks = markdownToPortableText(event.data, {
      schema: snapshot.context.schema,
      keyGenerator: snapshot.context.keyGenerator,
    })
    return blocks.length > 0 ? {blocks} : false
  },
  actions: [
    ({event}, {blocks}) => [
      raise({...event, type: 'deserialization.success', data: blocks}),
    ],
  ],
})

const serializeMarkdown = defineBehavior({
  on: 'serialize.data',
  guard: ({event}) => event.mimeType === 'text/markdown',
  actions: [
    ({snapshot, event}) => [
      raise({
        type: 'serialization.success',
        mimeType: 'text/markdown',
        data: portableTextToMarkdown(
          getFragment(snapshot).map((entry) => entry.node),
        ),
        originEvent: event.originEvent,
      }),
    ],
  ],
})
```

The [v8 migration guide](https://www.portabletext.org/editor/guides/migrate-from-v7/#restore-the-textmarkdown-clipboard-behavior) carries the same recipe.

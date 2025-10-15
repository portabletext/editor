# `@portabletext/plugin-input-rule`

> Easily configure Input Rules in the Portable Text Editor

> ⚠️ Please note that `defineInputRule` and other APIs exposed by this plugin are still WIP and might change slightly. We are still ironing out some details before can cut a stable release.

Listening for an inserted text pattern to then perform a set of actions is incredibly common, but also carries many footguns:

1. How do you implement undo functionality correctly?
2. What about smart undo with <kbd>Backspace</kbd>?
3. And have you considered `insert.text` events that carry more than one character? (Android says hello.)

_This is why this plugin exists_. It brings the concept of "Input Rules" to the Portable Text Editor to allow you to write text transformation logic as if they were Behaviors, without having to worry about low-level details:

```tsx
import type {EditorSchema} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

const unorderedListRule = defineInputRule({
  // Instead of an event, we listen for a RegExp pattern
  on: /^(-|\*) /,
  // The `event` carries useful information like the offsets of RegExp matches
  // as well as information about the focused text block.
  guard: ({snapshot, event}) => {
    // In theory, an Input Rule could return multiple matches. But in this
    // case we only expect one match.
    const match = event.matches.at(0)

    if (!match) {
      return false
    }

    return {match}
  },
  actions: [
    ({event}, {match}) => [
      // Turn the text block into a paragraph
      raise({
        type: 'block.unset',
        props: ['style'],
        at: event.focusTextBlock.path,
      }),
      // Then, turn it into a list ite
      raise({
        type: 'block.set',
        props: {
          listItem: 'bullet',
          level: event.focusTextBlock.node.level ?? 1,
        },
        at: event.focusTextBlock.path,
      }),
      // Finally, delete the matched text
      raise({
        type: 'delete',
        at: match.targetOffsets,
      }),
    ],
  ],
})

export function MyMarkdownPlugin() {
  return <InputRulePlugin rules={[unorderedListRule]} />
}
```

🤫 [`@portabletext/plugin-markdown-shortcuts`](../plugin-markdown-shortcuts/) already exists and is powered by Input Rules.

## Text Transformation Rules

Because text transformations are so common, the plugin exposes a high-level `defineTextTransformRule` to configure these without the need for any boilerplate:

```tsx
const emDashRule = defineTextTransformRule({
  on: /--/,
  transform: () => '—',
})

export function MyTypographyPlugin() {
  return <InputRulePlugin rules={[emDasRule]} />
}
```

In fact, the production-ready [`@portabletext/plugin-typography`](../plugin-typography/) is built on top of Input Rules and comes packed with common text transformations like this.

## Other Examples

Other ideas that can easily be realized with Input Rules:

1. Automatically turning `"[Sanity](https://sanity.io)" into a link.
2. Listening for text patterns like `"{AAPL}"` and turn that into a stock ticker.

### Markdown Link

```tsx
const markdownLinkRule = defineInputRule({
  on: /\[(.+)]\((.+)\)/,
  actions: [
    ({snapshot, event}) => {
      const newText = event.textBefore + event.textInserted
      let textLengthDelta = 0
      const actions: Array<BehaviorAction> = []

      for (const match of event.matches.reverse()) {
        const textMatch = match.groupMatches.at(0)
        const hrefMatch = match.groupMatches.at(1)

        if (textMatch === undefined || hrefMatch === undefined) {
          continue
        }

        textLengthDelta =
          textLengthDelta -
          (match.targetOffsets.focus.offset -
            match.targetOffsets.anchor.offset -
            textMatch.text.length)

        const leftSideOffsets = {
          anchor: match.targetOffsets.anchor,
          focus: textMatch.targetOffsets.anchor,
        }
        const rightSideOffsets = {
          anchor: textMatch.targetOffsets.focus,
          focus: match.targetOffsets.focus,
        }

        actions.push(
          raise({
            type: 'select',
            at: textMatch.targetOffsets,
          }),
        )
        actions.push(
          raise({
            type: 'annotation.add',
            annotation: {
              name: 'link',
              value: {
                href: hrefMatch.text,
              },
            },
          }),
        )
        actions.push(
          raise({
            type: 'delete',
            at: rightSideOffsets,
          }),
        )
        actions.push(
          raise({
            type: 'delete',
            at: leftSideOffsets,
          }),
        )
      }

      const endCaretPosition = {
        path: event.focusTextBlock.path,
        offset: newText.length - textLengthDelta * -1,
      }

      return [
        ...actions,
        raise({
          type: 'select',
          at: {
            anchor: endCaretPosition,
            focus: endCaretPosition,
          },
        }),
      ]
    },
  ],
})
```

## Stock Ticker Rule

```tsx
const stockTickerRule = defineInputRule({
  on: /\{(.+)\}/,
  guard: ({snapshot, event}) => {
    const match = event.matches.at(0)

    if (!match) {
      return false
    }

    const symbolMatch = match.groupMatches.at(0)

    if (symbolMatch === undefined) {
      return false
    }

    return {match, symbolMatch}
  },
  actions: [
    ({snapshot, event}, {match, symbolMatch}) => {
      const stockTickerKey = snapshot.context.keyGenerator()

      return [
        raise({
          type: 'delete',
          at: match.targetOffsets,
        }),
        raise({
          type: 'insert.child',
          child: {
            _key: stockTickerKey,
            _type: 'stock-ticker',
            symbol: symbolMatch.text,
          },
        }),
        raise({
          type: 'select',
          at: {
            anchor: {
              path: [
                {_key: event.focusTextBlock.node._key},
                'children',
                {_key: stockTickerKey},
              ],
              offset: 0,
            },
            focus: {
              path: [
                {_key: event.focusTextBlock.node._key},
                'children',
                {_key: stockTickerKey},
              ],
              offset: 0,
            },
          },
        }),
      ]
    },
  ],
})
```

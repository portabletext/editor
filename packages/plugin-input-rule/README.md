# `@portabletext/plugin-input-rule`

> Easily configure Input Rules in the Portable Text Editor

1. How do you implement undo functionality correctly?
2. What about smart undo with <kbd>Backspace</kbd>?
3. Have you considered `insert.text` events that carry more than one character? (Android, anyone?)

_This is why this plugin exists_. It brings the concept of "Input Rules" to the Portable Text Editor, allowing you to write text transformation logic as if they were Behaviors, without worrying about low-level details:

```tsx
import type {EditorSchema} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

const unorderedListRule = defineInputRule({
  // Listen for a RegExp pattern instead of a raw event
  on: /^(-|\*) /,
  // The `event` carries useful information like the offsets of RegExp matches
  // as well as information about the focused text block
  guard: ({snapshot, event}) => {
    // In theory, an Input Rule could return multiple matches, but in this
    // case we only expect one
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
        at: event.focusBlock.path,
      }),
      // Then, turn it into a list item
      raise({
        type: 'block.set',
        props: {
          listItem: 'bullet',
          level: event.focusBlock.node.level ?? 1,
        },
        at: event.focusBlock.path,
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

> 💡 **Tip:** The [`@portabletext/plugin-markdown-shortcuts`](../plugin-markdown-shortcuts/) package is already built using Input Rules and provides common markdown shortcuts out of the box.

## Text Transformation Rules

Text transformations are so common that the plugin provides a high-level `defineTextTransformRule` helper to configure them without any boilerplate:

```tsx
const emDashRule = defineTextTransformRule({
  on: /--/,
  transform: () => '—',
})

export function MyTypographyPlugin() {
  return <InputRulePlugin rules={[emDashRule]} />
}
```

In fact, the production-ready [`@portabletext/plugin-typography`](../plugin-typography/) is built on top of Input Rules and comes packed with common text transformations like this.

## Advanced Examples

Input Rules can handle more complex transformations. Here are two advanced examples:

1. **Markdown Link**: Automatically convert `[text](url)` syntax into proper links
2. **Stock Ticker**: Convert `{SYMBOL}` patterns into stock ticker objects

### Markdown Link Rule

This example shows how to convert markdown-style link syntax `[text](url)` into proper link annotations:

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
        path: event.focusBlock.path,
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

### Stock Ticker Rule

This example demonstrates how to convert text patterns like `{AAPL}` into custom inline objects:

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
                {_key: event.focusBlock.node._key},
                'children',
                {_key: stockTickerKey},
              ],
              offset: 0,
            },
            focus: {
              path: [
                {_key: event.focusBlock.node._key},
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

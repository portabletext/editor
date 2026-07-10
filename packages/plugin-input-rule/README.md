# `@portabletext/plugin-input-rule`

> Easily configure Input Rules in the Portable Text Editor

## Installation

```sh
npm install @portabletext/plugin-input-rule
```

## Why

1. How do you implement undo functionality correctly?
2. What about smart undo with <kbd>Backspace</kbd>?
3. Have you considered `insert.text` events that carry more than one character? (Android, anyone?)

_This is why this plugin exists_. It brings the concept of "Input Rules" to the Portable Text Editor, allowing you to write text transformation logic as if they were Behaviors, without worrying about low-level details:

```tsx
import type {EditorSchema} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule, InputRulePlugin} from '@portabletext/plugin-input-rule'

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

> **Tip:** The [`@portabletext/plugin-markdown-shortcuts`](../plugin-markdown-shortcuts/) package is already built using Input Rules and provides common markdown shortcuts out of the box.

## How rules execute

A rule looks like a Behavior, but three contracts matter as soon as its actions read state:

1. **The pattern matches the text up to the caret, plus the insertion.** `textBefore` is the focus block's text from its start to the caret, and the pattern runs against `textBefore + textInserted`. `^` anchors to the start of the block's text; `$` anchors to the end of the insertion, not the end of the block, and text after the caret is invisible to the pattern. A match that sits entirely in already-typed text is ignored; only matches involving the insertion fire.

2. **Action callbacks see the document as it was before the insertion.** The `guard` and every entry in `actions` receive the same pre-insertion snapshot, and a later entry does not observe an earlier entry's effects. The events they raise apply to the document with the insertion in place, but anything computed inside a callback, a block value, a selection, reflects the state before it landed. Embedding a block read this way into an `insert.block` resurrects the very text your `delete` removes.

3. **Target the match with `match.targetOffsets`.** They address the text your raised events apply to, the document with the insertion in place, so they are the right target for `select` and `delete`. `match.selection` stops at the caret and falls one character short of a match that includes the insertion.

When an action needs the document as it looks after earlier raised events have applied, raise a custom event and let a companion Behavior do the reading; a Behavior handling a raised event sees the document with all previously raised events applied:

```tsx
const bulletListRule = defineInputRule({
  on: /^[-*] $/,
  actions: [
    ({event}) => {
      const match = event.matches.at(0)

      if (!match) {
        return []
      }

      return [
        raise({type: 'delete', at: match.targetOffsets}),
        raise({type: 'custom.convert to list'}),
      ]
    },
  ],
})

const convertToList = defineBehavior({
  on: 'custom.convert to list',
  guard: ({snapshot}) => {
    // Runs after the raised `delete` has applied, so the focus block
    // reads back without the matched marker and can be moved or embedded
    // safely.
    const focusBlock = getFocusTextBlock(snapshot)
    return focusBlock ? {focusBlock} : false
  },
  // ...
})
```

## Working with capture groups

When a rule needs the location of a _part_ of its match, capture that part in a **named group** and read it back by name from `match.groups`:

```tsx
const mentionRule = defineInputRule({
  on: /@(?<handle>\w+)!$/,
  guard: ({event}) => {
    const match = event.matches.at(0)
    const handle = match?.groups['handle']

    if (!handle) {
      return false
    }

    return {handle}
  },
  actions: [
    (_, {handle}) => [
      // `handle.text` is the captured text, `handle.targetOffsets` its
      // location — same shape as the match itself
    ],
  ],
})
```

`match.groups` mirrors the platform's `RegExpMatchArray.groups`: entries exist only for named groups that participated in the match, so always handle `undefined` (an optional group may not have matched). A capture group must be named (`(?<name>...)`) for its location to be handed back — unnamed groups remain useful for regex mechanics like alternation (`/^(-|\*) /`) but get no location. In codebases with `noPropertyAccessFromIndexSignature` enabled, access entries with brackets: `match.groups['handle']`.

## Text transformation rules

Text transformations are so common that the plugin provides a high-level `defineTextTransformRule` helper to configure them without any boilerplate:

```tsx
import {
  defineTextTransformRule,
  InputRulePlugin,
} from '@portabletext/plugin-input-rule'

const emDashRule = defineTextTransformRule({
  on: /--/,
  transform: () => '—',
})

export function MyTypographyPlugin() {
  return <InputRulePlugin rules={[emDashRule]} />
}
```

In fact, the production-ready [`@portabletext/plugin-typography`](../plugin-typography/) is built on top of Input Rules and comes packed with common text transformations like this.

A transform that should replace only _part_ of its match uses the record form of `transform`: keys name the capture groups to replace, each with its own transform:

```tsx
const multiplicationRule = defineTextTransformRule({
  on: /\d+\s?(?<operator>[*x])\s?\d+/,
  // Only the operator's span is replaced; the digits around it stay
  transform: {operator: () => '×'},
})
```

Unlike ProseMirror's and TipTap's input rules, which implicitly replace the first capture group when one exists, replacement targets are always declared: a function transform replaces the whole match, regardless of any capture groups, and a record transform replaces exactly the groups its keys name. `defineTextTransformRule` throws at definition time when a key names a group the pattern doesn't have, and a match in which none of the keys participated is skipped. The surrounding context (like the digits above) must stay _inside_ the match rather than in lookarounds, a rule only fires when its match involves the just-inserted text, so a trailing lookahead would leave the match entirely in already-typed text and the rule would never trigger.

## Advanced examples

Input Rules can handle more complex transformations. Here are two advanced examples:

1. **Markdown Link**: Automatically convert `[text](url)` syntax into proper links
2. **Stock Ticker**: Convert `{SYMBOL}` patterns into stock ticker objects

### Markdown link rule

This example shows how to convert markdown-style link syntax `[text](url)` into proper link annotations:

```tsx
const markdownLinkRule = defineInputRule({
  on: /\[(?<text>.+)]\((?<href>.+)\)/,
  actions: [
    ({snapshot, event}) => {
      const newText = event.textBefore + event.textInserted
      let textLengthDelta = 0
      const actions: Array<BehaviorAction> = []

      for (const match of event.matches.reverse()) {
        const textMatch = match.groups['text']
        const hrefMatch = match.groups['href']

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

### Stock ticker rule

This example demonstrates how to convert text patterns like `{AAPL}` into custom inline objects:

```tsx
const stockTickerRule = defineInputRule({
  on: /\{(?<symbol>.+)\}/,
  guard: ({snapshot, event}) => {
    const match = event.matches.at(0)

    if (!match) {
      return false
    }

    const symbolMatch = match.groups['symbol']

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

## Matches spanning inline objects

Inline objects don't contribute to the text your RegExp matches against, so a pattern can match "across" one without knowing it. By default, such a match is dropped before your `guard` runs: for rules like the stock ticker above, whose actions `delete` the matched range and replace it, firing would destroy the inline object sitting inside the range.

Rules whose actions leave part of the matched range in place can grant leniency per named capture group:

```tsx
const strongPairRule = defineInputRule({
  on: /\*\*(?<content>[^*\n]+?)\*\*$/,
  // The actions decorate the content and delete only the `**` markers, so
  // an inline object inside the content is harmless and the match should
  // fire. An inline object anywhere else in the match, between the marker
  // characters, still drops the match.
  inlineObjects: {allow: ['content']},
  // ...
})
```

The match survives when every inline object inside it sits within a listed group's matched span (inclusive of its edges). Unlisted groups and the text between groups, the rule's syntax markers, stay protected. This also expresses "this group's text becomes data": a markdown link rule can allow objects in its `text` group while leaving its `href` group protected, an inline object inside the href would make the captured text a lie.

The [`@portabletext/plugin-character-pair-decorator`](../plugin-character-pair-decorator/) package is built exactly this way: `inlineObjects: {allow: ['content']}` lets `**bo`⟨inline object⟩`ld**` decorate across the object, while a match with an inline object between the marker characters stays literal.

To allow inline objects anywhere in the match, capture the whole pattern in a named group and list it.

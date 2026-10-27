# `@portabletext/slack`

> Convert Portable Text to and from Slack's clipboard format

When you copy from Slack, the clipboard holds `text/plain` and `slack/texty`, and no `text/html`. `slack/texty` is a JSON string holding a [Quill Delta](https://quilljs.com/docs/delta/), and it is the only place the formatting survives. Slack's message box also reads `slack/texty` when you paste, and ignores the structure of pasted HTML. This package converts in both directions, so a paste from Slack keeps its formatting and a copy into Slack keeps lists, quotes and code blocks.

The options, matchers, default schema and degradation reports follow [`@portabletext/markdown`](../markdown/).

## Installation

```bash
npm install @portabletext/slack
```

## Usage

**Slack → Portable Text**

```ts
import {slackToPortableText} from '@portabletext/slack'

const blocks = slackToPortableText(
  '{"ops":[{"insert":"foo "},{"attributes":{"bold":true},"insert":"bar"},{"insert":"\\n"}]}',
)
```

```json
[
  {
    "_type": "block",
    "_key": "f4s8k2",
    "style": "normal",
    "children": [
      {"_type": "span", "_key": "a9c3x1", "text": "foo ", "marks": []},
      {"_type": "span", "_key": "b7d2m5", "text": "bar", "marks": ["strong"]}
    ],
    "markDefs": []
  }
]
```

`texty` that isn't a Delta returns `[]`, so the caller can fall back to `text/plain`.

**Portable Text → Slack**

```ts
import {portableTextToSlack} from '@portabletext/slack'

const {texty, text} = portableTextToSlack([
  {
    _type: 'block',
    _key: 'f4s8k2',
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{_type: 'span', _key: 'a9c3x1', text: 'foo', marks: []}],
    markDefs: [],
  },
])
// texty: '{"ops":[{"insert":"foo"},{"insert":"\n","attributes":{"list":"bullet"}}]}'
// text: '• foo'
```

Write `texty` as `slack/texty` and `text` as `text/plain`. To wire both into the Portable Text Editor, see [Paste from and copy to Slack](https://www.portabletext.org/editor/guides/slack-clipboard/) on the docs site.

## Supported features

| Slack                      | Portable Text                                      |
| -------------------------- | -------------------------------------------------- |
| Bold, italic, strike, code | `strong`, `em`, `strike-through`, `code`           |
| Links                      | `link` annotation with `href`                      |
| Bullet and numbered lists  | `bullet` and `number` list items with a `level`    |
| Blockquotes                | `blockquote` style                                 |
| Code blocks                | One `code` block object per run of code lines      |
| Mentions and channels      | Display text, or your own objects through matchers |
| Emoji                      | Display text, or your own objects through matchers |

Slack's message box writes links as `slackslug` attributes, and posted messages write them as `link` attributes. Both become `link` annotations. Links with a `javascript:`, `vbscript:`, `file:` or `data:` URL are dropped and reported.

A round trip through `portableTextToSlack` and `slackToPortableText` keeps everything in the table above, mentions, channels and emoji included when you pass matching [`embeds`](#embeds) and [`types`](#inline-objects) matchers. A code block keeps only its text, since a Slack code block holds no formatting. Keys are generated on every conversion, and neighbouring spans with the same marks merge.

## `slackToPortableText`

### Schema

Without a `schema`, the conversion builds the same default schema as `@portabletext/markdown`. Pass your own compiled schema and it only builds what that schema declares:

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'
import {slackToPortableText} from '@portabletext/slack'

declare const texty: string

const blocks = slackToPortableText(texty, {
  schema: compileSchema(
    defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
      lists: [{name: 'bullet'}],
    }),
  ),
})
```

### Matchers

Each Slack construct maps to the schema through a matcher. The matcher types (`DecoratorMatcher`, `AnnotationMatcher`, `StyleMatcher`, `ListItemMatcher` and `ObjectMatcher`) behave like the ones `@portabletext/markdown` exports. A matcher returning `undefined` means the schema has no place for the construct, and the conversion degrades it.

| Option                | Slack construct              | Default                                |
| --------------------- | ---------------------------- | -------------------------------------- |
| `marks.strong`        | `bold`                       | `strong` decorator                     |
| `marks.em`            | `italic`                     | `em` decorator                         |
| `marks.strikeThrough` | `strike`                     | `strike-through` decorator             |
| `marks.code`          | `code`                       | `code` decorator                       |
| `marks.link`          | `link` and `slackslug` links | `link` annotation                      |
| `block.normal`        | Every line                   | `normal` style                         |
| `block.blockquote`    | `blockquote` lines           | `blockquote` style                     |
| `listItem.bullet`     | `bullet` list lines          | `bullet` list                          |
| `listItem.number`     | `ordered` list lines         | `number` list                          |
| `types.code`          | A run of `code-block` lines  | `code` block object, see below         |
| `embeds.mention`      | A user mention               | None: the display text, such as `@foo` |
| `embeds.channel`      | A channel link               | None: the display text, such as `#foo` |
| `embeds.emoji`        | An emoji                     | None: the colon code, such as `:foo:`  |

The default `types.code` matcher builds the schema's `code` block object. When it declares a `lines` array field that holds text blocks, each code line becomes a text block in `lines`, of the block type and with the first style that field declares, and with no style when that field declares an empty style list. Otherwise, when it declares a `code` string field, the lines are joined into one string. When it declares neither, the code block becomes one text block and is reported as `code-block-to-text`. Slack code blocks carry no language, and a code line keeps only its text: its formatting, links and embeds are reported.

### Embeds

Mentions, channel links and emoji refer to Slack ids and codes that mean nothing outside Slack, so by default they become their display text and are reported. An embed matcher receives `{context: {schema, keyGenerator}, value}` and returns an inline object, an array of spans, or `undefined` to fall back to the display text.

```ts
import {slackToPortableText} from '@portabletext/slack'

declare const texty: string

const blocks = slackToPortableText(texty, {
  embeds: {
    mention: ({context, value}) => ({
      _type: 'mention',
      _key: context.keyGenerator(),
      slackId: value.id,
      label: value.text,
    }),
    emoji: ({context, value}) => [
      {
        _type: 'span',
        _key: context.keyGenerator(),
        text: value.text,
        marks: [],
      },
    ],
  },
})
```

| Matcher   | `value`                                                                                     |
| --------- | ------------------------------------------------------------------------------------------- |
| `mention` | `id`: the Slack user id, starting with `U` or `W`. `text`: the display text, such as `@foo` |
| `channel` | `id`: the Slack channel id. `text`: the display text, such as `#foo`                        |
| `emoji`   | `text`: the colon code, such as `:foo:`. `name`: the same code without the colons           |

Broadcasts (`@here`, `@channel`) never reach a matcher. They stay their display text and are not reported, since the text is all they carry. Other mentions whose id is not a user id, such as user groups, never reach the `mention` matcher either: they stay their display text and are reported as `embed-to-text`.

Spans returned from a matcher keep the formatting around the embed: a bold mention gets `strong` added to each span's marks. An inline object carries no marks, so the formatting and link around an embed a matcher returns as an inline object are removed and reported.

### Reporting degradation

Every construct the schema or the matchers can't represent degrades to a lossier shape instead of throwing. `onDegradation` is called once, after the whole content has been walked, only when at least one construct degraded. It receives every `Degradation` in document order and a grouped `message`. Throw from inside it to enforce lossless conversion:

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'
import {slackToPortableText} from '@portabletext/slack'

slackToPortableText(
  '{"ops":[{"attributes":{"bold":true},"insert":"foo"},{"insert":"\\n"}]}',
  {
    schema: compileSchema(defineSchema({})),
    onDegradation: ({message}) => {
      throw new Error(message)
    },
  },
)
// throws Error:
// Slack content could not be converted without loss:
// - line 1: Removed bold formatting, kept the text: the schema has no `strong` decorator ("foo")
```

Each `Degradation` carries `type`, a human-readable `message`, the 1-based `line` and, when there is text to quote, a `snippet`. Match on `type`, not `message`.

| `type`               | What happened                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decorator-dropped`  | Bold, italic, strike or code formatting was removed, the text kept, also in a code line or around an embed a matcher built as an inline object    |
| `annotation-dropped` | A link was removed, the text kept: no `link` annotation, no or unsafe URL, in a code line, or around an embed a matcher built as an inline object |
| `style-fallback`     | A blockquote became `normal`, or `normal` itself is not in the schema                                                                             |
| `list-flattened`     | A bullet or numbered list became plain blocks                                                                                                     |
| `code-block-to-text` | A code block became one text block                                                                                                                |
| `fields-dropped`     | A built object lost fields the schema doesn't declare                                                                                             |
| `embed-to-text`      | A mention, channel link or emoji became its display text, which every embed in a code line does                                                   |
| `embed-dropped`      | An embed of a shape the conversion doesn't recognize was removed                                                                                  |

## `portableTextToSlack`

Returns `{texty, text}`. `texty` is the Delta for `slack/texty`. `text` is a plain-text fallback for `text/plain` that writes bullets as `•`, numbered items with their number, quotes with `>` and code blocks between ` ``` ` fences.

A `code` block object with a `lines` array of text blocks or a `code` string becomes a Slack code block. A Slack code block line is plain text, so the styles, list items, decorators, annotations and inline objects in `lines` are dropped, each reported at its path inside the code block. A code line's default style is not reported: no style or `normal` without a `schema`, and no style or the first style the `lines` block type declares with one, the style `slackToPortableText` gives a code line. With a `schema`, the text blocks in `lines` are those of the block type the `lines` field declares, and any other entry is removed and reported as `object-dropped`. Pass a `schema` to only treat `code` that way when the schema declares a `code` block object.

Only blocks whose `_type` is the schema's block type (`block` without a `schema`) are written as text blocks. Any other object, even one with `children`, is a block object.

### Inline objects

By default an inline object is removed and reported. To write it to Slack, pass a `types` matcher keyed by its `_type`. A matcher receives `{context: {schema}, value}`, where `schema` is the `schema` option and `value` is the inline object, and returns one of:

| Return value            | Written to Slack as                                    |
| ----------------------- | ------------------------------------------------------ |
| `{mention: {id, text}}` | A user mention, `id` being the Slack user id           |
| `{channel: {id, text}}` | A channel link, `id` being the Slack channel id        |
| `{emoji: {text}}`       | An emoji, `text` being the colon code, such as `:foo:` |
| A string                | Plain text                                             |
| `undefined`             | Nothing: the object is removed and reported            |

`text` writes the mention or channel `text`, with line breaks written as spaces, and the emoji colon code. An inline object carries no marks, so the formatting and links of the spans around it don't apply to it. Inline objects in a code block's `lines` never reach a matcher.

These matchers write back the objects the [`embeds`](#embeds) example builds, so a paste and a copy round trip:

```ts
import {portableTextToSlack} from '@portabletext/slack'
import type {PortableTextBlock} from '@portabletext/schema'

declare const blocks: Array<PortableTextBlock>

const {texty, text} = portableTextToSlack(blocks, {
  types: {
    mention: ({value}) => ({mention: {id: value.slackId, text: value.label}}),
  },
})
```

The emoji in that example became a span, so it needs no matcher on the way back.

### Reporting degradation

Anything Slack can't show is written as text and reported through `onDegradation`, which receives every `SerializeDegradation` in document order and a grouped `message`. Each one carries `type`, `message`, the `path` to the node and, when there is text to quote, a `snippet`.

| `type`               | What happened                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `annotation-dropped` | An annotation other than `link`, a link with a `javascript:`, `vbscript:`, `file:` or `data:` URL, or any annotation in a code line was removed, the text kept |
| `decorator-dropped`  | A decorator other than `strong`, `em`, `strike-through` and `code`, or any decorator in a code line, was removed                                               |
| `style-fallback`     | A heading became a bold line, another style became a plain line, or a code line lost its style                                                                 |
| `list-item-fallback` | A list item other than `bullet` and `number` became a bullet, or a code line lost its list item                                                                |
| `object-to-text`     | A block object became the text it holds, such as a table's cells, an image URL or its own spans                                                                |
| `object-dropped`     | An inline object no `types` matcher wrote, a block object with no text, or a code block's `lines` entry that isn't a text block was removed                    |

## License

MIT © [Sanity.io](https://www.sanity.io/)

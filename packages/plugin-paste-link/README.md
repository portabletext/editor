# `@portabletext/plugin-paste-link`

> Allows pasting links in the Portable Text Editor

## Installation

```sh
npm install @portabletext/plugin-paste-link
```

## Usage

Import the `PasteLinkPlugin` React component and place it inside the `EditorProvider`:

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {PasteLinkPlugin} from '@portabletext/plugin-paste-link'

const schemaDefinition = defineSchema({
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
})

function App() {
  return (
    <EditorProvider initialConfig={{schemaDefinition}}>
      <PortableTextEditable />
      <PasteLinkPlugin />
    </EditorProvider>
  )
}
```

By default, the plugin looks for a `link` annotation with an `href` field of type `string`.

### Controlling when the plugin runs

Use the `guard` prop to control when the paste link behavior runs. Return `false` to skip the behavior and fall through to default paste handling:

```tsx
import {getActiveStyle} from '@portabletext/editor/selectors'

;<PasteLinkPlugin
  guard={({snapshot}) => {
    // Skip paste-link on h1 blocks (e.g., document titles)
    return getActiveStyle(snapshot) !== 'h1'
  }}
/>
```

### Customizing the link annotation

You can customize the link annotation with the `link` prop:

```tsx
<PasteLinkPlugin
  link={({context, value}) => {
    const schemaType = context.schema.annotations.find(
      (annotation) => annotation.name === 'customLink',
    )

    if (!schemaType) return undefined

    return {_type: schemaType.name, url: value.href}
  }}
/>
```

The `link` callback returns an annotation built from a `context.schema`
lookup (`context.schema.annotations.find(...)`) instead of a hardcoded type.
That lookup is what makes paste-link schema-aware: when the schema has no
matching annotation the callback returns `undefined` and pasting a URL falls
through to the default paste handling, so the plugin never adds an annotation
the schema does not declare. Because `context.schema` is resolved at the
caret, the same gating follows
[containers](../schema/README.md#containers-and-sub-schemas): the lookup sees
the container's sub-schema, so a link is only added where that container
actually allows it.

## Behaviors

### Paste URL on selected text

When text is selected and a URL is pasted, the plugin adds a link annotation to the selection.

### Paste URL on existing link

When text with an existing link annotation is selected and a URL is pasted, the plugin replaces the existing link with a new one containing the pasted URL.

### Paste URL at caret

When the selection is collapsed and a URL is pasted, the plugin inserts the URL text with a link annotation. Existing decorators (bold, italic, etc.) are preserved.

## API

### `PasteLinkPlugin`

React component that registers paste behaviors for handling URLs.

#### Props

- `guard` (optional): A `PasteLinkGuard` function that controls when the paste link behavior runs.
  - Parameters: `{snapshot, event, dom}` - standard behavior guard parameters
  - Returns: `true` to allow the behavior, `false` to skip and fall through to default paste handling.
  - Use this to disable paste-link behavior in certain contexts (e.g., title blocks, code blocks).

- `link` (optional): A `LinkMatcher` function that converts a pasted URL into a link annotation.
  - Parameters:
    - `context`: Contains `schema` and `keyGenerator` from the editor context
    - `value`: Contains `href` (the pasted URL string)
  - Returns: An object with `_type` (annotation type name), optional `_key`, and any additional properties. Return `undefined` to skip the behavior.
  - Default: Looks for a `link` annotation with an `href` field of type `string`.

### Types

```typescript
type PasteLinkGuard = BehaviorGuard<
  Extract<NativeBehaviorEvent, {type: 'clipboard.paste'}>,
  true
>

type LinkMatcher = (params: {
  context: LinkMatcherContext
  value: LinkMatcherValue
}) => LinkMatcherResult | undefined

type LinkMatcherContext = Pick<EditorContext, 'schema' | 'keyGenerator'>
type LinkMatcherValue = {href: string}
type LinkMatcherResult = {
  _type: string
  _key?: string
  [other: string]: unknown
}
```

## Supported protocols

- `http:`
- `https:`
- `mailto:`
- `tel:`

URLs with other protocols are pasted as plain text.

## License

MIT

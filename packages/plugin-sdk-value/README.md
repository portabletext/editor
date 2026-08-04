# `@portabletext/plugin-sdk-value`

> Connect a Portable Text Editor with a Sanity document using the SDK

Two-way synchronization between a Portable Text Editor and a field in a Sanity
document, plus presence: other people's carets show up in the field, and the
local user's caret shows up for them, including in the Studio.

## Installation

```sh
npm install @portabletext/plugin-sdk-value
```

## Features

- **Two-way synchronization**: Changes in the editor update the document, and document changes update the editor
- **Real-time updates**: Automatically handles patches from external sources (other users, mutations, etc.)
- **Optimistic updates**: Provides smooth user experience with immediate local updates
- **Presence**: Reports where the local user is editing, and draws other people's carets

## Usage

Use `SDKPortableTextEditable` in place of `PortableTextEditable`, inside the
`EditorProvider`. It names the document and field once and wires up value sync,
presence reporting, and remote carets:

```tsx
import {defineSchema, EditorProvider} from '@portabletext/editor'
import {SDKPortableTextEditable} from '@portabletext/plugin-sdk-value'

function MyEditor() {
  return (
    <EditorProvider initialConfig={{schemaDefinition: defineSchema({})}}>
      <SDKPortableTextEditable
        documentId="my-document-id"
        documentType="myDocumentType"
        path="content"
      />
    </EditorProvider>
  )
}
```

That is all of it. Remote carets are drawn with a built-in caret, so nothing has
to be styled to get presence working.

Every other prop is forwarded to `PortableTextEditable` untouched. Any
`rangeDecorations` you pass are kept and merged with the presence carets rather
than replaced.

### Styling the caret

The built-in caret is deliberately plain: a coloured line with a dot above it and
the participant's name on hover. Colours come from a small fixed palette, keyed on
the user, so one person in two tabs gets one colour. Pass `renderCursor` to
replace it:

```tsx
<SDKPortableTextEditable
  {...documentHandle}
  path="content"
  renderCursor={({user}) =>
    (props) => (
      <MyCaret label={user.profile.displayName}>{props.children}</MyCaret>
    )}
/>
```

Your component receives the decorated text as `children` and should render it.
Pass `renderCursor={null}` to draw no carets at all while still reporting the
local user's presence, which is what you want if you only care about keeping the
document in sync.

### Rendering the editable yourself

`SDKValuePlugin` still works as a sibling component if you would rather keep
control of `PortableTextEditable`. Pair it with `SDKPresencePlugin` to report
presence, and `useSDKPresenceCursors` for remote carets:

```tsx
function MyEditor(props: DocumentHandle) {
  const cursors = useSDKPresenceCursors({
    ...props,
    path: 'content',
    renderCursor:
      ({user}) =>
      (cursorProps) => <Caret user={user}>{cursorProps.children}</Caret>,
  })

  return (
    <EditorProvider initialConfig={{schemaDefinition: defineSchema({})}}>
      <PortableTextEditable rangeDecorations={cursors} />
      <SDKValuePlugin {...props} path="content" />
      <SDKPresencePlugin {...props} path="content" />
    </EditorProvider>
  )
}
```

## Props

`SDKPortableTextEditable` accepts a
[Document Handle](https://www.sanity.io/docs/app-sdk/document-handles), every
`PortableTextEditable` prop, and:

| Prop           | Type                          | Description                                                                      |
| -------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| `documentId`   | `string`                      | The document ID                                                                  |
| `documentType` | `string`                      | The document type                                                                |
| `path`         | `string`                      | [JSONMatch][json-match] path expression to the Portable Text field               |
| `renderCursor` | `function \| null` (optional) | Draws one remote participant's caret. Omit for the built-in one, `null` for none |
| `dataset`      | `string` (optional)           | Dataset name (if different from configured default)                              |
| `projectId`    | `string` (optional)           | Project ID (if different from configured default)                                |
| `perspective`  | `string \| object` (optional) | Which document to sync and report: draft, published, or a release                |

[json-match]: https://www.sanity.io/docs/content-lake/json-match

## Notes on presence

Carets are drawn with the built-in component unless you pass `renderCursor`, and
are collapsed to a single point at the participant's focus. Presence
answers where someone is, so decorating their whole selection would highlight
text the local user never selected. The Studio does the same.

Participants are counted by session, not by person. The same user in two tabs
draws two carets, in the same colour. Group by `user.sanityUserId` in your own
`renderCursor` if you would rather show one.

The local user is never included, so an app does not draw its own caret.

Which document is reported follows the handle's `perspective`, or the ambient one
from `ResourceProvider`. Pass the plain document id and let the perspective
select the draft, the published document, or a release version. This matters for
the Studio, whose field indicators compare the exact document id its form is on.

## Requirements

This plugin requires:

- `@sanity/sdk-react` 2.19 or newer, where the presence hooks were added
- The document must exist in the Sanity dataset

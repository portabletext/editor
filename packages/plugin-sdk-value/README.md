# `@portabletext/plugin-sdk-value`

> Connect a Portable Text Editor with a Sanity document using the SDK

Two-way synchronization between a Portable Text Editor and a field in a Sanity
document, plus presence and inline comments: other people's carets show up in
the field and the local user's caret shows up for them, and comment threads
anchored to text draw as highlights, all interoperating with the Studio.

## Installation

```sh
npm install @portabletext/plugin-sdk-value
```

## Features

- **Two-way synchronization**: Changes in the editor update the document, and document changes update the editor
- **Real-time updates**: Automatically handles patches from external sources (other users, mutations, etc.)
- **Optimistic updates**: Provides smooth user experience with immediate local updates
- **Presence**: Reports where the local user is editing, and draws other people's carets
- **Inline comments**: Draws highlights for comment threads anchored to text, and starts new threads on the selection

## Usage

Render `PortableTextEditable` from `@portabletext/editor` and add the plugins as
children of `EditorProvider`, the way the other `@portabletext/plugin-*`
packages are used. `SDKValuePlugin` syncs the field's value,
`SDKPresencePlugin` reports the local user's caret and draws other people's, and
`SDKCommentsPlugin` draws comment highlights:

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {
  SDKCommentsPlugin,
  SDKPresencePlugin,
  SDKValuePlugin,
} from '@portabletext/plugin-sdk-value'
import {Suspense} from 'react'

function MyEditor() {
  return (
    <EditorProvider initialConfig={{schemaDefinition: defineSchema({})}}>
      <SDKValuePlugin
        documentId="my-document-id"
        documentType="myDocumentType"
        path="content"
      />
      <SDKPresencePlugin
        documentId="my-document-id"
        documentType="myDocumentType"
        path="content"
      />
      <Suspense fallback={null}>
        <SDKCommentsPlugin
          documentId="my-document-id"
          documentType="myDocumentType"
          path="content"
          renderDecoration={(comment) => (props) => (
            <mark data-comment-id={comment.id}>{props.children}</mark>
          )}
        />
      </Suspense>
      <PortableTextEditable />
    </EditorProvider>
  )
}
```

That is all of it. Remote carets are drawn with a built-in caret, so nothing has
to be styled to get presence working. Drop `SDKCommentsPlugin` if the app has no
comments. `PortableTextEditable` is yours, so props
such as `style` and `renderBlock` go straight to it.

### Styling the caret

The built-in caret is deliberately plain: a coloured line with a dot above it and
the participant's name on hover. Colours come from a small fixed palette, keyed on
the user, so one person in two tabs gets one colour. Pass `renderCursor` to
`SDKPresencePlugin` to replace it:

```tsx nocheck
<SDKPresencePlugin
  {...documentHandle}
  path="content"
  renderCursor={({user}) =>
    (props) => (
      <MyCaret label={user.profile.displayName}>{props.children}</MyCaret>
    )}
/>
```

Your component receives the decorated text as `children` and should render it.
The returned render is called as a plain function, not as a component, so it
must not call hooks. When you need hooks, return an element of your own
component.
Pass `renderCursor={null}` to draw no carets at all while still reporting the
local user's presence.

### Inline comments

Comment threads anchored to text in the field draw as highlights, and new
threads can be started on the current selection. The composer UI stays with the
app, the same split presence uses for carets. Comments are written in the shape
Sanity Studio stores, so threads round-trip between an SDK app and the Studio.

`SDKCommentsPlugin` draws the open threads on the field. It draws every
anchored block and lets each highlight follow edits while its stored text still
resolves. If the text can no longer be found, the highlight stays hidden until
any content in the comment list changes, including replies and reactions. A
content change resolves and places every anchor again from its stored text.
Place it inside `EditorProvider`, next to `PortableTextEditable`. It suspends
while the comments load, so wrap it in `Suspense` where you want a fallback:

```tsx nocheck
<EditorProvider initialConfig={{schemaDefinition}}>
  <Suspense fallback={null}>
    <SDKCommentsPlugin
      {...documentHandle}
      path="content"
      renderDecoration={(comment) => (props) => (
        <span data-comment-id={comment.id} style={{background: '#fef3c7'}}>
          {props.children}
        </span>
      )}
    />
  </Suspense>
  <PortableTextEditable />
</EditorProvider>
```

The returned render is called as a plain function, not as a component, so it
must not call hooks. When you need hooks, return an element of your own
component.

`renderDecoration` is read when a highlight is drawn, so a highlight already on
screen keeps its look until it is drawn again. A look that changes with app
state belongs in your own component, which can use hooks.

Use `useSDKCommentDecorations` instead when a component of your own needs the
`DecorationLayer`. It takes the same options and must run inside
`EditorProvider`.

`useSDKCommentAuthoring` is the write side: `commentableSelection` is set when
the current selection can take a comment, and `createInlineComment` starts a
thread anchored to it. It needs the live editor, so it is a hook, and the
composer UI that uses it is the one component an app writes inside
`EditorProvider`:

```tsx nocheck
import {useSDKCommentAuthoring} from '@portabletext/plugin-sdk-value'

function CommentComposer(props: DocumentHandle) {
  const {commentableSelection, createInlineComment} = useSDKCommentAuthoring({
    ...props,
    path: 'content',
  })

  if (!commentableSelection) {
    return null
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        const message = new FormData(event.currentTarget).get('message')
        await createInlineComment({
          message: [
            {
              _type: 'block',
              _key: 'message',
              children: [{_type: 'span', _key: 'text', text: String(message)}],
            },
          ],
        })
      }}
    >
      <input name="message" />
      <button type="submit">Comment</button>
    </form>
  )
}
```

Highlights follow the text while the user types, and a highlight whose text is
deleted or rewritten beyond recognition is dropped rather than drawn on the
wrong words. Resolved threads draw nothing, matching the Studio.

### A full example

Value sync, presence, comments and comment authoring together. Everything but
the composer is a plugin. The composer is your own component, because its UI
lives inside the provider anyway:

```tsx nocheck
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {
  SDKCommentsPlugin,
  SDKPresencePlugin,
  SDKValuePlugin,
  useSDKCommentAuthoring,
} from '@portabletext/plugin-sdk-value'
import type {DocumentHandle} from '@sanity/sdk-react'
import {Suspense} from 'react'

function MyEditor(props: DocumentHandle) {
  return (
    <EditorProvider initialConfig={{schemaDefinition: defineSchema({})}}>
      <SDKValuePlugin {...props} path="content" />
      <SDKPresencePlugin {...props} path="content" />
      <Suspense fallback={null}>
        <SDKCommentsPlugin
          {...props}
          path="content"
          renderDecoration={(comment) => (decorationProps) => (
            <mark data-comment-id={comment.id}>{decorationProps.children}</mark>
          )}
        />
        <CommentComposer {...props} />
      </Suspense>
      <PortableTextEditable />
    </EditorProvider>
  )
}

function CommentComposer(props: DocumentHandle) {
  const {commentableSelection, createInlineComment} = useSDKCommentAuthoring({
    ...props,
    path: 'content',
  })

  return (
    <button
      disabled={!commentableSelection}
      onClick={() =>
        createInlineComment({
          message: [
            {
              _type: 'block',
              _key: 'message',
              children: [{_type: 'span', _key: 'text', text: 'Looks good'}],
            },
          ],
        })
      }
    >
      Comment on selection
    </button>
  )
}
```

`useSDKPresenceCursors` and `useSDKCommentDecorations` are the hooks behind the
two plugins. Use them when your own component needs the `DecorationLayer`, for
example to read it or combine it with other decorations.

## Props

`SDKValuePlugin`, `SDKPresencePlugin` and `SDKCommentsPlugin` accept a
[Document Handle](https://www.sanity.io/docs/app-sdk/document-handles) and:

| Prop               | Type                          | Description                                                                                  |
| ------------------ | ----------------------------- | -------------------------------------------------------------------------------------------- |
| `documentId`       | `string`                      | The document ID                                                                              |
| `documentType`     | `string`                      | The document type                                                                            |
| `path`             | `string`                      | [JSONMatch][json-match] path expression to the Portable Text field                           |
| `renderDecoration` | `function`                    | `SDKCommentsPlugin` only. Returns the render for one comment's highlight                     |
| `renderCursor`     | `function \| null` (optional) | `SDKPresencePlugin` only. Draws one remote caret. Omit for the built-in one, `null` for none |
| `dataset`          | `string` (optional)           | Dataset name (if different from configured default)                                          |
| `projectId`        | `string` (optional)           | Project ID (if different from configured default)                                            |
| `perspective`      | `string \| object` (optional) | Which document to sync and report: draft, published, or a release                            |

[json-match]: https://www.sanity.io/docs/content-lake/json-match

## Notes on presence

Carets are drawn with the built-in component unless you pass `renderCursor` to `SDKPresencePlugin`, and
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

- `@sanity/sdk-react` 2.20.1 or newer, where the comment hooks were added
- The document must exist in the Sanity dataset

# SDK Value Plugin

> 🔗 Connects a Portable Text Editor with a Sanity document using the SDK

The SDK Value plugin provides seamless two-way synchronization between a Portable Text Editor instance and a specific field in a Sanity document. This enables real-time collaboration and ensures that changes made through the editor are immediately reflected in the document, and vice versa.

## Features

- **Two-way synchronization**: Changes in the editor update the document, and document changes update the editor
- **Real-time updates**: Automatically handles patches from external sources (other users, mutations, etc.)
- **Optimistic updates**: Provides smooth user experience with immediate local updates

## Usage

Import the `SDKValuePlugin` React component and place it inside the `EditorProvider`. The plugin requires document handle properties and a path to specify which field to synchronize:

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {SDKValuePlugin} from '@portabletext/plugin-sdk-value'

function MyEditor() {
  return (
    <EditorProvider initialConfig={{schemaDefinition: defineSchema({})}}>
      <PortableTextEditable />
      <SDKValuePlugin
        documentId="my-document-id"
        documentType="myDocumentType"
        path="content"
      />
    </EditorProvider>
  )
}
```

## Props

The `SDKValuePlugin` component accepts a [Document Handle](https://www.sanity.io/docs/app-sdk/document-handles) plus an additional `path` parameter:

| Prop           | Type                | Description                                                        |
| -------------- | ------------------- | ------------------------------------------------------------------ |
| `documentId`   | `string`            | The document ID                                                    |
| `documentType` | `string`            | The document type                                                  |
| `path`         | `string`            | [JSONMatch][json-match] path expression to the Portable Text field |
| `dataset`      | `string` (optional) | Dataset name (if different from configured default)                |
| `projectId`    | `string` (optional) | Project ID (if different from configured default)                  |

[json-match]: https://www.sanity.io/docs/content-lake/json-match

## Requirements

This plugin requires:

- `@sanity/sdk-react` for document state management
- The document must exist in the Sanity dataset

---
'@portabletext/editor': major
---

feat!: remove the `update value` event and value validation

The `update value` event and the `value changed` and `invalid value` notifications are removed, along with the `InvalidValueResolution` type. The initial value is read once from `initialConfig` and loads in one step. To show another document or a new snapshot of the same document, remount with a `key`:

```tsx
<EditorProvider
  key={documentId}
  initialConfig={{schemaDefinition, initialValue}}
>
  <PortableTextEditable />
</EditorProvider>
```

The editor no longer validates the value it receives, but it still removes `null`, string, number, boolean and array entries and emits the removal as a local change. A block of a type the schema does not know shows as a block object. A start value with a missing `_key` gets its key as a local change with `patches`. A root block with an empty or missing `_key` or no `_type` used to drop content from the start value. It now shows, and its key or the schema's text block type is emitted as a local change with `patches`. A block with no `_type` already got the same fix through remote patches and inside containers. A span outside a text block now throws on render too, as it already did for remote patches. An unused mark definition is kept. `operation` listeners see one `set` of the whole value on mount, followed by the editor's own fixes.

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

The editor no longer validates the value it receives. A block of a type the schema does not know shows as a block object. A start value with a missing `_key` gets its key as a correction with `patches`. An unused mark definition is kept. `operation` listeners see one `set` of the whole value on mount, followed by the editor's own corrections.

import {
  PortableTextEditor,
  usePortableTextEditor,
  usePortableTextEditorSelection,
  type SchemaDefinition,
} from '@portabletext/editor'
import {defaultSchema} from './defaultSchema'

type ToolbarProps = {
  customSchema?: SchemaDefinition
}

export function Toolbar({customSchema}: ToolbarProps) {
  const schemaDefinition = customSchema || defaultSchema
  if (!schemaDefinition) {
    return null
  }
  // Obtain the editor instance
  const editorInstance = usePortableTextEditor()
  // Rerender the toolbar whenever the selection changes
  usePortableTextEditorSelection()

  const decoratorButtons = schemaDefinition.decorators
    ? schemaDefinition.decorators.map((decorator) => {
        return (
          <button
            key={decorator.name}
            style={{
              textDecoration: PortableTextEditor.isMarkActive(
                editorInstance,
                decorator.name,
              )
                ? 'underline'
                : 'unset',
            }}
            onClick={() => {
              // Toggle the decorator by name
              PortableTextEditor.toggleMark(editorInstance, decorator.name)
              // Pressing this button steals focus so let's focus the editor again
              PortableTextEditor.focus(editorInstance)
            }}
          >
            {decorator.name}
          </button>
        )
      })
    : null

  const linkButton = (
    <button
      style={{
        textDecoration:
          schemaDefinition.annotations &&
          PortableTextEditor.isAnnotationActive(
            editorInstance,
            schemaDefinition.annotations[0].name,
          )
            ? 'underline'
            : 'unset',
      }}
      onClick={() => {
        if (
          schemaDefinition.annotations &&
          PortableTextEditor.isAnnotationActive(
            editorInstance,
            schemaDefinition.annotations[0].name,
          )
        ) {
          PortableTextEditor.removeAnnotation(
            editorInstance,
            schemaDefinition.annotations[0],
          )
        } else if (schemaDefinition.annotations) {
          PortableTextEditor.addAnnotation(
            editorInstance,
            schemaDefinition.annotations[0],
            {href: 'https://example.com'},
          )
        }
        PortableTextEditor.focus(editorInstance)
      }}
    >
      link
    </button>
  )

  const styleButtons = schemaDefinition.styles
    ? schemaDefinition.styles.map((style) => (
        <button
          key={style.name}
          style={{
            textDecoration: PortableTextEditor.hasBlockStyle(
              editorInstance,
              style.name,
            )
              ? 'underline'
              : 'unset',
          }}
          onClick={() => {
            PortableTextEditor.toggleBlockStyle(editorInstance, style.name)
            PortableTextEditor.focus(editorInstance)
          }}
        >
          {style.name}
        </button>
      ))
    : null

  const listButtons = schemaDefinition.lists
    ? schemaDefinition.lists.map((list) => (
        <button
          key={list.name}
          style={{
            textDecoration: PortableTextEditor.hasListStyle(
              editorInstance,
              list.name,
            )
              ? 'underline'
              : 'unset',
          }}
          onClick={() => {
            PortableTextEditor.toggleList(editorInstance, list.name)
            PortableTextEditor.focus(editorInstance)
          }}
        >
          {list.name}
        </button>
      ))
    : null

  const imageButton = schemaDefinition?.blockObjects?.[0] ? (
    <button
      onClick={() => {
        if (schemaDefinition.blockObjects?.[0]) {
          PortableTextEditor.insertBlock(
            editorInstance,
            schemaDefinition.blockObjects[0],
            {src: 'https://example.com/image.jpg'},
          )
        }
        PortableTextEditor.focus(editorInstance)
      }}
    >
      {schemaDefinition.blockObjects[0].name}
    </button>
  ) : null

  const stockTickerButton = schemaDefinition?.inlineObjects?.[0] ? (
    <button
      onClick={() => {
        if (schemaDefinition.inlineObjects) {
          PortableTextEditor.insertChild(
            editorInstance,
            schemaDefinition.inlineObjects[0],
            {symbol: 'AAPL'},
          )
          PortableTextEditor.focus(editorInstance)
        }
      }}
    >
      {schemaDefinition.inlineObjects[0].name}
    </button>
  ) : null

  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap: '0.5em'}}>
      <div>{decoratorButtons}</div>
      <div>{linkButton}</div>
      <div>{styleButtons}</div>
      <div>{listButtons}</div>
    </div>
  )
}

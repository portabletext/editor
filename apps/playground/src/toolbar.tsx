import {
  EditorSelection,
  PortableTextEditor,
  usePortableTextEditor,
  usePortableTextEditorSelection,
} from '@portabletext/editor'
import {BlockDecoratorDefinition, ObjectSchemaType} from '@sanity/types'
import {Button, Card, Flex} from '@sanity/ui'

export function Toolbar() {
  const editor = usePortableTextEditor()
  const selection = usePortableTextEditorSelection()
  const decorators = editor.schemaTypes.decorators
  const annotations = editor.schemaTypes.annotations

  return (
    <Card border>
      <Flex gap={1} wrap="wrap">
        {decorators.map((decorator) => (
          <DecoratorToolbarButton
            key={decorator.value}
            decorator={decorator}
            editor={editor}
            selection={selection}
          />
        ))}
        {annotations.map((annotation) => (
          <AnnotationToolbarButton
            key={annotation.name}
            annotation={annotation}
            editor={editor}
            selection={selection}
          />
        ))}
      </Flex>
    </Card>
  )
}

function AnnotationToolbarButton(props: {
  annotation: ObjectSchemaType
  editor: PortableTextEditor
  selection: EditorSelection
}) {
  const active =
    props.selection !== null &&
    PortableTextEditor.isAnnotationActive(props.editor, props.annotation.name)

  return (
    <Button
      mode="bleed"
      selected={active}
      onClick={() => {
        if (active) {
          PortableTextEditor.removeAnnotation(props.editor, props.annotation)
        } else {
          PortableTextEditor.addAnnotation(props.editor, props.annotation, {
            href: 'https://example.com',
          })
        }
        PortableTextEditor.focus(props.editor)
      }}
    >
      {props.annotation.title}
    </Button>
  )
}

function DecoratorToolbarButton(props: {
  decorator: BlockDecoratorDefinition
  editor: PortableTextEditor
  selection: EditorSelection
}) {
  const active =
    props.selection !== null && PortableTextEditor.isMarkActive(props.editor, props.decorator.value)

  return (
    <Button
      mode="bleed"
      selected={active}
      onClick={() => {
        PortableTextEditor.toggleMark(props.editor, props.decorator.value)
        PortableTextEditor.focus(props.editor)
      }}
    >
      {props.decorator.title}
    </Button>
  )
}

import {
  EditorSelection,
  PortableTextEditor,
  usePortableTextEditor,
  usePortableTextEditorSelection,
} from '@portabletext/editor'
import {BlockDecoratorDefinition, ObjectSchemaType} from '@sanity/types'
import {Group} from 'react-aria-components'
import {Toolbar} from './components/toolbar'
import {Separator} from './components/separator'
import {ToggleButton} from './components/toggle-button'

export function PortableTextToolbar() {
  const editor = usePortableTextEditor()
  const selection = usePortableTextEditorSelection()
  const decorators = editor.schemaTypes.decorators
  const annotations = editor.schemaTypes.annotations

  return (
    <Toolbar aria-label="Text formatting">
      <Group aria-label="Decorators" className="contents">
        {decorators.map((decorator) => (
          <DecoratorToolbarButton
            key={decorator.value}
            decorator={decorator}
            editor={editor}
            selection={selection}
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Annotations" className="contents">
        {annotations.map((annotation) => (
          <AnnotationToolbarButton
            key={annotation.name}
            annotation={annotation}
            editor={editor}
            selection={selection}
          />
        ))}
      </Group>
    </Toolbar>
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
    <ToggleButton
      isSelected={active}
      onPress={() => {
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
    </ToggleButton>
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
    <ToggleButton
      isSelected={active}
      onPress={() => {
        PortableTextEditor.toggleMark(props.editor, props.decorator.value)
        PortableTextEditor.focus(props.editor)
      }}
    >
      {props.decorator.title}
    </ToggleButton>
  )
}

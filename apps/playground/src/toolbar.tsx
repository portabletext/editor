import {
  EditorSelection,
  PortableTextEditor,
  usePortableTextEditor,
  usePortableTextEditorSelection,
} from '@portabletext/editor'
import {BlockDecoratorDefinition} from '@sanity/types'
import {Button, Card, Flex} from '@sanity/ui'

export function Toolbar() {
  const editor = usePortableTextEditor()
  const selection = usePortableTextEditorSelection()
  const decorators = editor.schemaTypes.decorators

  return (
    <Card border>
      <Flex gap={1} wrap="wrap">
        {decorators.map((decorator) => (
          <ToolbarButton
            key={decorator.value}
            decorator={decorator}
            editor={editor}
            selection={selection}
          />
        ))}
      </Flex>
    </Card>
  )
}

function ToolbarButton(props: {
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
      key={props.decorator.value}
      onClick={() => {
        PortableTextEditor.toggleMark(props.editor, props.decorator.value)
        PortableTextEditor.focus(props.editor)
      }}
    >
      {props.decorator.title}
    </Button>
  )
}

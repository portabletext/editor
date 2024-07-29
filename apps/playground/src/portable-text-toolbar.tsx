import {
  EditorSelection,
  PortableTextEditor,
  usePortableTextEditor,
  usePortableTextEditorSelection,
} from '@portabletext/editor'
import {BlockDecoratorDefinition, BlockListDefinition, ObjectSchemaType} from '@sanity/types'
import {Group, TooltipTrigger} from 'react-aria-components'
import {Toolbar} from './components/toolbar'
import {Separator} from './components/separator'
import {ToggleButton} from './components/toggle-button'
import {isValidElement} from 'react'
import {isValidElementType} from 'react-is'
import startCase from 'lodash.startcase'
import {Tooltip} from './components/tooltip'

export function PortableTextToolbar() {
  const editor = usePortableTextEditor()
  const selection = usePortableTextEditorSelection()
  const decorators = editor.schemaTypes.decorators
  const annotations = editor.schemaTypes.annotations
  const lists = editor.schemaTypes.lists

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
      <Separator orientation="vertical" />
      <Group aria-label="Lists" className="contents">
        {lists.map((list) => (
          <ListToolbarButton key={list.value} list={list} editor={editor} selection={selection} />
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
  const IconComponent = props.annotation.icon
  const title = props.annotation.title ?? startCase(props.annotation.name)

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={title}
        size="sm"
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
        {isValidElement(IconComponent) ? (
          IconComponent
        ) : isValidElementType(IconComponent) ? (
          <IconComponent className="w-4 h-4" />
        ) : (
          title
        )}
      </ToggleButton>
      <Tooltip>{title}</Tooltip>
    </TooltipTrigger>
  )
}

function DecoratorToolbarButton(props: {
  decorator: BlockDecoratorDefinition
  editor: PortableTextEditor
  selection: EditorSelection
}) {
  const active =
    props.selection !== null && PortableTextEditor.isMarkActive(props.editor, props.decorator.value)
  const IconComponent = props.decorator.icon

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.decorator.title}
        size="sm"
        isSelected={active}
        onPress={() => {
          PortableTextEditor.toggleMark(props.editor, props.decorator.value)
          PortableTextEditor.focus(props.editor)
        }}
      >
        {isValidElement(IconComponent) ? (
          IconComponent
        ) : isValidElementType(IconComponent) ? (
          <IconComponent className="w-4 h-4" />
        ) : (
          props.decorator.title
        )}
      </ToggleButton>
      <Tooltip>{props.decorator.title}</Tooltip>
    </TooltipTrigger>
  )
}

function ListToolbarButton(props: {
  list: BlockListDefinition
  editor: PortableTextEditor
  selection: EditorSelection
}) {
  const active =
    props.selection !== null && PortableTextEditor.hasListStyle(props.editor, props.list.value)
  const IconComponent = props.list.icon

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.list.title}
        size="sm"
        isSelected={active}
        onPress={() => {
          PortableTextEditor.toggleList(props.editor, props.list.value)
          PortableTextEditor.focus(props.editor)
        }}
      >
        {isValidElement(IconComponent) ? (
          IconComponent
        ) : isValidElementType(IconComponent) ? (
          <IconComponent className="w-4 h-4" />
        ) : (
          props.list.title
        )}
      </ToggleButton>
      <Tooltip>{props.list.title}</Tooltip>
    </TooltipTrigger>
  )
}

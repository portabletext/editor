import {
  EditorSelection,
  PortableTextEditor,
  usePortableTextEditor,
  usePortableTextEditorSelection,
} from '@portabletext/editor'
import {BlockDecoratorDefinition, BlockListDefinition, ObjectSchemaType} from '@sanity/types'
import startCase from 'lodash.startcase'
import {isValidElement, useMemo} from 'react'
import {Group, TooltipTrigger} from 'react-aria-components'
import {isValidElementType} from 'react-is'
import {Button} from './components/button'
import {Select, SelectItem} from './components/select'
import {Separator} from './components/separator'
import {ToggleButton} from './components/toggle-button'
import {Toolbar} from './components/toolbar'
import {Tooltip} from './components/tooltip'

export function PortableTextToolbar() {
  const editor = usePortableTextEditor()
  const selection = usePortableTextEditorSelection()
  const decorators = editor.schemaTypes.decorators
  const annotations = editor.schemaTypes.annotations
  const lists = editor.schemaTypes.lists
  const inlineObjects = editor.schemaTypes.inlineObjects
  const blockObjects = editor.schemaTypes.blockObjects

  return (
    <Toolbar aria-label="Text formatting">
      <StyleSelector editor={editor} selection={selection} />
      <Separator orientation="vertical" />
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
      <Separator orientation="vertical" />
      <Group aria-label="Block objects" className="contents">
        {blockObjects.map((blockObject) => (
          <BlockObjectButton key={blockObject.name} blockObject={blockObject} editor={editor} />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Inline objects" className="contents">
        {inlineObjects.map((inlineObject) => (
          <InlineObjectButton key={inlineObject.name} inlineObject={inlineObject} editor={editor} />
        ))}
      </Group>
    </Toolbar>
  )
}

function StyleSelector(props: {editor: PortableTextEditor; selection: EditorSelection}) {
  const styles = props.editor.schemaTypes.styles
  const focusBlock = PortableTextEditor.focusBlock(props.editor)
  const activeStyle = useMemo(
    () =>
      focusBlock
        ? (styles.find((style) => PortableTextEditor.hasBlockStyle(props.editor, style.value))
            ?.value ?? null)
        : null,
    [props.editor, focusBlock, styles],
  )

  return (
    <Select
      placeholder="Select style"
      aria-label="Style"
      selectedKey={activeStyle}
      onSelectionChange={(style) => {
        if (typeof style === 'string') {
          PortableTextEditor.toggleBlockStyle(props.editor, style)
          PortableTextEditor.focus(props.editor)
        }
      }}
    >
      {styles.map((style) => (
        <SelectItem key={style.value} id={style.value} textValue={style.title}>
          <Icon icon={style.icon} fallback={null} />
          {style.title}
        </SelectItem>
      ))}
    </Select>
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
            PortableTextEditor.addAnnotation(
              props.editor,
              props.annotation,
              props.annotation.name === 'comment'
                ? {
                    text: 'Consider rewriting this',
                  }
                : props.annotation.name === 'link'
                  ? {
                      href: 'https://example.com',
                    }
                  : {},
            )
          }
          PortableTextEditor.focus(props.editor)
        }}
      >
        <Icon icon={props.annotation.icon} fallback={title} />
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
        <Icon icon={props.decorator.icon} fallback={props.decorator.title} />
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
        <Icon icon={props.list.icon} fallback={props.list.title} />
      </ToggleButton>
      <Tooltip>{props.list.title}</Tooltip>
    </TooltipTrigger>
  )
}

function InlineObjectButton(props: {inlineObject: ObjectSchemaType; editor: PortableTextEditor}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onPress={() => {
        PortableTextEditor.insertChild(props.editor, props.inlineObject, {symbol: 'NVDA'})
        PortableTextEditor.focus(props.editor)
      }}
    >
      <Icon icon={props.inlineObject.icon} fallback={null} />
      {props.inlineObject.title}
    </Button>
  )
}

function BlockObjectButton(props: {blockObject: ObjectSchemaType; editor: PortableTextEditor}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onPress={() => {
        PortableTextEditor.insertBlock(
          props.editor,
          props.blockObject,
          props.blockObject.name === 'img' ? {url: 'http://example.com/image.png'} : {},
        )
        PortableTextEditor.focus(props.editor)
      }}
    >
      <Icon icon={props.blockObject.icon} fallback={null} />
      {props.blockObject.title}
    </Button>
  )
}

function Icon(props: {icon?: React.ReactNode | React.ComponentType; fallback: string | null}) {
  const IconComponent = props.icon

  return isValidElement(IconComponent) ? (
    IconComponent
  ) : isValidElementType(IconComponent) ? (
    <IconComponent className="w-4 h-4" />
  ) : (
    props.fallback
  )
}

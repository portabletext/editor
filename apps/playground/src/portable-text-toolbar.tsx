import {
  PortableTextEditor,
  usePortableTextEditor,
  usePortableTextEditorSelection,
  type EditorSelection,
} from '@portabletext/editor'
import {SquareDashedMousePointerIcon} from 'lucide-react'
import {isValidElement, useMemo} from 'react'
import {Group, TooltipTrigger} from 'react-aria-components'
import {isValidElementType} from 'react-is'
import {Button} from './components/button'
import {Select, SelectItem} from './components/select'
import {Separator} from './components/separator'
import {ToggleButton} from './components/toggle-button'
import {Toolbar} from './components/toolbar'
import {Tooltip} from './components/tooltip'
import type {SchemaDefinition} from './schema'

export function PortableTextToolbar(props: {
  schemaDefinition: SchemaDefinition
}) {
  const editor = usePortableTextEditor()
  const selection = usePortableTextEditorSelection()

  return (
    <Toolbar aria-label="Text formatting">
      <StyleSelector
        schemaDefinition={props.schemaDefinition}
        editor={editor}
        selection={selection}
      />
      <Separator orientation="vertical" />
      <Group aria-label="Decorators" className="contents">
        {props.schemaDefinition.decorators?.map((decorator) => (
          <DecoratorToolbarButton
            key={decorator.name}
            decorator={decorator}
            editor={editor}
            selection={selection}
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Annotations" className="contents">
        {props.schemaDefinition.annotations.map((annotation) => (
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
        {props.schemaDefinition.lists.map((list) => (
          <ListToolbarButton
            key={list.name}
            list={list}
            editor={editor}
            selection={selection}
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Block objects" className="contents">
        {props.schemaDefinition.blockObjects.map((blockObject) => (
          <BlockObjectButton
            key={blockObject.name}
            blockObject={blockObject}
            editor={editor}
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Inline objects" className="contents">
        {props.schemaDefinition.inlineObjects.map((inlineObject) => (
          <InlineObjectButton
            key={inlineObject.name}
            inlineObject={inlineObject}
            editor={editor}
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <TooltipTrigger>
        <Button
          aria-label="Focus"
          variant="secondary"
          size="sm"
          onPress={() => {
            PortableTextEditor.focus(editor)
          }}
        >
          <SquareDashedMousePointerIcon className="size-4" />
        </Button>
        <Tooltip>Focus</Tooltip>
      </TooltipTrigger>
    </Toolbar>
  )
}

function StyleSelector(props: {
  schemaDefinition: SchemaDefinition
  editor: PortableTextEditor
  selection: EditorSelection
}) {
  const focusBlock = PortableTextEditor.focusBlock(props.editor)
  const activeStyle = useMemo(
    () =>
      focusBlock
        ? (props.schemaDefinition.styles.find((style) =>
            PortableTextEditor.hasBlockStyle(props.editor, style.name),
          )?.name ?? null)
        : null,
    [props.editor, focusBlock, props.schemaDefinition],
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
      {props.schemaDefinition.styles.map((style) => (
        <SelectItem key={style.name} id={style.name} textValue={style.title}>
          <Icon icon={style.icon} fallback={null} />
          {style.title}
        </SelectItem>
      ))}
    </Select>
  )
}

function AnnotationToolbarButton(props: {
  annotation: SchemaDefinition['annotations'][number]
  editor: PortableTextEditor
  selection: EditorSelection
}) {
  const active =
    props.selection !== null &&
    PortableTextEditor.isAnnotationActive(props.editor, props.annotation.name)

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.annotation.title}
        size="sm"
        isSelected={active}
        onPress={() => {
          if (active) {
            PortableTextEditor.removeAnnotation(props.editor, {
              name: props.annotation.name,
            })
          } else {
            PortableTextEditor.addAnnotation(
              props.editor,
              {name: props.annotation.name},
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
        <Icon icon={props.annotation.icon} fallback={props.annotation.title} />
      </ToggleButton>
      <Tooltip>{props.annotation.title}</Tooltip>
    </TooltipTrigger>
  )
}

function DecoratorToolbarButton(props: {
  decorator: SchemaDefinition['decorators'][number]
  editor: PortableTextEditor
  selection: EditorSelection
}) {
  const active =
    props.selection !== null &&
    PortableTextEditor.isMarkActive(props.editor, props.decorator.name)

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.decorator.title}
        size="sm"
        isSelected={active}
        onPress={() => {
          PortableTextEditor.toggleMark(props.editor, props.decorator.name)
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
  list: SchemaDefinition['lists'][number]
  editor: PortableTextEditor
  selection: EditorSelection
}) {
  const active =
    props.selection !== null &&
    PortableTextEditor.hasListStyle(props.editor, props.list.name)

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.list.title}
        size="sm"
        isSelected={active}
        onPress={() => {
          PortableTextEditor.toggleList(props.editor, props.list.name)
          PortableTextEditor.focus(props.editor)
        }}
      >
        <Icon icon={props.list.icon} fallback={props.list.title} />
      </ToggleButton>
      <Tooltip>{props.list.title}</Tooltip>
    </TooltipTrigger>
  )
}

function InlineObjectButton(props: {
  inlineObject: SchemaDefinition['inlineObjects'][number]
  editor: PortableTextEditor
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onPress={() => {
        PortableTextEditor.insertChild(
          props.editor,
          {name: props.inlineObject.name},
          {symbol: 'NVDA'},
        )
        PortableTextEditor.focus(props.editor)
      }}
    >
      <Icon icon={props.inlineObject.icon} fallback={null} />
      {props.inlineObject.title}
    </Button>
  )
}

function BlockObjectButton(props: {
  blockObject: SchemaDefinition['blockObjects'][number]
  editor: PortableTextEditor
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onPress={() => {
        PortableTextEditor.insertBlock(
          props.editor,
          {name: props.blockObject.name},
          props.blockObject.name === 'image'
            ? {url: 'http://example.com/image.png'}
            : {},
        )
        PortableTextEditor.focus(props.editor)
      }}
    >
      <Icon icon={props.blockObject.icon} fallback={null} />
      {props.blockObject.title}
    </Button>
  )
}

function Icon(props: {
  icon?: React.ReactNode | React.ComponentType
  fallback: string | null
}) {
  const IconComponent = props.icon

  return isValidElement(IconComponent) ? (
    IconComponent
  ) : isValidElementType(IconComponent) ? (
    <IconComponent className="w-4 h-4" />
  ) : (
    props.fallback
  )
}

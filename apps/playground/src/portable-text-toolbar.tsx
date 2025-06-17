import {
  useEditor,
  useEditorSelector,
  type RangeDecoration,
  type RangeDecorationOnMovedDetails,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {SquareDashedMousePointerIcon, TextCursorIcon} from 'lucide-react'
import {isValidElement} from 'react'
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
  onAddRangeDecoration: (rangeDecoration: RangeDecoration) => void
  onRangeDecorationMoved: (details: RangeDecorationOnMovedDetails) => void
}) {
  const editor = useEditor()
  const readOnly = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  return (
    <Toolbar aria-label="Text formatting">
      <StyleSelector schemaDefinition={props.schemaDefinition} />
      <Separator orientation="vertical" />
      <Group aria-label="Decorators" className="contents">
        {props.schemaDefinition.decorators?.map((decorator) => (
          <DecoratorToolbarButton key={decorator.name} decorator={decorator} />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Annotations" className="contents">
        {props.schemaDefinition.annotations.map((annotation) => (
          <AnnotationToolbarButton
            key={annotation.name}
            annotation={annotation}
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Lists" className="contents">
        {props.schemaDefinition.lists.map((list) => (
          <ListToolbarButton key={list.name} list={list} />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Block objects" className="contents">
        {props.schemaDefinition.blockObjects.map((blockObject) => (
          <BlockObjectButton key={blockObject.name} blockObject={blockObject} />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Inline objects" className="contents">
        {props.schemaDefinition.inlineObjects.map((inlineObject) => (
          <InlineObjectButton
            key={inlineObject.name}
            inlineObject={inlineObject}
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <TooltipTrigger>
        <Button
          aria-label="Focus"
          variant="secondary"
          size="sm"
          isDisabled={readOnly}
          onPress={() => {
            editor.send({type: 'focus'})
          }}
        >
          <SquareDashedMousePointerIcon className="size-4" />
        </Button>
        <Tooltip>Focus</Tooltip>
      </TooltipTrigger>
      <Separator orientation="vertical" />
      <TooltipTrigger>
        <DecorateSelectionButton
          onAddRangeDecoration={props.onAddRangeDecoration}
          onRangeDecorationMoved={props.onRangeDecorationMoved}
        />
        <Tooltip>Add Range Decoration</Tooltip>
      </TooltipTrigger>
    </Toolbar>
  )
}

function StyleSelector(props: {schemaDefinition: SchemaDefinition}) {
  const editor = useEditor()
  const activeStyle = useEditorSelector(editor, selectors.getActiveStyle)
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  return (
    <TooltipTrigger>
      <Select
        isDisabled={disabled}
        placeholder="Select style"
        aria-label="Style"
        selectedKey={activeStyle ?? null}
        onSelectionChange={(style) => {
          if (typeof style === 'string') {
            editor.send({type: 'style.toggle', style})
            editor.send({type: 'focus'})
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
      <Tooltip>Select style</Tooltip>
    </TooltipTrigger>
  )
}

function AnnotationToolbarButton(props: {
  annotation: SchemaDefinition['annotations'][number]
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveAnnotation(props.annotation.name),
  )

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.annotation.title}
        size="sm"
        isDisabled={disabled}
        isSelected={active}
        onPress={() => {
          if (active) {
            editor.send({
              type: 'annotation.remove',
              annotation: {
                name: props.annotation.name,
              },
            })
          } else {
            editor.send({
              type: 'annotation.add',
              annotation: {
                name: props.annotation.name,
                value:
                  props.annotation.name === 'comment'
                    ? {
                        text: 'Consider rewriting this',
                      }
                    : props.annotation.name === 'link'
                      ? {
                          href: 'https://example.com',
                        }
                      : {},
              },
            })
          }
          editor.send({type: 'focus'})
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
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveDecorator(props.decorator.name),
  )

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.decorator.title}
        size="sm"
        isDisabled={disabled}
        isSelected={active}
        onPress={() => {
          editor.send({
            type: 'decorator.toggle',
            decorator: props.decorator.name,
          })
          editor.send({type: 'focus'})
        }}
      >
        <Icon icon={props.decorator.icon} fallback={props.decorator.title} />
      </ToggleButton>
      <Tooltip>{props.decorator.title}</Tooltip>
    </TooltipTrigger>
  )
}

function ListToolbarButton(props: {list: SchemaDefinition['lists'][number]}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveListItem(props.list.name),
  )

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.list.title}
        size="sm"
        isDisabled={disabled}
        isSelected={active}
        onPress={() => {
          editor.send({
            type: 'list item.toggle',
            listItem: props.list.name,
          })
          editor.send({type: 'focus'})
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
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  return (
    <TooltipTrigger>
      <Button
        variant="secondary"
        size="sm"
        isDisabled={disabled}
        onPress={() => {
          editor.send({
            type: 'insert.inline object',
            inlineObject: {
              name: props.inlineObject.name,
              value:
                props.inlineObject.name === 'stock-ticker'
                  ? {symbol: 'NVDA'}
                  : {},
            },
          })
          editor.send({type: 'focus'})
        }}
      >
        <Icon icon={props.inlineObject.icon} fallback={null} />
        {props.inlineObject.title}
      </Button>
      <Tooltip>Insert {props.inlineObject.title}</Tooltip>
    </TooltipTrigger>
  )
}

function BlockObjectButton(props: {
  blockObject: SchemaDefinition['blockObjects'][number]
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  return (
    <TooltipTrigger>
      <Button
        variant="secondary"
        size="sm"
        isDisabled={disabled}
        onPress={() => {
          editor.send({
            type: 'insert.block object',
            placement: 'auto',
            blockObject: {
              name: props.blockObject.name,
              value:
                props.blockObject.name === 'image'
                  ? {
                      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4OTggMjQwIj48cG9seWdvbiBwb2ludHM9IjM5Mi4xOSA3OC40NSAzOTIuMTMgMTAwLjc1IDM3Mi4xOSA4OS4yNCAzNzEuOSAxODkuMjEgMzU4LjkxIDE4MS43MSAzNTkuMTkgODEuNzQgMzM5LjM1IDcwLjI4IDMzOS40MiA0Ny45OCAzOTIuMTkgNzguNDUiLz48cG9seWdvbiBwb2ludHM9IjQ0Mi42NyAxMDcuNTkgNDQyLjYxIDEyOS45IDQxMy4yOSAxMTIuOTcgNDEzLjIyIDEzOS42NSA0MzkuODEgMTU1IDQzOS43NSAxNzYuNzIgNDEzLjE2IDE2MS4zNyA0MTMuMDcgMTkwLjQ0IDQ0Mi4zOSAyMDcuMzYgNDQyLjMyIDIyOS44NyA0MDAuMzEgMjA1LjYxIDQwMC42NiA4My4zNCA0NDIuNjcgMTA3LjU5Ii8+PHBvbHlnb24gcG9pbnRzPSI1MDMuNCA3OS4yMiA0ODMuODYgMTUwLjE0IDUwNC43MiAyMDAuOTQgNDkwLjczIDIwOS4wMSA0NzYuNjQgMTc0LjY1IDQ2Mi44OCAyMjUuMSA0NDkuMTkgMjMzIDQ2OS42OSAxNTguNzIgNDQ5LjgyIDExMC4xNSA0NjMuODkgMTAyLjAzIDQ3Ni44MSAxMzQuMjYgNDg5LjgxIDg3LjA2IDUwMy40IDc5LjIyIi8+PHBvbHlnb24gcG9pbnRzPSI1NTcuNzUgNDcuODMgNTU3LjgyIDcwLjE0IDUzOC42IDgxLjI0IDUzOC44OCAxODEuMjIgNTI2LjM2IDE4OC40NCA1MjYuMDggODguNDYgNTA2Ljk1IDk5LjUxIDUwNi44OSA3Ny4yIDU1Ny43NSA0Ny44MyIvPjxwYXRoIGQ9Ik00MTkuMzcsMjcuMTJoMHMuMTktMzEuODIsMjcuODMtMTUuODMsMjcuNjUsNDcuODYsMjcuNjUsNDcuODZsLTkuMjItNS4zM3MwLTIxLjI4LTE4LjQzLTMxLjkyLTE4LjQzLDEwLjY0LTE4LjQzLDEwLjY0WiIvPjwvc3ZnPgo=',
                      alt: 'Portable Text logo',
                    }
                  : {},
            },
          })
          editor.send({type: 'focus'})
        }}
      >
        <Icon icon={props.blockObject.icon} fallback={null} />
        {props.blockObject.title}
      </Button>
      <Tooltip>Insert {props.blockObject.title}</Tooltip>
    </TooltipTrigger>
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

function DecorateSelectionButton(props: {
  onAddRangeDecoration: (rangeDecoration: RangeDecoration) => void
  onRangeDecorationMoved: (details: RangeDecorationOnMovedDetails) => void
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const selection = useEditorSelector(editor, selectors.getSelection)

  return (
    <Button
      aria-label="Decorate"
      isDisabled={!selection || disabled}
      variant="secondary"
      size="sm"
      onPress={() => {
        props.onAddRangeDecoration({
          component: RangeComponent,
          selection,
          onMoved: props.onRangeDecorationMoved,
        })
        editor.send({
          type: 'focus',
        })
      }}
    >
      <TextCursorIcon className="size-4" />
    </Button>
  )
}

function RangeComponent(props: React.PropsWithChildren<unknown>) {
  return (
    <span className="bg-green-200 border border-green-600">
      {props.children}
    </span>
  )
}

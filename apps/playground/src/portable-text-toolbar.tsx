import {
  useEditor,
  useEditorSelector,
  type RangeDecoration,
  type RangeDecorationOnMovedDetails,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {SquareDashedMousePointerIcon, TextCursorIcon, XIcon} from 'lucide-react'
import {isValidElement} from 'react'
import {
  Dialog,
  DialogTrigger,
  Group,
  Heading,
  Modal,
  TextField,
  TooltipTrigger,
} from 'react-aria-components'
import {isValidElementType} from 'react-is'
import {Button} from './components/button'
import {Container} from './components/container'
import {Input, Label} from './components/field'
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
          <InsertObjectButton
            key={blockObject.name}
            definition={blockObject}
            type="block"
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Inline objects" className="contents">
        {props.schemaDefinition.inlineObjects.map((inlineObject) => (
          <InsertObjectButton
            key={inlineObject.name}
            definition={inlineObject}
            type="inline"
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

function InsertObjectButton(
  props:
    | {
        type: 'block'
        definition: SchemaDefinition['blockObjects'][number]
      }
    | {
        type: 'inline'
        definition: SchemaDefinition['inlineObjects'][number]
      },
) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  return (
    <DialogTrigger>
      <TooltipTrigger>
        <Button variant="secondary" size="sm" isDisabled={disabled}>
          <Icon icon={props.definition.icon} fallback={null} />
          {props.definition.title}
        </Button>
        <Tooltip>Insert {props.definition.title}</Tooltip>
      </TooltipTrigger>

      <Modal className="bg-black/9 fixed left-0 top-0 w-screen h-[var(--visual-viewport-height)] flex items-center justify-center">
        <Dialog>
          {({close}) => (
            <Container>
              <div className="flex items-center justify-between gap-2">
                <Heading slot="title">Insert {props.definition.title}</Heading>
                <TooltipTrigger>
                  <Button variant="secondary" size="sm" onPress={close}>
                    <XIcon className="size-4" />
                  </Button>
                  <Tooltip>Close</Tooltip>
                </TooltipTrigger>
              </div>
              <ObjectForm
                {...props}
                onSubmit={({values, placement}) => {
                  if (props.type === 'inline') {
                    editor.send({
                      type: 'insert.inline object',
                      inlineObject: {
                        name: props.definition.name,
                        value: values,
                      },
                    })
                  } else {
                    editor.send({
                      type: 'insert.block object',
                      placement: placement ?? 'auto',
                      blockObject: {
                        name: props.definition.name,
                        value: values,
                      },
                    })
                  }
                  editor.send({type: 'focus'})
                  close()
                }}
              />
            </Container>
          )}
        </Dialog>
      </Modal>
    </DialogTrigger>
  )
}

function ObjectForm(
  props: (
    | {
        type: 'block'
        definition: SchemaDefinition['blockObjects'][number]
      }
    | {
        type: 'inline'
        definition: SchemaDefinition['inlineObjects'][number]
      }
  ) & {
    onSubmit: ({
      values,
      placement,
    }: {
      values: {[key: string]: string | number}
      placement?: 'auto' | 'before' | 'after'
    }) => void
  },
) {
  const defaultValues: {[key: string]: string | number} =
    'defaultValues' in props.definition ? props.definition.defaultValues : {}

  const fields = props.definition.fields.map((field, index) => {
    const defaultValue = defaultValues[field.name] as string

    return (
      <TextField
        key={field.name}
        autoFocus={index === 0}
        className="flex flex-col gap-1"
        defaultValue={defaultValue}
      >
        <Label>{'title' in field ? field.title : field.name}</Label>
        <Input name={field.name} />
      </TextField>
    )
  })

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()

        const formData = new FormData(e.target as HTMLFormElement)
        const formDataValues = Object.fromEntries(formData) as {
          [key: string]: string | number
        }
        const {placement, ...values} = formDataValues

        props.onSubmit({
          values,
          placement: placement as 'auto' | 'before' | 'after' | undefined,
        })
      }}
    >
      {fields}
      {props.type === 'block' ? (
        <TextField>
          <Label>Placement</Label>
          <Select
            name="placement"
            aria-label="Placement"
            defaultSelectedKey="auto"
          >
            <SelectItem id="auto" textValue="auto">
              Auto
            </SelectItem>
            <SelectItem id="before" textValue="before">
              Before
            </SelectItem>
            <SelectItem id="after" textValue="after">
              After
            </SelectItem>
          </Select>
        </TextField>
      ) : null}
      <Button className="self-end" type="submit" size="sm">
        Insert
      </Button>
    </form>
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

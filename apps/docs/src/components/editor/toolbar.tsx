import {
  useEditor,
  useEditorSelector,
  type SchemaDefinition,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Type,
  Underline,
} from 'lucide-react'
import {Button} from '../ui/button'
import {Tooltip, TooltipProvider, TooltipTrigger} from '../ui/tooltip'
import {defaultSchema} from './defaultSchema'

type ToolbarProps = {
  customSchema?: SchemaDefinition
}

const iconMap: Record<string, React.ReactNode> = {
  strong: <Bold />,
  em: <Italic />,
  underline: <Underline />,
}

const styleMap: Record<string, React.ReactNode> = {
  normal: <Type className="h-4 w-4" />,
  h1: <Heading1 className="h-4 w-4" />,
  h2: <Heading2 className="h-4 w-4" />,
  h3: <Heading3 className="h-4 w-4" />,
  blockquote: <Quote className="h-4 w-4" />,
}

const listMap: Record<string, React.ReactNode> = {
  bullet: <List className="h-4 w-4" />,
  number: <ListOrdered className="h-4 w-4" />,
}

export function Toolbar({customSchema}: ToolbarProps) {
  const schemaDefinition = customSchema || defaultSchema
  if (!schemaDefinition) {
    return null
  }

  const decoratorButtons = schemaDefinition.decorators
    ? schemaDefinition.decorators.map((decorator) => (
        <DecoratorButton key={decorator.name} decorator={decorator.name} />
      ))
    : null

  const annotationButtons = schemaDefinition.annotations
    ? schemaDefinition.annotations.map((annotation) => (
        <AnnotationButton key={annotation.name} annotation={annotation} />
      ))
    : null

  const styleButtons = schemaDefinition.styles
    ? schemaDefinition.styles.map((style) => (
        <StyleButton key={style.name} style={style.name} />
      ))
    : null

  const listButtons = schemaDefinition.lists
    ? schemaDefinition.lists.map((list) => (
        <ListButton key={list.name} list={list.name} />
      ))
    : null

  return (
    <TooltipProvider>
      <div className="inline-flex items-center ">
        <div className="flex flex-wrap items-center gap-1">
          {decoratorButtons}
          {annotationButtons}
          {styleButtons}
          {listButtons}
        </div>
      </div>
    </TooltipProvider>
  )
}

function DecoratorButton(props: {decorator: string}) {
  const editor = useEditor()
  const active = useEditorSelector(
    editor,
    selectors.isActiveDecorator(props.decorator),
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'default' : 'ghost'}
          size="icon"
          onClick={() => {
            editor.send({type: 'decorator.toggle', decorator: props.decorator})
            editor.send({type: 'focus'})
          }}
        >
          {iconMap[props.decorator] || <></>}
          <span className="sr-only">{props.decorator}</span>
        </Button>
      </TooltipTrigger>
    </Tooltip>
  )
}

function AnnotationButton(props: {annotation: {name: string}}) {
  const editor = useEditor()
  const active = useEditorSelector(
    editor,
    selectors.isActiveAnnotation(props.annotation.name),
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'default' : 'ghost'}
          size="icon"
          onClick={() => {
            editor.send({
              type: 'annotation.toggle',
              annotation: {
                name: props.annotation.name,
                value:
                  props.annotation.name === 'link'
                    ? {href: 'https://example.com'}
                    : {},
              },
            })
            editor.send({type: 'focus'})
          }}
        >
          <Link2 />
          <span className="sr-only">Link</span>
        </Button>
      </TooltipTrigger>
    </Tooltip>
  )
}

function StyleButton(props: {style: string}) {
  const editor = useEditor()
  const active = useEditorSelector(editor, selectors.isActiveStyle(props.style))

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'default' : 'ghost'}
          size="icon"
          onClick={() => {
            editor.send({type: 'style.toggle', style: props.style})
            editor.send({type: 'focus'})
          }}
        >
          {styleMap[props.style] || <></>}
          <span className="sr-only">Toggle {props.style}</span>
        </Button>
      </TooltipTrigger>
    </Tooltip>
  )
}

function ListButton(props: {list: string}) {
  const editor = useEditor()
  const active = useEditorSelector(
    editor,
    selectors.isActiveListItem(props.list),
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'default' : 'ghost'}
          size="icon"
          onClick={() => {
            editor.send({
              type: 'list item.toggle',
              listItem: props.list,
            })
            editor.send({type: 'focus'})
          }}
        >
          {listMap[props.list] || <></>}
          <span className="sr-only">Toggle {props.list}</span>
        </Button>
      </TooltipTrigger>
    </Tooltip>
  )
}

import {
  PortableTextEditor,
  usePortableTextEditor,
  usePortableTextEditorSelection,
  type SchemaDefinition,
} from '@portabletext/editor'
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
  blockqoute: <Quote className="h-4 w-4" />,
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
  // Obtain the editor instance
  const editorInstance = usePortableTextEditor()
  // Rerender the toolbar whenever the selection changes
  usePortableTextEditorSelection()

  const decoratorButtons = schemaDefinition.decorators
    ? schemaDefinition.decorators.map((decorator) => {
        return (
          <Tooltip key={decorator.name}>
            <TooltipTrigger asChild>
              <Button
                variant={
                  PortableTextEditor.isMarkActive(
                    editorInstance,
                    decorator.name,
                  )
                    ? 'secondary'
                    : 'ghost'
                }
                size="icon"
                onClick={() => {
                  // Toggle the decorator by name
                  PortableTextEditor.toggleMark(editorInstance, decorator.name)
                  // Pressing this button steals focus so let's focus the editor again
                  PortableTextEditor.focus(editorInstance)
                }}
              >
                {iconMap[decorator.name] || <></>}
                <span className="sr-only">{decorator.name}</span>
              </Button>
            </TooltipTrigger>
          </Tooltip>
        )
      })
    : null

  const linkButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={
            schemaDefinition.annotations &&
            PortableTextEditor.isAnnotationActive(
              editorInstance,
              schemaDefinition.annotations[0].name,
            )
              ? 'secondary'
              : 'ghost'
          }
          size="icon"
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
          <Link2 />
          <span className="sr-only">Link</span>
        </Button>
      </TooltipTrigger>
    </Tooltip>
  )

  const styleButtons = schemaDefinition.styles
    ? schemaDefinition.styles.map((style) => (
        <Tooltip key={style.name}>
          <TooltipTrigger asChild>
            <Button
              variant={
                PortableTextEditor.hasBlockStyle(editorInstance, style.name)
                  ? 'secondary'
                  : 'ghost'
              }
              size="icon"
              onClick={() => {
                PortableTextEditor.toggleBlockStyle(editorInstance, style.name)
                PortableTextEditor.focus(editorInstance)
              }}
            >
              {styleMap[style.name] || <></>}
              <span className="sr-only">Toggle {style.name}</span>
            </Button>
          </TooltipTrigger>
        </Tooltip>
      ))
    : null

  const listButtons = schemaDefinition.lists
    ? schemaDefinition.lists.map((list) => (
        <Tooltip key={list.name}>
          <TooltipTrigger asChild>
            <Button
              variant={
                PortableTextEditor.hasListStyle(editorInstance, list.name)
                  ? 'secondary'
                  : 'ghost'
              }
              size="icon"
              onClick={() => {
                PortableTextEditor.toggleList(editorInstance, list.name)
                PortableTextEditor.focus(editorInstance)
              }}
            >
              {listMap[list.name] || <></>}
              <span className="sr-only">Toggle {list.name}</span>
            </Button>
          </TooltipTrigger>
        </Tooltip>
      ))
    : null

  return (
    <TooltipProvider>
      <div className="inline-flex items-center ">
        <div className="flex flex-wrap items-center gap-1">
          {decoratorButtons}
          {linkButton}
          {styleButtons}
          {listButtons}
        </div>
      </div>
    </TooltipProvider>
  )
}

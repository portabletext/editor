import {FileUploader} from '@/components/form/file-uploader'
import {EditorLink, IEditorLinkForm} from '@/components/form/link'
import {StyleSelector} from '@/components/rich-text/style-selector'
import {StyledButton} from '@/components/styled-button'
import {useMediaQuery} from '@/hooks/use-media-query'
import {cn} from '@/lib/utils'
import {useEditor, useEditorSelector} from '@portabletext/editor'
import {
  isActiveDecorator,
  isActiveListItem,
  isActiveStyle,
} from '@portabletext/editor/selectors'
import {ImageIcon} from 'lucide-react'
import {useState} from 'react'
import {schemaDefinition, type SchemaDefinition} from './schema'

interface ToolbarButtonProps extends SchemaDefinition {
  active: boolean
  onClick: () => void
}

function ToolbarButton({name, icon, active, onClick}: ToolbarButtonProps) {
  const editor = useEditor()
  const Icon = icon
  return (
    <StyledButton
      size="icon-sm"
      type="button"
      variant="ghost"
      className={cn(active && 'dark:bg-accent bg-accent')}
      aria-label={name}
      onClick={() => {
        onClick()
        editor.send({type: 'focus'})
      }}
    >
      <Icon />
    </StyledButton>
  )
}

function DecoratorButton(props: SchemaDefinition) {
  const editor = useEditor()
  const active = useEditorSelector(editor, isActiveDecorator(props.name))

  return (
    <ToolbarButton
      active={active}
      onClick={() => {
        editor.send({
          type: 'decorator.toggle',
          decorator: props.name,
        })
      }}
      {...props}
    />
  )
}

function StyleButton(props: SchemaDefinition) {
  const editor = useEditor()
  const active = useEditorSelector(editor, isActiveStyle(props.name))

  return (
    <ToolbarButton
      active={active}
      onClick={() => {
        editor.send({type: 'style.toggle', style: props.name})
      }}
      {...props}
    />
  )
}

function ListButton(props: SchemaDefinition) {
  const editor = useEditor()
  const active = useEditorSelector(editor, isActiveListItem(props.name))

  return (
    <ToolbarButton
      active={active}
      onClick={() => {
        editor.send({
          type: 'list item.toggle',
          listItem: props.name,
        })
      }}
      {...props}
    />
  )
}

function DecoratorButtons() {
  return schemaDefinition.decorators.map((decorator) => (
    <DecoratorButton key={decorator.name} {...decorator} />
  ))
}

function StyleButtons() {
  return schemaDefinition.styles.map((style) => (
    <StyleButton key={style.name} {...style} />
  ))
}

function ListButtons() {
  return schemaDefinition.lists.map((list) => (
    <ListButton key={list.name} {...list} />
  ))
}

const AttachFileButton = () => {
  const editor = useEditor()

  return (
    <FileUploader
      trigger={
        <StyledButton type="button" size="icon-sm" variant="ghost">
          <ImageIcon />
        </StyledButton>
      }
      onFileUpload={(files) => {
        if (!files) {
          return
        }
        editor.send({type: 'focus'})
        for (const file of files) {
          editor.send({
            type: 'insert.inline object',
            inlineObject: {
              name: 'media',
              value: {
                id: file.id,
                name: file.name,
                src: file.src,
                mediaType: file.mediaType,
              },
            },
          })
        }
      }}
    />
  )
}

const LinkButton = () => {
  const editor = useEditor()

  return (
    <EditorLink
      onSubmit={(formData: IEditorLinkForm) => {
        if (!formData) {
          return
        }
        editor.send({type: 'focus'})
        editor.send({
          type: 'insert.inline object',
          inlineObject: {
            name: 'link',
            value: formData,
          },
        })
      }}
    />
  )
}

export const Toolbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
}) => {
  const [isDesktop, setIsDesktop] = useState(false)

  useMediaQuery('(min-width: 768px)', (isDesktop) => setIsDesktop(isDesktop))

  return (
    <div className={cn('flex gap-2 m-0 lg:mb-3', className)}>
      <DecoratorButtons />
      <LinkButton />
      <AttachFileButton />
      {isDesktop ? (
        <StyleButtons />
      ) : (
        <StyleSelector styles={schemaDefinition.styles} />
      )}
      <ListButtons />
    </div>
  )
}

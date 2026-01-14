import {Separator} from '@/components/ui/separator'
import {TooltipProvider} from '@/components/ui/tooltip'
import {
  blockquote,
  bold,
  createKeyboardShortcut,
  h1,
  h2,
  h3,
  italic,
  normal,
  underline,
} from '@portabletext/keyboard-shortcuts'
import {
  useToolbarSchema,
  type ExtendAnnotationSchemaType,
  type ExtendBlockObjectSchemaType,
  type ExtendDecoratorSchemaType,
  type ExtendInlineObjectSchemaType,
  type ExtendListSchemaType,
  type ExtendStyleSchemaType,
} from '@portabletext/toolbar'
import {
  ActivityIcon,
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  TextQuoteIcon,
  UnderlineIcon,
} from 'lucide-react'
import {AnnotationButton} from './annotation-button'
import {AnnotationPopover} from './annotation-popover'
import {BlockObjectButton} from './block-object-button'
import {DecoratorButton} from './decorator-button'
import {HistoryButtons} from './history-buttons'
import {InlineObjectButton} from './inline-object-button'
import {ListButton} from './list-button'
import {StyleButton} from './style-button'

const linkShortcut = createKeyboardShortcut({
  default: [{key: 'L', alt: false, ctrl: true, meta: false, shift: false}],
  apple: [{key: 'L', alt: false, ctrl: false, meta: true, shift: false}],
})

const extendDecorator: ExtendDecoratorSchemaType = (decorator) => {
  if (decorator.name === 'strong') {
    return {
      ...decorator,
      title: 'Bold',
      icon: BoldIcon,
      shortcut: bold,
    }
  }

  if (decorator.name === 'em') {
    return {
      ...decorator,
      title: 'Italic',
      icon: ItalicIcon,
      shortcut: italic,
    }
  }

  if (decorator.name === 'underline') {
    return {
      ...decorator,
      title: 'Underline',
      icon: UnderlineIcon,
      shortcut: underline,
    }
  }

  return decorator
}

const extendAnnotation: ExtendAnnotationSchemaType = (annotation) => {
  if (annotation.name === 'link') {
    return {
      ...annotation,
      title: 'Link',
      icon: LinkIcon,
      fields: annotation.fields.map((field) =>
        field.name === 'href' ? {...field, title: 'URL'} : field,
      ),
      defaultValues: {
        href: 'https://example.com',
      },
      shortcut: linkShortcut,
    }
  }

  return annotation
}

const extendStyle: ExtendStyleSchemaType = (style) => {
  if (style.name === 'normal') {
    return {
      ...style,
      title: 'Normal',
      icon: PilcrowIcon,
      shortcut: normal,
    }
  }

  if (style.name === 'h1') {
    return {
      ...style,
      title: 'Heading 1',
      icon: Heading1Icon,
      shortcut: h1,
    }
  }

  if (style.name === 'h2') {
    return {
      ...style,
      title: 'Heading 2',
      icon: Heading2Icon,
      shortcut: h2,
    }
  }

  if (style.name === 'h3') {
    return {
      ...style,
      title: 'Heading 3',
      icon: Heading3Icon,
      shortcut: h3,
    }
  }

  if (style.name === 'blockquote') {
    return {
      ...style,
      title: 'Blockquote',
      icon: TextQuoteIcon,
      shortcut: blockquote,
    }
  }

  return style
}

const extendList: ExtendListSchemaType = (list) => {
  if (list.name === 'bullet') {
    return {
      ...list,
      title: 'Bullet List',
      icon: ListIcon,
    }
  }

  if (list.name === 'number') {
    return {
      ...list,
      title: 'Numbered List',
      icon: ListOrderedIcon,
    }
  }

  return list
}

const extendBlockObject: ExtendBlockObjectSchemaType = (blockObject) => {
  if (blockObject.name === 'image') {
    return {
      ...blockObject,
      title: 'Image',
      icon: ImageIcon,
      fields: blockObject.fields.map((field) => {
        if (field.name === 'src') return {...field, title: 'Source URL'}
        if (field.name === 'alt') return {...field, title: 'Alt Text'}
        return field
      }),
      defaultValues: {
        src: 'https://placehold.co/400x300',
        alt: 'Placeholder image',
      },
    }
  }

  return blockObject
}

const extendInlineObject: ExtendInlineObjectSchemaType = (inlineObject) => {
  if (inlineObject.name === 'stock-ticker') {
    return {
      ...inlineObject,
      title: 'Stock Ticker',
      icon: ActivityIcon,
      fields: inlineObject.fields.map((field) => {
        if (field.name === 'symbol') return {...field, title: 'Symbol'}
        return field
      }),
      defaultValues: {
        symbol: 'AAPL',
      },
    }
  }

  return inlineObject
}

export function PortableTextToolbar() {
  const toolbarSchema = useToolbarSchema({
    extendDecorator,
    extendAnnotation,
    extendStyle,
    extendList,
    extendBlockObject,
    extendInlineObject,
  })

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex items-center gap-0.5 overflow-x-auto scrollbar-thin scrollbar-thumb-muted"
        role="toolbar"
        aria-label="Editor toolbar"
      >
        <HistoryButtons />

        {toolbarSchema.styles ? (
          <>
            <Separator
              orientation="vertical"
              className="mx-1.5 h-4 shrink-0 bg-muted-foreground/25"
            />
            <div className="shrink-0">
              <StyleButton schemaTypes={toolbarSchema.styles} />
            </div>
          </>
        ) : null}

        {toolbarSchema.decorators ? (
          <>
            <Separator
              orientation="vertical"
              className="mx-1.5 h-4 shrink-0 bg-muted-foreground/25"
            />
            <div
              className="flex items-center gap-0.5 shrink-0"
              role="group"
              aria-label="Decorators"
            >
              {toolbarSchema.decorators.map((decorator) => (
                <DecoratorButton key={decorator.name} schemaType={decorator} />
              ))}
            </div>
          </>
        ) : null}

        {toolbarSchema.annotations ? (
          <>
            <Separator
              orientation="vertical"
              className="mx-1.5 h-4 shrink-0 bg-muted-foreground/25"
            />
            <div
              className="flex items-center gap-0.5 shrink-0"
              role="group"
              aria-label="Annotations"
            >
              {toolbarSchema.annotations.map((annotation) => (
                <AnnotationButton
                  key={annotation.name}
                  schemaType={annotation}
                />
              ))}
            </div>
          </>
        ) : null}

        {toolbarSchema.lists ? (
          <>
            <Separator
              orientation="vertical"
              className="mx-1.5 h-4 shrink-0 bg-muted-foreground/25"
            />
            <div
              className="flex items-center gap-0.5 shrink-0"
              role="group"
              aria-label="Lists"
            >
              {toolbarSchema.lists.map((list) => (
                <ListButton key={list.name} schemaType={list} />
              ))}
            </div>
          </>
        ) : null}

        {toolbarSchema.inlineObjects ? (
          <>
            <Separator
              orientation="vertical"
              className="mx-1.5 h-4 shrink-0 bg-muted-foreground/25"
            />
            <div
              className="flex items-center gap-0.5 shrink-0"
              role="group"
              aria-label="Inline objects"
            >
              {toolbarSchema.inlineObjects.map((inlineObject) => (
                <InlineObjectButton
                  key={inlineObject.name}
                  schemaType={inlineObject}
                />
              ))}
            </div>
          </>
        ) : null}

        {toolbarSchema.blockObjects ? (
          <>
            <Separator
              orientation="vertical"
              className="mx-1.5 h-4 shrink-0 bg-muted-foreground/25"
            />
            <div
              className="flex items-center gap-0.5 shrink-0"
              role="group"
              aria-label="Block objects"
            >
              {toolbarSchema.blockObjects.map((blockObject) => (
                <BlockObjectButton
                  key={blockObject.name}
                  schemaType={blockObject}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {toolbarSchema.annotations ? (
        <AnnotationPopover schemaTypes={toolbarSchema.annotations} />
      ) : null}
    </TooltipProvider>
  )
}

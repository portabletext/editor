import {PortableTextEditable} from '@portabletext/editor'
import {TypographyPlugin} from '@portabletext/plugin-typography'
import {BlockquotePlugin} from './plugins/blockquote'
import {CalloutPlugin} from './plugins/callout'
import {CodeBlockPlugin} from './plugins/code-block'
import {EmojiPickerPlugin} from './plugins/emoji-picker'
import {HorizontalRulePlugin} from './plugins/horizontal-rule'
import {ImagePlugin} from './plugins/image'
import {MarkdownShortcutsPlugin} from './plugins/markdown-shortcuts'
import {SlashMenuPlugin} from './plugins/slash-menu'
import {StructuredListsPlugin} from './plugins/structured-lists'
import {TablesPlugin} from './plugins/tables'
import {Toolbar} from './toolbar'

export function PilcrowEditor() {
  return (
    <>
      <ImagePlugin />
      <HorizontalRulePlugin />
      <CodeBlockPlugin />
      <BlockquotePlugin />
      <CalloutPlugin />
      <TablesPlugin />
      <StructuredListsPlugin />
      <MarkdownShortcutsPlugin />
      <SlashMenuPlugin />
      <EmojiPickerPlugin />
      <TypographyPlugin />
      <div className="pc-editor">
        <Toolbar />
        <div className="pc-editor-body">
          <PortableTextEditable
            className="pc-editable"
            renderStyle={(styleProps) => {
              const tag =
                styleProps.value === 'normal'
                  ? 'p'
                  : (styleProps.value as
                      | 'h1'
                      | 'h2'
                      | 'h3'
                      | 'h4'
                      | 'h5'
                      | 'h6')
              const Tag = tag
              return (
                <Tag className={`pc-style pc-style-${styleProps.value}`}>
                  {styleProps.children}
                </Tag>
              )
            }}
            renderDecorator={(decoratorProps) => {
              const Tag = decoratorMap[decoratorProps.value] ?? 'span'
              return <Tag>{decoratorProps.children}</Tag>
            }}
            renderAnnotation={(annotationProps) => {
              if (annotationProps.schemaType.name === 'link') {
                const href =
                  (annotationProps.value as {href?: string} | undefined)
                    ?.href ?? '#'
                return (
                  <a className="pc-link" href={href}>
                    {annotationProps.children}
                  </a>
                )
              }
              return <>{annotationProps.children}</>
            }}
            renderChild={(childProps) => <>{childProps.children}</>}
            renderListItem={(listItemProps) => <>{listItemProps.children}</>}
            renderBlock={(blockProps) => <>{blockProps.children}</>}
          />
        </div>
      </div>
    </>
  )
}

const decoratorMap: Record<string, 'strong' | 'em' | 'code' | 's'> = {
  'strong': 'strong',
  'em': 'em',
  'code': 'code',
  'strike-through': 's',
}

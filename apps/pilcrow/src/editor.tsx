import {PortableTextEditable, type RangeDecoration} from '@portabletext/editor'
import {BlockquotePlugin} from './plugins/blockquote'
import {BubbleMenuPlugin} from './plugins/bubble-menu'
import {CalloutPlugin} from './plugins/callout'
import {CodeBlockPlugin} from './plugins/code-block'
import {HorizontalRulePlugin} from './plugins/horizontal-rule'
import {ImagePlugin} from './plugins/image'
import {MarkdownDeserializerPlugin} from './plugins/markdown-deserializer'
import {SaveOnHotkeyPlugin} from './plugins/save-on-hotkey'
import {useShikiDecorations} from './plugins/shiki'
import {StructuredListsPlugin} from './plugins/structured-lists'
import {TablesPlugin} from './plugins/tables'
import {TextFileDeserializerPlugin} from './plugins/text-file-deserializer'
import type {Theme} from './use-theme'

/**
 * Pilcrow's editor surface for M0.
 *
 * Container/leaf plugins are registration-only — they paint the chrome
 * and that's it. Smart behaviors (Tab to sink list items, table
 * navigation, code-block indent, slash menus, markdown shortcuts)
 * land in M1+.
 *
 * Inline marks (strong, em, code, strike-through) and the link
 * annotation use the legacy renderDecorator/renderAnnotation props
 * because the new v2 pipeline operates on block-level container/leaf
 * registrations; inline pieces still flow through the established
 * leaf-level prop callbacks.
 *
 * The renderBlock / renderStyle / renderListItem / renderChild props
 * pass children through unchanged — the new pipeline handles the
 * block-level rendering via ContainerPlugin + LeafPlugin. We keep
 * these stubs so the editor doesn't fall back to its default block
 * wrappers, which would conflict with the container chrome.
 */
export function PilcrowEditor(props: {theme: Theme}) {
  const rangeDecorations = useShikiDecorations(props.theme)
  return (
    <>
      <BlockquotePlugin />
      <CalloutPlugin />
      <CodeBlockPlugin />
      <HorizontalRulePlugin />
      <ImagePlugin />
      <StructuredListsPlugin />
      <TablesPlugin />
      <MarkdownDeserializerPlugin />
      <TextFileDeserializerPlugin />
      <SaveOnHotkeyPlugin />
      <BubbleMenuPlugin />
      <PortableTextEditable
        className="pc-editable"
        rangeDecorations={rangeDecorations as RangeDecoration[]}
        renderStyle={({value, children}) => {
          if (value === 'normal') {
            return <p className="pc-p">{children}</p>
          }
          if (
            value === 'h1' ||
            value === 'h2' ||
            value === 'h3' ||
            value === 'h4' ||
            value === 'h5' ||
            value === 'h6'
          ) {
            const Tag = value
            return <Tag className={`pc-${value}`}>{children}</Tag>
          }
          return <p className="pc-p">{children}</p>
        }}
        renderDecorator={({value, children}) => {
          if (value === 'strong') {
            return <strong className="pc-strong">{children}</strong>
          }
          if (value === 'em') {
            return <em className="pc-em">{children}</em>
          }
          if (value === 'code') {
            return <code className="pc-code">{children}</code>
          }
          if (value === 'strike-through') {
            return <s className="pc-strike">{children}</s>
          }
          return <span>{children}</span>
        }}
        renderAnnotation={({schemaType, value, children}) => {
          if (schemaType.name === 'link') {
            const link = value as {href?: string; title?: string}
            return (
              <a className="pc-link" href={link.href ?? '#'} title={link.title}>
                {children}
              </a>
            )
          }
          return <span>{children}</span>
        }}
        renderChild={(props) => <>{props.children}</>}
        renderListItem={(props) => <>{props.children}</>}
        renderBlock={(props) => <>{props.children}</>}
      />
    </>
  )
}

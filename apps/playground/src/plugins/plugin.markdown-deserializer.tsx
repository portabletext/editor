import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {markdownToPortableText} from '@portabletext/markdown'
import {useEffect} from 'react'

export function MarkdownDeserializerPlugin() {
  const editor = useEditor()

  useEffect(() => {
    return editor.registerBehavior({
      behavior: defineBehavior({
        on: 'deserialize.data',
        guard: ({snapshot, event}) => {
          if (event.mimeType !== 'text/plain') {
            return false
          }

          const blocks = markdownToPortableText(event.data, {
            schema: snapshot.context.schema,
            keyGenerator: snapshot.context.keyGenerator,
            html: {inline: 'skip'},
            types: {
              // Map md→pt's flat `{_type:'code', code:'a\nb\nc', language?}` into
              // the playground's editable code-block container shape. Each source
              // line becomes its own text block inside `lines`.
              code: ({context, value, isInline}) => {
                if (isInline) {
                  return undefined
                }
                const code = typeof value.code === 'string' ? value.code : ''
                const sourceLines = code.split('\n')
                // Trim a single trailing empty line - markdown-it always emits
                // one for fenced blocks.
                if (
                  sourceLines.length > 0 &&
                  sourceLines[sourceLines.length - 1] === ''
                ) {
                  sourceLines.pop()
                }
                const lines = sourceLines.map((text) => ({
                  _type: 'block',
                  _key: context.keyGenerator(),
                  style: 'normal',
                  children: [
                    {
                      _type: 'span',
                      _key: context.keyGenerator(),
                      text,
                      marks: [],
                    },
                  ],
                  markDefs: [],
                }))
                return {
                  _type: 'code-block',
                  _key: context.keyGenerator(),
                  lines,
                }
              },
              // The default md→pt table emits cells with field name `value`,
              // but the playground's cell schema uses `content`. Rename.
              table: ({context, value}) => {
                const rows = value.rows.map((row) => ({
                  _type: 'row',
                  _key: row._key,
                  cells: row.cells.map((cell) => ({
                    _type: 'cell',
                    _key: cell._key,
                    content: cell.value,
                  })),
                }))
                return {
                  _type: 'table',
                  _key: context.keyGenerator(),
                  ...(value.headerRows !== undefined
                    ? {headerRow: value.headerRows >= 1}
                    : {}),
                  rows,
                }
              },
              // The playground has a void `break` block-object in place of a
              // dedicated horizontal-rule type - map onto it.
              horizontalRule: ({context}) => ({
                _type: 'break',
                _key: context.keyGenerator(),
              }),
              // The deserializer marks every text block inside a GFM alert
              // with `style: 'blockquote'` so it renders as a quote when no
              // callout matcher is wired. The playground does match callouts,
              // so the blockquote frame stacks awkwardly with the callout's
              // own visual frame. Strip the style from content blocks.
              callout: ({context, value}) => ({
                _type: 'callout',
                _key: context.keyGenerator(),
                tone: value.tone,
                content: value.content.map((block) =>
                  block._type === 'block' && block.style === 'blockquote'
                    ? {...block, style: 'normal'}
                    : block,
                ),
              }),
            },
          })

          if (blocks.length === 0) {
            return false
          }

          return {blocks}
        },
        actions: [
          ({event}, {blocks}) => [
            raise({
              ...event,
              type: 'deserialization.success',
              data: blocks,
            }),
          ],
        ],
      }),
    })
  }, [editor])

  return null
}

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
              horizontalRule: ({context}) => ({
                _type: 'horizontal-rule',
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

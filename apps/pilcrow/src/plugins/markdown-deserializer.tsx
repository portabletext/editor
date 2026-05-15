import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {markdownToPortableText} from '@portabletext/markdown'
import {useEffect} from 'react'
import {pilcrowMatchers} from '../markdown'

/**
 * Translates pasted plain text through `markdownToPortableText` so any
 * markdown payload (paragraphs, headings, lists, code fences, tables,
 * GFM callouts, horizontal rules) renders structured on paste instead
 * of landing as a single span. Behaviour mirrors the upstream playground
 * deserializer, with pilcrow-specific matchers wired in.
 *
 * The engine ships a `text/markdown` converter that runs first for
 * payloads carrying that explicit MIME. This sits on the `text/plain`
 * stream, which is what every editor (including system clipboard from
 * a markdown file) actually exposes.
 */
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
            types: pilcrowMatchers,
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

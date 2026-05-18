import {useEditor} from '@portabletext/editor'
import {defineBehavior, effect, forward} from '@portabletext/editor/behaviors'
import {useEffect} from 'react'
import {readFiles} from './read-files'

/**
 * Reads dropped text/markdown files and re-dispatches the drop as a
 * `text/plain` deserialize event so the markdown deserializer can
 * pick it up and parse the body into blocks.
 *
 * Matches text/* MIME types plus the .md extension (the system clipboard
 * sometimes omits a MIME on local files even when the extension is .md).
 *
 * Mirrors the playground's TextFileDeserializerPlugin behaviour: chain
 * file → readAs text → re-send deserialize with text/plain data, then
 * fall through to MarkdownDeserializerPlugin.
 */
export function TextFileDeserializerPlugin() {
  const editor = useEditor()

  useEffect(() => {
    return editor.registerBehavior({
      behavior: defineBehavior({
        on: 'deserialize',
        guard: ({event}) => {
          const files = Array.from(
            event.originEvent.originEvent.dataTransfer.files,
          )
          const textFiles = files.filter(
            (file) =>
              file.type.startsWith('text/') ||
              file.name.toLowerCase().endsWith('.md'),
          )

          if (textFiles.length > 0) {
            return {textFiles}
          }

          return false
        },
        actions: [
          ({event}, {textFiles}) => [
            forward(event),
            effect(async () => {
              const textFileResults = await readFiles({
                files: textFiles,
                readAs: 'text',
              })
              const texts = textFileResults
                .filter((fileResult) => fileResult.status === 'fulfilled')
                .map((fileResult) => fileResult.value.result)

              for (const text of texts.reverse()) {
                const dataTransfer = new DataTransfer()
                dataTransfer.setData('text/plain', text)

                event.originEvent.originEvent.dataTransfer.setData(
                  'text/plain',
                  text,
                )

                editor.send({
                  ...event,
                  originEvent: {
                    ...event.originEvent,
                    originEvent: {
                      ...event.originEvent.originEvent,
                      dataTransfer,
                    },
                  },
                })
              }
            }),
          ],
        ],
      }),
    })
  }, [editor])

  return null
}

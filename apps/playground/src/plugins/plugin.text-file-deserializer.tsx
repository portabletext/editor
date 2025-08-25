import {useEditor} from '@portabletext/editor'
import {defineBehavior, effect, forward} from '@portabletext/editor/behaviors'
import {useEffect} from 'react'
import {readFiles} from './read-files'

export function TextFileDeserializerPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehaviors = [
      editor.registerBehavior({
        behavior: defineBehavior({
          on: 'deserialize',
          guard: ({event}) => {
            const files = Array.from(
              event.originEvent.originEvent.dataTransfer.files,
            )
            const textFiles = files.filter((file) =>
              file.type.startsWith('text/'),
            )

            if (textFiles.length > 0) {
              return {textFiles}
            }

            return false
          },
          actions: [
            ({event}, {textFiles}) => [
              // Forward the event so other Behaviors can respond to it
              forward(event),

              // Read the text files and send the `deserialize` event again
              // with `text/plain` data
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
      }),
    ]

    return () =>
      unregisterBehaviors.forEach((unregisterBehavior) => {
        unregisterBehavior()
      })
  }, [editor])

  return null
}

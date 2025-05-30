import {useEditor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
} from '@portabletext/editor/behaviors'
import {useEffect} from 'react'
import {readFiles} from './read-files'

export function ImageDeserializerPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehaviors = [
      editor.registerBehavior({
        behavior: defineBehavior<{images: Array<{alt: string; src: string}>}>({
          on: 'custom.insert.images',
          actions: [
            ({event}) => [
              raise({
                type: 'insert.blocks',
                blocks: event.images.map((image) => ({
                  _type: 'image',
                  alt: image.alt,
                  url: image.src,
                })),
                placement: 'auto',
              }),
            ],
          ],
        }),
      }),
      editor.registerBehavior({
        behavior: defineBehavior({
          on: 'deserialize',
          guard: ({event}) => {
            const files = Array.from(
              event.originEvent.originEvent.dataTransfer.files,
            )
            const imageFiles = files.filter((file) =>
              file.type.startsWith('image/'),
            )

            if (imageFiles.length > 0) {
              return {imageFiles}
            }

            return false
          },
          actions: [
            ({event}, {imageFiles}) => [
              // Forward the event so other Behaviors can respond to it
              forward(event),

              // This is async so it has to be an effect
              effect(async () => {
                const imageFileResults = await readFiles({
                  files: imageFiles,
                  readAs: 'data-url',
                })
                const images = imageFileResults
                  .filter((fileResult) => fileResult.status === 'fulfilled')
                  .map((fileResult) => ({
                    alt: fileResult.value.file.name,
                    src: fileResult.value.result,
                  }))

                editor.send({
                  type: 'custom.insert.images',
                  images,
                })
              }),
            ],
          ],
        }),
      }),
    ]

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor])

  return null
}

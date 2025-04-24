import {useEditor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  noop,
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
            const otherFiles = files.filter(
              (file) => !file.type.startsWith('image/'),
            )

            if (imageFiles.length > 0) {
              return {imageFiles, otherFiles}
            }

            return false
          },
          actions: [
            ({event}, {imageFiles, otherFiles}) => [
              // Clear image/* files from the DataTransfer object
              effect(() => {
                const dataTransfer = new DataTransfer()

                for (const file of otherFiles) {
                  dataTransfer.items.add(file)
                }

                event.originEvent.originEvent.dataTransfer = dataTransfer
              }),

              // Raise the deserialize event again with the updated
              // DataTransfer object so other Behaviors can respond to it
              raise({type: 'deserialize', originEvent: event.originEvent}),

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
              noop(),
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

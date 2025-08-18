import {htmlToBlocks} from '@portabletext/block-tools'
import {PortableTextBlock, useEditor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
} from '@portabletext/editor/behaviors'
import {defineConverter} from '@portabletext/editor/converters'
import {useEffect} from 'react'
import {readFiles} from './read-files'

export function ImageDeserializerPlugin() {
  const editor = useEditor()

  useEffect(() => {
    // Registering a custom Converter in the editor
    const unregisterConverter = editor.registerConverter({
      // This is the definition of the Converter
      converter: defineConverter({
        mimeType: 'text/html',
        // It's not concerned with the serialization of the data
        // (it should probably be an option to leave out the method rather than having to return a failure)
        serialize: ({event}) => {
          return {
            type: 'serialization.failure',
            mimeType: 'text/html',
            originEvent: event.originEvent,
            reason: 'Unsupported operation',
          }
        },
        // But it is concerned with the deserialization of the data where it uses `htmlToBlock` from
        // `@portabletext/block-tools` and adds custom matchers for images.
        deserialize: ({snapshot, event}) => {
          // Notice how `htmlToBlocks` can accept an `EditorSchema`
          const blocks = htmlToBlocks(event.data, snapshot.context.schema, {
            keyGenerator: snapshot.context.keyGenerator,
            matchers: {
              image: ({props}) => {
                return {
                  _type: 'image',
                  ...(props.src ? {url: props.src} : {}),
                  ...(props.alt ? {alt: props.alt} : {}),
                }
              },
              inlineImage: ({props}) => {
                return {
                  _type: 'image',
                  ...(props.src ? {url: props.src} : {}),
                  ...(props.alt ? {alt: props.alt} : {}),
                }
              },
            },
            // Ugly type cast that I need to fix
          }) as Array<PortableTextBlock>

          if (blocks.length === 0) {
            return {
              type: 'deserialization.failure',
              mimeType: 'text/html',
              reason: 'No blocks deserialized',
            }
          }

          return {
            type: 'deserialization.success',
            data: blocks,
            mimeType: 'text/html',
          }
        },
      }),
    })

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
      unregisterConverter()

      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor])

  return null
}

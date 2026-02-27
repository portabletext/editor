import {htmlToPortableText} from '@portabletext/html'
import {defineSchema, type PortableTextObject} from '@portabletext/schema'
import {expect, test, vi} from 'vitest'
import {effect, execute, raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

// Custom Behavior to resolve images, either by setting the src
// and alt props or deleting the block if the upload failed.
const resolveImagesBehavior = defineBehavior<{
  images: Array<ImageResult>
}>({
  on: 'custom.resolve-images',
  actions: [
    ({event}) =>
      event.images.map((image) =>
        image.status === 'fulfilled'
          ? raise({
              type: 'block.set',
              at: [{_key: image._key}],
              props: {
                src: image.result.src,
                alt: image.result.alt,
              },
            })
          : raise({
              type: 'delete.block',
              at: [{_key: image._key}],
            }),
      ),
  ],
})

test('Scenario: Pasting image files', async () => {
  const {editor} = await createTestEditor({
    children: (
      <BehaviorPlugin
        behaviors={[
          defineBehavior({
            on: 'deserialize',
            guard: ({snapshot, event}) => {
              const files = Array.from(
                event.originEvent.originEvent.dataTransfer.files,
              )
              const imageFiles = new Map(
                files
                  .filter((file) => file.type.startsWith('image/'))
                  .map((imageFile) => [
                    imageFile,
                    snapshot.context.keyGenerator(),
                  ]),
              )

              if (imageFiles.size === 0) {
                return false
              }

              return {imageFiles}
            },
            actions: [
              (_, {imageFiles}) => [
                // Insert the blocks immediately
                execute({
                  type: 'insert.blocks',
                  blocks: [...imageFiles.entries()].map(
                    ([imageFile, _key]) => ({
                      _key,
                      _type: 'image',
                      alt: imageFile.name,
                    }),
                  ),
                  placement: 'auto',
                }),
                // Then upload the images
                effect(({send}) => {
                  uploadImages(imageFiles)
                    .then((images) =>
                      // We'll mock the rejection of the second image
                      images.map((image) =>
                        image.status === 'fulfilled' &&
                        image.result.alt === 'pixel-b.jpg'
                          ? {
                              ...image,
                              status: 'rejected',
                            }
                          : image,
                      ),
                    )
                    .then((images) => {
                      // Finally, send a custom event to resolve the images
                      // in the editor
                      send({
                        type: 'custom.resolve-images',
                        images,
                      })
                    })
                }),
              ],
            ],
          }),
          resolveImagesBehavior,
        ]}
      />
    ),
    schemaDefinition: defineSchema({
      blockObjects: [
        {
          name: 'image',
          fields: [
            {name: 'src', type: 'string'},
            {name: 'alt', type: 'string'},
          ],
        },
      ],
    }),
  })

  // 1x1 pixel
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAAZf4xYAAAAASUVORK5CYII='
  const blob = new Blob([base64ToUint8Array(base64)], {type: 'image/jpeg'})
  const pixelA = new File([blob], 'pixel-a.jpg', {type: 'image/jpeg'})
  const pixelB = new File([blob], 'pixel-b.jpg', {type: 'image/jpeg'})
  const pixelC = new File([blob], 'pixel-c.jpg', {type: 'image/jpeg'})
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(pixelA)
  dataTransfer.items.add(pixelB)
  dataTransfer.items.add(pixelC)

  editor.send({
    type: 'clipboard.paste',
    originEvent: {dataTransfer},
    position: {
      selection: editor.getSnapshot().context.selection!,
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: 'k2',
        alt: 'pixel-a.jpg',
      },
      {
        _type: 'image',
        _key: 'k3',
        alt: 'pixel-b.jpg',
      },
      {
        _type: 'image',
        _key: 'k4',
        alt: 'pixel-c.jpg',
      },
    ])
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: 'k2',
        src: `data:image/jpeg;base64,${base64}`,
        alt: 'pixel-a.jpg',
      },
      {
        _type: 'image',
        _key: 'k4',
        src: `data:image/jpeg;base64,${base64}`,
        alt: 'pixel-c.jpg',
      },
    ])
  })
})

test('Scenario: Uploading images embedded in HTML', async () => {
  const {editor} = await createTestEditor({
    children: (
      <BehaviorPlugin
        behaviors={[
          defineBehavior({
            on: 'deserialize.data',
            guard: ({snapshot, event}) => {
              if (event.mimeType !== 'text/html') {
                return false
              }

              const blocks = htmlToPortableText(event.data, {
                schema: snapshot.context.schema,
                keyGenerator: snapshot.context.keyGenerator,
                matchers: {
                  image: ({context, props}) => {
                    return {
                      _type: 'image',
                      _key: context.keyGenerator(),
                      _src: props.src,
                      _alt: props.alt,
                    }
                  },
                },
              })

              if (blocks.length === 0) {
                return false
              }

              const pendingImageBlocks = blocks.filter(isPendingImageBlock)

              return {blocks, pendingImageBlocks}
            },
            actions: [
              (_, {blocks, pendingImageBlocks}) => [
                execute({
                  type: 'insert.blocks',
                  blocks,
                  placement: 'auto',
                }),
                effect(({send}) => {
                  uploadImagesFromSrc(pendingImageBlocks)
                    .then((images) =>
                      // We'll mock the rejection of the second image
                      images.map((image) =>
                        image.status === 'fulfilled' &&
                        image.result.alt === 'Image B'
                          ? {
                              ...image,
                              status: 'rejected',
                            }
                          : image,
                      ),
                    )
                    .then((images) => {
                      send({
                        type: 'custom.resolve-images',
                        images,
                      })
                    })
                }),
              ],
            ],
          }),
          resolveImagesBehavior,
        ]}
      />
    ),
    schemaDefinition: defineSchema({
      blockObjects: [
        {
          name: 'image',
          fields: [
            {name: 'src', type: 'string'},
            {name: 'alt', type: 'string'},
          ],
        },
      ],
    }),
  })

  const html = `
    <p><img src="https://example.com/image-a.jpg" alt="Image A" /></p>
    <p><img src="https://example.com/image-b.jpg" alt="Image B" /></p>
    <p><img src="https://example.com/image-c.jpg" alt="Image C" /></p>
  `
  const dataTransfer = new DataTransfer()
  dataTransfer.setData('text/html', html)
  editor.send({
    type: 'clipboard.paste',
    originEvent: {dataTransfer},
    position: {
      selection: editor.getSnapshot().context.selection!,
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: 'k2',
      },
      {
        _type: 'image',
        _key: 'k3',
      },
      {
        _type: 'image',
        _key: 'k4',
      },
    ])
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: 'k2',
        src: 'https://internal.com/image-a.jpg',
        alt: 'Image A',
      },
      {
        _type: 'image',
        _key: 'k4',
        src: 'https://internal.com/image-c.jpg',
        alt: 'Image C',
      },
    ])
  })
})

test('Scenario: Pasting image files that exist both in HTML and as a file', async () => {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAAZf4xYAAAAASUVORK5CYII='
  const blob = new Blob([base64ToUint8Array(base64)], {type: 'image/jpeg'})
  const imageA = new File([blob], 'image-a.jpg', {type: 'image/jpeg'})
  const html =
    '<p><img src="https://example.com/image-a.jpg" alt="Image A" /></p>'

  const handleImageFilesBehavior = defineBehavior({
    on: 'deserialize',
    guard: ({snapshot, event}) => {
      const files = Array.from(event.originEvent.originEvent.dataTransfer.files)
      const imageFiles = new Map(
        files
          .filter((file) => file.type.startsWith('image/'))
          .map((imageFile) => [imageFile, snapshot.context.keyGenerator()]),
      )

      if (imageFiles.size === 0) {
        return false
      }

      return {imageFiles}
    },
    actions: [
      (_, {imageFiles}) => [
        execute({
          type: 'insert.blocks',
          blocks: [...imageFiles.entries()].map(([_, _key]) => ({
            _key,
            _type: 'image',
          })),
          placement: 'auto',
        }),
        effect(({send}) => {
          uploadImages(imageFiles).then((images) => {
            send({
              type: 'custom.resolve-images',
              images,
            })
          })
        }),
      ],
    ],
  })

  const handleHtmlImagesBehavior = defineBehavior({
    on: 'deserialize.data',
    guard: ({snapshot, event}) => {
      if (event.mimeType !== 'text/html') {
        return false
      }

      const blocks = htmlToPortableText(event.data, {
        schema: snapshot.context.schema,
        keyGenerator: snapshot.context.keyGenerator,
        matchers: {
          image: ({context, props}) => {
            return {
              _type: 'image',
              _key: context.keyGenerator(),
              _src: props.src,
              _alt: props.alt,
            }
          },
        },
      })

      if (blocks.length === 0) {
        return false
      }

      const pendingImageBlocks = blocks.filter(isPendingImageBlock)

      return {blocks, pendingImageBlocks}
    },
    actions: [
      (_, {blocks, pendingImageBlocks}) => [
        execute({
          type: 'insert.blocks',
          blocks,
          placement: 'auto',
        }),
        effect(({send}) => {
          uploadImagesFromSrc(pendingImageBlocks).then((images) => {
            send({
              type: 'custom.resolve-images',
              images,
            })
          })
        }),
      ],
    ],
  })

  // Given an editor with Behaviors that handle image files and HTML images
  const {editor} = await createTestEditor({
    children: (
      <BehaviorPlugin
        behaviors={[
          handleImageFilesBehavior,
          handleHtmlImagesBehavior,
          resolveImagesBehavior,
        ]}
      />
    ),
    schemaDefinition: defineSchema({
      blockObjects: [
        {
          name: 'image',
          fields: [
            {name: 'src', type: 'string'},
            {name: 'alt', type: 'string'},
          ],
        },
      ],
    }),
  })

  // When pasting an image file and HTML image
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(imageA)
  dataTransfer.setData('text/html', html)
  editor.send({
    type: 'clipboard.paste',
    originEvent: {dataTransfer},
    position: {
      selection: editor.getSnapshot().context.selection!,
    },
  })

  // Then the image file takes precedence because the `deserialize` events
  // happens before the `deserialize.data` event.
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: 'k2',
        src: `data:image/jpeg;base64,${base64}`,
        alt: 'image-a.jpg',
      },
    ])
  })
})

type PendingImageBlock = {
  _type: 'image'
  _key: string
  _src: string
  _alt: string
}

function isPendingImageBlock(
  block: PortableTextObject,
): block is PendingImageBlock {
  return block._type === 'image' && block['_src'] !== undefined
}

type ImageResult =
  | {
      _key: string
      status: 'fulfilled'
      result: {
        src: string
        alt: string
      }
    }
  | {
      _key: string
      status: 'rejected'
    }

function base64ToUint8Array(b64: string) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes
}

function uploadImages(images: Map<File, string>): Promise<Array<ImageResult>> {
  return Promise.all(
    [...images.entries()].map(([file, _key]) => uploadImage([file, _key])),
  )
}

function uploadImage([file, _key]: [File, string]) {
  return new Promise<ImageResult>((resolve) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({
          _key,
          status: 'fulfilled',
          result: {
            src: reader.result,
            alt: file.name,
          },
        })
      } else {
        resolve({
          _key,
          status: 'rejected',
        })
      }
    }

    reader.onerror = () => {
      resolve({
        _key,
        status: 'rejected',
      })
    }

    reader.readAsDataURL(file)
  })
}

function uploadImagesFromSrc(
  images: Array<{_src: string; _key: string; _alt: string}>,
) {
  return Promise.all(images.map((image) => uploadImageFromSrc(image)))
}

function uploadImageFromSrc({
  _src,
  _key,
  _alt,
}: {
  _src: string
  _key: string
  _alt: string
}) {
  return new Promise<ImageResult>((resolve) => {
    resolve({
      _key,
      status: 'fulfilled',
      result: {
        src: _src.replace('example.com', 'internal.com'),
        alt: _alt,
      },
    })
  })
}

import {
  htmlToBlocks,
  type ImageSchemaMatcher,
  type SchemaMatchers,
} from '@portabletext/block-tools'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {defineBehavior, effect, execute, raise} from '../src/behaviors'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {BehaviorPlugin} from '../src/plugins'

describe('event.clipboard.paste', () => {
  test('Scenario: Cut/paste block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()

    // Given the text "foo bar baz|{image}"
    const {locator, editorRef, editorActorRef, slateRef} =
      await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'src', type: 'string'}]},
          ],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo bar baz'}],
          },
          {
            _key: imageKey,
            _type: 'image',
            src: 'https://example.com/image.jpg',
          },
        ],
      })

    const imageSelection = {
      anchor: {
        path: [{_key: imageKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: imageKey}],
        offset: 0,
      },
    }

    // When the {image} is selected
    await userEvent.click(locator)
    editorRef.current?.send({type: 'select', at: imageSelection})

    await vi.waitFor(() => {
      const selection = editorRef.current?.getSnapshot().context.selection
      expect(selection).toEqual({
        ...imageSelection,
        backward: false,
      })
    })

    const dataTransfer = new DataTransfer()

    // And cut is performed
    editorActorRef.current?.send({
      type: 'behavior event',
      behaviorEvent: {
        type: 'clipboard.cut',
        originEvent: {dataTransfer},
        position: {
          selection: imageSelection,
        },
      },
      editor: slateRef.current!,
    })

    const newSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
      },
    }

    // And the caret is put before "foo bar baz"
    editorRef.current?.send({type: 'select', at: newSelection})

    // And paste is performed
    editorActorRef.current?.send({
      type: 'behavior event',
      behaviorEvent: {
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {
          selection: newSelection,
        },
      },
      editor: slateRef.current!,
    })

    // Then the image is pasted before "foo bar baz"
    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // And when paste is performed
    editorActorRef.current?.send({
      type: 'behavior event',
      behaviorEvent: {
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {
          selection: imageSelection,
        },
      },
      editor: slateRef.current!,
    })

    // The image is pasted again, this time with a new _key
    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
        {
          _key: 'k5',
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('Scenario Outline: Pasting text/html with an inline image', () => {
    const html =
      '<p>Hello world</p><p>foo <img src="https://example.com/image.jpg" alt="Image" /> bar</p><p>baz</p>'

    const schemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'image',
          fields: [
            {name: 'src', type: 'string'},
            {name: 'alt', type: 'string'},
          ],
        },
      ],
      inlineObjects: [
        {
          name: 'image',
          fields: [
            {name: 'src', type: 'string'},
            {name: 'alt', type: 'string'},
          ],
        },
      ],
    })

    const imageMatcher: ImageSchemaMatcher = ({context, props}) => {
      return {
        _type: 'image',
        _key: context.keyGenerator(),
        src: props.src,
        alt: props.alt,
      }
    }
    const inlineImageMatcher: ImageSchemaMatcher = ({context, props}) => {
      return {
        _type: 'image',
        _key: context.keyGenerator(),
        src: props.src,
        alt: props.alt,
      }
    }

    function createBehavior(matchers: SchemaMatchers) {
      return defineBehavior({
        on: 'deserialize.data',
        guard: ({snapshot, event}) => {
          if (event.mimeType !== 'text/html') {
            return false
          }

          const blocks = htmlToBlocks(event.data, snapshot.context.schema, {
            keyGenerator: snapshot.context.keyGenerator,
            matchers,
          })

          if (blocks.length === 0) {
            return false
          }

          return {
            blocks,
          }
        },
        actions: [
          ({event}, {blocks}) => [
            raise({
              type: 'deserialization.success',
              data: blocks,
              mimeType: 'text/html',
              originEvent: event.originEvent,
            }),
          ],
        ],
      })
    }

    test('Scenario: `image` and `inlineImage` block-tools matchers', async () => {
      const {editorRef, paste} = await createTestEditor({
        children: (
          <BehaviorPlugin
            behaviors={[
              createBehavior({
                inlineImage: inlineImageMatcher,
                image: imageMatcher,
              }),
            ]}
          />
        ),
        schemaDefinition,
      })

      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/html', html)
      paste(dataTransfer)

      await vi.waitFor(() => {
        expect(getTersePt(editorRef.current?.getSnapshot().context!)).toEqual([
          'Hello world',
          'foo ,{image}, bar',
          'baz',
        ])
      })
    })

    test('Scenario: only `image` matcher', async () => {
      const {editorRef, paste} = await createTestEditor({
        children: (
          <BehaviorPlugin
            behaviors={[
              createBehavior({
                image: imageMatcher,
              }),
            ]}
          />
        ),
        schemaDefinition,
      })

      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/html', html)
      paste(dataTransfer)

      await vi.waitFor(() => {
        expect(getTersePt(editorRef.current?.getSnapshot().context!)).toEqual([
          'Hello world',
          'foo',
          '{image}',
          'bar',
          'baz',
        ])
      })
    })

    test('Scenario: No matchers', async () => {
      const {editorRef, paste} = await createTestEditor({
        children: <BehaviorPlugin behaviors={[createBehavior({})]} />,
        schemaDefinition,
      })

      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/html', html)
      paste(dataTransfer)

      await vi.waitFor(() => {
        expect(getTersePt(editorRef.current?.getSnapshot().context!)).toEqual([
          'Hello world',
          'foo bar',
          'baz',
        ])
      })
    })
  })

  test('Scenario: Pasting image files', async () => {
    const {editorRef, paste} = await createTestEditor({
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
            // Custom Behavior to resolve images, either by setting the src
            // and alt props or deleting the block if the upload failed.
            defineBehavior<{
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
            }),
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

    paste(dataTransfer)

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
})

function base64ToUint8Array(b64: string) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function uploadImages(images: Map<File, string>): Promise<Array<ImageResult>> {
  return Promise.all(
    [...images.entries()].map(([file, _key]) => uploadImage([file, _key])),
  )
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

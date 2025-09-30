import {
  htmlToBlocks,
  type ImageSchemaMatcher,
  type SchemaMatchers,
} from '@portabletext/block-tools'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('event.clipboard.paste', () => {
  test('Scenario: Cut/paste block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()

    // Given the text "foo bar baz|{image}"
    const {locator, editor} = await createTestEditor({
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
    editor.send({type: 'select', at: imageSelection})

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).toEqual({
        ...imageSelection,
        backward: false,
      })
    })

    const dataTransfer = new DataTransfer()

    // And cut is performed
    editor.send({
      type: 'clipboard.cut',
      originEvent: {dataTransfer},
      position: {
        selection: imageSelection,
      },
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
    editor.send({type: 'select', at: newSelection})

    // And paste is performed
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: newSelection,
      },
    })

    // Then the image is pasted before "foo bar baz"
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: imageSelection,
      },
    })

    // The image is pasted again, this time with a new _key
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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
      const {editor} = await createTestEditor({
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
      editor.send({
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {
          selection: editor.getSnapshot().context.selection!,
        },
      })

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context!)).toEqual([
          'Hello world',
          'foo ,{image}, bar',
          'baz',
        ])
      })
    })

    test('Scenario: only `image` matcher', async () => {
      const {editor} = await createTestEditor({
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
      editor.send({
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {
          selection: editor.getSnapshot().context.selection!,
        },
      })

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context!)).toEqual([
          'Hello world',
          'foo',
          '{image}',
          'bar',
          'baz',
        ])
      })
    })

    test('Scenario: No matchers', async () => {
      const {editor} = await createTestEditor({
        children: <BehaviorPlugin behaviors={[createBehavior({})]} />,
        schemaDefinition,
      })

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
        expect(getTersePt(editor.getSnapshot().context!)).toEqual([
          'Hello world',
          'foo bar',
          'baz',
        ])
      })
    })
  })
})

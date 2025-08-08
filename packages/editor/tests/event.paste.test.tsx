import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'

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
})

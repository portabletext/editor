import {createTestKeyGenerator} from '@portabletext/test'
import {assert, describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {converterPortableText} from '../src/converters/converter.portable-text'
import {createTestEditor} from '../src/test/vitest'

describe('event.drag.drop self-drop semantics', () => {
  test('Scenario: collapsed drop inside expanded drag origin is suppressed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const dragSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 6},
    }
    const dropSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 3,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 3},
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: dragSelection})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...dragSelection,
        backward: false,
      })
    })

    const initialValue = editor.getSnapshot().context.value

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: dragSelection},
      position: {
        block: 'end',
        isEditor: false,
        isContainer: false,
        selection: dropSelection,
      },
    })

    // Wait a tick to let any async drop processing complete
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })

  test('Scenario: collapsed drop at start edge of expanded drag origin is suppressed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const dragSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 6},
    }
    const dropSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 0},
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: dragSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...dragSelection,
        backward: false,
      })
    })

    const initialValue = editor.getSnapshot().context.value

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: dragSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: dropSelection,
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })

  test('Scenario: collapsed drop at end edge of expanded drag origin is suppressed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const dragSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 6},
    }
    const dropSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 6,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 6},
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: dragSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...dragSelection,
        backward: false,
      })
    })

    const initialValue = editor.getSnapshot().context.value

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: dragSelection},
      position: {
        block: 'end',
        isEditor: false,
        isContainer: false,
        selection: dropSelection,
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })

  test('Scenario: drop onto block-object inside drag origin is suppressed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKeyA = keyGenerator()
    const spanKeyA = keyGenerator()
    const imageKey = keyGenerator()
    const blockKeyB = keyGenerator()
    const spanKeyB = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKeyA,
          _type: 'block',
          children: [{_key: spanKeyA, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_key: imageKey, _type: 'image', src: 'https://example.com/image.jpg'},
        {
          _key: blockKeyB,
          _type: 'block',
          children: [{_key: spanKeyB, _type: 'span', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const dragSelection = {
      anchor: {
        path: [{_key: blockKeyA}, 'children', {_key: spanKeyA}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKeyB}, 'children', {_key: spanKeyB}],
        offset: 3,
      },
    }
    const dropSelection = {
      anchor: {path: [{_key: imageKey}], offset: 0},
      focus: {path: [{_key: imageKey}], offset: 0},
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: dragSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...dragSelection,
        backward: false,
      })
    })

    const initialValue = editor.getSnapshot().context.value

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: dragSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: dropSelection,
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })

  test('Scenario: drop after the drag origin end is allowed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKeyA = keyGenerator()
    const spanKeyA = keyGenerator()
    const blockKeyB = keyGenerator()
    const spanKeyB = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKeyA,
          _type: 'block',
          children: [{_key: spanKeyA, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: blockKeyB,
          _type: 'block',
          children: [{_key: spanKeyB, _type: 'span', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const dragSelection = {
      anchor: {
        path: [{_key: blockKeyA}, 'children', {_key: spanKeyA}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKeyA}, 'children', {_key: spanKeyA}],
        offset: 3,
      },
    }
    const dropSelection = {
      anchor: {
        path: [{_key: blockKeyB}, 'children', {_key: spanKeyB}],
        offset: 3,
      },
      focus: {
        path: [{_key: blockKeyB}, 'children', {_key: spanKeyB}],
        offset: 3,
      },
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: dragSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...dragSelection,
        backward: false,
      })
    })

    const initialValue = editor.getSnapshot().context.value

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: dragSelection},
      position: {
        block: 'end',
        isEditor: false,
        isContainer: false,
        selection: dropSelection,
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).not.toEqual(initialValue)
    })
  })
})

import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {
  defineSchema,
  type EditorEmittedEvent,
  type Operation,
  type Patch,
} from '../src'
import {EventListenerPlugin} from '../src/plugins'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../test-utils/text-block-depths'

describe('event.remove.text', () => {
  test('Scenario: remove.text at an explicit position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [
            {_key: 's0', _type: 'span', text: 'hello world', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    editor.send({
      type: 'remove.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 5,
      text: ' world',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: remove.text with empty text applies no operation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          style: 'normal',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })
    const operations: Array<Operation> = []
    editor.on('operation', (event) => {
      operations.push(event.operation)
    })

    editor.send({
      type: 'remove.text',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      offset: 1,
      text: '',
    })
    editor.send({
      type: 'remove.text',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      offset: 2,
      text: 'o',
    })

    await vi.waitFor(() => {
      expect(operations).toEqual([
        {
          type: 'remove.text',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 2,
          text: 'o',
        },
      ])
    })
  })

  test('Scenario: remove.text with empty text leaves unnormalized siblings unmerged', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: fooBlockKey,
          _type: 'block',
          style: 'normal',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
        },
        {
          _key: bazBlockKey,
          _type: 'block',
          style: 'normal',
          children: [{_key: bazSpanKey, _type: 'span', text: 'baz', marks: []}],
          markDefs: [],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
      offset: 1,
      text: '',
    })
    editor.send({
      type: 'remove.text',
      at: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
      offset: 2,
      text: 'z',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: fooBlockKey,
          _type: 'block',
          style: 'normal',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
        },
        {
          _key: bazBlockKey,
          _type: 'block',
          style: 'normal',
          children: [{_key: bazSpanKey, _type: 'span', text: 'ba', marks: []}],
          markDefs: [],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}, 'text'],
          value: '@@ -1,3 +1,2 @@\n ba\n-z\n',
          origin: 'local',
        },
      ])
    })
  })
})

describe('event.remove.text with a compact path at the root', () => {
  test('Scenario: `remove.text` at a compact span path (indexed) changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })

    editor.send({type: 'remove.text', at: [0, 0], offset: 1, text: 'oo'})
    editor.send({
      type: 'remove.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 1,
      text: 'ar',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'remove.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 1,
              text: 'ar',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1 @@\n b\n-ar\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1 @@\n b\n-ar\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'b', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.remove.text with a compact path inside a callout', () => {
  test('Scenario: `remove.text` at a compact span path (indexed) changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [0, 'content', 0, 0],
      offset: 1,
      text: 'oo',
    })
    editor.send({
      type: 'remove.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 1,
      text: 'ar',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'remove.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 1,
              text: 'ar',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
                'text',
              ],
              value: '@@ -1,3 +1 @@\n b\n-ar\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: '@@ -1,3 +1 @@\n b\n-ar\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'b', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.remove.text with a compact path inside a callout inside a callout', () => {
  test('Scenario: `remove.text` at a compact span path (indexed) changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [0, 'content', 0, 'content', 0, 0],
      offset: 1,
      text: 'oo',
    })
    editor.send({
      type: 'remove.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 1,
      text: 'ar',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'remove.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 1,
              text: 'ar',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
                'text',
              ],
              value: '@@ -1,3 +1 @@\n b\n-ar\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: '@@ -1,3 +1 @@\n b\n-ar\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b1',
                children: [{_type: 'span', _key: 's1', text: 'b', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.remove.text with a compact path inside a field with its own sub-schema', () => {
  test('Scenario: `remove.text` at a compact span path (indexed) changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [0, 'body', 0, 0],
      offset: 1,
      text: 'oo',
    })
    editor.send({
      type: 'remove.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 1,
      text: 'ar',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'remove.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 1,
              text: 'ar',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
                'text',
              ],
              value: '@@ -1,3 +1 @@\n b\n-ar\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: '@@ -1,3 +1 @@\n b\n-ar\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'b', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {defineSchema, type EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../test-utils/text-block-depths'

describe('event.insert', () => {
  test('Scenario: insert a node into an array', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    editor.send({
      type: 'insert',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      value: {_key: 's1', _type: 'span', text: 'bar', marks: ['strong']},
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [
            {_key: 's0', _type: 'span', text: 'foo', marks: []},
            {_key: 's1', _type: 'span', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
        },
      ])
    })
  })
})

describe('event.insert with a compact path at the root', () => {
  test('Scenario: `insert` at a compact span path (indexed) changes nothing', async () => {
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

    editor.send({
      type: 'insert',
      at: [0, 0],
      value: {_key: 'i0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert',
      at: [{_key: 'b1'}],
      value: {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert',
              path: [{_key: 'b1'}],
              node: {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              position: 'after',
              inverse: {type: 'unset', path: [{_key: 'b2'}]},
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'insert',
              path: [{_key: 'b1'}],
              position: 'after',
              items: [
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
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
        children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.insert with a compact path inside a callout', () => {
  test('Scenario: `insert` at a compact span path (indexed) changes nothing', async () => {
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
      type: 'insert',
      at: [0, 'content', 0, 0],
      value: {_key: 'i0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}],
      value: {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert',
              path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
              node: {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              position: 'after',
              inverse: {
                type: 'unset',
                path: [{_key: 'c0'}, 'content', {_key: 'b2'}],
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'setIfMissing',
              path: [{_key: 'c0'}, 'content'],
              value: [],
            },
            {
              origin: 'local',
              type: 'insert',
              path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
              position: 'after',
              items: [
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'setIfMissing',
            path: [{_key: 'c0'}, 'content'],
            value: [],
          },
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
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
            children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
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

describe('event.insert with a compact path inside a callout inside a callout', () => {
  test('Scenario: `insert` at a compact span path (indexed) changes nothing', async () => {
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
      type: 'insert',
      at: [0, 'content', 0, 'content', 0, 0],
      value: {_key: 'i0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert',
      at: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content', {_key: 'b1'}],
      value: {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
              ],
              node: {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              position: 'after',
              inverse: {
                type: 'unset',
                path: [
                  {_key: 'c0'},
                  'content',
                  {_key: 'c1'},
                  'content',
                  {_key: 'b2'},
                ],
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'setIfMissing',
              path: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content'],
              value: [],
            },
            {
              origin: 'local',
              type: 'insert',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
              ],
              position: 'after',
              items: [
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'setIfMissing',
            path: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content'],
            value: [],
          },
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
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
                children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
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

describe('event.insert with a compact path inside a field with its own sub-schema', () => {
  test('Scenario: `insert` at a compact span path (indexed) changes nothing', async () => {
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
      type: 'insert',
      at: [0, 'body', 0, 0],
      value: {_key: 'i0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}],
      value: {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert',
              path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
              node: {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              position: 'after',
              inverse: {
                type: 'unset',
                path: [{_key: 'n0'}, 'body', {_key: 'b2'}],
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'setIfMissing',
              path: [{_key: 'n0'}, 'body'],
              value: [],
            },
            {
              origin: 'local',
              type: 'insert',
              path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
              position: 'after',
              items: [
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'setIfMissing',
            path: [{_key: 'n0'}, 'body'],
            value: [],
          },
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
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
            children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
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

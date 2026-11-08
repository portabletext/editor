import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src'
import type {BehaviorEvent} from '../src/behaviors'
import {effect, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../test-utils/text-block-depths'

describe('a path to a missing key at the root', () => {
  test('Scenario: `insert.text` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}],
      offset: 0,
      text: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert.text',
        at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}],
        offset: 0,
        text: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}],
      value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert',
        at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}],
        value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      },
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `remove.text` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}],
      offset: 0,
      text: 'f',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'remove.text',
        at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}],
        offset: 0,
        text: 'f',
      },
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `set` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}, 'text'],
      value: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'set',
        at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}, 'text'],
        value: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `unset` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {type: 'unset', at: [{_key: 'b0'}, 'children', {_key: 's0-missing'}]},
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'b0'}, 'children', {_key: 's0-missing'}],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [{_key: 'b0'}, 'children', {_key: 's0-missing'}, 'marks'],
          value: ['em'],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', {_key: 's0-missing'}, 'text'],
          value: 'baz',
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [{_key: 'b0'}, 'children', {_key: 's0-missing'}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert.text` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
      offset: 0,
      text: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert.text',
        at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
        offset: 0,
        text: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
      value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert',
        at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
        value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      },
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `remove.text` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
      offset: 0,
      text: 'f',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'remove.text',
        at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
        offset: 0,
        text: 'f',
      },
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `set` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}, 'text'],
      value: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'set',
        at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}, 'text'],
        value: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `unset` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
              text: 'baz',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'unset',
        at: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
      },
      {
        type: 'insert.text',
        at: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: 'b0-missing-top-level'},
            'children',
            {_key: 's0'},
            'marks',
          ],
          value: ['em'],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'b0-missing-top-level'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'baz',
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [{_key: 'b0-missing-top-level'}, 'children', {_key: 's0'}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('a path to a missing span key by block position at the root', () => {
  test('Scenario: a local `unset` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [{_key: 'b2'}, 'children', {_key: 's2-missing'}],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a local `insert` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [{_key: 'b2'}, 'children', {_key: 's2-missing'}],
      value: {_key: 'x0', _type: 'span', text: 'qux', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `unset` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'b2'}, 'children', {_key: 's2-missing'}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `insert` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: 'b2'}, 'children', {_key: 's2-missing'}],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'qux', marks: []}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a local `unset` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [{_key: 'b1'}, 'children', {_key: 's1-missing'}],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a local `insert` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [{_key: 'b1'}, 'children', {_key: 's1-missing'}],
      value: {_key: 'x0', _type: 'span', text: 'qux', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `unset` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'b1'}, 'children', {_key: 's1-missing'}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `insert` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: 'b1'}, 'children', {_key: 's1-missing'}],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'qux', marks: []}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

describe('a path to a missing key inside a callout', () => {
  test('Scenario: `insert.text` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
      offset: 0,
      text: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
        offset: 0,
        text: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
        value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `remove.text` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
      offset: 0,
      text: 'f',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'remove.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
        offset: 0,
        text: 'f',
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `set` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'set',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
        'text',
      ],
      value: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'set',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
          'text',
        ],
        value: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `unset` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'unset',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
            'marks',
          ],
          value: ['em'],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
            'text',
          ],
          value: 'baz',
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
          ],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert.text` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 0,
      text: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert.text',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 0,
        text: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `remove.text` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 0,
      text: 'f',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'remove.text',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 0,
        text: 'f',
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `set` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'set',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
        'text',
      ],
      value: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'set',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `unset` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'unset',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
      },
      {
        type: 'insert.text',
        at: [{_key: 'c0'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'b0-missing-top-level'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: 'b0-missing-top-level'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'marks',
          ],
          value: ['em'],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'b0-missing-top-level'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'baz',
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [
            {_key: 'b0-missing-top-level'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
          ],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('a path to a missing span key by block position inside a callout', () => {
  test('Scenario: a local `unset` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b2'},
        'children',
        {_key: 's2-missing'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a local `insert` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b2'},
        'children',
        {_key: 's2-missing'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'qux', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `unset` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2-missing'},
          ],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `insert` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2-missing'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'qux', marks: []}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a local `unset` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1-missing'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a local `insert` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1-missing'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'qux', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `unset` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1-missing'},
          ],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `insert` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1-missing'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'qux', marks: []}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

describe('a path to a missing key inside a callout inside a callout', () => {
  test('Scenario: `insert.text` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
      offset: 0,
      text: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
        offset: 0,
        text: 'baz',
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: `insert` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
        value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: `remove.text` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
      offset: 0,
      text: 'f',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'remove.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
        offset: 0,
        text: 'f',
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: `set` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'set',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
        'text',
      ],
      value: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'set',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
          'text',
        ],
        value: 'baz',
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: `unset` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'unset',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: an incoming `insert` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
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
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
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
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
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
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
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
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
            'marks',
          ],
          value: ['em'],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
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
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
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
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
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
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
            'text',
          ],
          value: 'baz',
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
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
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
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
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
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
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
          ],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
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
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
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
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert.text` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 0,
      text: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert.text',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 0,
        text: 'baz',
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: `insert` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: `remove.text` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 0,
      text: 'f',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'remove.text',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 0,
        text: 'f',
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: `set` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'set',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
        'text',
      ],
      value: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'set',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: 'baz',
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: `unset` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'b0-missing-top-level'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'unset',
        at: [
          {_key: 'b0-missing-top-level'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
      },
      {
        type: 'insert.text',
        at: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
        text: 'baz',
      },
    ])
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
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
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

  test('Scenario: an incoming `insert` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
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
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'b0-missing-top-level'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
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
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
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
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
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
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: 'b0-missing-top-level'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'marks',
          ],
          value: ['em'],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
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
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
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
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
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
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'b0-missing-top-level'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'baz',
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
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
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
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
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
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
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [
            {_key: 'b0-missing-top-level'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
          ],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
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
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
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
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('a path to a missing span key by block position inside a callout inside a callout', () => {
  test('Scenario: a local `unset` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b2'},
        'children',
        {_key: 's2-missing'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
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
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
                children: [
                  {_type: 'span', _key: 's0', text: 'fooqux', marks: []},
                ],
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

  test('Scenario: a local `insert` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b2'},
        'children',
        {_key: 's2-missing'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'qux', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
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
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
                children: [
                  {_type: 'span', _key: 's0', text: 'fooqux', marks: []},
                ],
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

  test('Scenario: a remote `unset` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2-missing'},
          ],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
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
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
                children: [
                  {_type: 'span', _key: 's0', text: 'fooqux', marks: []},
                ],
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

  test('Scenario: a remote `insert` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2-missing'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'qux', marks: []}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
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
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
                children: [
                  {_type: 'span', _key: 's0', text: 'fooqux', marks: []},
                ],
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

  test('Scenario: a local `unset` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1-missing'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
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
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
                children: [
                  {_type: 'span', _key: 's0', text: 'fooqux', marks: []},
                ],
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

  test('Scenario: a local `insert` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1-missing'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'qux', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
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
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
                children: [
                  {_type: 'span', _key: 's0', text: 'fooqux', marks: []},
                ],
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

  test('Scenario: a remote `unset` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1-missing'},
          ],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
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
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
                children: [
                  {_type: 'span', _key: 's0', text: 'fooqux', marks: []},
                ],
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

  test('Scenario: a remote `insert` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1-missing'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'qux', marks: []}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
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
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
                children: [
                  {_type: 'span', _key: 's0', text: 'fooqux', marks: []},
                ],
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

describe('a path to a missing key inside a field with its own sub-schema', () => {
  test('Scenario: `insert.text` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
      offset: 0,
      text: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert.text',
        at: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
        offset: 0,
        text: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert',
        at: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
        value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `remove.text` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
      offset: 0,
      text: 'f',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'remove.text',
        at: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
        offset: 0,
        text: 'f',
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `set` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'set',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
        'text',
      ],
      value: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'set',
        at: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
          'text',
        ],
        value: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `unset` at the missing span key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0-missing'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'unset',
        at: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0-missing'},
        ],
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
            'marks',
          ],
          value: ['em'],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
            'text',
          ],
          value: 'baz',
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at the missing span key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0-missing'},
          ],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert.text` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'b0-missing-top-level'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 0,
      text: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert.text',
        at: [
          {_key: 'b0-missing-top-level'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 0,
        text: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `insert` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'b0-missing-top-level'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'insert',
        at: [
          {_key: 'b0-missing-top-level'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        value: {_key: 'x0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `remove.text` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [
        {_key: 'b0-missing-top-level'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 0,
      text: 'f',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'remove.text',
        at: [
          {_key: 'b0-missing-top-level'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 0,
        text: 'f',
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `set` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'set',
      at: [
        {_key: 'b0-missing-top-level'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
        'text',
      ],
      value: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'set',
        at: [
          {_key: 'b0-missing-top-level'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: 'baz',
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: `unset` at the missing top-level key reaches Behaviors unchanged, changes nothing and emits no `patch` and no `change` content', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const seenEvents: Array<BehaviorEvent> = []
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
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      seenEvents.push(structuredClone(event))
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'b0-missing-top-level'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
              ],
              offset: 3,
              text: 'baz',
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
              value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
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
            value: '@@ -1,3 +1,6 @@\n bar\n+baz\n',
          },
        },
      ])
    })
    expect(seenEvents).toEqual([
      {
        type: 'unset',
        at: [
          {_key: 'b0-missing-top-level'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
      },
      {
        type: 'insert.text',
        at: [{_key: 'n0'}, 'body', {_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        text: 'baz',
      },
    ])
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
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'b0-missing-top-level'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: 'b0-missing-top-level'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'marks',
          ],
          value: ['em'],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'b0-missing-top-level'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'baz',
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at the missing top-level key between two valid patches in one event leaves the valid patches applied', async () => {
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
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [
            {_key: 'b0-missing-top-level'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
          ],
          origin: 'remote',
        },
        {
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
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
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
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
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
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('a path to a missing span key by block position inside a field with its own sub-schema', () => {
  test('Scenario: a local `unset` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b2'},
        'children',
        {_key: 's2-missing'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a local `insert` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b2'},
        'children',
        {_key: 's2-missing'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'qux', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `unset` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b2'},
            'children',
            {_key: 's2-missing'},
          ],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `insert` at a missing span key in the last block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b2'},
            'children',
            {_key: 's2-missing'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'qux', marks: []}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a local `unset` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b1'},
        'children',
        {_key: 's1-missing'},
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a local `insert` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b1'},
        'children',
        {_key: 's1-missing'},
      ],
      value: {_key: 'x0', _type: 'span', text: 'qux', marks: []},
      position: 'after',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `unset` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1-missing'},
          ],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

  test('Scenario: a remote `insert` at a missing span key in a middle block changes nothing and logs nothing', async () => {
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
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(emitted) => {
              if (emitted.type === 'patch' || emitted.type === 'change') {
                events.push(emitted)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1-missing'},
          ],
          position: 'after',
          items: [{_type: 'span', _key: 'x0', text: 'qux', marks: []}],
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'insert.text',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
              ],
              offset: 3,
              text: 'qux',
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b0'},
                'children',
                {_key: 's0'},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
              {_key: 'b0'},
              'children',
              {_key: 's0'},
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+qux\n',
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
            children: [{_type: 'span', _key: 's0', text: 'fooqux', marks: []}],
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

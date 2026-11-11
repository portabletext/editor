import {
  applyAll,
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {useEffect} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {
  ChangeEvent,
  Editor,
  EditorEmittedEvent,
  MutationEvent,
} from '../src'
import {effect, execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {useEditor} from '../src/editor/use-editor'
import {subscribeToChanges, type ChangeCause} from '../src/engine/core/change'
import {useEngineStatic} from '../src/engine/react/hooks/use-engine-static'
import {safeStringify} from '../src/internal-utils/safe-json'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {objectFieldDepth} from '../test-utils/load-depths'
import {
  createWrapperKeys,
  loadContainers,
  loadDepths,
  loadSchemaDefinition,
  textBlock,
} from '../test-utils/load-depths'
import {LoadOnMount, type LoadRecord} from '../test-utils/load-on-mount'

describe('event.change', () => {
  test('Scenario: `load` removes a null entry at position 0 in root with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[0]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 0), null as never, ...blocks.slice(0)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 0 in root with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[0]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 0), 'baz' as never, ...blocks.slice(0)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 1 in root with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[0]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 1), null as never, ...blocks.slice(1)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 1], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 1 in root with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[0]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 1), 'baz' as never, ...blocks.slice(1)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 1], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 2 in root with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[0]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 2), null as never, ...blocks.slice(2)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 2 in root with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[0]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 2), 'baz' as never, ...blocks.slice(2)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes several entries in descending order in root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const first = textBlock(keyGenerator(), keyGenerator(), 'foo')
    const second = textBlock(keyGenerator(), keyGenerator(), 'bar')
    const depth = loadDepths[0]!
    const loaded = depth.wrap(
      [null as never, first, 'baz' as never, second, 7 as never],
      wrapperKey,
    )
    const expected = depth.wrap([first, second], wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 4], origin: 'local'},
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 0 in callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[1]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 0), null as never, ...blocks.slice(0)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 0 in callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[1]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 0), 'baz' as never, ...blocks.slice(0)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 1 in callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[1]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 1), null as never, ...blocks.slice(1)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 1], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 1 in callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[1]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 1), 'baz' as never, ...blocks.slice(1)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 1], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 2 in callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[1]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 2), null as never, ...blocks.slice(2)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 2 in callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[1]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 2), 'baz' as never, ...blocks.slice(2)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes several entries in descending order in callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const first = textBlock(keyGenerator(), keyGenerator(), 'foo')
    const second = textBlock(keyGenerator(), keyGenerator(), 'bar')
    const depth = loadDepths[1]!
    const loaded = depth.wrap(
      [null as never, first, 'baz' as never, second, 7 as never],
      wrapperKey,
    )
    const expected = depth.wrap([first, second], wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 4], origin: 'local'},
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 0 in nested callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[2]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 0), null as never, ...blocks.slice(0)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 0 in nested callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[2]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 0), 'baz' as never, ...blocks.slice(0)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 1 in nested callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[2]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 1), null as never, ...blocks.slice(1)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 1], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 1 in nested callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[2]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 1), 'baz' as never, ...blocks.slice(1)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 1], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 2 in nested callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[2]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 2), null as never, ...blocks.slice(2)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 2 in nested callout with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[2]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 2), 'baz' as never, ...blocks.slice(2)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes several entries in descending order in nested callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const first = textBlock(keyGenerator(), keyGenerator(), 'foo')
    const second = textBlock(keyGenerator(), keyGenerator(), 'bar')
    const depth = loadDepths[2]!
    const loaded = depth.wrap(
      [null as never, first, 'baz' as never, second, 7 as never],
      wrapperKey,
    )
    const expected = depth.wrap([first, second], wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 4], origin: 'local'},
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 0 in table cell with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[3]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 0), null as never, ...blocks.slice(0)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 0 in table cell with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[3]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 0), 'baz' as never, ...blocks.slice(0)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 1 in table cell with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[3]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 1), null as never, ...blocks.slice(1)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 1], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 1 in table cell with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[3]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 1), 'baz' as never, ...blocks.slice(1)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 1], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a null entry at position 2 in table cell with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[3]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 2), null as never, ...blocks.slice(2)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes a string entry at position 2 in table cell with patches only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const blocks = [
      textBlock(keyGenerator(), keyGenerator(), 'foo'),
      textBlock(keyGenerator(), keyGenerator(), 'bar'),
    ]
    const depth = loadDepths[3]!
    const loaded = depth.wrap(
      [...blocks.slice(0, 2), 'baz' as never, ...blocks.slice(2)],
      wrapperKey,
    )
    const expected = depth.wrap(blocks, wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })
  test('Scenario: `load` removes several entries in descending order in table cell', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const first = textBlock(keyGenerator(), keyGenerator(), 'foo')
    const second = textBlock(keyGenerator(), keyGenerator(), 'bar')
    const depth = loadDepths[3]!
    const loaded = depth.wrap(
      [null as never, first, 'baz' as never, second, 7 as never],
      wrapperKey,
    )
    const expected = depth.wrap([first, second], wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[loaded.value]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual(expected)
    expect(records).toEqual([
      {
        type: 'event',
        event: {
          type: 'change',
          origin: 'local',
          operations: [],
          patches: [
            {type: 'unset', path: [...loaded.prefix, 4], origin: 'local'},
            {type: 'unset', path: [...loaded.prefix, 2], origin: 'local'},
            {type: 'unset', path: [...loaded.prefix, 0], origin: 'local'},
          ],
          correction: true,
        },
      },
      {type: 'ready', value: expected, status: 'ready'},
    ])
  })

  test('Scenario: `load` corrections address duplicate containers at root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const containerKey = keyGenerator()
    const first = {
      _type: 'callout',
      _key: containerKey,
      content: [textBlock(keyGenerator(), keyGenerator(), 'foo')],
    }
    const second = {
      _type: 'callout',
      _key: containerKey,
      content: [
        null,
        textBlock(keyGenerator(), keyGenerator(), 'bar'),
        'baz',
        7,
      ],
    }
    const host = loadDepths[0]!.wrap([first, second], wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[host]} records={records} />
        </>
      ),
    })
    const patches = records.flatMap((record) =>
      record.type === 'event' &&
      record.event.type === 'change' &&
      record.event.origin === 'local'
        ? record.event.patches
        : [],
    )
    expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
  })
  test('Scenario: `load` corrections address duplicate containers at callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const containerKey = keyGenerator()
    const first = {
      _type: 'callout',
      _key: containerKey,
      content: [textBlock(keyGenerator(), keyGenerator(), 'foo')],
    }
    const second = {
      _type: 'callout',
      _key: containerKey,
      content: [
        null,
        textBlock(keyGenerator(), keyGenerator(), 'bar'),
        'baz',
        7,
      ],
    }
    const host = loadDepths[1]!.wrap([first, second], wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[host]} records={records} />
        </>
      ),
    })
    const patches = records.flatMap((record) =>
      record.type === 'event' &&
      record.event.type === 'change' &&
      record.event.origin === 'local'
        ? record.event.patches
        : [],
    )
    expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
  })
  test('Scenario: `load` corrections address duplicate containers at nested callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const containerKey = keyGenerator()
    const first = {
      _type: 'callout',
      _key: containerKey,
      content: [textBlock(keyGenerator(), keyGenerator(), 'foo')],
    }
    const second = {
      _type: 'callout',
      _key: containerKey,
      content: [
        null,
        textBlock(keyGenerator(), keyGenerator(), 'bar'),
        'baz',
        7,
      ],
    }
    const host = loadDepths[2]!.wrap([first, second], wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[host]} records={records} />
        </>
      ),
    })
    const patches = records.flatMap((record) =>
      record.type === 'event' &&
      record.event.type === 'change' &&
      record.event.origin === 'local'
        ? record.event.patches
        : [],
    )
    expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
  })
  test('Scenario: `load` corrections address duplicate containers at table cell', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const containerKey = keyGenerator()
    const first = {
      _type: 'callout',
      _key: containerKey,
      content: [textBlock(keyGenerator(), keyGenerator(), 'foo')],
    }
    const second = {
      _type: 'callout',
      _key: containerKey,
      content: [
        null,
        textBlock(keyGenerator(), keyGenerator(), 'bar'),
        'baz',
        7,
      ],
    }
    const host = loadDepths[3]!.wrap([first, second], wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[host]} records={records} />
        </>
      ),
    })
    const patches = records.flatMap((record) =>
      record.type === 'event' &&
      record.event.type === 'change' &&
      record.event.origin === 'local'
        ? record.event.patches
        : [],
    )
    expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
  })
  test('Scenario: `load` corrections address duplicate containers at object field', async () => {
    const keyGenerator = createTestKeyGenerator()
    const wrapperKey = createWrapperKeys(keyGenerator)
    const containerKey = keyGenerator()
    const first = {
      _type: 'callout',
      _key: containerKey,
      content: [textBlock(keyGenerator(), keyGenerator(), 'foo')],
    }
    const second = {
      _type: 'callout',
      _key: containerKey,
      content: [
        null,
        textBlock(keyGenerator(), keyGenerator(), 'bar'),
        'baz',
        7,
      ],
    }
    const host = objectFieldDepth.wrap([first, second], wrapperKey).value
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[host]} records={records} />
        </>
      ),
    })
    const patches = records.flatMap((record) =>
      record.type === 'event' &&
      record.event.type === 'change' &&
      record.event.origin === 'local'
        ? record.event.patches
        : [],
    )
    expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
  })
  test('Scenario: `load` keeps named text block children in an object field with clean input', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const block = {
      ...textBlock(keyGenerator(), keyGenerator(), 'foo'),
      _type: 'line',
    }
    const host = [{_type: 'note', _key: noteKey, body: [block]}]
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'note',
            fields: [
              {
                name: 'body',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    name: 'line',
                    styles: [{name: 'normal'}],
                    decorators: [{name: 'em'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'note', arrayField: 'body'})]}
          />
          <LoadOnMount loads={[host]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {_type: 'note', _key: noteKey, body: [block]},
    ])
    const patches = records.flatMap((record) =>
      record.type === 'event' &&
      record.event.type === 'change' &&
      record.event.origin === 'local'
        ? record.event.patches
        : [],
    )
    expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
  })
  test('Scenario: `load` keeps named text block children in an object field with null input', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const block = {
      ...textBlock(keyGenerator(), keyGenerator(), 'foo'),
      _type: 'line',
    }
    const host = [{_type: 'note', _key: noteKey, body: [null, block]}]
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'note',
            fields: [
              {
                name: 'body',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    name: 'line',
                    styles: [{name: 'normal'}],
                    decorators: [{name: 'em'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'note', arrayField: 'body'})]}
          />
          <LoadOnMount loads={[host]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {_type: 'note', _key: noteKey, body: [block]},
    ])
    const patches = records.flatMap((record) =>
      record.type === 'event' &&
      record.event.type === 'change' &&
      record.event.origin === 'local'
        ? record.event.patches
        : [],
    )
    expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
  })
  test('Scenario: `load` keeps named text block children in an object field with string input', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const block = {
      ...textBlock(keyGenerator(), keyGenerator(), 'foo'),
      _type: 'line',
    }
    const host = [{_type: 'note', _key: noteKey, body: ['baz', block]}]
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'note',
            fields: [
              {
                name: 'body',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    name: 'line',
                    styles: [{name: 'normal'}],
                    decorators: [{name: 'em'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'note', arrayField: 'body'})]}
          />
          <LoadOnMount loads={[host]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {_type: 'note', _key: noteKey, body: [block]},
    ])
    const patches = records.flatMap((record) =>
      record.type === 'event' &&
      record.event.type === 'change' &&
      record.event.origin === 'local'
        ? record.event.patches
        : [],
    )
    expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
  })
  test('Scenario: `load` keeps named text block children in an object field with number input', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const block = {
      ...textBlock(keyGenerator(), keyGenerator(), 'foo'),
      _type: 'line',
    }
    const host = [{_type: 'note', _key: noteKey, body: [7, block]}]
    const records: Array<LoadRecord> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'note',
            fields: [
              {
                name: 'body',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    name: 'line',
                    styles: [{name: 'normal'}],
                    decorators: [{name: 'em'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'note', arrayField: 'body'})]}
          />
          <LoadOnMount loads={[host]} records={records} />
        </>
      ),
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {_type: 'note', _key: noteKey, body: [block]},
    ])
    const patches = records.flatMap((record) =>
      record.type === 'event' &&
      record.event.type === 'change' &&
      record.event.origin === 'local'
        ? record.event.patches
        : [],
    )
    expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
  })

  describe('load', () => {
    test('Scenario: `load` of a text block with empty `children` at root emits only corrections', async () => {
      const depth = loadDepths[0]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'm-k2', text: '', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'insert',
                path: [
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                node: {
                  _type: 'span',
                  _key: 'm-k2',
                  text: '',
                  marks: [],
                },
                position: 'before',
              },
            ],
            patches: [
              {
                type: 'setIfMissing',
                path: [
                  {
                    _key: 'k0',
                  },
                  'children',
                ],
                value: [],
                origin: 'local',
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                position: 'before',
                items: [
                  {
                    _type: 'span',
                    _key: 'm-k2',
                    text: '',
                    marks: [],
                  },
                ],
                origin: 'local',
              },
              {
                type: 'unset',
                path: [],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'm-k2',
                  text: '',
                  marks: [],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a span missing `marks` at root emits only corrections', async () => {
      const depth = loadDepths[0]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo'}],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo'}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'ready',
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'foo',
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a block missing `_key` at root emits only corrections', async () => {
      const depth = loadDepths[0]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: 'm-k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [0, '_key'],
                value: 'm-k2',
                inverse: {
                  type: 'unset',
                  path: [0, '_key'],
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [0, '_key'],
                value: 'm-k2',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k0',
                  text: 'foo',
                  marks: [],
                },
              ],
              _key: 'm-k2',
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of duplicate block keys at root emits only corrections', async () => {
      const depth = loadDepths[0]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const secondSpanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          textBlock(blockKey, spanKey, 'foo'),
          textBlock(blockKey, secondSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          textBlock(blockKey, spanKey, 'foo'),
          textBlock('m-k2', secondSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [1, '_key'],
                value: 'm-k2',
                inverse: {
                  type: 'set',
                  path: [1, '_key'],
                  value: 'k0',
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [1, '_key'],
                value: 'm-k2',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'foo',
                  marks: [],
                },
              ],
            },
            {
              _type: 'block',
              _key: 'm-k2',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k2',
                  text: 'bar',
                  marks: [],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of an unknown mark at root emits only corrections', async () => {
      const depth = loadDepths[0]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo', ['unknown'])] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo', ['unknown'])] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'ready',
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'foo',
                  marks: ['unknown'],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a non-object entry at root emits only corrections', async () => {
      const depth = loadDepths[0]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo'), 'bar'] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo')] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [1],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'foo',
                  marks: [],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a `null` entry at root emits only corrections', async () => {
      const depth = loadDepths[0]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo'), null] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo')] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [1],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'foo',
                  marks: [],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of empty children, a missing key, a duplicate key and a non-object entry together at root emits only corrections', async () => {
      const depth = loadDepths[0]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const secondSpanKey = fixtureKeyGenerator()
      const thirdSpanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [],
          },
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: secondSpanKey, text: 'foo', marks: []},
            ],
          },
          textBlock(blockKey, thirdSpanKey, 'bar'),
          'baz',
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: depth.name === 'root' ? 'm-k4' : 'm-k3',
                text: '',
                marks: [],
              },
            ],
          },
          {
            _type: 'block',
            _key: depth.name === 'root' ? 'm-k3' : 'm-k4',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: secondSpanKey, text: 'foo', marks: []},
            ],
          },
          textBlock('m-k2', thirdSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [3],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [2, '_key'],
                value: 'm-k2',
                inverse: {
                  type: 'set',
                  path: [2, '_key'],
                  value: 'k0',
                },
              },
              {
                type: 'set',
                path: [1, '_key'],
                value: 'm-k3',
                inverse: {
                  type: 'unset',
                  path: [1, '_key'],
                },
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                node: {
                  _type: 'span',
                  _key: 'm-k4',
                  text: '',
                  marks: [],
                },
                position: 'before',
              },
            ],
            patches: [
              {
                type: 'set',
                path: [2, '_key'],
                value: 'm-k2',
                origin: 'local',
              },
              {
                type: 'set',
                path: [1, '_key'],
                value: 'm-k3',
                origin: 'local',
              },
              {
                type: 'setIfMissing',
                path: [
                  {
                    _key: 'k0',
                  },
                  'children',
                ],
                value: [],
                origin: 'local',
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                position: 'before',
                items: [
                  {
                    _type: 'span',
                    _key: 'm-k4',
                    text: '',
                    marks: [],
                  },
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'm-k4',
                  text: '',
                  marks: [],
                },
              ],
            },
            {
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'foo',
                  marks: [],
                },
              ],
              _key: 'm-k3',
            },
            {
              _type: 'block',
              _key: 'm-k2',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k2',
                  text: 'bar',
                  marks: [],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a text block with empty `children` at callout emits only corrections', async () => {
      const depth = loadDepths[1]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'm-k2', text: '', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                node: {
                  _type: 'span',
                  _key: 'm-k2',
                  text: '',
                  marks: [],
                },
                position: 'before',
              },
            ],
            patches: [
              {
                type: 'setIfMissing',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                ],
                value: [],
                origin: 'local',
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                position: 'before',
                items: [
                  {
                    _type: 'span',
                    _key: 'm-k2',
                    text: '',
                    marks: [],
                  },
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'm-k2',
                      text: '',
                      marks: [],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a span missing `marks` at callout emits only corrections', async () => {
      const depth = loadDepths[1]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo'}],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo'}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k1',
                      text: 'foo',
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a block missing `_key` at callout emits only corrections', async () => {
      const depth = loadDepths[1]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: 'm-k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  0,
                  '_key',
                ],
                value: 'm-k2',
                inverse: {
                  type: 'unset',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'content',
                    0,
                    '_key',
                  ],
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  0,
                  '_key',
                ],
                value: 'm-k2',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k0',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                  _key: 'm-k2',
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of duplicate block keys at callout emits only corrections', async () => {
      const depth = loadDepths[1]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const secondSpanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          textBlock(blockKey, spanKey, 'foo'),
          textBlock(blockKey, secondSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          textBlock(blockKey, spanKey, 'foo'),
          textBlock('m-k2', secondSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k2',
                inverse: {
                  type: 'set',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'content',
                    1,
                    '_key',
                  ],
                  value: 'k0',
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k2',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k1',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _type: 'block',
                  _key: 'm-k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k2',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of an unknown mark at callout emits only corrections', async () => {
      const depth = loadDepths[1]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo', ['unknown'])] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo', ['unknown'])] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k1',
                      text: 'foo',
                      marks: ['unknown'],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a non-object entry at callout emits only corrections', async () => {
      const depth = loadDepths[1]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo'), 'bar'] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo')] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  1,
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k1',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a `null` entry at callout emits only corrections', async () => {
      const depth = loadDepths[1]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo'), null] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo')] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  1,
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k1',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of empty children, a missing key, a duplicate key and a non-object entry together at callout emits only corrections', async () => {
      const depth = loadDepths[1]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const secondSpanKey = fixtureKeyGenerator()
      const thirdSpanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [],
          },
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: secondSpanKey, text: 'foo', marks: []},
            ],
          },
          textBlock(blockKey, thirdSpanKey, 'bar'),
          'baz',
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: depth.name === 'root' ? 'm-k4' : 'm-k3',
                text: '',
                marks: [],
              },
            ],
          },
          {
            _type: 'block',
            _key: depth.name === 'root' ? 'm-k3' : 'm-k4',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: secondSpanKey, text: 'foo', marks: []},
            ],
          },
          textBlock('m-k2', thirdSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  3,
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  2,
                  '_key',
                ],
                value: 'm-k2',
                inverse: {
                  type: 'set',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'content',
                    2,
                    '_key',
                  ],
                  value: 'k0',
                },
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                node: {
                  _type: 'span',
                  _key: 'm-k3',
                  text: '',
                  marks: [],
                },
                position: 'before',
              },
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k4',
                inverse: {
                  type: 'unset',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'content',
                    1,
                    '_key',
                  ],
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  2,
                  '_key',
                ],
                value: 'm-k2',
                origin: 'local',
              },
              {
                type: 'setIfMissing',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                ],
                value: [],
                origin: 'local',
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                position: 'before',
                items: [
                  {
                    _type: 'span',
                    _key: 'm-k3',
                    text: '',
                    marks: [],
                  },
                ],
                origin: 'local',
              },
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k4',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'm-k3',
                      text: '',
                      marks: [],
                    },
                  ],
                },
                {
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k1',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                  _key: 'm-k4',
                },
                {
                  _type: 'block',
                  _key: 'm-k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k2',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a text block with empty `children` at nested callout emits only corrections', async () => {
      const depth = loadDepths[2]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'm-k2', text: '', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                node: {
                  _type: 'span',
                  _key: 'm-k2',
                  text: '',
                  marks: [],
                },
                position: 'before',
              },
            ],
            patches: [
              {
                type: 'setIfMissing',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                ],
                value: [],
                origin: 'local',
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                position: 'before',
                items: [
                  {
                    _type: 'span',
                    _key: 'm-k2',
                    text: '',
                    marks: [],
                  },
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'callout',
                  _key: 'w-k1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'm-k2',
                          text: '',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a span missing `marks` at nested callout emits only corrections', async () => {
      const depth = loadDepths[2]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo'}],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo'}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'callout',
                  _key: 'w-k1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'foo',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a block missing `_key` at nested callout emits only corrections', async () => {
      const depth = loadDepths[2]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: 'm-k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  0,
                  '_key',
                ],
                value: 'm-k2',
                inverse: {
                  type: 'unset',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'content',
                    {
                      _key: 'w-k1',
                    },
                    'content',
                    0,
                    '_key',
                  ],
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  0,
                  '_key',
                ],
                value: 'm-k2',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'callout',
                  _key: 'w-k1',
                  content: [
                    {
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'k0',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      _key: 'm-k2',
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of duplicate block keys at nested callout emits only corrections', async () => {
      const depth = loadDepths[2]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const secondSpanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          textBlock(blockKey, spanKey, 'foo'),
          textBlock(blockKey, secondSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          textBlock(blockKey, spanKey, 'foo'),
          textBlock('m-k2', secondSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k2',
                inverse: {
                  type: 'set',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'content',
                    {
                      _key: 'w-k1',
                    },
                    'content',
                    1,
                    '_key',
                  ],
                  value: 'k0',
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k2',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'callout',
                  _key: 'w-k1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _type: 'block',
                      _key: 'm-k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'k2',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of an unknown mark at nested callout emits only corrections', async () => {
      const depth = loadDepths[2]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo', ['unknown'])] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo', ['unknown'])] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'callout',
                  _key: 'w-k1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'foo',
                          marks: ['unknown'],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a non-object entry at nested callout emits only corrections', async () => {
      const depth = loadDepths[2]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo'), 'bar'] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo')] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  1,
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'callout',
                  _key: 'w-k1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a `null` entry at nested callout emits only corrections', async () => {
      const depth = loadDepths[2]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo'), null] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo')] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  1,
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'callout',
                  _key: 'w-k1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of empty children, a missing key, a duplicate key and a non-object entry together at nested callout emits only corrections', async () => {
      const depth = loadDepths[2]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const secondSpanKey = fixtureKeyGenerator()
      const thirdSpanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [],
          },
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: secondSpanKey, text: 'foo', marks: []},
            ],
          },
          textBlock(blockKey, thirdSpanKey, 'bar'),
          'baz',
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: depth.name === 'root' ? 'm-k4' : 'm-k3',
                text: '',
                marks: [],
              },
            ],
          },
          {
            _type: 'block',
            _key: depth.name === 'root' ? 'm-k3' : 'm-k4',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: secondSpanKey, text: 'foo', marks: []},
            ],
          },
          textBlock('m-k2', thirdSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  3,
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  2,
                  '_key',
                ],
                value: 'm-k2',
                inverse: {
                  type: 'set',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'content',
                    {
                      _key: 'w-k1',
                    },
                    'content',
                    2,
                    '_key',
                  ],
                  value: 'k0',
                },
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                node: {
                  _type: 'span',
                  _key: 'm-k3',
                  text: '',
                  marks: [],
                },
                position: 'before',
              },
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k4',
                inverse: {
                  type: 'unset',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'content',
                    {
                      _key: 'w-k1',
                    },
                    'content',
                    1,
                    '_key',
                  ],
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  2,
                  '_key',
                ],
                value: 'm-k2',
                origin: 'local',
              },
              {
                type: 'setIfMissing',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                ],
                value: [],
                origin: 'local',
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                position: 'before',
                items: [
                  {
                    _type: 'span',
                    _key: 'm-k3',
                    text: '',
                    marks: [],
                  },
                ],
                origin: 'local',
              },
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'content',
                  {
                    _key: 'w-k1',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k4',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'callout',
              _key: 'w-k0',
              content: [
                {
                  _type: 'callout',
                  _key: 'w-k1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'm-k3',
                          text: '',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      _key: 'm-k4',
                    },
                    {
                      _type: 'block',
                      _key: 'm-k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 'k2',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a text block with empty `children` at table cell emits only corrections', async () => {
      const depth = loadDepths[3]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'm-k2', text: '', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                node: {
                  _type: 'span',
                  _key: 'm-k2',
                  text: '',
                  marks: [],
                },
                position: 'before',
              },
            ],
            patches: [
              {
                type: 'setIfMissing',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                ],
                value: [],
                origin: 'local',
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                position: 'before',
                items: [
                  {
                    _type: 'span',
                    _key: 'm-k2',
                    text: '',
                    marks: [],
                  },
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'table',
              _key: 'w-k0',
              rows: [
                {
                  _type: 'row',
                  _key: 'w-k1',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'w-k2',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'm-k2',
                              text: '',
                              marks: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a span missing `marks` at table cell emits only corrections', async () => {
      const depth = loadDepths[3]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo'}],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo'}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'ready',
          value: [
            {
              _type: 'table',
              _key: 'w-k0',
              rows: [
                {
                  _type: 'row',
                  _key: 'w-k1',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'w-k2',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k1',
                              text: 'foo',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a block missing `_key` at table cell emits only corrections', async () => {
      const depth = loadDepths[3]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: 'm-k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  0,
                  '_key',
                ],
                value: 'm-k2',
                inverse: {
                  type: 'unset',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'rows',
                    {
                      _key: 'w-k1',
                    },
                    'cells',
                    {
                      _key: 'w-k2',
                    },
                    'content',
                    0,
                    '_key',
                  ],
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  0,
                  '_key',
                ],
                value: 'm-k2',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'table',
              _key: 'w-k0',
              rows: [
                {
                  _type: 'row',
                  _key: 'w-k1',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'w-k2',
                      content: [
                        {
                          _type: 'block',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k0',
                              text: 'foo',
                              marks: [],
                            },
                          ],
                          _key: 'm-k2',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of duplicate block keys at table cell emits only corrections', async () => {
      const depth = loadDepths[3]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const secondSpanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          textBlock(blockKey, spanKey, 'foo'),
          textBlock(blockKey, secondSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          textBlock(blockKey, spanKey, 'foo'),
          textBlock('m-k2', secondSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k2',
                inverse: {
                  type: 'set',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'rows',
                    {
                      _key: 'w-k1',
                    },
                    'cells',
                    {
                      _key: 'w-k2',
                    },
                    'content',
                    1,
                    '_key',
                  ],
                  value: 'k0',
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k2',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'table',
              _key: 'w-k0',
              rows: [
                {
                  _type: 'row',
                  _key: 'w-k1',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'w-k2',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k1',
                              text: 'foo',
                              marks: [],
                            },
                          ],
                        },
                        {
                          _type: 'block',
                          _key: 'm-k2',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k2',
                              text: 'bar',
                              marks: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of an unknown mark at table cell emits only corrections', async () => {
      const depth = loadDepths[3]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo', ['unknown'])] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo', ['unknown'])] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'ready',
          value: [
            {
              _type: 'table',
              _key: 'w-k0',
              rows: [
                {
                  _type: 'row',
                  _key: 'w-k1',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'w-k2',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k1',
                              text: 'foo',
                              marks: ['unknown'],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a non-object entry at table cell emits only corrections', async () => {
      const depth = loadDepths[3]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo'), 'bar'] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo')] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  1,
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'table',
              _key: 'w-k0',
              rows: [
                {
                  _type: 'row',
                  _key: 'w-k1',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'w-k2',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k1',
                              text: 'foo',
                              marks: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of a `null` entry at table cell emits only corrections', async () => {
      const depth = loadDepths[3]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const spanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo'), null] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [textBlock(blockKey, spanKey, 'foo')] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  1,
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'table',
              _key: 'w-k0',
              rows: [
                {
                  _type: 'row',
                  _key: 'w-k1',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'w-k2',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k1',
                              text: 'foo',
                              marks: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })

    test('Scenario: `load` of empty children, a missing key, a duplicate key and a non-object entry together at table cell emits only corrections', async () => {
      const depth = loadDepths[3]!

      const keyGenerator = createTestKeyGenerator('m-')
      const fixtureKeyGenerator = createTestKeyGenerator()
      const wrapperKey = createWrapperKeys(createTestKeyGenerator('w-'))
      const blockKey = fixtureKeyGenerator()
      const secondSpanKey = fixtureKeyGenerator()
      const thirdSpanKey = fixtureKeyGenerator()
      const loaded = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [],
          },
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: secondSpanKey, text: 'foo', marks: []},
            ],
          },
          textBlock(blockKey, thirdSpanKey, 'bar'),
          'baz',
        ] as never,
        wrapperKey,
      )
      const expected = depth.wrap(
        [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: depth.name === 'root' ? 'm-k4' : 'm-k3',
                text: '',
                marks: [],
              },
            ],
          },
          {
            _type: 'block',
            _key: depth.name === 'root' ? 'm-k3' : 'm-k4',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: secondSpanKey, text: 'foo', marks: []},
            ],
          },
          textBlock('m-k2', thirdSpanKey, 'bar'),
        ] as never,
        wrapperKey,
      )
      const records: Array<LoadRecord> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        children: (
          <>
            <NodePlugin nodes={loadContainers} />
            <LoadOnMount loads={[loaded.value]} records={records} />
          </>
        ),
      })

      expect(editor.getSnapshot().context.value).toEqual(expected.value)
      expect(records).toEqual([
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [],
            patches: [
              {
                type: 'unset',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  3,
                ],
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'event',
          event: {
            type: 'change',
            origin: 'local',
            operations: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  2,
                  '_key',
                ],
                value: 'm-k2',
                inverse: {
                  type: 'set',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'rows',
                    {
                      _key: 'w-k1',
                    },
                    'cells',
                    {
                      _key: 'w-k2',
                    },
                    'content',
                    2,
                    '_key',
                  ],
                  value: 'k0',
                },
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                node: {
                  _type: 'span',
                  _key: 'm-k3',
                  text: '',
                  marks: [],
                },
                position: 'before',
              },
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k4',
                inverse: {
                  type: 'unset',
                  path: [
                    {
                      _key: 'w-k0',
                    },
                    'rows',
                    {
                      _key: 'w-k1',
                    },
                    'cells',
                    {
                      _key: 'w-k2',
                    },
                    'content',
                    1,
                    '_key',
                  ],
                },
              },
            ],
            patches: [
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  2,
                  '_key',
                ],
                value: 'm-k2',
                origin: 'local',
              },
              {
                type: 'setIfMissing',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                ],
                value: [],
                origin: 'local',
              },
              {
                type: 'insert',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  {
                    _key: 'k0',
                  },
                  'children',
                  0,
                ],
                position: 'before',
                items: [
                  {
                    _type: 'span',
                    _key: 'm-k3',
                    text: '',
                    marks: [],
                  },
                ],
                origin: 'local',
              },
              {
                type: 'set',
                path: [
                  {
                    _key: 'w-k0',
                  },
                  'rows',
                  {
                    _key: 'w-k1',
                  },
                  'cells',
                  {
                    _key: 'w-k2',
                  },
                  'content',
                  1,
                  '_key',
                ],
                value: 'm-k4',
                origin: 'local',
              },
            ],
            correction: true,
          },
        },
        {
          type: 'ready',
          value: [
            {
              _type: 'table',
              _key: 'w-k0',
              rows: [
                {
                  _type: 'row',
                  _key: 'w-k1',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'w-k2',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'm-k3',
                              text: '',
                              marks: [],
                            },
                          ],
                        },
                        {
                          _type: 'block',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k1',
                              text: 'foo',
                              marks: [],
                            },
                          ],
                          _key: 'm-k4',
                        },
                        {
                          _type: 'block',
                          _key: 'm-k2',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k2',
                              text: 'bar',
                              marks: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          status: 'ready',
        },
      ])
    })
  })

  test('Scenario: Typing emits one local `change` per keystroke with its operations and patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, '')],
    })
    const changes = collectChanges(editor)
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(blockKey, spanKey, 'foo'),
      ])
    })

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 0, text: 'f'},
        ],
        patches: [
          {...diffMatchPatch('', 'f', [...spanPath, 'text']), origin: 'local'},
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 1, text: 'o'},
        ],
        patches: [
          {
            ...diffMatchPatch('f', 'fo', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 2, text: 'o'},
        ],
        patches: [
          {
            ...diffMatchPatch('fo', 'foo', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: A local `change` is emitted synchronously, before the mutation batcher flushes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)
    const mutations = collectMutations(editor)

    editor.send({type: 'insert.text', text: '!'})

    expect(mutations).toEqual([])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: Pasting blocks emits one local `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, '')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    const barBlock = block(keyGenerator(), keyGenerator(), 'bar')
    const bazBlock = block(keyGenerator(), keyGenerator(), 'baz')
    const changes = collectChanges(editor)

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(
      'application/x-portable-text',
      safeStringify([barBlock, bazBlock]),
    )
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {selection: editor.getSnapshot().context.selection!},
    })

    expect(editor.getSnapshot().context.value).toEqual([barBlock, bazBlock])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [{_key: blockKey}],
            position: 'before',
            node: barBlock,
            inverse: {type: 'unset', path: [{_key: barBlock._key}]},
          },
          {
            type: 'unset',
            path: [{_key: blockKey}],
            inverse: {
              type: 'insert',
              path: [{_key: barBlock._key}],
              position: 'after',
              node: block(blockKey, spanKey, ''),
            },
          },
          {
            type: 'insert',
            path: [{_key: barBlock._key}],
            position: 'after',
            node: bazBlock,
            inverse: {type: 'unset', path: [{_key: bazBlock._key}]},
          },
        ],
        patches: [
          {
            ...insert([barBlock], 'before', [{_key: blockKey}]),
            origin: 'local',
          },
          {...unset([{_key: blockKey}]), origin: 'local'},
          {
            ...insert([bazBlock], 'after', [{_key: barBlock._key}]),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: Pasting text into a span emits the paste, then a `correction` merging the pasted span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)
    const pastedSpanPath = [{_key: blockKey}, 'children', {_key: 'k6'}]
    const pastedSpan = {_type: 'span', _key: 'k6', text: 'bar', marks: []}

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'bar')
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {selection: editor.getSnapshot().context.selection!},
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foobar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'insert',
            path: spanPath,
            position: 'after',
            node: pastedSpan,
            inverse: {type: 'unset', path: pastedSpanPath},
          },
        ],
        patches: [
          {...set([], [{_key: blockKey}, 'markDefs']), origin: 'local'},
          {
            ...setIfMissing([], [{_key: blockKey}, 'children']),
            origin: 'local',
          },
          {...insert([pastedSpan], 'after', spanPath), origin: 'local'},
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: 'bar'},
          {
            type: 'unset',
            path: pastedSpanPath,
            inverse: {
              type: 'insert',
              path: spanPath,
              position: 'after',
              node: pastedSpan,
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foobar', [...spanPath, 'text']),
            origin: 'local',
          },
          {...unset(pastedSpanPath), origin: 'local'},
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: Undo and redo each emit one local `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    await userEvent.type(locator, 'bar')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(blockKey, spanKey, 'barfoo'),
      ])
    })

    const changes = collectChanges(editor)

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foo'),
    ])

    editor.send({type: 'history.redo'})

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'barfoo'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'remove.text', path: spanPath, offset: 2, text: 'r'},
          {type: 'remove.text', path: spanPath, offset: 1, text: 'a'},
          {type: 'remove.text', path: spanPath, offset: 0, text: 'b'},
        ],
        patches: [
          {
            ...diffMatchPatch('barfoo', 'bafoo', [...spanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bafoo', 'bfoo', [...spanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bfoo', 'foo', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 0, text: 'b'},
          {type: 'insert.text', path: spanPath, offset: 1, text: 'a'},
          {type: 'insert.text', path: spanPath, offset: 2, text: 'r'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'bfoo', [...spanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bfoo', 'bafoo', [...spanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bafoo', 'barfoo', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: An edit whose normalization merges spans emits the edit, then a `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialBlock = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: fooSpanKey, text: 'foo', marks: ['strong']},
        {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
      ],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [initialBlock],
    })
    const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: blockKey}, 'children', {_key: barSpanKey}]
    const bazSpanPath = [{_key: blockKey}, 'children', {_key: bazSpanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: bazSpanPath, offset: 3},
        focus: {path: bazSpanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'insert.text', text: '!'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...initialBlock,
        children: [
          {_type: 'span', _key: fooSpanKey, text: 'foobar', marks: ['strong']},
          {_type: 'span', _key: bazSpanKey, text: 'baz!', marks: []},
        ],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: bazSpanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('baz', 'baz!', [...bazSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: fooSpanPath, offset: 3, text: 'bar'},
          {
            type: 'unset',
            path: barSpanPath,
            inverse: {
              type: 'insert',
              path: fooSpanPath,
              position: 'after',
              node: {
                _type: 'span',
                _key: barSpanKey,
                text: 'bar',
                marks: ['strong'],
              },
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foobar', [...fooSpanPath, 'text']),
            origin: 'local',
          },
          {...unset(barSpanPath), origin: 'local'},
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: A fix between two action groups of one Behavior event emits the edit, the correction and the next edit in application order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialBlock = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: fooSpanKey, text: 'foo', marks: ['strong']},
        {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
      ],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [initialBlock],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.punctuate',
              actions: [
                () => [execute({type: 'insert.text', text: '!'})],
                () => [execute({type: 'insert.text', text: '?'})],
              ],
            }),
          ]}
        />
      ),
    })
    const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: blockKey}, 'children', {_key: barSpanKey}]
    const bazSpanPath = [{_key: blockKey}, 'children', {_key: bazSpanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: bazSpanPath, offset: 3},
        focus: {path: bazSpanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'custom.punctuate'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...initialBlock,
        children: [
          {_type: 'span', _key: fooSpanKey, text: 'foobar', marks: ['strong']},
          {_type: 'span', _key: bazSpanKey, text: 'baz!?', marks: []},
        ],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: bazSpanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('baz', 'baz!', [...bazSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: fooSpanPath, offset: 3, text: 'bar'},
          {
            type: 'unset',
            path: barSpanPath,
            inverse: {
              type: 'insert',
              path: fooSpanPath,
              position: 'after',
              node: {
                _type: 'span',
                _key: barSpanKey,
                text: 'bar',
                marks: ['strong'],
              },
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foobar', [...fooSpanPath, 'text']),
            origin: 'local',
          },
          {...unset(barSpanPath), origin: 'local'},
        ],
        correction: true,
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: bazSpanPath, offset: 4, text: '?'},
        ],
        patches: [
          {
            ...diffMatchPatch('baz!', 'baz!?', [...bazSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
    expect(
      applyAll(
        [initialBlock],
        changes.flatMap((change) =>
          change.origin === 'local' ? change.patches : [],
        ),
      ),
    ).toEqual(editor.getSnapshot().context.value)
  })

  test('Scenario: Remote patches emit a remote `change` with the applied operations and no patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const textPath = [{_key: blockKey}, 'children', {_key: spanKey}, 'text']

    editor.send({
      type: 'apply',
      patches: [{...set('bar', textPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'set', path: textPath, value: 'bar'}],
      },
    ])
  })

  test('Scenario: A remote patch that triggers a fix emits the remote `change`, then a local `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']
    const duplicateSpan = {
      _type: 'span',
      _key: spanKey,
      text: 'bar',
      marks: ['strong'],
    }

    editor.send({
      type: 'apply',
      patches: [
        {...insert([duplicateSpan], 'after', spanPath), origin: 'remote'},
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...block(blockKey, spanKey, 'foo'),
        children: [
          {_type: 'span', _key: spanKey, text: 'foo', marks: []},
          {...duplicateSpan, _key: 'k4'},
        ],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'insert',
            path: spanPath,
            position: 'after',
            node: duplicateSpan,
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: spanKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
    ])
  })

  test('Scenario: `update value` emits one remote `change` for the whole update', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        block(fooBlockKey, fooSpanKey, 'foo'),
        block(bazBlockKey, bazSpanKey, 'baz'),
        block(barBlockKey, barSpanKey, 'bar'),
      ],
    })
    const changes = collectChanges(editor)
    const fooSpanPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const bazSpanPath = [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}]

    editor.send({
      type: 'update value',
      value: [
        block(fooBlockKey, fooSpanKey, 'foo!'),
        block(bazBlockKey, bazSpanKey, 'baz!'),
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(fooBlockKey, fooSpanKey, 'foo!'),
      block(bazBlockKey, bazSpanKey, 'baz!'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {type: 'unset', path: [{_key: barBlockKey}]},
          {
            type: 'set',
            path: [{_key: fooBlockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: fooBlockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [...fooSpanPath, 'marks'],
            value: [],
            inverse: {type: 'set', path: [...fooSpanPath, 'marks'], value: []},
          },
          {type: 'remove.text', path: fooSpanPath, offset: 0, text: 'foo'},
          {type: 'insert.text', path: fooSpanPath, offset: 0, text: 'foo!'},
          {
            type: 'set',
            path: [{_key: bazBlockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: bazBlockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [...bazSpanPath, 'marks'],
            value: [],
            inverse: {type: 'set', path: [...bazSpanPath, 'marks'], value: []},
          },
          {type: 'remove.text', path: bazSpanPath, offset: 0, text: 'baz'},
          {type: 'insert.text', path: bazSpanPath, offset: 0, text: 'baz!'},
        ],
      },
    ])
  })

  test('Scenario: `update value` that swaps two blocks emits one remote `change` with the move and no `correction`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        block(fooBlockKey, fooSpanKey, 'foo'),
        block(barBlockKey, barSpanKey, 'bar'),
      ],
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const hostValue = [
      block(barBlockKey, barSpanKey, 'bar'),
      block(fooBlockKey, fooSpanKey, 'foo'),
    ]

    editor.send({type: 'update value', value: hostValue})

    expect(editor.getSnapshot().context.value).toEqual([
      block(barBlockKey, barSpanKey, 'bar'),
      block(fooBlockKey, fooSpanKey, 'foo'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {type: 'unset', path: [{_key: barBlockKey}]},
          {
            type: 'insert',
            path: [0],
            node: block(barBlockKey, barSpanKey, 'bar'),
            position: 'before',
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(hostValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A remote patch that removes `markDefs` from a text block emits a remote `change` with the removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const markDefsPath = [{_key: blockKey}, 'markDefs']

    editor.send({
      type: 'apply',
      patches: [{...unset(markDefsPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: markDefsPath}],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A remote patch that leaves the content as it was emits no `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const textPath = [{_key: blockKey}, 'children', {_key: spanKey}, 'text']

    editor.send({
      type: 'apply',
      patches: [{...set('foo', textPath), origin: 'remote'}],
    })
    editor.send({
      type: 'apply',
      patches: [{...set('bar', textPath), origin: 'remote'}],
    })

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'set', path: textPath, value: 'bar'}],
      },
    ])
  })

  test('Scenario: `update value` that needs a fix emits the remote `change`, then a local `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const duplicateKeyChildren = [
      {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
      {_type: 'span', _key: duplicateKey, text: 'bar', marks: ['strong']},
    ]
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']

    editor.send({
      type: 'update value',
      value: [
        {
          ...block(blockKey, spanKey, ''),
          children: duplicateKeyChildren,
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...block(blockKey, spanKey, ''),
        children: [
          duplicateKeyChildren[0],
          {...duplicateKeyChildren[1], _key: 'k5'},
        ],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children'],
            value: duplicateKeyChildren,
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'children'],
              value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k5',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k5', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
    ])
  })

  test('Scenario: `update value` with a keyless child emits the remote `change` without the child, then a `correction` with the minted key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    editor.send({
      type: 'update value',
      value: [
        {
          ...block(blockKey, spanKey, ''),
          children: [{_type: 'span', text: 'bar', marks: []}],
        },
      ],
    })
    consoleWarn.mockRestore()

    const repairedSpan = {_type: 'span', _key: 'k4', text: 'bar', marks: []}

    expect(editor.getSnapshot().context.value).toEqual([
      {...block(blockKey, spanKey, ''), children: [repairedSpan]},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'children'],
              value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 0],
            node: repairedSpan,
            position: 'before',
          },
        ],
        patches: [set(repairedSpan, [{_key: blockKey}, 'children', 0])],
        correction: true,
      },
    ])
  })

  test('Scenario: `update value` with empty children emits the remote `change` without a span, then a `correction` inserting one', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    editor.send({
      type: 'update value',
      value: [{...block(blockKey, spanKey, ''), children: []}],
    })
    consoleWarn.mockRestore()

    const insertedSpan = {_type: 'span', _key: 'k4', text: '', marks: []}

    expect(editor.getSnapshot().context.value).toEqual([
      {...block(blockKey, spanKey, ''), children: [insertedSpan]},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'children'],
              value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 0],
            node: insertedSpan,
            position: 'before',
          },
        ],
        patches: [
          setIfMissing([], [{_key: blockKey}, 'children']),
          insert([insertedSpan], 'after', [{_key: blockKey}, 'children', 0]),
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: `update value` with an unused mark definition emits the remote `change` with it, then a `correction` removing it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const linkMarkDef = {
      _type: 'link',
      _key: linkKey,
      href: 'https://example.com',
    }
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const linkPath = [{_key: blockKey}, 'markDefs', {_key: linkKey}]

    editor.send({
      type: 'update value',
      value: [{...block(blockKey, spanKey, 'bar'), markDefs: [linkMarkDef]}],
    })
    consoleWarn.mockRestore()

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [linkMarkDef],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [...spanPath, 'marks'],
            value: [],
            inverse: {type: 'set', path: [...spanPath, 'marks'], value: []},
          },
          {type: 'remove.text', path: spanPath, offset: 0, text: 'foo'},
          {type: 'insert.text', path: spanPath, offset: 0, text: 'bar'},
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [{type: 'unset', path: linkPath}],
        patches: [unset(linkPath)],
        correction: true,
      },
    ])
  })

  test('Scenario: `update value` with two keyless children emits the remote `change` without them, then one `correction` inserting both with their keys', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    editor.send({
      type: 'update value',
      value: [
        {
          ...block(blockKey, spanKey, ''),
          children: [
            {_type: 'span', text: 'foo', marks: []},
            {_type: 'span', text: 'bar', marks: ['strong']},
          ],
        },
      ],
    })
    consoleWarn.mockRestore()

    const fooSpan = {_type: 'span', _key: 'k4', text: 'foo', marks: []}
    const barSpan = {_type: 'span', _key: 'k5', text: 'bar', marks: ['strong']}

    expect(editor.getSnapshot().context.value).toEqual([
      {...block(blockKey, spanKey, ''), children: [fooSpan, barSpan]},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'children'],
              value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 0],
            node: fooSpan,
            position: 'before',
          },
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 1],
            node: barSpan,
            position: 'before',
          },
        ],
        patches: [
          {
            ...set('k5', [{_key: blockKey}, 'children', 1, '_key']),
            origin: 'local',
          },
          set(fooSpan, [{_key: blockKey}, 'children', 0]),
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: The local `patches` of the `correction` for an `update value` with a keyless child are the patches of the `patch` events, in their order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const patches: Array<Patch> = []
    editor.on('patch', (event) => {
      patches.push(event.patch)
    })
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    editor.send({
      type: 'update value',
      value: [
        {
          ...block(blockKey, spanKey, ''),
          children: [{_type: 'span', text: 'bar', marks: []}],
        },
      ],
    })
    consoleWarn.mockRestore()

    const repairedSpan = {_type: 'span', _key: 'k4', text: 'bar', marks: []}

    await vi.waitFor(() => {
      expect(patches).toEqual([
        set(repairedSpan, [{_key: blockKey}, 'children', 0]),
      ])
    })
    expect(
      changes.flatMap((change) =>
        change.origin === 'local' ? change.patches : [],
      ),
    ).toEqual(patches)
  })

  test('Scenario: The local `patches` of the `correction` for an `update value` with two keyless children are the patches of the `patch` events, in their order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const patches: Array<Patch> = []
    editor.on('patch', (event) => {
      patches.push(event.patch)
    })
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    editor.send({
      type: 'update value',
      value: [
        {
          ...block(blockKey, spanKey, ''),
          children: [
            {_type: 'span', text: 'foo', marks: []},
            {_type: 'span', text: 'bar', marks: ['strong']},
          ],
        },
      ],
    })
    consoleWarn.mockRestore()

    const fooSpan = {_type: 'span', _key: 'k4', text: 'foo', marks: []}

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          ...set('k5', [{_key: blockKey}, 'children', 1, '_key']),
          origin: 'local',
        },
        set(fooSpan, [{_key: blockKey}, 'children', 0]),
      ])
    })
    expect(
      changes.flatMap((change) =>
        change.origin === 'local' ? change.patches : [],
      ),
    ).toEqual(patches)
  })

  test('Scenario: `update value` with keyless children first, in the middle and last emits the remote `change` with only the keyed children, then one `correction` inserting the keyless ones in index order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const barKey = keyGenerator()
    const quxKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const barSpan = {
      _type: 'span',
      _key: barKey,
      text: 'bar',
      marks: ['strong'],
    }
    const quxSpan = {
      _type: 'span',
      _key: quxKey,
      text: 'qux',
      marks: ['strong'],
    }

    editor.send({
      type: 'update value',
      value: [
        {
          ...block(blockKey, spanKey, ''),
          children: [
            {_type: 'span', text: 'foo', marks: []},
            barSpan,
            {_type: 'span', text: 'baz', marks: []},
            quxSpan,
            {_type: 'span', text: 'quux', marks: []},
          ],
        },
      ],
    })
    consoleWarn.mockRestore()

    const fooSpan = {_type: 'span', _key: 'k6', text: 'foo', marks: []}
    const bazSpan = {_type: 'span', _key: 'k8', text: 'baz', marks: []}
    const quuxSpan = {_type: 'span', _key: 'k7', text: 'quux', marks: []}

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...block(blockKey, spanKey, ''),
        children: [fooSpan, barSpan, bazSpan, quxSpan, quuxSpan],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children'],
            value: [barSpan, quxSpan],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'children'],
              value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 0],
            node: fooSpan,
            position: 'before',
          },
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 2],
            node: bazSpan,
            position: 'before',
          },
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 4],
            node: quuxSpan,
            position: 'before',
          },
        ],
        patches: [
          {
            ...set('k8', [{_key: blockKey}, 'children', 2, '_key']),
            origin: 'local',
          },
          {
            ...set('k7', [{_key: blockKey}, 'children', 4, '_key']),
            origin: 'local',
          },
          set(fooSpan, [{_key: blockKey}, 'children', 0]),
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: `update value` with an empty keyless child before another keyless child emits a `correction` whose patches apply to the received value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const value = [
      {
        ...block(blockKey, spanKey, ''),
        children: [
          {_type: 'span', text: '', marks: []},
          {_type: 'span', text: 'bar', marks: []},
        ],
      },
    ]

    editor.send({type: 'update value', value})
    consoleWarn.mockRestore()

    const emptySpan = {_type: 'span', _key: 'k4', text: '', marks: []}
    const barSpan = {_type: 'span', _key: 'k5', text: 'bar', marks: []}

    expect(editor.getSnapshot().context.value).toEqual([
      {...block(blockKey, spanKey, ''), children: [emptySpan, barSpan]},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'children'],
              value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 0],
            node: emptySpan,
            position: 'before',
          },
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 1],
            node: barSpan,
            position: 'before',
          },
        ],
        patches: [
          {
            ...set('k5', [{_key: blockKey}, 'children', 1, '_key']),
            origin: 'local',
          },
          set(emptySpan, [{_key: blockKey}, 'children', 0]),
        ],
        correction: true,
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(value, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: `update value` repeating a block key with a keyless child in the later block emits a `correction` inserting the child into the later block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        block(fooBlockKey, fooSpanKey, 'foo'),
        block(barBlockKey, barSpanKey, 'bar'),
      ],
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    editor.send({
      type: 'update value',
      value: [
        block(fooBlockKey, fooSpanKey, 'baz'),
        {
          ...block(fooBlockKey, barSpanKey, ''),
          children: [{_type: 'span', text: 'bar', marks: []}],
        },
      ],
    })
    consoleWarn.mockRestore()

    const repairedSpan = {_type: 'span', text: 'bar', marks: [], _key: 'k6'}

    expect(editor.getSnapshot().context.value).toEqual([
      block(fooBlockKey, fooSpanKey, 'baz'),
      {...block('k7', barSpanKey, ''), children: [repairedSpan]},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: fooBlockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: fooBlockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [
              {_key: fooBlockKey},
              'children',
              {_key: fooSpanKey},
              'marks',
            ],
            value: [],
            inverse: {
              type: 'set',
              path: [
                {_key: fooBlockKey},
                'children',
                {_key: fooSpanKey},
                'marks',
              ],
              value: [],
            },
          },
          {
            type: 'remove.text',
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 0,
            text: 'foo',
          },
          {
            type: 'insert.text',
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 0,
            text: 'baz',
          },
          {type: 'unset', path: [{_key: barBlockKey}]},
          {
            type: 'insert',
            path: [1],
            node: {...block(fooBlockKey, barSpanKey, ''), children: []},
            position: 'before',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [1, 'children', 0],
            node: repairedSpan,
            position: 'before',
          },
          {
            type: 'set',
            path: [1, '_key'],
            value: 'k7',
            inverse: {type: 'set', path: [1, '_key'], value: fooBlockKey},
          },
        ],
        patches: [
          {...set('k7', [1, '_key']), origin: 'local'},
          set(repairedSpan, [{_key: fooBlockKey}, 'children', 0]),
        ],
        correction: true,
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test.fails('Scenario: Replaying the local `patches` of an `update value` repeating a block key with a keyless child in the later block gives the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        block(fooBlockKey, fooSpanKey, 'foo'),
        block(barBlockKey, barSpanKey, 'bar'),
      ],
    })
    const changes = collectChanges(editor)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const hostValue = [
      block(fooBlockKey, fooSpanKey, 'baz'),
      {
        ...block(fooBlockKey, barSpanKey, ''),
        children: [{_type: 'span', text: 'bar', marks: []}],
      },
    ]

    editor.send({type: 'update value', value: hostValue})
    consoleWarn.mockRestore()

    expect(replayLocalPatches(hostValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A first load with a keyless child emits only a `correction` with the minted key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const changes: Array<ChangeEvent> = []
    const events: Array<EditorEmittedEvent> = []
    await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          ...block(blockKey, '', ''),
          children: [{_type: 'span', text: 'foo', marks: []}],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
            if (event.type === 'change') {
              changes.push(event)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'ready')).toBe(true)
    })

    const repairedSpan = {_type: 'span', _key: 'k3', text: 'foo', marks: []}

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', 0],
            node: repairedSpan,
            position: 'before',
          },
        ],
        patches: [
          {
            ...set(repairedSpan, [{_key: blockKey}, 'children', 0]),
            origin: 'local',
          },
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: Deleting the last block emits one local `change` with the removal, then the placeholder insert, and patches ending with `unset([])`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)

    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    const placeholderBlock = block('k4', 'k5', '')

    expect(editor.getSnapshot().context.value).toEqual([placeholderBlock])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'unset',
            path: [{_key: blockKey}],
            inverse: {
              type: 'insert',
              path: [0],
              node: block(blockKey, spanKey, 'foo'),
              position: 'before',
            },
          },
          {
            type: 'insert',
            path: [0],
            node: placeholderBlock,
            position: 'before',
            inverse: {type: 'unset', path: [{_key: 'k4'}]},
          },
        ],
        patches: [
          {...unset([{_key: blockKey}]), origin: 'local'},
          {...unset([]), origin: 'local'},
        ],
      },
    ])
  })

  test('Scenario: Undo back to empty after typing into an empty editor emits the undo, keeps the original block and ends its patches with `unset([])`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({keyGenerator})
    const changes = collectChanges(editor)
    const spanPath = [{_key: 'k0'}, 'children', {_key: 'k1'}]

    expect(editor.getSnapshot().context.value).toEqual([block('k0', 'k1', '')])

    await userEvent.click(locator)
    await userEvent.type(locator, 'f')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block('k0', 'k1', 'f'),
      ])
    })
    changes.length = 0

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([block('k0', 'k1', '')])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'remove.text', path: spanPath, offset: 0, text: 'f'},
        ],
        patches: [
          {...diffMatchPatch('f', '', [...spanPath, 'text']), origin: 'local'},
          {...unset([]), origin: 'local'},
        ],
      },
    ])
  })

  test('Scenario: Selecting all and pressing Backspace emits the removals, keeps the first block and ends its patches with `unset([])`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        block(fooBlockKey, fooSpanKey, 'foo'),
        block(barBlockKey, barSpanKey, 'bar'),
      ],
    })
    const changes = collectChanges(editor)
    const fooSpanPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: barBlockKey}, 'children', {_key: barSpanKey}]

    await userEvent.click(locator)
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: fooSpanPath, offset: 0},
        focus: {path: barSpanPath, offset: 3},
        backward: false,
      })
    })
    changes.length = 0

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(fooBlockKey, fooSpanKey, ''),
      ])
    })
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'remove.text', path: fooSpanPath, offset: 0, text: 'foo'},
          {type: 'remove.text', path: barSpanPath, offset: 0, text: 'bar'},
          {
            type: 'unset',
            path: [{_key: barBlockKey}],
            inverse: {
              type: 'insert',
              path: [{_key: fooBlockKey}],
              node: block(barBlockKey, barSpanKey, ''),
              position: 'after',
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', '', [...fooSpanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bar', '', [...barSpanPath, 'text']),
            origin: 'local',
          },
          {...unset([{_key: barBlockKey}]), origin: 'local'},
          {...unset([]), origin: 'local'},
        ],
      },
    ])
  })

  test('Scenario: Another writer unsetting the field emits the remote `change`, then a `correction` with the placeholder insert and no patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)

    editor.send({
      type: 'apply',
      patches: [{...unset([]), origin: 'remote'}],
    })

    const placeholderBlock = block('k4', 'k5', '')

    expect(editor.getSnapshot().context.value).toEqual([placeholderBlock])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: []}],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [0],
            node: placeholderBlock,
            position: 'before',
          },
        ],
        patches: [],
        correction: true,
      },
    ])
  })

  test('Scenario: Replaying a session’s `change` events gives the editor’s value, from the snapshot by `operations` and from the host’s value by local `patches`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({keyGenerator})
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')
    await userEvent.keyboard('{Enter}')
    await userEvent.type(locator, 'bar')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block('k0', 'k1', 'foo'),
        block('k2', 'k3', 'bar'),
      ])
    })
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')
    await userEvent.keyboard('{Backspace}')
    editor.send({type: 'delete.block', at: [{_key: 'k0'}]})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block('k4', 'k5', ''),
      ])
    })
    await userEvent.click(locator)
    await userEvent.type(locator, 'baz')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block('k4', 'k5', 'baz'),
      ])
    })

    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(undefined, changes)).toEqual(
      editor.getSnapshot().context.value,
    )

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([block('k4', 'k5', '')])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    // The undo empties the field again, and an empty field is the
    // placeholder.
    expect(replayLocalPatches(undefined, changes)).toEqual(undefined)
  })

  test('Scenario: A remote patch that fails to apply does not stop later `change` events', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const textPath = [{_key: blockKey}, 'children', {_key: spanKey}, 'text']
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    editor.send({
      type: 'apply',
      patches: [
        {
          ...set('bar', [{_key: blockKey}, 'children', 5, 'text']),
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'apply',
      patches: [{...set('bar', textPath), origin: 'remote'}],
    })
    consoleError.mockRestore()

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'set', path: textPath, value: 'bar'}],
      },
    ])
  })

  test('Scenario: The first load of a value that needs no fix emits no `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const events: Array<EditorEmittedEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'ready')).toBe(true)
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    expect(events).toEqual([
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k2'}]},
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: block(blockKey, spanKey, 'foo'),
        },
        origin: 'remote',
      },
      {type: 'value changed', value: [block(blockKey, spanKey, 'foo')]},
      {type: 'ready'},
      {
        type: 'selection',
        selection: {
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 3},
          backward: false,
        },
      },
      {
        type: 'operation',
        operation: {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        origin: 'local',
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'patch',
        patch: {
          ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
          origin: 'local',
        },
      },
      {
        type: 'selection',
        selection: {
          anchor: {path: spanPath, offset: 4},
          focus: {path: spanPath, offset: 4},
          backward: false,
        },
      },
    ])
  })

  test('Scenario: A first load the editor has to fix emits only a `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const loadedBlock = {
      ...block(blockKey, duplicateKey, ''),
      children: [
        {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
        {_type: 'span', _key: duplicateKey, text: 'bar', marks: ['strong']},
      ],
    }
    const events: Array<EditorEmittedEvent> = []
    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [loadedBlock],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'ready')).toBe(true)
    })

    expect(events).toEqual([
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k2'}]},
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: loadedBlock,
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: duplicateKeyPath,
          value: 'k4',
          inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
        },
        origin: 'remote',
      },
      {type: 'value changed', value: [loadedBlock]},
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
      {type: 'ready'},
    ])
  })

  test('Scenario: A container registered with `editor.registerNode` after load that fills existing content emits a `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        block(blockKey, spanKey, 'foo'),
        {_type: 'callout', _key: calloutKey},
      ],
    })
    const changes = collectChanges(editor)
    const contentPath = [{_key: calloutKey}, 'content']

    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foo'),
      {_type: 'callout', _key: calloutKey, content: [block('k5', 'k6', '')]},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: contentPath,
            value: [block('k5', 'k6', '')],
            inverse: {type: 'unset', path: contentPath},
          },
        ],
        patches: [
          {...set([block('k5', 'k6', '')], contentPath), origin: 'local'},
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: A container registered with `editor.registerNode` after load that fills an empty array field emits a `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        block(blockKey, spanKey, 'foo'),
        {_type: 'callout', _key: calloutKey, content: []},
      ],
    })
    const changes = collectChanges(editor)
    const contentPath = [{_key: calloutKey}, 'content']

    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foo'),
      {_type: 'callout', _key: calloutKey, content: [block('k5', 'k6', '')]},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [...contentPath, 0],
            position: 'before',
            node: block('k5', 'k6', ''),
            inverse: {type: 'unset', path: [...contentPath, {_key: 'k5'}]},
          },
        ],
        patches: [
          {...setIfMissing([], contentPath), origin: 'local'},
          {
            ...insert([block('k5', 'k6', '')], 'before', [...contentPath, 0]),
            origin: 'local',
          },
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: Unregistering a node after load emits a `correction` with the fix the editor makes to existing content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const secondSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const unregister = editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const secondSpanPath = [{_key: blockKey}, 'children', {_key: secondSpanKey}]
    const secondSpan = {
      _type: 'span',
      _key: secondSpanKey,
      text: 'bar',
      marks: [],
    }
    editor.send({
      type: 'apply',
      patches: [{...insert([secondSpan], 'after', spanPath), origin: 'remote'}],
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...block(blockKey, spanKey, 'foo'),
        children: [
          {_type: 'span', _key: spanKey, text: 'foo', marks: []},
          secondSpan,
        ],
      },
    ])
    const changes = collectChanges(editor)

    unregister()

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foobar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: 'bar'},
          {
            type: 'unset',
            path: secondSpanPath,
            inverse: {
              type: 'insert',
              path: spanPath,
              position: 'after',
              node: secondSpan,
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foobar', [...spanPath, 'text']),
            origin: 'local',
          },
          {...unset(secondSpanPath), origin: 'local'},
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: Actions that change nothing emit no `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    editor.send({
      type: 'update value',
      value: [block(blockKey, spanKey, 'foo')],
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: The local `change` patches of a session equal the patches of its `mutation` events', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({keyGenerator})
    const changes = collectChanges(editor)
    const mutations = collectMutations(editor)
    const fooSpanPath = [{_key: 'k0'}, 'children', {_key: 'k1'}]
    const barSpanPath = [{_key: 'k2'}, 'children', {_key: 'k3'}]

    // No intake repairs here: the batcher may drop a superseded one from
    // `mutation`, while `change` always carries its patches.
    await userEvent.type(locator, 'foo')
    await userEvent.keyboard('{Enter}')
    await userEvent.type(locator, 'bar')
    editor.send({type: 'history.undo'})

    const sessionPatches = [
      {...setIfMissing([], []), origin: 'local'},
      {...insert([block('k0', 'k1', '')], 'before', [0]), origin: 'local'},
      {...diffMatchPatch('', 'f', [...fooSpanPath, 'text']), origin: 'local'},
      {...diffMatchPatch('f', 'fo', [...fooSpanPath, 'text']), origin: 'local'},
      {
        ...diffMatchPatch('fo', 'foo', [...fooSpanPath, 'text']),
        origin: 'local',
      },
      {
        ...insert([block('k2', 'k3', '')], 'after', [{_key: 'k0'}]),
        origin: 'local',
      },
      {...diffMatchPatch('', 'b', [...barSpanPath, 'text']), origin: 'local'},
      {...diffMatchPatch('b', 'ba', [...barSpanPath, 'text']), origin: 'local'},
      {
        ...diffMatchPatch('ba', 'bar', [...barSpanPath, 'text']),
        origin: 'local',
      },
      {
        ...diffMatchPatch('bar', 'ba', [...barSpanPath, 'text']),
        origin: 'local',
      },
      {...diffMatchPatch('ba', 'b', [...barSpanPath, 'text']), origin: 'local'},
      {...diffMatchPatch('b', '', [...barSpanPath, 'text']), origin: 'local'},
    ]

    await vi.waitFor(() => {
      expect(mutations.flatMap((mutation) => mutation.patches)).toEqual(
        sessionPatches,
      )
    })
    expect(
      changes.flatMap((change) =>
        change.origin === 'local' ? change.patches : [],
      ),
    ).toEqual(sessionPatches)
  })

  test('Scenario: A `change` listener that edits on a remote `change` gets the correction of the remote `change` before its own edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes: Array<ChangeEvent> = []
    editor.on('change', (event) => {
      changes.push(event)
      if (event.origin === 'remote') {
        editor.send({type: 'delete.block', at: [{_key: blockKey}]})
      }
    })
    const fooSpan = {_type: 'span', _key: spanKey, text: 'foo', marks: []}
    const barSpan = {
      _type: 'span',
      _key: spanKey,
      text: 'bar',
      marks: ['strong'],
    }
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']

    editor.send({
      type: 'update value',
      value: [{...block(blockKey, spanKey, ''), children: [fooSpan, barSpan]}],
    })

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            position: 'after',
            node: barSpan,
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: spanKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'unset',
            path: [{_key: blockKey}],
            inverse: {
              type: 'insert',
              path: [0],
              position: 'before',
              node: {
                ...block(blockKey, spanKey, ''),
                children: [fooSpan, {...barSpan, _key: 'k4'}],
              },
            },
          },
          {
            type: 'insert',
            path: [0],
            position: 'before',
            node: block('k5', 'k6', ''),
            inverse: {type: 'unset', path: [{_key: 'k5'}]},
          },
        ],
        patches: [
          {...unset([{_key: blockKey}]), origin: 'local'},
          {...unset([]), origin: 'local'},
        ],
      },
    ])
  })

  test('Scenario: A first load that streams its blocks across ticks commits one change', async () => {
    const keyGenerator = createTestKeyGenerator()
    // `updateValue` yields a tick every 10 blocks, so 25 blocks span three.
    const initialValue = Array.from({length: 25}, () =>
      block(keyGenerator(), keyGenerator(), 'foo'),
    )
    const committedCauses: Array<ChangeCause> = []
    function ChangeProbe() {
      const engine = useEngineStatic()
      useEffect(
        () =>
          subscribeToChanges(engine, (change) => {
            committedCauses.push(change.cause)
          }),
        [engine],
      )
      return null
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: <ChangeProbe />,
    })

    await vi.waitFor(() => {
      expect(committedCauses).toEqual([{type: 'value sync', initial: true}])
    })
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })

  test('Scenario: A remote patch sent before a streamed first load finishes arrives after the correction of the load', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const fooSpan = {_type: 'span', _key: duplicateKey, text: 'foo', marks: []}
    const barSpan = {
      _type: 'span',
      _key: duplicateKey,
      text: 'bar',
      marks: ['strong'],
    }
    const events: Array<EditorEmittedEvent> = []
    const firstSpanPath = [{_key: blockKey}, 'children', {_key: duplicateKey}]
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']
    const loadedBlock = {
      ...block(blockKey, duplicateKey, ''),
      children: [fooSpan, barSpan],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [loadedBlock],
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
          <SendOnMount
            event={{
              type: 'apply',
              patches: [{...unset(firstSpanPath), origin: 'remote'}],
            }}
          />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block(blockKey, duplicateKey, ''),
          children: [{...barSpan, _key: 'k4'}],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k2'}]},
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: loadedBlock,
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: duplicateKeyPath,
          value: 'k4',
          inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
        },
        origin: 'remote',
      },
      {type: 'value changed', value: [loadedBlock]},
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
      {type: 'ready'},
      {
        type: 'operation',
        operation: {type: 'unset', path: firstSpanPath},
        origin: 'remote',
      },
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: firstSpanPath}],
      },
    ])
  })

  test('Scenario: A value sent before a streamed first load finishes syncs after the correction of the load', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const fooSpan = {_type: 'span', _key: duplicateKey, text: 'foo', marks: []}
    const barSpan = {
      _type: 'span',
      _key: duplicateKey,
      text: 'bar',
      marks: ['strong'],
    }
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']
    const firstSpanPath = [{_key: blockKey}, 'children', {_key: duplicateKey}]
    const events: Array<EditorEmittedEvent> = []
    const loadedBlock = {
      ...block(blockKey, duplicateKey, ''),
      children: [fooSpan, barSpan],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [loadedBlock],
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
          <SendOnMount
            event={{
              type: 'update value',
              value: [block(blockKey, duplicateKey, 'baz')],
            }}
          />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(blockKey, duplicateKey, 'baz'),
      ])
    })
    expect(events).toEqual([
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k2'}]},
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: loadedBlock,
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: duplicateKeyPath,
          value: 'k4',
          inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
        },
        origin: 'remote',
      },
      {type: 'value changed', value: [loadedBlock]},
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
      {type: 'ready'},
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
          inverse: {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
          },
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'k4'}],
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: [...firstSpanPath, 'marks'],
          value: [],
          inverse: {type: 'set', path: [...firstSpanPath, 'marks'], value: []},
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'remove.text',
          path: firstSpanPath,
          offset: 0,
          text: 'foo',
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert.text',
          path: firstSpanPath,
          offset: 0,
          text: 'baz',
        },
        origin: 'remote',
      },
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {type: 'unset', path: [{_key: blockKey}, 'children', {_key: 'k4'}]},
          {
            type: 'set',
            path: [...firstSpanPath, 'marks'],
            value: [],
            inverse: {
              type: 'set',
              path: [...firstSpanPath, 'marks'],
              value: [],
            },
          },
          {type: 'remove.text', path: firstSpanPath, offset: 0, text: 'foo'},
          {type: 'insert.text', path: firstSpanPath, offset: 0, text: 'baz'},
        ],
      },
      {type: 'value changed', value: [block(blockKey, duplicateKey, 'baz')]},
    ])
  })

  test('Scenario: A Behavior event sent by an `operation` listener during `update value` emits its own local `change` after the remote `change` so far', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const mutations = collectMutations(editor)
    const patches: Array<Patch> = []
    editor.on('patch', (event) => {
      patches.push(event.patch)
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const bazBlock = {
      _type: 'block',
      _key: 'k4',
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    }
    editor.on('operation', (event) => {
      if (event.origin === 'remote' && event.operation.type === 'insert.text') {
        editor.send({
          type: 'insert.block',
          block: {_type: 'block', children: [{_type: 'span', text: 'baz'}]},
          placement: 'after',
          at: {
            anchor: {path: spanPath, offset: 0},
            focus: {path: spanPath, offset: 0},
          },
        })
      }
    })

    editor.send({
      type: 'update value',
      value: [block(blockKey, spanKey, 'bar')],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar'),
      bazBlock,
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [...spanPath, 'marks'],
            value: [],
            inverse: {type: 'set', path: [...spanPath, 'marks'], value: []},
          },
          {type: 'remove.text', path: spanPath, offset: 0, text: 'foo'},
          {type: 'insert.text', path: spanPath, offset: 0, text: 'bar'},
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [{_key: blockKey}],
            position: 'after',
            node: bazBlock,
          },
        ],
        patches: [],
      },
    ])

    // The insert is applied inside the sync's brackets, so like on main it
    // sends no `patch`. The edit after it anchors the `mutation` flush.
    editor.send({
      type: 'insert.text',
      at: spanPath,
      offset: 3,
      text: '!',
    })

    await vi.waitFor(() => {
      expect(mutations).toEqual([
        {
          type: 'mutation',
          patches: [
            {
              ...diffMatchPatch('bar', 'bar!', [...spanPath, 'text']),
              origin: 'local',
            },
          ],
          value: [block(blockKey, spanKey, 'bar!'), bazBlock],
        },
      ])
    })
    expect(patches).toEqual([
      {
        ...diffMatchPatch('bar', 'bar!', [...spanPath, 'text']),
        origin: 'local',
      },
    ])
  })

  test('Scenario: A container registered by an `operation` listener during `update value` is registered and emits no `change` of its own', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [
        block(blockKey, spanKey, 'foo'),
        {_type: 'callout', _key: calloutKey},
      ],
    })
    const changes = collectChanges(editor)
    const patches: Array<Patch> = []
    editor.on('patch', (event) => {
      patches.push(event.patch)
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    editor.on('operation', (event) => {
      if (event.origin === 'remote' && event.operation.type === 'insert.text') {
        editor.registerNode({
          node: defineContainer({type: 'callout', arrayField: 'content'}),
        })
      }
    })

    editor.send({
      type: 'update value',
      value: [
        block(blockKey, spanKey, 'bar'),
        {_type: 'callout', _key: calloutKey},
      ],
    })

    // The sync defers normalization, so like on main the registration
    // fills nothing until the next edit.
    expect(editor.getSnapshot().context.containers.has('callout')).toEqual(true)
    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar'),
      {_type: 'callout', _key: calloutKey},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [...spanPath, 'marks'],
            value: [],
            inverse: {type: 'set', path: [...spanPath, 'marks'], value: []},
          },
          {type: 'remove.text', path: spanPath, offset: 0, text: 'foo'},
          {type: 'insert.text', path: spanPath, offset: 0, text: 'bar'},
        ],
      },
    ])
    expect(patches).toEqual([])
  })

  test('Scenario: A Behavior event sent by an `operation` listener during `update value` of a container emits its own local `change` after the remote `change` so far', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [callout(calloutKey, [block(blockKey, spanKey, 'foo')])],
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const changes = collectChanges(editor)
    const mutations = collectMutations(editor)
    const patches: Array<Patch> = []
    editor.on('patch', (event) => {
      patches.push(event.patch)
    })
    const contentPath = [{_key: calloutKey}, 'content']
    const spanPath = [
      ...contentPath,
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]
    const bazBlock = {
      _type: 'block',
      _key: 'k5',
      children: [{_type: 'span', _key: 'k6', text: 'baz', marks: []}],
    }
    editor.on('operation', (event) => {
      if (event.origin === 'remote' && event.operation.type === 'set') {
        editor.send({
          type: 'insert.block',
          block: {_type: 'block', children: [{_type: 'span', text: 'baz'}]},
          placement: 'after',
          at: {
            anchor: {path: spanPath, offset: 0},
            focus: {path: spanPath, offset: 0},
          },
        })
      }
    })

    editor.send({
      type: 'update value',
      value: [callout(calloutKey, [block(blockKey, spanKey, 'bar')])],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [block(blockKey, spanKey, 'bar'), bazBlock]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: contentPath,
            value: [block(blockKey, spanKey, 'bar')],
            inverse: {
              type: 'set',
              path: contentPath,
              value: [block(blockKey, spanKey, 'foo')],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [...contentPath, {_key: blockKey}],
            position: 'after',
            node: bazBlock,
          },
        ],
        patches: [],
      },
    ])

    // The insert is applied inside the sync's brackets, so like on main it
    // sends no `patch`. The edit after it anchors the `mutation` flush.
    editor.send({
      type: 'insert.text',
      at: spanPath,
      offset: 3,
      text: '!',
    })

    await vi.waitFor(() => {
      expect(mutations).toEqual([
        {
          type: 'mutation',
          patches: [
            {
              ...diffMatchPatch('bar', 'bar!', [...spanPath, 'text']),
              origin: 'local',
            },
          ],
          value: [
            callout(calloutKey, [block(blockKey, spanKey, 'bar!'), bazBlock]),
          ],
        },
      ])
    })
    expect(patches).toEqual([
      {
        ...diffMatchPatch('bar', 'bar!', [...spanPath, 'text']),
        origin: 'local',
      },
    ])
  })

  test('Scenario: `update value` sent by a Behavior effect emits its own remote `change` and keeps the value in sync', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.sync',
              actions: [
                () => [
                  effect(() => {
                    editor.send({
                      type: 'update value',
                      value: [block(fooBlockKey, fooSpanKey, 'foo')],
                    })
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })
    const fooSpanPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const changes = collectChanges(editor)

    editor.send({type: 'custom.sync'})

    expect(editor.getSnapshot().context.value).toEqual([
      block(fooBlockKey, fooSpanKey, 'foo'),
    ])

    editor.send({
      type: 'update value',
      value: [block(fooBlockKey, fooSpanKey, 'bar')],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(fooBlockKey, fooSpanKey, 'bar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {type: 'unset', path: [{_key: 'k2'}]},
          {
            type: 'insert',
            path: [0],
            position: 'before',
            node: block(fooBlockKey, fooSpanKey, 'foo'),
          },
        ],
      },
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: fooBlockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: fooBlockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [...fooSpanPath, 'marks'],
            value: [],
            inverse: {type: 'set', path: [...fooSpanPath, 'marks'], value: []},
          },
          {type: 'remove.text', path: fooSpanPath, offset: 0, text: 'foo'},
          {type: 'insert.text', path: fooSpanPath, offset: 0, text: 'bar'},
        ],
      },
    ])
  })

  test('Scenario: `update value` sent by a Behavior effect after an `await` emits its own remote `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.sync',
              actions: [
                () => [
                  effect(async () => {
                    await Promise.resolve()
                    editor.send({
                      type: 'update value',
                      value: [block(fooBlockKey, fooSpanKey, 'foo')],
                    })
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })
    const changes = collectChanges(editor)

    editor.send({type: 'custom.sync'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(fooBlockKey, fooSpanKey, 'foo'),
      ])
    })
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {type: 'unset', path: [{_key: 'k2'}]},
          {
            type: 'insert',
            path: [0],
            position: 'before',
            node: block(fooBlockKey, fooSpanKey, 'foo'),
          },
        ],
      },
    ])
  })
  test('Scenario: Typing and splitting a text block inside a container emits local `change` events whose `operations` and `patches` replay to the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      callout(calloutKey, [block(blockKey, spanKey, 'foo')]),
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      initialValue,
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const contentPath = [{_key: calloutKey}, 'content']
    const spanPath = [
      ...contentPath,
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]
    const newSpanPath = [...contentPath, {_key: 'k5'}, 'children', {_key: 'k6'}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'insert.text', text: '!'})
    editor.send({type: 'insert.break'})
    editor.send({type: 'insert.text', text: 'bar'})

    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [
        block(blockKey, spanKey, 'foo!'),
        block('k5', 'k6', 'bar'),
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [...contentPath, {_key: blockKey}],
            position: 'after',
            node: block('k5', 'k6', ''),
            inverse: {type: 'unset', path: [...contentPath, {_key: 'k5'}]},
          },
        ],
        patches: [
          {...setIfMissing([], contentPath), origin: 'local'},
          {
            ...insert([block('k5', 'k6', '')], 'after', [
              ...contentPath,
              {_key: blockKey},
            ]),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: newSpanPath, offset: 0, text: 'bar'},
        ],
        patches: [
          {
            ...diffMatchPatch('', 'bar', [...newSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(initialValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: `update value` changing a text block inside a container emits one remote `change` whose `operations` replay to the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [callout(calloutKey, [block(blockKey, spanKey, 'foo')])],
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const contentPath = [{_key: calloutKey}, 'content']
    const hostValue = [callout(calloutKey, [block(blockKey, spanKey, 'bar')])]

    editor.send({type: 'update value', value: hostValue})

    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [block(blockKey, spanKey, 'bar')]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: contentPath,
            value: [block(blockKey, spanKey, 'bar')],
            inverse: {
              type: 'set',
              path: contentPath,
              value: [block(blockKey, spanKey, 'foo')],
            },
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(hostValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: `update value` repeating a span key in a text block inside a container emits the remote `change`, then a `correction` re-keying the span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [callout(calloutKey, [block(blockKey, spanKey, 'foo')])],
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const contentPath = [{_key: calloutKey}, 'content']
    const duplicateKeyPath = [
      ...contentPath,
      {_key: blockKey},
      'children',
      1,
      '_key',
    ]
    const duplicateKeyBlock = {
      ...block(blockKey, spanKey, ''),
      children: [
        {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
        {_type: 'span', _key: duplicateKey, text: 'bar', marks: ['strong']},
      ],
    }
    const hostValue = [callout(calloutKey, [duplicateKeyBlock])]

    editor.send({type: 'update value', value: hostValue})

    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [
        {
          ...block(blockKey, spanKey, ''),
          children: [
            {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          ],
        },
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: contentPath,
            value: [duplicateKeyBlock],
            inverse: {
              type: 'set',
              path: contentPath,
              value: [block(blockKey, spanKey, 'foo')],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k6',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k6', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(hostValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: Typing and splitting a text block inside a container inside a container emits local `change` events whose `operations` and `patches` replay to the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const outerCalloutKey = keyGenerator()
    const innerCalloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      callout(outerCalloutKey, [
        callout(innerCalloutKey, [block(blockKey, spanKey, 'foo')]),
      ]),
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedCalloutSchemaDefinition,
      initialValue,
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const contentPath = [
      {_key: outerCalloutKey},
      'content',
      {_key: innerCalloutKey},
      'content',
    ]
    const spanPath = [
      ...contentPath,
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]
    const newSpanPath = [...contentPath, {_key: 'k6'}, 'children', {_key: 'k7'}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'insert.text', text: '!'})
    editor.send({type: 'insert.break'})
    editor.send({type: 'insert.text', text: 'bar'})

    expect(editor.getSnapshot().context.value).toEqual([
      callout(outerCalloutKey, [
        callout(innerCalloutKey, [
          block(blockKey, spanKey, 'foo!'),
          block('k6', 'k7', 'bar'),
        ]),
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [...contentPath, {_key: blockKey}],
            position: 'after',
            node: block('k6', 'k7', ''),
            inverse: {type: 'unset', path: [...contentPath, {_key: 'k6'}]},
          },
        ],
        patches: [
          {...setIfMissing([], contentPath), origin: 'local'},
          {
            ...insert([block('k6', 'k7', '')], 'after', [
              ...contentPath,
              {_key: blockKey},
            ]),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: newSpanPath, offset: 0, text: 'bar'},
        ],
        patches: [
          {
            ...diffMatchPatch('', 'bar', [...newSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(initialValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: `update value` changing a text block inside a container inside a container emits one remote `change` whose `operations` replay to the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const outerCalloutKey = keyGenerator()
    const innerCalloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedCalloutSchemaDefinition,
      initialValue: [
        callout(outerCalloutKey, [
          callout(innerCalloutKey, [block(blockKey, spanKey, 'foo')]),
        ]),
      ],
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const outerContentPath = [{_key: outerCalloutKey}, 'content']
    const hostValue = [
      callout(outerCalloutKey, [
        callout(innerCalloutKey, [block(blockKey, spanKey, 'bar')]),
      ]),
    ]

    editor.send({type: 'update value', value: hostValue})

    expect(editor.getSnapshot().context.value).toEqual([
      callout(outerCalloutKey, [
        callout(innerCalloutKey, [block(blockKey, spanKey, 'bar')]),
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: outerContentPath,
            value: [
              callout(innerCalloutKey, [block(blockKey, spanKey, 'bar')]),
            ],
            inverse: {
              type: 'set',
              path: outerContentPath,
              value: [
                callout(innerCalloutKey, [block(blockKey, spanKey, 'foo')]),
              ],
            },
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(hostValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: `update value` repeating a span key in a text block inside a container inside a container emits the remote `change`, then a `correction` re-keying the span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const outerCalloutKey = keyGenerator()
    const innerCalloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedCalloutSchemaDefinition,
      initialValue: [
        callout(outerCalloutKey, [
          callout(innerCalloutKey, [block(blockKey, spanKey, 'foo')]),
        ]),
      ],
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const outerContentPath = [{_key: outerCalloutKey}, 'content']
    const duplicateKeyPath = [
      ...outerContentPath,
      {_key: innerCalloutKey},
      'content',
      {_key: blockKey},
      'children',
      1,
      '_key',
    ]
    const duplicateKeyBlock = {
      ...block(blockKey, spanKey, ''),
      children: [
        {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
        {_type: 'span', _key: duplicateKey, text: 'bar', marks: ['strong']},
      ],
    }
    const hostValue = [
      callout(outerCalloutKey, [callout(innerCalloutKey, [duplicateKeyBlock])]),
    ]

    editor.send({type: 'update value', value: hostValue})

    expect(editor.getSnapshot().context.value).toEqual([
      callout(outerCalloutKey, [
        callout(innerCalloutKey, [
          {
            ...block(blockKey, spanKey, ''),
            children: [
              {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
              {_type: 'span', _key: 'k7', text: 'bar', marks: ['strong']},
            ],
          },
        ]),
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: outerContentPath,
            value: [callout(innerCalloutKey, [duplicateKeyBlock])],
            inverse: {
              type: 'set',
              path: outerContentPath,
              value: [
                callout(innerCalloutKey, [block(blockKey, spanKey, 'foo')]),
              ],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k7',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k7', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(hostValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: Typing and splitting a text block in an object field with its own sub-schema emits local `change` events whose `operations` and `patches` replay to the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [note(noteKey, [emBlock(blockKey, spanKey, 'foo')])]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: noteSchemaDefinition,
      initialValue,
    })
    editor.registerNode({
      node: defineContainer({type: 'note', arrayField: 'body'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const bodyPath = [{_key: noteKey}, 'body']
    const spanPath = [
      ...bodyPath,
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]
    const newSpanPath = [...bodyPath, {_key: 'k5'}, 'children', {_key: 'k6'}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'insert.text', text: '!'})
    editor.send({type: 'insert.break'})
    editor.send({type: 'insert.text', text: 'bar'})

    expect(editor.getSnapshot().context.value).toEqual([
      note(noteKey, [
        emBlock(blockKey, spanKey, 'foo!'),
        block('k5', 'k6', 'bar'),
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [...bodyPath, {_key: blockKey}],
            position: 'after',
            node: block('k5', 'k6', ''),
            inverse: {type: 'unset', path: [...bodyPath, {_key: 'k5'}]},
          },
        ],
        patches: [
          {...setIfMissing([], bodyPath), origin: 'local'},
          {
            ...insert([block('k5', 'k6', '')], 'after', [
              ...bodyPath,
              {_key: blockKey},
            ]),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: newSpanPath, offset: 0, text: 'bar'},
        ],
        patches: [
          {
            ...diffMatchPatch('', 'bar', [...newSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(initialValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: `update value` changing a text block in an object field with its own sub-schema emits one remote `change` whose `operations` replay to the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: noteSchemaDefinition,
      initialValue: [note(noteKey, [emBlock(blockKey, spanKey, 'foo')])],
    })
    editor.registerNode({
      node: defineContainer({type: 'note', arrayField: 'body'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const bodyPath = [{_key: noteKey}, 'body']
    const hostValue = [note(noteKey, [emBlock(blockKey, spanKey, 'bar')])]

    editor.send({type: 'update value', value: hostValue})

    expect(editor.getSnapshot().context.value).toEqual([
      note(noteKey, [emBlock(blockKey, spanKey, 'bar')]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: bodyPath,
            value: [emBlock(blockKey, spanKey, 'bar')],
            inverse: {
              type: 'set',
              path: bodyPath,
              value: [emBlock(blockKey, spanKey, 'foo')],
            },
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(hostValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: `update value` repeating a span key in a text block in an object field with its own sub-schema emits the remote `change`, then a `correction` re-keying the span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: noteSchemaDefinition,
      initialValue: [note(noteKey, [emBlock(blockKey, spanKey, 'foo')])],
    })
    editor.registerNode({
      node: defineContainer({type: 'note', arrayField: 'body'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const bodyPath = [{_key: noteKey}, 'body']
    const duplicateKeyPath = [
      ...bodyPath,
      {_key: blockKey},
      'children',
      1,
      '_key',
    ]
    const duplicateKeyBlock = {
      ...block(blockKey, spanKey, ''),
      children: [
        {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
        {_type: 'span', _key: duplicateKey, text: 'bar', marks: ['em']},
      ],
    }
    const hostValue = [note(noteKey, [duplicateKeyBlock])]

    editor.send({type: 'update value', value: hostValue})

    expect(editor.getSnapshot().context.value).toEqual([
      note(noteKey, [
        {
          ...block(blockKey, spanKey, ''),
          children: [
            {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'k6', text: 'bar', marks: ['em']},
          ],
        },
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: bodyPath,
            value: [duplicateKeyBlock],
            inverse: {
              type: 'set',
              path: bodyPath,
              value: [emBlock(blockKey, spanKey, 'foo')],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k6',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k6', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(hostValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A remote patch that removes `markDefs` from a text block inside a container emits a remote `change` with the removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [callout(calloutKey, [block(blockKey, spanKey, 'foo')])],
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const markDefsPath = [
      {_key: calloutKey},
      'content',
      {_key: blockKey},
      'markDefs',
    ]

    editor.send({
      type: 'apply',
      patches: [{...unset(markDefsPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: markDefsPath}],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A remote patch that removes `markDefs` from a text block inside a container inside a container emits a remote `change` with the removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const outerKey = keyGenerator()
    const innerKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedCalloutSchemaDefinition,
      initialValue: [
        callout(outerKey, [
          callout(innerKey, [block(blockKey, spanKey, 'foo')]),
        ]),
      ],
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const markDefsPath = [
      {_key: outerKey},
      'content',
      {_key: innerKey},
      'content',
      {_key: blockKey},
      'markDefs',
    ]

    editor.send({
      type: 'apply',
      patches: [{...unset(markDefsPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      callout(outerKey, [
        callout(innerKey, [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ]),
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: markDefsPath}],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A remote patch that removes `markDefs` from a text block in an object field with its own sub-schema emits a remote `change` with the removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: noteSchemaDefinition,
      initialValue: [note(noteKey, [emBlock(blockKey, spanKey, 'foo')])],
    })
    editor.registerNode({
      node: defineContainer({type: 'note', arrayField: 'body'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const markDefsPath = [{_key: noteKey}, 'body', {_key: blockKey}, 'markDefs']

    editor.send({
      type: 'apply',
      patches: [{...unset(markDefsPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      note(noteKey, [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: ['em']},
          ],
        },
      ]),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: markDefsPath}],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })
})

const calloutSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const nestedCalloutSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
  ],
})

const noteSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'note',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [{type: 'block', decorators: [{name: 'em'}]}],
        },
      ],
    },
  ],
})

function collectChanges(editor: Editor): Array<ChangeEvent> {
  const changes: Array<ChangeEvent> = []
  editor.on('change', (event) => {
    changes.push(event)
  })
  return changes
}

function SendOnMount({event}: {event: Parameters<Editor['send']>[0]}) {
  const editor = useEditor()
  useEffect(() => {
    editor.send(event)
  }, [editor, event])
  return null
}

function collectMutations(editor: Editor): Array<MutationEvent> {
  const mutations: Array<MutationEvent> = []
  editor.on('mutation', (event) => {
    mutations.push(event)
  })
  return mutations
}

function block(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
  }
}

function callout(
  calloutKey: string,
  content: Array<PortableTextBlock>,
): PortableTextBlock {
  return {_type: 'callout', _key: calloutKey, content}
}

function note(
  noteKey: string,
  body: Array<PortableTextBlock>,
): PortableTextBlock {
  return {_type: 'note', _key: noteKey, body}
}

function emBlock(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    ...block(blockKey, spanKey, text),
    children: [{_type: 'span', _key: spanKey, text, marks: ['em']}],
  }
}

function replayOperations(
  snapshotValue: Array<PortableTextBlock>,
  changes: Array<ChangeEvent>,
): Array<PortableTextBlock> {
  return changes
    .flatMap((change) => change.operations)
    .reduce(
      (value, operation) =>
        applyAll(value, [operationToPatch(value, operation)]) ?? [],
      snapshotValue,
    )
}

function replayLocalPatches(
  hostValue: Array<PortableTextBlock> | undefined,
  changes: Array<ChangeEvent>,
): Array<PortableTextBlock> | undefined {
  return changes.reduce(
    (value, change) =>
      change.origin === 'local' ? applyAll(value, change.patches) : value,
    hostValue,
  )
}

/**
 * The patch that applies `operation` to `value`, so a session's operations
 * can be replayed onto a plain copy of the snapshot.
 */
function operationToPatch(
  value: Array<PortableTextBlock>,
  operation: ChangeEvent['operations'][number],
): Patch {
  switch (operation.type) {
    case 'insert': {
      const index = operation.path.at(-1)

      if (
        operation.position === 'before' &&
        typeof index === 'number' &&
        index > 0
      ) {
        // An engine `insert` before the index one past the last node
        // appends, where the same `insert` patch does nothing.
        return insert([operation.node], 'after', [
          ...operation.path.slice(0, -1),
          index - 1,
        ])
      }

      return insert([operation.node], operation.position, operation.path)
    }
    case 'set':
      return set(operation.value, operation.path)
    case 'unset':
      return unset(operation.path)
    case 'insert.text':
    case 'remove.text': {
      const text = getTextAt(value, operation.path)

      return set(
        operation.type === 'insert.text'
          ? text.slice(0, operation.offset) +
              operation.text +
              text.slice(operation.offset)
          : text.slice(0, operation.offset) +
              text.slice(operation.offset + operation.text.length),
        [...operation.path, 'text'],
      )
    }
  }
}

function getTextAt(
  value: Array<PortableTextBlock>,
  path: ChangeEvent['operations'][number]['path'],
): string {
  const span = path.reduce<unknown>((node, segment) => {
    if (typeof segment === 'string' || typeof segment === 'number') {
      return (node as Record<string | number, unknown> | undefined)?.[segment]
    }

    if (Array.isArray(segment) || !Array.isArray(node)) {
      return undefined
    }

    return node.find(
      (candidate: {_key?: string}) => candidate._key === segment._key,
    )
  }, value)

  return (span as {text?: string} | undefined)?.text ?? ''
}

test('Scenario: interrupted load corrections replay to the editor value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const first = textBlock(keyGenerator(), keyGenerator(), 'foo')
  const second = textBlock(keyGenerator(), keyGenerator(), 'bar')
  const host = [first, null, second]
  const patches: Array<Patch> = []
  function Loader() {
    const editor = useEditor()
    useEffect(() => {
      const changes = editor.on('change', (event) => {
        if (event.origin === 'local') {
          patches.push(...event.patches)
        }
      })
      let selected = false
      const operations = editor.on('operation', (event) => {
        if (
          !selected &&
          event.operation.type === 'set' &&
          event.operation.path.length === 0
        ) {
          selected = true
          const path = [{_key: first._key}, 'children', {_key: 'k1'}]
          editor.send({
            type: 'select',
            at: {anchor: {path, offset: 1}, focus: {path, offset: 1}},
          })
        }
      })
      editor.send({type: 'load', value: host as Array<PortableTextBlock>})
      return () => {
        changes.unsubscribe()
        operations.unsubscribe()
      }
    }, [editor])
    return null
  }
  const {editor} = await createTestEditor({keyGenerator, children: <Loader />})
  expect(applyAll(host, patches)).toEqual(editor.getSnapshot().context.value)
})
test('Scenario: load removes a null children entry at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const schemaDefinition = {
    ...loadSchemaDefinition,
    annotations: [{name: 'link'}],
  }
  const block = {
    _key: blockKey,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_key: spanKey, _type: 'span', text: 'bar', marks: []}],
  }
  const expected = [block]
  const incoming = [{...block, children: [null as never, ...block.children]}]
  const records: Array<LoadRecord> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: (
      <>
        <NodePlugin nodes={loadContainers} />
        <LoadOnMount loads={[incoming]} records={records} />
      </>
    ),
  })
  expect(editor.getSnapshot().context.value).toEqual(expected)
  expect(records).toEqual([
    {
      type: 'event',
      event: {
        type: 'change',
        origin: 'local',
        operations: [],
        patches: [
          {
            type: 'unset',
            path: [{_key: blockKey}, 'children', 0],
            origin: 'local',
          },
        ],
        correction: true,
      },
    },
    {type: 'ready', value: expected, status: 'ready'},
  ])
  expect(
    applyAll(
      incoming,
      records.flatMap((record) =>
        record.type === 'event' &&
        record.event.type === 'change' &&
        record.event.origin === 'local'
          ? (record.event.patches ?? [])
          : [],
      ),
    ),
  ).toEqual(editor.getSnapshot().context.value)
})

test('Scenario: load removes a null markDefs entry at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const markKey = keyGenerator()

  const schemaDefinition = {
    ...loadSchemaDefinition,
    annotations: [{name: 'link'}],
  }
  const block = {
    _key: blockKey,
    _type: 'block',
    style: 'normal',
    markDefs: [{_key: markKey, _type: 'link'}],
    children: [{_key: spanKey, _type: 'span', text: 'bar', marks: [markKey]}],
  }
  const expected = [block]
  const incoming = [{...block, markDefs: [null as never, ...block.markDefs]}]
  const records: Array<LoadRecord> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: (
      <>
        <NodePlugin nodes={loadContainers} />
        <LoadOnMount loads={[incoming]} records={records} />
      </>
    ),
  })
  expect(editor.getSnapshot().context.value).toEqual(expected)
  expect(records).toEqual([
    {
      type: 'event',
      event: {
        type: 'change',
        origin: 'local',
        operations: [],
        patches: [
          {
            type: 'unset',
            path: [{_key: blockKey}, 'markDefs', 0],
            origin: 'local',
          },
        ],
        correction: true,
      },
    },
    {type: 'ready', value: expected, status: 'ready'},
  ])
  expect(
    applyAll(
      incoming,
      records.flatMap((record) =>
        record.type === 'event' &&
        record.event.type === 'change' &&
        record.event.origin === 'local'
          ? (record.event.patches ?? [])
          : [],
      ),
    ),
  ).toEqual(editor.getSnapshot().context.value)
})

test('Scenario: load removes a null children entry at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const wrapperKey = keyGenerator()
  const schemaDefinition = {
    ...loadSchemaDefinition,
    annotations: [{name: 'link'}],
  }
  const block = {
    _key: blockKey,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_key: spanKey, _type: 'span', text: 'bar', marks: []}],
  }
  const expected = [{_key: wrapperKey, _type: 'callout', content: [block]}]
  const incoming = [
    {
      _key: wrapperKey,
      _type: 'callout',
      content: [{...block, children: [null as never, ...block.children]}],
    },
  ]
  const records: Array<LoadRecord> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: (
      <>
        <NodePlugin nodes={loadContainers} />
        <LoadOnMount loads={[incoming]} records={records} />
      </>
    ),
  })
  expect(editor.getSnapshot().context.value).toEqual(expected)
  expect(records).toEqual([
    {
      type: 'event',
      event: {
        type: 'change',
        origin: 'local',
        operations: [],
        patches: [
          {
            type: 'unset',
            path: [
              {_key: wrapperKey},
              'content',
              {_key: blockKey},
              'children',
              0,
            ],
            origin: 'local',
          },
        ],
        correction: true,
      },
    },
    {type: 'ready', value: expected, status: 'ready'},
  ])
  expect(
    applyAll(
      incoming,
      records.flatMap((record) =>
        record.type === 'event' &&
        record.event.type === 'change' &&
        record.event.origin === 'local'
          ? (record.event.patches ?? [])
          : [],
      ),
    ),
  ).toEqual(editor.getSnapshot().context.value)
})

test('Scenario: load removes a null markDefs entry at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const markKey = keyGenerator()
  const wrapperKey = keyGenerator()
  const schemaDefinition = {
    ...loadSchemaDefinition,
    annotations: [{name: 'link'}],
  }
  const block = {
    _key: blockKey,
    _type: 'block',
    style: 'normal',
    markDefs: [{_key: markKey, _type: 'link'}],
    children: [{_key: spanKey, _type: 'span', text: 'bar', marks: [markKey]}],
  }
  const expected = [{_key: wrapperKey, _type: 'callout', content: [block]}]
  const incoming = [
    {
      _key: wrapperKey,
      _type: 'callout',
      content: [{...block, markDefs: [null as never, ...block.markDefs]}],
    },
  ]
  const records: Array<LoadRecord> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: (
      <>
        <NodePlugin nodes={loadContainers} />
        <LoadOnMount loads={[incoming]} records={records} />
      </>
    ),
  })
  expect(editor.getSnapshot().context.value).toEqual(expected)
  expect(records).toEqual([
    {
      type: 'event',
      event: {
        type: 'change',
        origin: 'local',
        operations: [],
        patches: [
          {
            type: 'unset',
            path: [
              {_key: wrapperKey},
              'content',
              {_key: blockKey},
              'markDefs',
              0,
            ],
            origin: 'local',
          },
        ],
        correction: true,
      },
    },
    {type: 'ready', value: expected, status: 'ready'},
  ])
  expect(
    applyAll(
      incoming,
      records.flatMap((record) =>
        record.type === 'event' &&
        record.event.type === 'change' &&
        record.event.origin === 'local'
          ? (record.event.patches ?? [])
          : [],
      ),
    ),
  ).toEqual(editor.getSnapshot().context.value)
})

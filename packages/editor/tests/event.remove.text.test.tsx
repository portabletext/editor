import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {defineSchema, type Operation, type Patch} from '../src'
import {EventListenerPlugin} from '../src/plugins'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import {
  compactSpanPaths,
  textBlock,
  textBlockDepths,
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

describe.each(textBlockDepths)(
  'event.remove.text with a compact path $depth',
  ({wrap}) => {
    test.each(compactSpanPaths)(
      'Scenario: `remove.text` at a compact span path ($form) changes nothing',
      async ({path: compactPath}) => {
        const consoleError = vi.spyOn(console, 'error')
        const consoleWarn = vi.spyOn(console, 'warn')
        onTestFinished(() => {
          consoleError.mockRestore()
          consoleWarn.mockRestore()
        })
        const keyGenerator = createTestKeyGenerator()
        const depth = wrap(keyGenerator)
        const fooBlockKey = keyGenerator()
        const fooSpanKey = keyGenerator()
        const barBlockKey = keyGenerator()
        const barSpanKey = keyGenerator()
        const barSpanPath = [
          ...depth.keyedPrefix,
          {_key: barBlockKey},
          'children',
          {_key: barSpanKey},
        ]
        const patches: Array<Patch> = []

        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: textBlockDepthsSchemaDefinition,
          initialValue: depth.wrapValue([
            textBlock(depth.blockName, fooBlockKey, fooSpanKey, 'foo'),
            textBlock(depth.blockName, barBlockKey, barSpanKey, 'bar'),
          ]),
          children: (
            <>
              <NodePlugin nodes={textBlockDepthsContainers} />
              <EventListenerPlugin
                on={(event) => {
                  if (event.type === 'patch') {
                    patches.push(event.patch)
                  }
                }}
              />
            </>
          ),
        })

        editor.send({
          type: 'remove.text',
          at: compactPath(depth, fooBlockKey, fooSpanKey),
          offset: 1,
          text: 'oo',
        })
        editor.send({
          type: 'remove.text',
          at: barSpanPath,
          offset: 1,
          text: 'ar',
        })

        await vi.waitFor(() => {
          expect(patches).toEqual([
            {
              origin: 'local',
              type: 'diffMatchPatch',
              path: [...barSpanPath, 'text'],
              value: '@@ -1,3 +1 @@\n b\n-ar\n',
            },
          ])
        })
        expect(editor.getSnapshot().context.value).toEqual(
          depth.wrapValue([
            textBlock(depth.blockName, fooBlockKey, fooSpanKey, 'foo'),
            textBlock(depth.blockName, barBlockKey, barSpanKey, 'b'),
          ]),
        )
        expect(consoleError.mock.calls).toEqual([])
        expect(consoleWarn.mock.calls).toEqual([])
      },
    )
  },
)

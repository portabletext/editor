import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {defineSchema, type Patch} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import {
  compactSpanPaths,
  textBlock,
  textBlockDepths,
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

describe.each(textBlockDepths)(
  'event.insert with a compact path $depth',
  ({wrap}) => {
    test.each(compactSpanPaths)(
      'Scenario: `insert` at a compact span path ($form) changes nothing',
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
        const compactInsertedKey = keyGenerator()
        const bazBlockKey = keyGenerator()
        const bazSpanKey = keyGenerator()
        const barBlockPath = [...depth.keyedPrefix, {_key: barBlockKey}]
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
          type: 'insert',
          at: compactPath(depth, fooBlockKey, fooSpanKey),
          value: {
            _key: compactInsertedKey,
            _type: 'span',
            text: 'baz',
            marks: [],
          },
          position: 'after',
        })
        editor.send({
          type: 'insert',
          at: barBlockPath,
          value: textBlock(depth.blockName, bazBlockKey, bazSpanKey, 'baz'),
          position: 'after',
        })

        await vi.waitFor(() => {
          expect(patches).toEqual([
            ...(depth.keyedPrefix.length === 0
              ? []
              : [
                  {
                    origin: 'local',
                    type: 'setIfMissing',
                    path: depth.keyedPrefix,
                    value: [],
                  },
                ]),
            {
              origin: 'local',
              type: 'insert',
              path: barBlockPath,
              position: 'after',
              items: [
                textBlock(depth.blockName, bazBlockKey, bazSpanKey, 'baz'),
              ],
            },
          ])
        })
        expect(editor.getSnapshot().context.value).toEqual(
          depth.wrapValue([
            textBlock(depth.blockName, fooBlockKey, fooSpanKey, 'foo'),
            textBlock(depth.blockName, barBlockKey, barSpanKey, 'bar'),
            textBlock(depth.blockName, bazBlockKey, bazSpanKey, 'baz'),
          ]),
        )
        expect(consoleError.mock.calls).toEqual([])
        expect(consoleWarn.mock.calls).toEqual([])
      },
    )
  },
)

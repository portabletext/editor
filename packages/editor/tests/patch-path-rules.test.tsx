import type {Patch} from '@portabletext/patches'
import {
  patchPathRules,
  type PatchPathRule,
} from '@portabletext/patches/test-utils/patch-path-rules'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import type {Editor} from '../src/editor'
import type {Path} from '../src/engine/interfaces/path'
import {getValue} from '../src/internal-utils/get-value'
import {serializePath} from '../src/paths/serialize-path'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import type {Operation} from '../src/types/operation'
import {isKeyedSegment} from '../src/utils/util.is-keyed-segment'

const knownDifferences = new Set<PatchPathRule['id']>([
  'index--1-insert-replace',
  'index--1-inc',
  'index--1-dec',
  'index--2-insert-replace',
  'index--2-inc',
  'index--2-dec',
  'index-0-insert-replace',
  'index-0-inc',
  'index-0-dec',
  'index-2-insert-replace',
  'index-2-inc',
  'index-2-dec',
  'index-3-insert-before',
  'index-3-insert-after',
  'index-3-insert-replace',
  'insert-replace-1',
  'insert-replace-3',
  'present-null-setIfMissing',
  'primitive-null-deep-setIfMissing',
  'path-number-explicit-unset',
  'path-object-explicit-unset',
  'nested-array-set',
  'nested-array-unset',
  'nested-array-inc',
  'nested-array-dec',
  'nested-array-insert-before',
  'nested-array-insert-after',
  'nested-array-insert-replace',
])

const knownConsoleErrors: Partial<
  Record<PatchPathRule['id'], (path: string) => string>
> = {
  'index-3-insert-after': pastTheEnd,
}

const editorRows = patchPathRules
  // Sanity rejects these mutations, so they never reach the editor as remote patches.
  .filter((row) => !('rejected' in row.sanity))
  // The editor throws on a `null` item, re-keys a duplicate key and turns an empty array into a placeholder block on load, so the row would not test a path rule.
  .filter((row) => !isStartTheEditorCannotHold(row.start))

describe.each([
  {depth: 'at the root', wrap: atRoot},
  {depth: 'inside a callout', wrap: inCallout},
  {depth: 'inside a callout inside a callout', wrap: inNestedCallout},
  {depth: 'inside a field with its own sub-schema', wrap: inNote},
])(
  'remote patches $depth follow the patch path rules measured against Sanity',
  ({wrap}) => {
    for (const row of editorRows) {
      const knownDifference = knownDifferences.has(row.id)

      test(`Scenario: ${row.rule} ${row.id} ${knownDifference ? 'lands elsewhere than' : 'lands where'} Sanity puts it`, async () => {
        const keyGenerator = createTestKeyGenerator()
        const {wrapValue, prefix} = wrap(keyGenerator)
        const markerKey = keyGenerator()
        const path = [...prefix, ...row.patch.path]
        const expectedConsoleErrors = knownConsoleErrors[row.id]
        const consoleError = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {})
        onTestFinished(() => {
          const calls = consoleError.mock.calls
          consoleError.mockRestore()
          expect(calls).toEqual(
            expectedConsoleErrors
              ? [[new Error(expectedConsoleErrors(serializePath(path)))]]
              : [],
          )
        })
        const initialValue = wrapValue(structuredClone(row.start))

        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition,
          initialValue,
          children: <NodePlugin nodes={containers} />,
        })

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual(initialValue)
        })

        const markerRemovals: Array<Operation> = []
        editor.on('operation', ({operation, origin}) => {
          if (
            origin === 'remote' &&
            operation.type === 'unset' &&
            isKeyedSegment(operation.path[0]) &&
            operation.path[0]._key === markerKey
          ) {
            markerRemovals.push(structuredClone(operation))
          }
        })

        // A row patch that changes nothing has nothing to wait for, so wait
        // for the marker removal that follows it in the same batch.
        editor.send({
          type: 'apply',
          patches: [
            {...structuredClone(row.patch), origin: 'remote', path},
            {
              type: 'insert',
              origin: 'remote',
              path: [0],
              position: 'before',
              items: [marker(markerKey)],
            },
            {type: 'unset', origin: 'remote', path: [{_key: markerKey}]},
          ],
        })

        await vi.waitFor(() => {
          expect(markerRemovals).toEqual([
            {type: 'unset', path: [{_key: markerKey}]},
          ])
        })

        const editorOutcome = {
          value: getValue(editor.getSnapshot().context.value, prefix),
          consoleErrors: consoleError.mock.calls,
        }
        const sanityOutcome = {
          value: 'result' in row.sanity ? row.sanity.result : undefined,
          consoleErrors: [],
        }

        if (knownDifference) {
          expect(editorOutcome).not.toEqual(sanityOutcome)
        } else {
          expect(editorOutcome).toEqual(sanityOutcome)
        }
      })
    }
  },
)

describe.each([
  {depth: 'at the root', wrap: atRoot},
  {depth: 'inside a callout', wrap: inCallout},
  {depth: 'inside a callout inside a callout', wrap: inNestedCallout},
  {depth: 'inside a field with its own sub-schema', wrap: inNote},
])(
  'remote patches $depth resolve a negative index in any path segment, no Sanity measurement',
  ({wrap}) => {
    test("Scenario: a remote `set` at [-1, 'children', 0, 'text'] sets the text of the last block's first span", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'set',
          origin: 'remote',
          path: [...prefix, -1, 'children', 0, 'text'],
          value: 'foo bar',
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({
        value: wrapValue([
          foo,
          bar,
          textBlock(bazKey, [{...b, text: 'foo bar'}, a, z]),
        ]),
        consoleErrors: [],
      })
    })

    test("Scenario: a remote `set` at [-1, 'children', -1, 'text'] sets the text of the last block's last span", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'set',
          origin: 'remote',
          path: [...prefix, -1, 'children', -1, 'text'],
          value: 'zed',
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({
        value: wrapValue([
          foo,
          bar,
          textBlock(bazKey, [b, a, {...z, text: 'zed'}]),
        ]),
        consoleErrors: [],
      })
    })

    test("Scenario: a remote `set` at [{_key}, 'children', -2, 'text'] sets the text of the block's second to last span", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'set',
          origin: 'remote',
          path: [...prefix, {_key: bazKey}, 'children', -2, 'text'],
          value: 'ay',
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({
        value: wrapValue([
          foo,
          bar,
          textBlock(bazKey, [b, {...a, text: 'ay'}, z]),
        ]),
        consoleErrors: [],
      })
    })

    test("Scenario: a remote `set` at [{_key}, 'children', -4, 'text'] on three spans changes nothing", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const initialValue = wrapValue([foo, bar, textBlock(bazKey, [b, a, z])])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        initialValue,
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'set',
          origin: 'remote',
          path: [...prefix, {_key: bazKey}, 'children', -4, 'text'],
          value: 'x',
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({value: initialValue, consoleErrors: []})
    })

    test("Scenario: a remote `unset` at [-1, 'children', 0] removes the last block's first span", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'unset',
          origin: 'remote',
          path: [...prefix, -1, 'children', 0],
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({
        value: wrapValue([foo, bar, textBlock(bazKey, [a, z])]),
        consoleErrors: [],
      })
    })

    test("Scenario: a remote `insert` before [-1, 'children', 0] inserts a span first in the last block", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const x = span(keyGenerator(), 'x', ['em'])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, -1, 'children', 0],
          position: 'before',
          items: [x],
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({
        value: wrapValue([foo, bar, textBlock(bazKey, [x, b, a, z])]),
        consoleErrors: [],
      })
    })

    test("Scenario: a remote `insert` after [-1, 'children', 0] inserts a span second in the last block", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const x = span(keyGenerator(), 'x', ['em'])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, -1, 'children', 0],
          position: 'after',
          items: [x],
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({
        value: wrapValue([foo, bar, textBlock(bazKey, [b, x, a, z])]),
        consoleErrors: [],
      })
    })

    test("Scenario: a remote `set` at [-4, 'children', 0, 'text'] on three blocks changes nothing", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const initialValue = wrapValue([foo, bar, textBlock(bazKey, [b, a, z])])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        initialValue,
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'set',
          origin: 'remote',
          path: [...prefix, -4, 'children', 0, 'text'],
          value: 'x',
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({value: initialValue, consoleErrors: []})
    })

    test("Scenario: a remote `unset` at [-4, 'children', 0] on three blocks changes nothing", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const initialValue = wrapValue([foo, bar, textBlock(bazKey, [b, a, z])])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        initialValue,
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'unset',
          origin: 'remote',
          path: [...prefix, -4, 'children', 0],
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({value: initialValue, consoleErrors: []})
    })

    test("Scenario: a remote `insert` before [-4, 'children', 0] on three blocks changes nothing", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const x = span(keyGenerator(), 'x', ['em'])
      const initialValue = wrapValue([foo, bar, textBlock(bazKey, [b, a, z])])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        initialValue,
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, -4, 'children', 0],
          position: 'before',
          items: [x],
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({value: initialValue, consoleErrors: []})
    })

    test('Scenario: a remote `unset` at [-1] after an append in the same batch removes the appended block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const qux = textBlock(keyGenerator(), [span(keyGenerator(), 'qux')])
      const initialValue = wrapValue([foo, bar, textBlock(bazKey, [b, a, z])])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        initialValue,
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, 2],
          position: 'after',
          items: [qux],
        },
        {type: 'unset', origin: 'remote', path: [...prefix, -1]},
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({value: initialValue, consoleErrors: []})
    })

    test('Scenario: a remote `insert` after [-1] after an append in the same batch inserts after the appended block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const qux = textBlock(keyGenerator(), [span(keyGenerator(), 'qux')])
      const quux = textBlock(keyGenerator(), [span(keyGenerator(), 'quux')])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, 2],
          position: 'after',
          items: [qux],
        },
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, -1],
          position: 'after',
          items: [quux],
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({
        value: wrapValue([foo, bar, textBlock(bazKey, [b, a, z]), qux, quux]),
        consoleErrors: [],
      })
    })

    test("Scenario: a remote `set` at [-4, 'children', 0, 'text'] after an append in the same batch sets the first block's text", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, fooSpan, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const qux = textBlock(keyGenerator(), [span(keyGenerator(), 'qux')])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, 2],
          position: 'after',
          items: [qux],
        },
        {
          type: 'set',
          origin: 'remote',
          path: [...prefix, -4, 'children', 0, 'text'],
          value: 'x',
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({
        value: wrapValue([
          textBlock(foo._key, [{...fooSpan, text: 'x'}]),
          bar,
          textBlock(bazKey, [b, a, z]),
          qux,
        ]),
        consoleErrors: [],
      })
    })

    test('Scenario: a remote `unset` at [-3] after a removal in the same batch left two blocks changes nothing more', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
      )

      await sendRemotePatches(editor, keyGenerator, [
        {type: 'unset', origin: 'remote', path: [...prefix, {_key: bazKey}]},
        {type: 'unset', origin: 'remote', path: [...prefix, -3]},
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({value: wrapValue([foo, bar]), consoleErrors: []})
    })

    test("Scenario: a remote `unset` at [-1, 'children', -1] after a span append in the same batch removes the appended span", async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
      const x = span(keyGenerator(), 'x', ['strong'])
      const initialValue = wrapValue([foo, bar, textBlock(bazKey, [b, a, z])])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        initialValue,
      )

      await sendRemotePatches(editor, keyGenerator, [
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, {_key: bazKey}, 'children', 2],
          position: 'after',
          items: [x],
        },
        {
          type: 'unset',
          origin: 'remote',
          path: [...prefix, -1, 'children', -1],
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
      }).toEqual({value: initialValue, consoleErrors: []})
    })

    for (const position of ['before', 'after', 'replace'] as const) {
      test(`Scenario: a remote \`insert\` ${position} [-1, 'markDefs', -1] on a block with empty markDefs inserts the annotation`, async () => {
        const keyGenerator = createTestKeyGenerator()
        const {wrapValue, prefix} = wrap(keyGenerator)
        const {foo, bar, b, a, z, bazKey} = threeBlocks(keyGenerator)
        const link = {_type: 'link', _key: keyGenerator(), href: 'x'}
        const {editor, consoleErrors} = await createSpanEditor(
          keyGenerator,
          wrapValue([foo, bar, textBlock(bazKey, [b, a, z])]),
        )

        await sendRemotePatches(editor, keyGenerator, [
          {
            type: 'insert',
            origin: 'remote',
            path: [...prefix, -1, 'markDefs', -1],
            position,
            items: [link],
          },
          {
            type: 'insert',
            origin: 'remote',
            path: [...prefix, -1, 'children', 0, 'marks', -1],
            position,
            items: [link._key],
          },
        ])

        expect({
          value: editor.getSnapshot().context.value,
          consoleErrors,
        }).toEqual({
          value: wrapValue([
            foo,
            bar,
            {
              ...textBlock(bazKey, [{...b, marks: [link._key]}, a, z]),
              markDefs: [link],
            },
          ]),
          consoleErrors: [],
        })
      })

      test(`Scenario: a remote \`insert\` ${position} [-1] after a removal in the same batch emptied the array inserts the block`, async () => {
        const keyGenerator = createTestKeyGenerator()
        const {wrapValue, prefix} = wrap(keyGenerator)
        const {foo} = threeBlocks(keyGenerator)
        const qux = textBlock(keyGenerator(), [span(keyGenerator(), 'qux')])
        const {editor, consoleErrors} = await createSpanEditor(
          keyGenerator,
          wrapValue([foo]),
        )

        await sendRemotePatches(editor, keyGenerator, [
          {
            type: 'unset',
            origin: 'remote',
            path: [...prefix, {_key: foo._key}],
          },
          {
            type: 'insert',
            origin: 'remote',
            path: [...prefix, -1],
            position,
            items: [qux],
          },
        ])

        expect({
          value: editor.getSnapshot().context.value,
          consoleErrors,
        }).toEqual({value: wrapValue([qux]), consoleErrors: []})
      })
    }
  },
)

describe.each([
  {depth: 'at the root', wrap: atRoot},
  {depth: 'inside a callout', wrap: inCallout},
  {depth: 'inside a callout inside a callout', wrap: inNestedCallout},
  {depth: 'inside a field with its own sub-schema', wrap: inNote},
])(
  'remote patches $depth at a negative index into an empty array land where Sanity puts them',
  ({wrap}) => {
    for (const index of [-2, -4]) {
      for (const position of ['before', 'after', 'replace'] as const) {
        test(`Scenario: a remote \`insert\` ${position} [${index}] after a removal in the same batch emptied the array changes nothing before a later insert at [0]`, async () => {
          const keyGenerator = createTestKeyGenerator()
          const {wrapValue, prefix} = wrap(keyGenerator)
          const {foo, bar} = threeBlocks(keyGenerator)
          const qux = textBlock(keyGenerator(), [span(keyGenerator(), 'qux')])
          const {editor, consoleErrors} = await createSpanEditor(
            keyGenerator,
            wrapValue([foo]),
          )
          const consoleWarn = vi
            .spyOn(console, 'warn')
            .mockImplementation(() => {})
          onTestFinished(() => {
            consoleWarn.mockRestore()
          })

          await sendRemotePatches(editor, keyGenerator, [
            {
              type: 'unset',
              origin: 'remote',
              path: [...prefix, {_key: foo._key}],
            },
            {
              type: 'insert',
              origin: 'remote',
              path: [...prefix, index],
              position,
              items: [qux],
            },
            {
              type: 'insert',
              origin: 'remote',
              path: [...prefix, 0],
              position: 'before',
              items: [bar],
            },
          ])

          expect({
            value: editor.getSnapshot().context.value,
            consoleErrors,
            consoleWarnings: consoleWarn.mock.calls,
          }).toEqual({
            value: wrapValue([bar]),
            consoleErrors: [],
            consoleWarnings: [],
          })
        })
      }
    }

    test('Scenario: a remote `unset` at [-1] after a removal in the same batch emptied the array changes nothing before a later insert at [0]', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar} = threeBlocks(keyGenerator)
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo]),
      )
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      onTestFinished(() => {
        consoleWarn.mockRestore()
      })

      await sendRemotePatches(editor, keyGenerator, [
        {type: 'unset', origin: 'remote', path: [...prefix, {_key: foo._key}]},
        {type: 'unset', origin: 'remote', path: [...prefix, -1]},
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, 0],
          position: 'before',
          items: [bar],
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
        consoleWarnings: consoleWarn.mock.calls,
      }).toEqual({
        value: wrapValue([bar]),
        consoleErrors: [],
        consoleWarnings: [],
      })
    })

    test('Scenario: a remote `set` at [-1] after a removal in the same batch emptied the array changes nothing before a later insert at [0]', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const {foo, bar} = threeBlocks(keyGenerator)
      const qux = textBlock(keyGenerator(), [span(keyGenerator(), 'qux')])
      const {editor, consoleErrors} = await createSpanEditor(
        keyGenerator,
        wrapValue([foo]),
      )
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      onTestFinished(() => {
        consoleWarn.mockRestore()
      })

      await sendRemotePatches(editor, keyGenerator, [
        {type: 'unset', origin: 'remote', path: [...prefix, {_key: foo._key}]},
        {type: 'set', origin: 'remote', path: [...prefix, -1], value: qux},
        {
          type: 'insert',
          origin: 'remote',
          path: [...prefix, 0],
          position: 'before',
          items: [bar],
        },
      ])

      expect({
        value: editor.getSnapshot().context.value,
        consoleErrors,
        consoleWarnings: consoleWarn.mock.calls,
      }).toEqual({
        value: wrapValue([bar]),
        consoleErrors: [],
        consoleWarnings: [],
      })
    })
  },
)

describe('remote patches resolve a negative index that selects a container, no Sanity measurement', () => {
  test("Scenario: a remote `set` at [-2, 'content', -1, 'children', 0, 'text'] edits the last block of the callout second to last", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {
      firstKey,
      first,
      outerKey,
      innerAKey,
      innerA,
      innerBKey,
      innerB,
      lead,
      leadSpan,
      noteKey,
      noteBlock,
    } = containerFixture(keyGenerator)
    const {editor, consoleErrors} = await createSpanEditor(keyGenerator, [
      callout(firstKey, [first]),
      callout(outerKey, [
        callout(innerAKey, [innerA]),
        callout(innerBKey, [innerB]),
        lead,
      ]),
      note(noteKey, [noteBlock]),
    ])

    await sendRemotePatches(editor, keyGenerator, [
      {
        type: 'set',
        origin: 'remote',
        path: [-2, 'content', -1, 'children', 0, 'text'],
        value: 'x',
      },
    ])

    expect({value: editor.getSnapshot().context.value, consoleErrors}).toEqual({
      value: [
        callout(firstKey, [first]),
        callout(outerKey, [
          callout(innerAKey, [innerA]),
          callout(innerBKey, [innerB]),
          textBlock(lead._key, [{...leadSpan, text: 'x'}]),
        ]),
        note(noteKey, [noteBlock]),
      ],
      consoleErrors: [],
    })
  })

  test("Scenario: a remote `set` at [{_key}, 'content', -2, 'content', 0, 'children', 0, 'text'] edits the inner callout second to last", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {
      firstKey,
      first,
      outerKey,
      innerAKey,
      innerA,
      innerBKey,
      innerB,
      innerBSpan,
      lead,
      noteKey,
      noteBlock,
    } = containerFixture(keyGenerator)
    const {editor, consoleErrors} = await createSpanEditor(keyGenerator, [
      callout(firstKey, [first]),
      callout(outerKey, [
        callout(innerAKey, [innerA]),
        callout(innerBKey, [innerB]),
        lead,
      ]),
      note(noteKey, [noteBlock]),
    ])

    await sendRemotePatches(editor, keyGenerator, [
      {
        type: 'set',
        origin: 'remote',
        path: [
          {_key: outerKey},
          'content',
          -2,
          'content',
          0,
          'children',
          0,
          'text',
        ],
        value: 'x',
      },
    ])

    expect({value: editor.getSnapshot().context.value, consoleErrors}).toEqual({
      value: [
        callout(firstKey, [first]),
        callout(outerKey, [
          callout(innerAKey, [innerA]),
          callout(innerBKey, [
            textBlock(innerB._key, [{...innerBSpan, text: 'x'}]),
          ]),
          lead,
        ]),
        note(noteKey, [noteBlock]),
      ],
      consoleErrors: [],
    })
  })

  test("Scenario: a remote `set` at [-1, 'body', 0, 'children', 0, 'text'] edits the last note", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {
      firstKey,
      first,
      outerKey,
      innerAKey,
      innerA,
      innerBKey,
      innerB,
      lead,
      noteKey,
      noteBlock,
      noteSpan,
    } = containerFixture(keyGenerator)
    const {editor, consoleErrors} = await createSpanEditor(keyGenerator, [
      callout(firstKey, [first]),
      callout(outerKey, [
        callout(innerAKey, [innerA]),
        callout(innerBKey, [innerB]),
        lead,
      ]),
      note(noteKey, [noteBlock]),
    ])

    await sendRemotePatches(editor, keyGenerator, [
      {
        type: 'set',
        origin: 'remote',
        path: [-1, 'body', 0, 'children', 0, 'text'],
        value: 'x',
      },
    ])

    expect({value: editor.getSnapshot().context.value, consoleErrors}).toEqual({
      value: [
        callout(firstKey, [first]),
        callout(outerKey, [
          callout(innerAKey, [innerA]),
          callout(innerBKey, [innerB]),
          lead,
        ]),
        note(noteKey, [textBlock(noteBlock._key, [{...noteSpan, text: 'x'}])]),
      ],
      consoleErrors: [],
    })
  })

  test("Scenario: a remote `set` at [-2, 'content', -2, 'content', -1, 'children', -1, 'text'] edits the inner callout second to last", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {
      firstKey,
      first,
      outerKey,
      innerAKey,
      innerA,
      innerBKey,
      innerB,
      innerBSpan,
      lead,
      noteKey,
      noteBlock,
    } = containerFixture(keyGenerator)
    const {editor, consoleErrors} = await createSpanEditor(keyGenerator, [
      callout(firstKey, [first]),
      callout(outerKey, [
        callout(innerAKey, [innerA]),
        callout(innerBKey, [innerB]),
        lead,
      ]),
      note(noteKey, [noteBlock]),
    ])

    await sendRemotePatches(editor, keyGenerator, [
      {
        type: 'set',
        origin: 'remote',
        path: [-2, 'content', -2, 'content', -1, 'children', -1, 'text'],
        value: 'x',
      },
    ])

    expect({value: editor.getSnapshot().context.value, consoleErrors}).toEqual({
      value: [
        callout(firstKey, [first]),
        callout(outerKey, [
          callout(innerAKey, [innerA]),
          callout(innerBKey, [
            textBlock(innerB._key, [{...innerBSpan, text: 'x'}]),
          ]),
          lead,
        ]),
        note(noteKey, [noteBlock]),
      ],
      consoleErrors: [],
    })
  })

  test("Scenario: a remote `unset` at [-2, 'content', 0] removes the first inner callout of the callout second to last", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {
      firstKey,
      first,
      outerKey,
      innerAKey,
      innerA,
      innerBKey,
      innerB,
      lead,
      noteKey,
      noteBlock,
    } = containerFixture(keyGenerator)
    const {editor, consoleErrors} = await createSpanEditor(keyGenerator, [
      callout(firstKey, [first]),
      callout(outerKey, [
        callout(innerAKey, [innerA]),
        callout(innerBKey, [innerB]),
        lead,
      ]),
      note(noteKey, [noteBlock]),
    ])

    await sendRemotePatches(editor, keyGenerator, [
      {type: 'unset', origin: 'remote', path: [-2, 'content', 0]},
    ])

    expect({value: editor.getSnapshot().context.value, consoleErrors}).toEqual({
      value: [
        callout(firstKey, [first]),
        callout(outerKey, [callout(innerBKey, [innerB]), lead]),
        note(noteKey, [noteBlock]),
      ],
      consoleErrors: [],
    })
  })

  test("Scenario: a remote `insert` after [-1, 'body', 0] inserts a block second in the last note", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {
      firstKey,
      first,
      outerKey,
      innerAKey,
      innerA,
      innerBKey,
      innerB,
      lead,
      noteKey,
      noteBlock,
    } = containerFixture(keyGenerator)
    const quux = textBlock(keyGenerator(), [span(keyGenerator(), 'quux')])
    const {editor, consoleErrors} = await createSpanEditor(keyGenerator, [
      callout(firstKey, [first]),
      callout(outerKey, [
        callout(innerAKey, [innerA]),
        callout(innerBKey, [innerB]),
        lead,
      ]),
      note(noteKey, [noteBlock]),
    ])

    await sendRemotePatches(editor, keyGenerator, [
      {
        type: 'insert',
        origin: 'remote',
        path: [-1, 'body', 0],
        position: 'after',
        items: [quux],
      },
    ])

    expect({value: editor.getSnapshot().context.value, consoleErrors}).toEqual({
      value: [
        callout(firstKey, [first]),
        callout(outerKey, [
          callout(innerAKey, [innerA]),
          callout(innerBKey, [innerB]),
          lead,
        ]),
        note(noteKey, [noteBlock, quux]),
      ],
      consoleErrors: [],
    })
  })

  test("Scenario: a remote `set` at [-4, 'content', 0, 'children', 0, 'text'] on three callouts changes nothing", async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      callout(keyGenerator(), [
        textBlock(keyGenerator(), [span(keyGenerator(), 'alpha')]),
      ]),
      callout(keyGenerator(), [
        textBlock(keyGenerator(), [span(keyGenerator(), 'beta')]),
      ]),
      callout(keyGenerator(), [
        textBlock(keyGenerator(), [span(keyGenerator(), 'gamma')]),
      ]),
    ]
    const {editor, consoleErrors} = await createSpanEditor(
      keyGenerator,
      initialValue,
    )

    await sendRemotePatches(editor, keyGenerator, [
      {
        type: 'set',
        origin: 'remote',
        path: [-4, 'content', 0, 'children', 0, 'text'],
        value: 'x',
      },
    ])

    expect({value: editor.getSnapshot().context.value, consoleErrors}).toEqual({
      value: initialValue,
      consoleErrors: [],
    })
  })

  test("Scenario: a remote `unset` at [{_key}, 'content', -4, 'content', 0] on three inner callouts changes nothing", async () => {
    const keyGenerator = createTestKeyGenerator()
    const outerKey = keyGenerator()
    const initialValue = [
      callout(outerKey, [
        callout(keyGenerator(), [
          textBlock(keyGenerator(), [span(keyGenerator(), 'alpha')]),
          textBlock(keyGenerator(), [span(keyGenerator(), 'alpha 2')]),
        ]),
        callout(keyGenerator(), [
          textBlock(keyGenerator(), [span(keyGenerator(), 'beta')]),
          textBlock(keyGenerator(), [span(keyGenerator(), 'beta 2')]),
        ]),
        callout(keyGenerator(), [
          textBlock(keyGenerator(), [span(keyGenerator(), 'gamma')]),
          textBlock(keyGenerator(), [span(keyGenerator(), 'gamma 2')]),
        ]),
      ]),
    ]
    const {editor, consoleErrors} = await createSpanEditor(
      keyGenerator,
      initialValue,
    )

    await sendRemotePatches(editor, keyGenerator, [
      {
        type: 'unset',
        origin: 'remote',
        path: [{_key: outerKey}, 'content', -4, 'content', 0],
      },
    ])

    expect({value: editor.getSnapshot().context.value, consoleErrors}).toEqual({
      value: initialValue,
      consoleErrors: [],
    })
  })
})

const schemaDefinition = defineSchema({
  block: {
    fields: [
      {name: 'count', type: 'number'},
      {name: 'status', type: 'string'},
      {name: 'target', type: 'object'},
      {name: 'analysis', type: 'object'},
      {name: 'matrix', type: 'array'},
    ],
  },
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
    {
      name: 'note',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal'}, {name: 'h1'}],
              decorators: [{name: 'em'}],
            },
          ],
        },
      ],
    },
  ],
})

const containers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'note', arrayField: 'body'}),
]

type Value = PatchPathRule['start'][number]

type Wrap = (keyGenerator: () => string) => {
  wrapValue: (array: PatchPathRule['start']) => Array<PortableTextBlock>
  prefix: Path
}

function atRoot(): ReturnType<Wrap> {
  return {
    wrapValue: (array) => array as Array<PortableTextBlock>,
    prefix: [],
  }
}

function inCallout(keyGenerator: () => string): ReturnType<Wrap> {
  const calloutKey = keyGenerator()

  return {
    wrapValue: (array) => [
      {_type: 'callout', _key: calloutKey, content: array},
    ],
    prefix: [{_key: calloutKey}, 'content'],
  }
}

function inNestedCallout(keyGenerator: () => string): ReturnType<Wrap> {
  const outerKey = keyGenerator()
  const innerKey = keyGenerator()

  return {
    wrapValue: (array) => [
      {
        _type: 'callout',
        _key: outerKey,
        content: [{_type: 'callout', _key: innerKey, content: array}],
      },
    ],
    prefix: [{_key: outerKey}, 'content', {_key: innerKey}, 'content'],
  }
}

function inNote(keyGenerator: () => string): ReturnType<Wrap> {
  const noteKey = keyGenerator()

  return {
    wrapValue: (array) => [{_type: 'note', _key: noteKey, body: array}],
    prefix: [{_key: noteKey}, 'body'],
  }
}

function isStartTheEditorCannotHold(start: PatchPathRule['start']) {
  const keys = start.flatMap((item) =>
    item !== null && typeof item === 'object' && '_key' in item
      ? [item['_key']]
      : [],
  )

  return (
    start.length === 0 ||
    start.includes(null) ||
    new Set(keys).size !== keys.length
  )
}

function marker(key: string) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}-span`, text: '', marks: []}],
  }
}

const spanSchemaDefinition = defineSchema({
  decorators: [{name: 'em'}, {name: 'strong'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
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
    {
      name: 'note',
      fields: [{name: 'body', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

async function createSpanEditor(
  keyGenerator: () => string,
  initialValue: Array<PortableTextBlock>,
) {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  onTestFinished(() => {
    consoleError.mockRestore()
  })

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: spanSchemaDefinition,
    initialValue,
    children: <NodePlugin nodes={containers} />,
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })

  return {editor, consoleErrors: consoleError.mock.calls}
}

async function sendRemotePatches(
  editor: Editor,
  keyGenerator: () => string,
  patches: Array<Patch>,
) {
  const markerKey = keyGenerator()
  const markerRemovals: Array<Operation> = []
  editor.on('operation', ({operation, origin}) => {
    if (
      origin === 'remote' &&
      operation.type === 'unset' &&
      isKeyedSegment(operation.path[0]) &&
      operation.path[0]._key === markerKey
    ) {
      markerRemovals.push(structuredClone(operation))
    }
  })

  // A patch that changes nothing has nothing to wait for, so wait for the
  // marker removal that follows it in the same batch.
  editor.send({
    type: 'apply',
    patches: [
      ...patches,
      {
        type: 'insert',
        origin: 'remote',
        path: [0],
        position: 'before',
        items: [marker(markerKey)],
      },
      {type: 'unset', origin: 'remote', path: [{_key: markerKey}]},
    ],
  })

  await vi.waitFor(() => {
    expect(markerRemovals).toEqual([{type: 'unset', path: [{_key: markerKey}]}])
  })
}

function threeBlocks(keyGenerator: () => string) {
  const fooSpan = span(keyGenerator(), 'foo')
  const foo = textBlock(keyGenerator(), [fooSpan])
  const bar = textBlock(keyGenerator(), [span(keyGenerator(), 'bar')])
  const bazKey = keyGenerator()
  const b = span(keyGenerator(), 'b')
  const a = span(keyGenerator(), 'a', ['em'])
  const z = span(keyGenerator(), 'z', ['strong'])

  return {foo, fooSpan, bar, bazKey, b, a, z}
}

function containerFixture(keyGenerator: () => string) {
  const firstKey = keyGenerator()
  const first = textBlock(keyGenerator(), [span(keyGenerator(), 'first')])
  const outerKey = keyGenerator()
  const innerAKey = keyGenerator()
  const innerA = textBlock(keyGenerator(), [span(keyGenerator(), 'inner a')])
  const innerBKey = keyGenerator()
  const innerBSpan = span(keyGenerator(), 'inner b')
  const innerB = textBlock(keyGenerator(), [innerBSpan])
  const leadSpan = span(keyGenerator(), 'lead')
  const lead = textBlock(keyGenerator(), [leadSpan])
  const noteKey = keyGenerator()
  const noteSpan = span(keyGenerator(), 'note')
  const noteBlock = textBlock(keyGenerator(), [noteSpan])

  return {
    firstKey,
    first,
    outerKey,
    innerAKey,
    innerA,
    innerBKey,
    innerB,
    innerBSpan,
    lead,
    leadSpan,
    noteKey,
    noteBlock,
    noteSpan,
  }
}

function callout(key: string, content: Array<Value>) {
  return {_type: 'callout', _key: key, content}
}

function note(key: string, body: Array<Value>) {
  return {_type: 'note', _key: key, body}
}

function textBlock(key: string, children: Array<ReturnType<typeof span>>) {
  return {_type: 'block', _key: key, style: 'normal', markDefs: [], children}
}

function span(key: string, text: string, marks: Array<string> = []) {
  return {_type: 'span', _key: key, text, marks}
}

function pastTheEnd(path: string) {
  return `Cannot apply an "insert" operation at path ${path} because the destination is past the end of the node.`
}

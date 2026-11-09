import {
  patchPathRules,
  type PatchPathRule,
} from '@portabletext/patches/test-utils/patch-path-rules'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import type {Path} from '../src/engine/interfaces/path'
import {getValue} from '../src/internal-utils/get-value'
import {serializePath} from '../src/paths/serialize-path'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import type {Operation} from '../src/types/operation'
import {isRecord} from '../src/utils/asserters'
import {isKeyedSegment} from '../src/utils/util.is-keyed-segment'

const knownDifferences = new Set<PatchPathRule['id']>([
  'index--1-set',
  'index--1-unset',
  'index--1-insert-after',
  'index--1-insert-replace',
  'index--1-inc',
  'index--1-dec',
  'index--2-set',
  'index--2-insert-replace',
  'index--2-inc',
  'index--2-dec',
  'index--4-unset',
  'index--4-insert-before',
  'index--4-insert-after',
  'index--4-insert-replace',
  'index-0-insert-replace',
  'index-0-inc',
  'index-0-dec',
  'index-2-insert-replace',
  'index-2-inc',
  'index-2-dec',
  'index-3-unset',
  'index-3-insert-before',
  'index-3-insert-after',
  'index-3-insert-replace',
  'index-8-unset',
  'index-8-insert-before',
  'index-8-insert-after',
  'index-8-insert-replace',
  'absent-unset',
  'absent-insert-before',
  'absent-insert-after',
  'absent-insert-replace',
  'insert-replace-1',
  'insert-replace-3',
  'present-null-setIfMissing',
  'primitive-null-deep-setIfMissing',
  'path-number-compact-set',
  'path-number-compact-unset',
  'path-number-compact-diffMatchPatch',
  'path-number-explicit-unset',
  'path-object-compact-set',
  'path-object-compact-unset',
  'path-object-compact-diffMatchPatch',
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
  'index--1-unset': nodeNotFound,
  'index-3-unset': nodeNotFound,
  'index-3-insert-after': pastTheEnd,
  'index-8-unset': nodeNotFound,
  'index-8-insert-before': pastTheEnd,
  'index-8-insert-after': pastTheEnd,
  'index-8-insert-replace': pastTheEnd,
  'absent-unset': nodeNotFound,
  'absent-insert-before': siblingNotFound,
  'absent-insert-after': siblingNotFound,
  'absent-insert-replace': siblingNotFound,
}

const editorRows = patchPathRules
  // Sanity rejects these mutations, so they never reach the editor as remote patches.
  .filter((row) => !('rejected' in row.sanity))
  // The editor cannot load an item that is not an object, re-keys a duplicate key and turns an empty array into a placeholder block on load, so the row would not test a path rule.
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

        // The marker rides in the same event after the row's patch, so its
        // removal proves the row's patch was handled without changing the
        // array.
        editor.send({
          type: 'patches',
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
          snapshot: undefined,
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
    isRecord(item) && '_key' in item ? [item['_key']] : [],
  )

  return (
    start.length === 0 ||
    start.some((item) => !isRecord(item)) ||
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

function nodeNotFound(path: string) {
  return `Cannot apply an "unset" (node removal) operation at path ${path} because the node was not found.`
}

function pastTheEnd(path: string) {
  return `Cannot apply an "insert" operation at path ${path} because the destination is past the end of the node.`
}

function siblingNotFound(path: string) {
  return `Cannot apply an "insert" operation at path ${path} because the sibling was not found.`
}

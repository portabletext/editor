import {applyAll} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {cleanup} from 'vitest-browser-react'
import {safeStringify} from '../src/internal-utils/safe-json'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {diffValue} from '../test-utils/diff-by-key'
import {
  buildDoc,
  createRng,
  depths,
  editValue,
} from '../test-utils/seeded-edits'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  inlineObjects: [
    {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
  ],
  styles: [{name: 'normal'}, {name: 'h1'}],
  lists: [{name: 'bullet'}],
  blockObjects: [
    {name: 'image', fields: [{name: 'url', type: 'string'}]},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [{type: 'block'}, {type: 'image'}],
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
    },
  ],
})

const nodes = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

const seedsPerDepth = 100

describe('event.apply: seeded edits', () => {
  for (const [depthIndex, depth] of depths.entries()) {
    test(`Scenario: the value after \`apply\` equals \`applyAll\` for ${seedsPerDepth} edits at ${depth}`, async () => {
      for (let index = 0; index < seedsPerDepth; index++) {
        const seed = depthIndex * seedsPerDepth + index + 1
        const rng = createRng(seed)
        const newKey = createTestKeyGenerator()
        const before = buildDoc(rng, newKey)
        const {wanted, applied} = editValue(
          rng,
          newKey,
          before,
          1 + rng.int(3),
          depth,
        )

        if (safeStringify(wanted) === safeStringify(before)) {
          continue
        }

        const patches = diffValue(before, wanted)

        expect(applyAll(before, patches)).toEqual(wanted)

        const {editor} = await createTestEditor({
          keyGenerator: createTestKeyGenerator('ed-'),
          schemaDefinition,
          initialValue: structuredClone(before),
          children: <NodePlugin nodes={nodes} />,
        })

        editor.send({type: 'apply', patches})

        try {
          await vi.waitFor(() => {
            expect(editor.getSnapshot().context.value).toEqual(wanted)
          })
        } catch (error) {
          throw new Error(
            `seed ${seed} at ${depth} (edits: ${applied.join(', ')}) diverged from \`applyAll\`: ${error instanceof Error ? error.message : error}`,
          )
        } finally {
          await cleanup()
        }
      }
    }, 60_000)
  }
})

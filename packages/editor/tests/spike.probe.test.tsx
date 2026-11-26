import {historyStepsProbe} from '../src/internal-utils/history-steps-control'
import {applyAll, diffMatchPatch, set, type Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
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
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              name: 'row',
              type: 'object',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      name: 'cell',
                      type: 'object',
                      fields: [
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
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
const containers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

function buildDoc(depth: string) {
  const key = createTestKeyGenerator('v')
  const blocks = ['one', 'two', 'six'].map((text) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: key(), text, marks: []}],
  }))
  let value: any[] = blocks
  let prefix: any[] = []
  const wrap = (type: string, field: string) => {
    const k = key()
    value = [{_type: type, _key: k, [field]: value}]
    prefix = [{_key: k}, field, ...prefix]
  }
  if (depth === 'callout' || depth === 'nested callout')
    wrap('callout', 'content')
  if (depth === 'nested callout') wrap('callout', 'content')
  if (depth === 'table cell') {
    wrap('cell', 'content')
    wrap('row', 'cells')
    wrap('table', 'rows')
  }
  return {value, prefix, blocks}
}

function textsAt(value: any, prefix: any[]): string {
  let nodes: any = value
  for (const seg of prefix) {
    if (nodes == null) return 'MISSING'
    if (typeof seg === 'string') nodes = nodes[seg]
    else nodes = nodes.find((n: any) => n?._key === seg._key)
  }
  if (!Array.isArray(nodes)) return 'MISSING'
  return nodes
    .map((b: any) => (b.children ?? []).map((c: any) => c.text).join(''))
    .join('|')
}

const depths = ['root', 'callout', 'nested callout', 'table cell']
const positions = ['first', 'middle', 'last']
const shapes = ['block', 'span', 'children', 'dmp']
// local block text is 3 characters; remote texts are shorter, equal, one longer, longer
const remoteTexts = ['ba', 'bar', 'bark', 'barbaz']
// undo: local insert of 'x' at the offset, then remote, then undo
// redo: local Backspace at the offset, undo, then remote, then redo
const scenarios = ['undo', 'redo']
const offsets = [1, 3]

for (const depth of depths) {
  for (const position of positions) {
    test(`ROWS ${depth} ${position}`, async () => {
      for (const scenario of scenarios)
        for (const shape of shapes)
          for (const remoteText of remoteTexts)
            for (const offset of offsets) {
              const errors: string[] = []
              const countersBefore = {...historyStepsProbe}
              const spy = vi
                .spyOn(console, 'error')
                .mockImplementation((...args) => {
                  errors.push(String(args[0]).slice(0, 160))
                })
              const {value, prefix, blocks} = buildDoc(depth)
              const target = blocks[positions.indexOf(position)]!
              const span = target.children[0]!
              const blockPath = [...prefix, {_key: target._key}]
              const spanPath = [...blockPath, 'children', {_key: span._key}]
              const {editor, locator} = await createTestEditor({
                keyGenerator: createTestKeyGenerator('ed'),
                schemaDefinition,
                initialValue: structuredClone(value),
                children: <NodePlugin nodes={containers} />,
              })
              await userEvent.click(locator)
              let server: any = structuredClone(value)
              let phase = 'local'
              const emitted: Record<string, any[]> = {local: [], undoRedo: []}
              editor.on('change', (event: any) => {
                if (event.origin !== 'local') return
                for (const patch of event.patches) {
                ;(emitted[phase] ??= []).push(patch)
                try {
                  server = applyAll(server, [patch as Patch])
                } catch (e) {
                  errors.push('server apply: ' + String(e))
                }
                }
              })
              const row: any = {
                before: textsAt(value, prefix),
                depth,
                position,
                scenario,
                shape,
                remoteText,
                offset,
              }
              const pt = (o: number) => ({path: spanPath, offset: o})
              editor.send({
                type: 'select',
                at: {anchor: pt(offset), focus: pt(offset)},
              })
              if (scenario === 'undo') {
                editor.send({type: 'insert.text', text: 'x'})
              } else {
                editor.send({type: 'delete.backward', unit: 'character'})
                await vi.waitFor(() =>
                  expect(
                    textsAt(editor.getSnapshot().context.value, prefix).split(
                      '|',
                    )[positions.indexOf(position)],
                  ).toEqual(
                    span.text.slice(0, offset - 1) + span.text.slice(offset),
                  ),
                )
                row.afterBackspace = textsAt(
                  editor.getSnapshot().context.value,
                  prefix,
                )
                row.afterEdit = row.afterBackspace
                editor.send({type: 'history.undo'})
              }
              await vi.waitFor(() =>
                expect(
                  textsAt(editor.getSnapshot().context.value, prefix).split(
                    '|',
                  )[positions.indexOf(position)],
                ).toEqual(
                  scenario === 'undo'
                    ? span.text.slice(0, offset) + 'x' + span.text.slice(offset)
                    : span.text,
                ),
              )
              await vi.waitFor(() =>
                expect(server).toEqual(editor.getSnapshot().context.value),
              )
              row.local = textsAt(editor.getSnapshot().context.value, prefix)
              if (scenario === 'undo') row.afterEdit = row.local
              const newSpan = {...span, text: remoteText}
              const patch: Patch =
                shape === 'block'
                  ? set({...target, children: [newSpan]}, blockPath)
                  : shape === 'span'
                    ? set(newSpan, spanPath)
                    : shape === 'children'
                      ? set([newSpan], [...blockPath, 'children'])
                      : diffMatchPatch(
                          row.local.split('|')[positions.indexOf(position)],
                          remoteText,
                          [...spanPath, 'text'],
                        )
              server = applyAll(server, [patch])
              editor.send({
                type: 'apply',
                patches: [{...patch, origin: 'remote'}],
              })
              await vi.waitFor(() =>
                expect(
                  textsAt(editor.getSnapshot().context.value, prefix).split(
                    '|',
                  )[positions.indexOf(position)],
                ).toBe(remoteText),
              )
              row.mapping = structuredClone(historyStepsProbe.last)
              row.afterRemote = textsAt(
                editor.getSnapshot().context.value,
                prefix,
              )
              phase = 'undoRedo'
              try {
                editor.send({
                  type: scenario === 'undo' ? 'history.undo' : 'history.redo',
                })
              } catch (e) {
                row.throw = String(e).slice(0, 120)
              }
              row.after = textsAt(editor.getSnapshot().context.value, prefix)
              row.serverAfter = textsAt(server, prefix)
              row.targetAfter =
                row.after.split('|')[positions.indexOf(position)]
              row.serverTargetAfter =
                row.serverAfter.split('|')[positions.indexOf(position)]
              row.remoteKept = row.serverTargetAfter === remoteText
              row.emitted = emitted['undoRedo']
              row.diverged =
                JSON.stringify(server) !==
                JSON.stringify(editor.getSnapshot().context.value)
              row.errors = errors
              row.fallback = historyStepsProbe.fallback - countersBefore.fallback
              row.undefined = historyStepsProbe.undefined - countersBefore.undefined
              row.interpretCalls = historyStepsProbe.calls - countersBefore.calls
              row[scenario === 'undo' ? 'afterUndo' : 'afterRedo'] = row.after
              editor.send({type: scenario === 'undo' ? 'history.redo' : 'history.undo'})
              row[scenario === 'undo' ? 'afterRedo' : 'afterUndo'] = textsAt(editor.getSnapshot().context.value, prefix)
              spy.mockRestore()
              console.log('ROW ' + JSON.stringify(row))
            }
    }, 600_000)
  }
}

historyStepsProbe.trace = true

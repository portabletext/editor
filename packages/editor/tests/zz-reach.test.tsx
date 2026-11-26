import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}, {type: 'callout'}]}],
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
                      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
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

type Depth = 'root' | 'callout' | 'nested-callout' | 'table-cell'
const depths: Depth[] = ['root', 'callout', 'nested-callout', 'table-cell']

function setup(depth: Depth) {
  const k = createTestKeyGenerator()
  const block = (texts: string[]) => ({
    _key: k(),
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: texts.map((text, i) => ({_key: k(), _type: 'span', text, marks: i % 2 ? ['strong'] : []})),
  })
  const blocks = [block(['foo']), block(['bar']), block(['baz', 'qux'])]
  const a = k(), b = k(), c = k()
  let prefix: any[] = []
  let initialValue: any[] = blocks
  if (depth === 'callout') {
    prefix = [{_key: a}, 'content']
    initialValue = [{_key: a, _type: 'callout', content: blocks}]
  } else if (depth === 'nested-callout') {
    prefix = [{_key: a}, 'content', {_key: b}, 'content']
    initialValue = [{_key: a, _type: 'callout', content: [{_key: b, _type: 'callout', content: blocks}]}]
  } else if (depth === 'table-cell') {
    prefix = [{_key: a}, 'rows', {_key: b}, 'cells', {_key: c}, 'content']
    initialValue = [{_key: a, _type: 'table', rows: [{_key: b, _type: 'row', cells: [{_key: c, _type: 'cell', content: blocks}]}]}]
  }
  const missing = k()
  const last = blocks[2]!
  const spanPath = (blk: any, span: any) => [...prefix, {_key: blk._key}, 'children', {_key: span._key}]
  const valid = (off: number) => ({path: spanPath(last, last.children[0]), offset: off})
  const missingSpan = (off: number) => ({path: [...prefix, {_key: last._key}, 'children', {_key: missing}], offset: off})
  const missingBlock = (off: number) => ({path: [...prefix, {_key: missing}, 'children', {_key: missing}], offset: off})
  return {k, blocks, prefix, initialValue, valid, missingSpan, missingBlock, last, spanPath}
}

const out = (row: Record<string, unknown>) => console.log('REACHROW ' + JSON.stringify(row))
const texts = (v: any): string => JSON.stringify(v).match(/"text":"[a-z]*"/g)!.map((t) => t.slice(8, -1)).join('|')
const strong = (v: any): string[] => {
  const r: string[] = []
  const walk = (n: any) => {
    if (Array.isArray(n)) return n.forEach(walk)
    if (n && typeof n === 'object') {
      if (n._type === 'span' && n.marks?.includes('strong')) r.push(n.text)
      Object.values(n).forEach(walk)
    }
  }
  walk(v)
  return r
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function make(depth: Depth, editableProps?: any) {
  const s = setup(depth)
  const r = await createTestEditor({keyGenerator: s.k, schemaDefinition, initialValue: s.initialValue, children: <NodePlugin nodes={nodes} />, editableProps})
  return {s, ...r}
}
const pt = (s: any, blk: any, span: any, offset: number) => ({path: s.spanPath(blk, span), offset})
async function selectAndWait(editor: any, at: any) {
  editor.send({type: 'select', at})
  await vi.waitFor(() => expect(editor.getSnapshot().context.selection).not.toBeNull())
}
async function backspace(editor: any) {
  editor.send({type: 'focus'})
  await wait(50)
  await userEvent.keyboard('{Backspace}')
  await wait(100)
}
const sel = (editor: any, s: any) => {
  const x = editor.getSnapshot().context.selection
  if (!x) return null
  const lab = (p: any) => {
    const key = p.path.filter((k: any) => typeof k === 'object').at(-1)?._key
    for (const [bi, b] of s.blocks.entries()) for (const sp of b.children) if (sp._key === key) return `b${bi}/${sp.text}@${p.offset}`
    return `${key}@${p.offset}`
  }
  return `${lab(x.anchor)}..${lab(x.focus)}`
}

for (const depth of depths) {
  // a1: collaborator removes the span under an expanded selection, user presses Backspace
  test(`a1 remote unset under expanded selection then Backspace ${depth}`, async () => {
    const {s, editor} = await make(depth)
    const [baz, qux] = s.last.children
    await selectAndWait(editor, {anchor: pt(s, s.last, baz, 1), focus: pt(s, s.last, qux, 2)})
    editor.send({type: 'patches', patches: [{type: 'unset', path: s.spanPath(s.last, qux), origin: 'remote'}], snapshot: undefined} as any)
    await wait(100)
    const selAfterPatch = sel(editor, s)
    await backspace(editor)
    out({route: 'a1 remote unset expanded + Backspace', depth, selAfterPatch, after: texts(editor.getSnapshot().context.value)})
  })
  // a2: collaborator re-keys the span (unset + insert same text, new key) under the selection
  test(`a2 remote re-key under expanded selection then Backspace ${depth}`, async () => {
    const {s, editor} = await make(depth)
    const [baz, qux] = s.last.children
    await selectAndWait(editor, {anchor: pt(s, s.last, baz, 1), focus: pt(s, s.last, qux, 2)})
    editor.send({type: 'patches', patches: [
      {type: 'unset', path: s.spanPath(s.last, qux), origin: 'remote'},
      {type: 'insert', path: s.spanPath(s.last, baz), position: 'after', items: [{_key: 'rekeyed', _type: 'span', text: 'qux', marks: ['strong']}], origin: 'remote'},
    ], snapshot: undefined} as any)
    await wait(100)
    const selAfterPatch = sel(editor, s)
    await backspace(editor)
    out({route: 'a2 remote re-key expanded + Backspace', depth, selAfterPatch, after: texts(editor.getSnapshot().context.value)})
  })
  // a3: collaborator removes the span under an expanded selection, user bolds via toolbar
  test(`a3 remote unset under expanded selection then bold ${depth}`, async () => {
    const {s, editor} = await make(depth)
    const [baz, qux] = s.last.children
    await selectAndWait(editor, {anchor: pt(s, s.last, baz, 1), focus: pt(s, s.last, qux, 2)})
    editor.send({type: 'patches', patches: [{type: 'unset', path: s.spanPath(s.last, qux), origin: 'remote'}], snapshot: undefined} as any)
    await wait(100)
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await wait(100)
    out({route: 'a3 remote unset expanded + bold', depth, after: texts(editor.getSnapshot().context.value), strong: strong(editor.getSnapshot().context.value)})
  })
  // b1: undo after bolding splits a span, then Backspace
  test(`b1 bold splits span, undo, Backspace ${depth}`, async () => {
    const {s, editor} = await make(depth)
    const [baz] = s.last.children
    await selectAndWait(editor, {anchor: pt(s, s.last, baz, 1), focus: pt(s, s.last, baz, 2)})
    editor.send({type: 'decorator.add', decorator: 'strong'})
    await wait(100)
    editor.send({type: 'history.undo'})
    await wait(100)
    const selAfterUndo = sel(editor, s)
    await backspace(editor)
    out({route: 'b1 split, undo + Backspace', depth, selAfterUndo, after: texts(editor.getSnapshot().context.value)})
  })
  // b2: un-bold merges qux into baz, undo, redo, Backspace
  test(`b2 unbold merges spans, undo, redo, Backspace ${depth}`, async () => {
    const {s, editor} = await make(depth)
    const [, qux] = s.last.children
    await selectAndWait(editor, {anchor: pt(s, s.last, qux, 0), focus: pt(s, s.last, qux, 3)})
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await wait(100)
    editor.send({type: 'history.undo'})
    await wait(100)
    editor.send({type: 'history.redo'})
    await wait(100)
    const selAfterRedo = sel(editor, s)
    await backspace(editor)
    out({route: 'b2 merge, undo, redo + Backspace', depth, selAfterRedo, after: texts(editor.getSnapshot().context.value)})
  })
  // c1/e: host saves the selection, a local un-bold merges the span away on normalize, host restores via select, user presses Backspace
  test(`c1 saved selection restored after local merge then Backspace ${depth}`, async () => {
    const {s, editor} = await make(depth)
    const [baz, qux] = s.last.children
    await selectAndWait(editor, {anchor: pt(s, s.last, baz, 1), focus: pt(s, s.last, qux, 2)})
    const saved = editor.getSnapshot().context.selection
    await selectAndWait(editor, {anchor: pt(s, s.last, qux, 0), focus: pt(s, s.last, qux, 3)})
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await wait(100)
    const quxGone = !JSON.stringify(editor.getSnapshot().context.value).includes(`"_key":"${qux._key}"`)
    editor.send({type: 'select', at: saved})
    await wait(100)
    const selRestored = sel(editor, s)
    await backspace(editor)
    out({route: 'c1 saved selection via select after local merge + Backspace', depth, quxGone, selRestored, after: texts(editor.getSnapshot().context.value)})
  })
  // c2: same, host applies the saved range directly with delete (e.g. a "remove selected text" action)
  test(`c2 saved range delete after local merge ${depth}`, async () => {
    const {s, editor} = await make(depth)
    const [baz, qux] = s.last.children
    const saved = {anchor: pt(s, s.last, baz, 1), focus: pt(s, s.last, qux, 2)}
    await selectAndWait(editor, {anchor: pt(s, s.last, qux, 0), focus: pt(s, s.last, qux, 3)})
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await wait(100)
    editor.send({type: 'delete', at: saved})
    await wait(100)
    out({route: 'c2 saved range delete after local merge', depth, after: texts(editor.getSnapshot().context.value)})
  })
  // c3: same, host applies bold to the saved range (e.g. a toolbar acting on a remembered range)
  test(`c3 saved range bold after local merge ${depth}`, async () => {
    const {s, editor} = await make(depth)
    const [baz, qux] = s.last.children
    const saved = {anchor: pt(s, s.last, baz, 1), focus: pt(s, s.last, qux, 2)}
    await selectAndWait(editor, {anchor: pt(s, s.last, qux, 0), focus: pt(s, s.last, qux, 3)})
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await wait(100)
    editor.send({type: 'decorator.add', decorator: 'strong', at: saved} as any)
    await wait(100)
    out({route: 'c3 saved range bold after local merge', depth, strong: strong(editor.getSnapshot().context.value)})
  })
  // c4: host passes a saved selection as the selection prop after a collaborator removed the span, user presses Backspace
  test(`c4 selection prop after remote unset then Backspace ${depth}`, async () => {
    const s0 = setup(depth)
    const [baz, qux] = s0.last.children
    const saved = {anchor: pt(s0, s0.last, baz, 1), focus: pt(s0, s0.last, qux, 2), backward: false}
    const r = await createTestEditor({keyGenerator: s0.k, schemaDefinition, initialValue: s0.initialValue, children: <NodePlugin nodes={nodes} />})
    r.editor.send({type: 'patches', patches: [{type: 'unset', path: s0.spanPath(s0.last, qux), origin: 'remote'}], snapshot: undefined} as any)
    await wait(100)
    await r.rerender({keyGenerator: s0.k, schemaDefinition, initialValue: s0.initialValue, children: <NodePlugin nodes={nodes} />, editableProps: {selection: saved}} as any)
    await wait(200)
    const selFromProp = sel(r.editor, s0)
    await backspace(r.editor)
    out({route: 'c4 selection prop after remote unset + Backspace', depth, selFromProp, after: texts(r.editor.getSnapshot().context.value)})
  })
}

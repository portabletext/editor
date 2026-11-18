import type {Path, Patch} from '@portabletext/patches'
import {
  compileSchema,
  isSpan,
  isTextBlock,
  type Schema,
  type SchemaDefinition,
} from '@portabletext/schema'
import {
  createTestKeyGenerator,
  fromTextspec,
  toTextspec,
  type TextspecContainers,
  type TextspecSelection,
} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {server} from 'vitest/browser'
import {defineSchema, type Editor, type PortableTextBlock} from '../src'
import {pointRef} from '../src/engine/editor/point-ref'
import type {PointRef} from '../src/engine/interfaces/point-ref'
import {safeParse} from '../src/internal-utils/safe-json'
import {EventListenerPlugin} from '../src/plugins'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import type {EditorSelectionPoint as Point} from '../src/types/editor'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

type Depth = 'root' | 'container' | 'nested'

type Gesture = {
  scenario: string
  title: string
  seed: string | SeedBlocks
  schema?: SchemaDefinition
  actions: Array<string>
  /**
   * Runs before the patch buffer is reset, so the captured batch holds
   * only the gesture under test (undo scenarios do the edit here).
   */
  prepare?: (context: GestureContext) => Promise<void>
  run: (context: GestureContext) => Promise<void> | void
  depths?: Array<Depth>
}

/**
 * Seeds textspec can't express (duplicate keys across blocks, a span
 * boundary that isn't a mark boundary) are built by hand. `selection`
 * is relative to the root-level blocks and is re-rooted per depth.
 */
type SeedBlocks = {
  blocks: () => Array<PortableTextBlock>
  selection: {
    anchor: {path: Array<{_key: string} | string>; offset: number}
    focus: {path: Array<{_key: string} | string>; offset: number}
  }
}

type GestureContext = {
  editor: Editor
  selection: NonNullable<TextspecSelection>
  schema: Schema
  keyGenerator: () => string
  containers: TextspecContainers
  waitForValueChange: (before: unknown) => Promise<void>
}

const fixturesDir = '../steps/fixtures/wire-catalogue'

const gestures: Array<Gesture> = [
  {
    scenario: 'type-text',
    title: 'typing text mid-span',
    seed: 'B: foo bar baz|',
    actions: ["send {type: 'insert.text', text: ' foo'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'insert.text', text: ' foo'})
    },
  },
  {
    scenario: 'delete-within-span',
    title: 'deleting a range within a span',
    seed: 'B: foo ^bar| baz',
    actions: ["send {type: 'delete', at: selection}"],
    run: ({editor, selection}) => {
      editor.send({type: 'delete', at: selection})
    },
  },
  {
    scenario: 'block-split',
    title: 'splitting a block',
    seed: 'B: foo |bar baz',
    actions: ["send {type: 'insert.break'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'insert.break'})
    },
  },
  {
    scenario: 'block-split-multi-span',
    title: 'splitting a multi-span block',
    seed: 'B: fo|o [strong:bar] baz',
    schema: defineSchema({decorators: [{name: 'strong'}]}),
    actions: ["send {type: 'insert.break'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'insert.break'})
    },
  },
  {
    scenario: 'block-merge-backspace',
    title: 'merging two blocks with backspace',
    seed: 'B: foo\nB: |bar',
    actions: ["send {type: 'delete.backward', unit: 'character'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'delete.backward', unit: 'character'})
    },
  },
  {
    scenario: 'block-merge-forward',
    title: 'merging two blocks with forward delete',
    seed: 'B: foo|\nB: bar',
    actions: ["send {type: 'delete.forward', unit: 'character'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'delete.forward', unit: 'character'})
    },
  },
  {
    scenario: 'decorator-add-mid-span',
    title: 'adding a decorator mid-span',
    seed: 'B: foo ^bar| baz',
    schema: defineSchema({decorators: [{name: 'strong'}]}),
    actions: ["send {type: 'decorator.add', decorator: 'strong'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'decorator.add', decorator: 'strong'})
    },
  },
  {
    scenario: 'annotation-add-mid-span',
    title: 'adding an annotation mid-span',
    seed: 'B: foo ^bar| baz',
    schema: defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    }),
    actions: ["send {type: 'annotation.add', annotation: link}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({
        type: 'annotation.add',
        annotation: {name: 'link', value: {href: 'https://example.com'}},
      })
    },
  },
  {
    scenario: 'decorator-remove-whole-span',
    title: 'removing a decorator from a whole span',
    seed: 'B: foo [strong:^bar|] baz',
    schema: defineSchema({decorators: [{name: 'strong'}]}),
    actions: ["send {type: 'decorator.remove', decorator: 'strong'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'decorator.remove', decorator: 'strong'})
    },
  },
  {
    scenario: 'decorator-remove-sub-range',
    title: 'removing a decorator from a sub-range',
    seed: 'B: [strong:foo ^bar| baz]',
    schema: defineSchema({decorators: [{name: 'strong'}]}),
    actions: ["send {type: 'decorator.remove', decorator: 'strong'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'decorator.remove', decorator: 'strong'})
    },
  },
  {
    scenario: 'annotation-remove',
    title: 'removing an annotation from a whole span',
    seed: 'B: foo [@link href="https://example.com":^bar|] baz',
    schema: defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    }),
    actions: ["send {type: 'annotation.remove', annotation: {name: 'link'}}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'annotation.remove', annotation: {name: 'link'}})
    },
  },
  {
    scenario: 'block-move',
    title: 'moving a block down',
    seed: 'B: |foo\nB: bar',
    actions: ["send {type: 'move.block down', at: block 1}"],
    run: ({editor, selection}) => {
      editor.send({
        type: 'move.block down',
        at: selection.anchor.path.slice(0, -2),
      })
    },
  },
  {
    scenario: 'insert-blocks-auto',
    title: 'inserting two blocks at the end of a block',
    seed: 'B: foo|',
    actions: [
      "send {type: 'insert.blocks', placement: 'auto', blocks: [bar, baz]}",
    ],
    run: ({editor, selection, schema, keyGenerator}) => {
      editor.send({type: 'select', at: selection})
      editor.send({
        type: 'insert.blocks',
        placement: 'auto',
        blocks: fromTextspec({schema, keyGenerator}, 'B: bar\nB: baz').blocks,
      })
    },
  },
  {
    scenario: 'paste-text-single-block',
    title: 'pasting single-line plain text mid-span',
    seed: 'B: foo |bar',
    actions: ["send {type: 'clipboard.paste', text/plain: 'baz '}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/plain', 'baz ')
      editor.send({
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {selection},
      })
    },
  },
  {
    scenario: 'paste-text-multi-block',
    title: 'pasting two paragraphs of plain text mid-span',
    seed: 'B: foo |bar',
    actions: ["send {type: 'clipboard.paste', text/plain: 'baz\\n\\nfizz'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/plain', 'baz\n\nfizz')
      editor.send({
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {selection},
      })
    },
  },
  {
    scenario: 'range-type-across-blocks',
    title: 'typing over a selection across two blocks',
    seed: 'B: fo^o\nB: ba|r',
    actions: ["send {type: 'insert.text', text: 'x'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'insert.text', text: 'x'})
    },
  },
  {
    scenario: 'range-delete-across-blocks',
    title: 'deleting a selection across two blocks',
    seed: 'B: fo^o\nB: ba|r',
    actions: ["send {type: 'delete.backward', unit: 'character'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'delete.backward', unit: 'character'})
    },
  },
  {
    scenario: 'range-delete-across-three-blocks',
    title: 'deleting a selection across three blocks',
    seed: 'B: fo^o\nB: bar\nB: ba|z',
    actions: ["send {type: 'delete.backward', unit: 'character'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'delete.backward', unit: 'character'})
    },
  },
  {
    scenario: 'list-indent',
    title: 'indenting a list item with Tab',
    seed: 'B listItem="bullet": foo\nB listItem="bullet": ba|r',
    schema: defineSchema({lists: [{name: 'bullet'}]}),
    actions: ["send {type: 'keyboard.keydown', key: 'Tab'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'keyboard.keydown', originEvent: tabKey(false)})
    },
  },
  {
    scenario: 'list-outdent',
    title: 'outdenting a list item with Shift+Tab',
    seed: 'B listItem="bullet": foo\nB level=2 listItem="bullet": ba|r',
    schema: defineSchema({lists: [{name: 'bullet'}]}),
    actions: ["send {type: 'keyboard.keydown', key: 'Tab', shiftKey: true}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'keyboard.keydown', originEvent: tabKey(true)})
    },
  },
  {
    scenario: 'style-toggle',
    title: 'toggling a block style',
    seed: 'B: foo\nB: ba|r',
    schema: defineSchema({styles: [{name: 'normal'}, {name: 'h1'}]}),
    actions: ["send {type: 'style.toggle', style: 'h1'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'style.toggle', style: 'h1'})
    },
  },
  {
    scenario: 'insert-inline-object',
    title: 'inserting an inline object mid-span',
    seed: 'B: foo |bar',
    schema: defineSchema({
      inlineObjects: [
        {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
      ],
    }),
    actions: [
      "send {type: 'insert.inline object', inlineObject: {name: 'stock-ticker'}}",
    ],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({
        type: 'insert.inline object',
        inlineObject: {name: 'stock-ticker', value: {symbol: 'FOO'}},
      })
    },
  },
  {
    scenario: 'undo-split',
    title: 'undoing a block split',
    seed: 'B: foo |bar baz',
    actions: [
      "prepare: send {type: 'insert.break'}",
      "send {type: 'history.undo'}",
    ],
    prepare: async ({editor, selection, waitForValueChange}) => {
      editor.send({type: 'select', at: selection})
      const before = editor.getSnapshot().context.value
      editor.send({type: 'insert.break'})
      await waitForValueChange(before)
    },
    run: ({editor}) => {
      editor.send({type: 'history.undo'})
    },
  },
  {
    scenario: 'undo-merge',
    title: 'undoing a block merge',
    seed: 'B: foo\nB: |bar',
    actions: [
      "prepare: send {type: 'delete.backward', unit: 'character'}",
      "send {type: 'history.undo'}",
    ],
    prepare: async ({editor, selection, waitForValueChange}) => {
      editor.send({type: 'select', at: selection})
      const before = editor.getSnapshot().context.value
      editor.send({type: 'delete.backward', unit: 'character'})
      await waitForValueChange(before)
    },
    run: ({editor}) => {
      editor.send({type: 'history.undo'})
    },
  },
  {
    scenario: 'span-merge-cosmetic',
    title: 'typing across a cosmetic span boundary',
    seed: {
      blocks: () => [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 's0', text: 'foo ', marks: []},
            {_type: 'span', _key: 's1', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      selection: caretAt([{_key: 'b0'}, 'children', {_key: 's1'}], 3),
    },
    actions: ["send {type: 'insert.text', text: '!'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'insert.text', text: '!'})
    },
  },
  {
    scenario: 'block-merge-duplicate-keys',
    title: 'merging two blocks whose children share keys',
    seed: {
      blocks: () => duplicateKeyedBlocks(false),
      selection: caretAt([{_key: 'kB'}, 'children', {_key: 's1'}], 0),
    },
    schema: defineSchema({decorators: [{name: 'strong'}]}),
    actions: ["send {type: 'delete.backward', unit: 'character'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'delete.backward', unit: 'character'})
    },
  },
  {
    scenario: 'block-merge-duplicate-keys-forward',
    title: 'merging blocks with duplicate keys with forward delete',
    seed: {
      blocks: () => duplicateKeyedBlocks(false),
      selection: caretAt([{_key: 'kA'}, 'children', {_key: 's3'}], 4),
    },
    schema: defineSchema({decorators: [{name: 'strong'}]}),
    actions: ["send {type: 'delete.forward', unit: 'character'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'delete.forward', unit: 'character'})
    },
  },
  {
    scenario: 'block-merge-duplicate-keys-markdefs',
    title: 'merging blocks with duplicate keys and colliding markDefs',
    seed: {
      blocks: () => duplicateKeyedBlocks(true),
      selection: caretAt([{_key: 'kB'}, 'children', {_key: 's1'}], 0),
    },
    schema: defineSchema({
      decorators: [{name: 'strong'}],
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    }),
    actions: ["send {type: 'delete.backward', unit: 'character'}"],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'delete.backward', unit: 'character'})
    },
  },
  {
    scenario: 'range-delete-duplicate-keys',
    title: 'a range delete spanning two blocks with duplicate keys',
    seed: {
      blocks: () =>
        ['kA', 'kB'].map((blockKey) => ({
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: 'e0-k1', text: 'foo ', marks: []},
            {_type: 'span', _key: 'e0-k2', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        })),
      selection: {
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 'e0-k2'}], offset: 0},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 'e0-k1'}], offset: 3},
      },
    },
    schema: defineSchema({decorators: [{name: 'strong'}]}),
    actions: [
      "send {type: 'delete', direction: 'backward', unit: 'character'}",
    ],
    run: ({editor, selection}) => {
      editor.send({type: 'select', at: selection})
      editor.send({type: 'delete', direction: 'backward', unit: 'character'})
    },
  },
]

const depths: Array<Depth> = ['root', 'container', 'nested']

describe('wire catalogue (depth and gestures)', () => {
  for (const gesture of gestures) {
    for (const depth of gesture.depths ?? depths) {
      test(`Scenario: ${gesture.title} (${depth})`, async () => {
        await captureGesture(gesture, depth)
      })
    }
  }
})

async function captureGesture(gesture: Gesture, depth: Depth) {
  const keyGenerator = createTestKeyGenerator()
  const schemaDefinition = withContainers(gesture.schema ?? defineSchema({}))
  const schema = compileSchema(schemaDefinition)
  const containers = textspecContainers(schema)
  const {blocks, selection} =
    typeof gesture.seed === 'string'
      ? parseSeed(gesture.seed, depth, {schema, keyGenerator, containers})
      : wrapSeedBlocks(gesture.seed, depth)

  const patches: Array<Patch> = []
  // A host that commits per `mutation` event marks these groups with its
  // envelope, not gestures.
  const mutations: Array<Array<Patch>> = []
  const engineRef = React.createRef<PortableTextEditorEngine>()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: blocks,
    children: (
      <>
        <NodePlugin nodes={containerNodes} />
        <InternalEditorEngineRefPlugin ref={engineRef} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
            if (event.type === 'mutation') {
              mutations.push(event.patches)
            }
          }}
        />
      </>
    ),
  })

  const waitForValueChange = async (before: unknown) => {
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).not.toBe(before)
    })
  }

  const context: GestureContext = {
    editor,
    selection,
    schema,
    keyGenerator,
    containers,
    waitForValueChange,
  }

  if (gesture.prepare) {
    await gesture.prepare(context)
    await waitForMutationFlush(patches, mutations)
  }

  patches.length = 0
  mutations.length = 0
  const seedValue = structuredClone(editor.getSnapshot().context.value)
  const seedSpec = toTextspec({
    schema,
    value: seedValue,
    selection: null,
    containers,
  })

  const engine = engineRef.current
  if (!engine) {
    throw new Error('Editor engine ref is not set')
  }
  const refs = caretPoints(schema, seedValue).map((point) => ({
    point,
    ref: pointRef(engine, point, {affinity: 'forward'}),
  }))

  gesture.run(context)

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).not.toEqual(seedValue)
    expect(patches.length).toBeGreaterThan(0)
  })

  await waitForMutationFlush(patches, mutations)

  const editorPoints = refs.map(({point, ref}) => ({
    point,
    editor: unrefPoint(ref),
  }))

  const value = editor.getSnapshot().context.value
  const capture = {
    scenario: gesture.scenario,
    depth,
    schema: schemaDefinition,
    seed: seedSpec,
    seedValue,
    actions: gesture.actions,
    patches,
    mutationSizes: mutations.map((mutation) => mutation.length),
    result: toTextspec({
      schema,
      value,
      selection: editor.getSnapshot().context.selection,
      containers,
    }),
    resultValue: value,
    editorPoints,
  }

  const fixture = safeParse(
    await server.commands.readFile(
      `${fixturesDir}/${gesture.scenario}@${depth}.json`,
    ),
  )
  expect(capture).toEqual(fixture)
}

async function waitForMutationFlush(
  patches: Array<Patch>,
  mutations: Array<Array<Patch>>,
) {
  await vi.waitFor(
    () => {
      expect(mutations.flat()).toEqual(patches)
    },
    {timeout: 5_000},
  )
}

function unrefPoint(ref: PointRef) {
  return ref.unref()
}

/**
 * Every caret position in the seed: each offset `0..text.length` of every
 * span, in document order, at any depth.
 */
function caretPoints(
  schema: Schema,
  value: Array<PortableTextBlock>,
): Array<Point> {
  const points: Array<Point> = []

  const visit = (node: unknown, path: Path) => {
    if (isTextBlock({schema}, node)) {
      for (const child of node.children) {
        if (isSpan({schema}, child)) {
          for (let offset = 0; offset <= child.text.length; offset++) {
            points.push({
              path: [...path, 'children', {_key: child._key}],
              offset,
            })
          }
        }
      }
      return
    }
    if (typeof node !== 'object' || node === null) {
      return
    }
    for (const [field, fieldValue] of Object.entries(node)) {
      if (!Array.isArray(fieldValue) || field === 'markDefs') {
        continue
      }
      for (const item of fieldValue) {
        if (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as {_key?: unknown})._key === 'string'
        ) {
          visit(item, [...path, field, {_key: (item as {_key: string})._key}])
        }
      }
    }
  }

  for (const block of value) {
    visit(block, [{_key: block._key}])
  }

  return points
}

function parseSeed(
  spec: string,
  depth: Depth,
  context: {
    schema: Schema
    keyGenerator: () => string
    containers: TextspecContainers
  },
) {
  const seed = wrapSeed(spec, depth)
  const parsed = fromTextspec(context, seed)
  const selection = parsed.selection

  if (!selection) {
    throw new Error(`Could not resolve selection from textspec: ${seed}`)
  }

  return {
    blocks: parsed.blocks.map((block) =>
      canonicalize(context.schema, block, context.containers),
    ),
    selection,
  }
}

function wrapSeedBlocks(seed: SeedBlocks, depth: Depth) {
  const prefix: Array<{_key: string} | string> =
    depth === 'root'
      ? []
      : depth === 'container'
        ? [{_key: 'c0'}, 'content']
        : [{_key: 'a0'}, 'content', {_key: 'c0'}, 'content']
  const blocks = seed.blocks()
  const wrapped: Array<PortableTextBlock> =
    depth === 'root'
      ? blocks
      : depth === 'container'
        ? [{_type: 'callout', _key: 'c0', content: blocks}]
        : [
            {
              _type: 'aside',
              _key: 'a0',
              content: [{_type: 'callout', _key: 'c0', content: blocks}],
            },
          ]
  return {
    blocks: wrapped,
    selection: {
      anchor: {
        path: [...prefix, ...seed.selection.anchor.path],
        offset: seed.selection.anchor.offset,
      },
      focus: {
        path: [...prefix, ...seed.selection.focus.path],
        offset: seed.selection.focus.offset,
      },
    },
  }
}

function caretAt(path: Array<{_key: string} | string>, offset: number) {
  return {anchor: {path, offset}, focus: {path, offset}}
}

function duplicateKeyedBlocks(withLink: boolean): Array<PortableTextBlock> {
  return [
    {key: 'kA', href: 'https://a.example'},
    {key: 'kB', href: 'https://b.example'},
  ].map(({key, href}) => ({
    _type: 'block',
    _key: key,
    children: [
      {_type: 'span', _key: 's1', text: 'foo ', marks: []},
      {
        _type: 'span',
        _key: 's2',
        text: 'bar',
        marks: withLink ? ['strong', 'link1'] : ['strong'],
      },
      {_type: 'span', _key: 's3', text: ' baz', marks: []},
    ],
    markDefs: withLink ? [{_type: 'link', _key: 'link1', href}] : [],
    style: 'normal',
  }))
}

function wrapSeed(seed: string, depth: Depth): string {
  if (depth === 'root') {
    return seed
  }
  const lines = seed.split('\n')
  if (depth === 'container') {
    return ['CALLOUT:', ...lines.map((line) => `  ${line}`)].join('\n')
  }
  return ['ASIDE:', '  CALLOUT:', ...lines.map((line) => `    ${line}`)].join(
    '\n',
  )
}

/**
 * The scenario's own schema plus a `callout` (blocks) and an `aside`
 * (callouts). Container blocks declare no sub-schema, so they inherit the
 * root's decorators, annotations, lists, styles and inline objects.
 */
function withContainers(schemaDefinition: SchemaDefinition): SchemaDefinition {
  return defineSchema({
    ...schemaDefinition,
    blockObjects: [
      ...(schemaDefinition.blockObjects ?? []),
      {
        name: 'callout',
        fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
      },
      {
        name: 'aside',
        fields: [{name: 'content', type: 'array', of: [{type: 'callout'}]}],
      },
    ],
  })
}

const containerNodes = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer({
    type: 'aside',
    arrayField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
]

function textspecContainers(schema: Schema): TextspecContainers {
  const contentField = (type: string) => {
    const field = schema.blockObjects
      .find((blockObject) => blockObject.name === type)
      ?.fields.find((candidate) => candidate.name === 'content')
    if (!field || field.type !== 'array' || !field.of) {
      throw new Error(`Missing content field on ${type}`)
    }
    return {...field, of: field.of}
  }
  return new Map([
    [
      'callout',
      {kind: 'container', type: 'callout', field: contentField('callout')},
    ],
    ['aside', {kind: 'container', type: 'aside', field: contentField('aside')}],
  ])
}

/**
 * Parsed seeds lack `markDefs`/`style`; the first local edit would emit
 * normalization's default-materialization patches on top of the
 * scenario's, so seeds are canonicalized up front, at every depth.
 */
function canonicalize(
  schema: Schema,
  node: PortableTextBlock,
  containers: TextspecContainers,
): PortableTextBlock {
  if (isTextBlock({schema}, node)) {
    return {style: 'normal', markDefs: [], ...node}
  }
  const container = containers.get(node._type)
  if (container) {
    const content = (node as {content?: Array<PortableTextBlock>}).content
    return {
      ...node,
      content: (content ?? []).map((child) =>
        canonicalize(schema, child, containers),
      ),
    }
  }
  return node
}

function tabKey(shiftKey: boolean) {
  return {
    key: 'Tab',
    code: 'Tab',
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey,
  }
}

import type {Patch} from '@portabletext/patches'
import {compileSchema, isTextBlock, type Schema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {
  defineSchema,
  type Editor,
  type PortableTextBlock,
  type PortableTextSpan,
  type PortableTextTextBlock,
  type SchemaDefinition,
} from '../src'
import {safeStringify} from '../src/internal-utils/safe-json'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'
import {fromTextspec} from '../test-utils/from-textspec'
import {toTextspec} from '../test-utils/to-textspec'

/**
 * The wire catalogue: one scenario per test, each producing a committed
 * snapshot under `__fixtures__/wire-catalogue/`. The snapshot IS the
 * fixture: `scripts/generate-wire-catalogue.ts` reads it back to render the
 * markdown catalogue.
 *
 * `seed` and `result` are textspec notation strings (see
 * `test-utils/from-textspec.ts`/`to-textspec.ts`): together with the
 * `schema` field and the deterministic `createTestKeyGenerator`, `seed` is
 * enough to replay the scenario. The one exception is
 * `span-merge-cosmetic.json`, which pins two spans that carry identical
 * (empty) marks — textspec has no notation for a span boundary that isn't
 * a mark boundary, so that fixture keeps the pre-textspec shape (`seed` as
 * full blocks, `seedTerse`/`resultTerse`).
 */

type Capture = {
  scenario: string
  schema: SchemaDefinition
  seed: string
  actions: Array<string>
  patches: Array<Patch>
  result: string
  proof?: string
}

type LegacyCapture = {
  scenario: string
  schema: SchemaDefinition
  seed: Array<PortableTextBlock>
  seedTerse: Array<string>
  actions: Array<string>
  patches: Array<Patch>
  resultTerse: Array<string>
  proof?: string
}

async function writeCapture(capture: Capture | LegacyCapture) {
  await expect(`${safeStringify(capture, 2)}\n`).toMatchFileSnapshot(
    `__fixtures__/wire-catalogue/${capture.scenario}.json`,
  )
}

function captureResult(schema: Schema, editor: Editor): string {
  const {value, selection} = editor.getSnapshot().context
  return toTextspec({schema, value, selection})
}

describe('wire catalogue', () => {
  test('Scenario: typing text mid-span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo bar baz|'

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed})

    editor.send({type: 'select', at: selection})
    editor.send({type: 'insert.text', text: ' foo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo bar baz foo',
      ])
    })

    await writeCapture({
      scenario: 'type-text',
      schema,
      seed,
      actions: [
        'select {caret at end of the span}',
        "send {type: 'insert.text', text: ' foo'}",
      ],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: deleting a range within a span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo ^bar| baz'

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed})

    editor.send({type: 'delete', at: selection})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo  baz'])
    })

    await writeCapture({
      scenario: 'delete-within-span',
      schema,
      seed,
      actions: ["send {type: 'delete', at: {offset 4..7 on the span}}"],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: splitting a block with insert.break', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo |bar baz'

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed})

    editor.send({type: 'select', at: selection})
    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo ',
        'bar baz',
      ])
    })

    await writeCapture({
      scenario: 'block-split',
      schema,
      seed,
      actions: [
        'select {caret at offset 4 on the span}',
        "send {type: 'insert.break'}",
      ],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: merging two blocks with backspace at the boundary', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo\nB: |bar'

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed})

    editor.send({type: 'select', at: selection})
    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
    })

    await writeCapture({
      scenario: 'block-merge-backspace',
      schema,
      seed,
      actions: [
        'select {caret at start of block 2}',
        "send {type: 'delete.backward', unit: 'character'}",
      ],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: merging two blocks whose children share keys renames before the merge', async () => {
    // Duplicate `_key`s across the two blocks: textspec mints keys itself
    // and can't express a collision, so this seed is hand-built. See the
    // file header.
    const keyGenerator = createTestKeyGenerator()
    const schemaDefinition = defineSchema({decorators: [{name: 'strong'}]})
    const duplicateKeyedChildren = (): Array<PortableTextSpan> => [
      {_type: 'span', _key: 's1', text: 'foo ', marks: []},
      {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
      {_type: 'span', _key: 's3', text: ' baz', marks: []},
    ]
    const seed: Array<PortableTextTextBlock<PortableTextSpan>> = [
      {
        _type: 'block',
        _key: 'kA',
        children: duplicateKeyedChildren(),
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'kB',
        children: duplicateKeyedChildren(),
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, patches, schema, seedTerse} = await setupLegacyScenario({
      keyGenerator,
      schemaDefinition,
      initialValue: seed,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
      },
    })
    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(1)
    })

    await writeCapture({
      scenario: 'block-merge-duplicate-keys',
      schema,
      seed,
      seedTerse,
      actions: [
        'select {caret at start of block 2}',
        "send {type: 'delete.backward', unit: 'character'}",
      ],
      patches,
      resultTerse: getTersePt(editor.getSnapshot().context),
    })
  })

  test('Scenario: merging blocks with duplicate keys with forward delete', async () => {
    // Duplicate `_key`s across the two blocks: textspec mints keys itself
    // and can't express a collision, so this seed is hand-built. See the
    // file header.
    const keyGenerator = createTestKeyGenerator()
    const schemaDefinition = defineSchema({decorators: [{name: 'strong'}]})
    const duplicateKeyedChildren = (): Array<PortableTextSpan> => [
      {_type: 'span', _key: 's1', text: 'foo ', marks: []},
      {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
      {_type: 'span', _key: 's3', text: ' baz', marks: []},
    ]
    const seed: Array<PortableTextTextBlock<PortableTextSpan>> = [
      {
        _type: 'block',
        _key: 'kA',
        children: duplicateKeyedChildren(),
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'kB',
        children: duplicateKeyedChildren(),
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, patches, schema, seedTerse} = await setupLegacyScenario({
      keyGenerator,
      schemaDefinition,
      initialValue: seed,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 4},
        focus: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 4},
      },
    })
    editor.send({type: 'delete.forward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(1)
    })

    await writeCapture({
      scenario: 'block-merge-duplicate-keys-forward',
      schema,
      seed,
      seedTerse,
      actions: [
        'select {caret at end of block 1}',
        "send {type: 'delete.forward', unit: 'character'}",
      ],
      patches,
      resultTerse: getTersePt(editor.getSnapshot().context),
    })
  })

  test('Scenario: merging blocks with duplicate keys and colliding markDefs', async () => {
    // Duplicate `_key`s across the two blocks, including the `link1`
    // markDef, so the merge must rename the annotation and rewrite the
    // `marks` that reference it. Hand-built seed; see the file header.
    const keyGenerator = createTestKeyGenerator()
    const schemaDefinition = defineSchema({
      decorators: [{name: 'strong'}],
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    })
    const duplicateKeyedLinkedChildren = (): Array<PortableTextSpan> => [
      {_type: 'span', _key: 's1', text: 'foo ', marks: []},
      {_type: 'span', _key: 's2', text: 'bar', marks: ['strong', 'link1']},
      {_type: 'span', _key: 's3', text: ' baz', marks: []},
    ]
    const seed: Array<PortableTextTextBlock<PortableTextSpan>> = [
      {
        _type: 'block',
        _key: 'kA',
        children: duplicateKeyedLinkedChildren(),
        markDefs: [{_type: 'link', _key: 'link1', href: 'https://a.example'}],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'kB',
        children: duplicateKeyedLinkedChildren(),
        markDefs: [{_type: 'link', _key: 'link1', href: 'https://b.example'}],
        style: 'normal',
      },
    ]

    const {editor, patches, schema, seedTerse} = await setupLegacyScenario({
      keyGenerator,
      schemaDefinition,
      initialValue: seed,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
      },
    })
    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(1)
    })

    await writeCapture({
      scenario: 'block-merge-duplicate-keys-markdefs',
      schema,
      seed,
      seedTerse,
      actions: [
        'select {caret at start of block 2}',
        "send {type: 'delete.backward', unit: 'character'}",
      ],
      patches,
      resultTerse: getTersePt(editor.getSnapshot().context),
    })
  })

  test('Scenario: adding a decorator mid-span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo ^bar| baz'
    const schemaDefinition = defineSchema({decorators: [{name: 'strong'}]})

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed, schemaDefinition})

    editor.send({type: 'select', at: selection})
    editor.send({type: 'decorator.add', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo ,bar, baz',
      ])
    })

    await writeCapture({
      scenario: 'decorator-add-mid-span',
      schema,
      seed,
      actions: [
        'select {offset 4..7 on the span}',
        "send {type: 'decorator.add', decorator: 'strong'}",
      ],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: adding an annotation mid-span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo ^bar| baz'
    const schemaDefinition = defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    })

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed, schemaDefinition})

    editor.send({type: 'select', at: selection})
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo ,bar, baz',
      ])
    })

    await writeCapture({
      scenario: 'annotation-add-mid-span',
      schema,
      seed,
      actions: [
        'select {offset 4..7 on the span}',
        "send {type: 'annotation.add', annotation: {name: 'link', value: {href: 'https://example.com'}}}",
      ],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: removing a decorator from a whole span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo [strong:^bar|] baz'
    const schemaDefinition = defineSchema({decorators: [{name: 'strong'}]})

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed, schemaDefinition})

    editor.send({type: 'select', at: selection})
    editor.send({type: 'decorator.remove', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar baz'])
    })

    await writeCapture({
      scenario: 'decorator-remove-whole-span',
      schema,
      seed,
      actions: [
        'select {offset 0..3 on the span}',
        "send {type: 'decorator.remove', decorator: 'strong'}",
      ],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: removing a decorator from a sub-range of a fully-marked span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: [strong:foo ^bar| baz]'
    const schemaDefinition = defineSchema({decorators: [{name: 'strong'}]})

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed, schemaDefinition})

    editor.send({type: 'select', at: selection})
    editor.send({type: 'decorator.remove', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo ,bar, baz',
      ])
    })

    await writeCapture({
      scenario: 'decorator-remove-sub-range',
      schema,
      seed,
      actions: [
        'select {offset 4..7 on the span}',
        "send {type: 'decorator.remove', decorator: 'strong'}",
      ],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: removing an annotation from a whole span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo [@link href="https://example.com":^bar|] baz'
    const schemaDefinition = defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    })

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed, schemaDefinition})

    editor.send({type: 'select', at: selection})
    editor.send({
      type: 'annotation.remove',
      annotation: {name: 'link'},
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar baz'])
    })

    await writeCapture({
      scenario: 'annotation-remove',
      schema,
      seed,
      actions: [
        'select {offset 0..3 on the span}',
        "send {type: 'annotation.remove', annotation: {name: 'link'}}",
      ],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: typing across a cosmetic span boundary', async () => {
    // Two spans with identical (empty) marks: textspec has no notation for
    // a span boundary that isn't a mark boundary, so this seed can't be
    // expressed as a spec string. Kept as hand-built blocks; see the file
    // header.
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const span2Key = keyGenerator()
    const seedBlock: PortableTextTextBlock<PortableTextSpan> = {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
        {_type: 'span', _key: span2Key, text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }

    const {editor, patches, schema, seed, seedTerse} =
      await setupLegacyScenario({
        keyGenerator,
        initialValue: [seedBlock],
      })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: span2Key}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: span2Key}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar!'])
    })

    await writeCapture({
      scenario: 'span-merge-cosmetic',
      schema,
      seed,
      seedTerse,
      actions: [
        'select {caret at end of the second span}',
        "send {type: 'insert.text', text: '!'}",
      ],
      patches,
      resultTerse: getTersePt(editor.getSnapshot().context),
    })
  })

  test('Scenario: moving a block down', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo\nB: bar'

    const {editor, patches, schema, compiledSchema, blocks} =
      await setupScenario({keyGenerator, seed})

    editor.send({type: 'move.block down', at: [{_key: blocks[0]!._key!}]})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['bar', 'foo'])
    })

    await writeCapture({
      scenario: 'block-move',
      schema,
      seed,
      actions: ["send {type: 'move.block down', at: [{_key: block 1}]}"],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })

  test('Scenario: inserting two blocks at the end of a block (paste-shaped)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const seed = 'B: foo|'

    const {editor, patches, schema, compiledSchema, selection} =
      await setupScenario({keyGenerator, seed})

    editor.send({type: 'select', at: selection})
    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      blocks: fromTextspec(
        {schema: compiledSchema, keyGenerator},
        'B: bar\nB: baz',
      ).blocks,
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foobar',
        'baz',
      ])
    })

    await writeCapture({
      scenario: 'insert-blocks-auto',
      schema,
      seed,
      actions: [
        'select {caret at end of "foo"}',
        "send {type: 'insert.blocks', placement: 'auto', blocks: [bar, baz]}",
      ],
      patches,
      result: captureResult(compiledSchema, editor),
    })
  })
})

async function setupScenario(options: {
  keyGenerator: () => string
  seed: string
  schemaDefinition?: SchemaDefinition
}) {
  const patches: Array<Patch> = []
  const schema = options.schemaDefinition ?? {}
  const compiledSchema = compileSchema(
    options.schemaDefinition ?? defineSchema({}),
  )
  const {blocks: parsedBlocks, selection} = fromTextspec(
    {schema: compiledSchema, keyGenerator: options.keyGenerator},
    options.seed,
  )
  // The captures must contain only the scenario's own emission. Parsed
  // seeds lack `markDefs`/`style`, and the first local edit would emit
  // normalization's default-materialization patches on top of the
  // scenario's, so the seeds are canonicalized up front.
  const blocks = parsedBlocks.map((parsedBlock) =>
    isTextBlock({schema: compiledSchema}, parsedBlock)
      ? {
          style: 'normal',
          markDefs: [],
          ...parsedBlock,
        }
      : parsedBlock,
  )

  if (!selection) {
    throw new Error(
      `Could not resolve selection from textspec: ${options.seed}`,
    )
  }

  const {editor} = await createTestEditor({
    keyGenerator: options.keyGenerator,
    schemaDefinition: options.schemaDefinition,
    initialValue: blocks,
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

  return {editor, patches, schema, compiledSchema, blocks, selection}
}

async function setupLegacyScenario(options: {
  keyGenerator: () => string
  initialValue: Array<PortableTextBlock>
  schemaDefinition?: SchemaDefinition
}) {
  const patches: Array<Patch> = []

  const {editor} = await createTestEditor({
    keyGenerator: options.keyGenerator,
    schemaDefinition: options.schemaDefinition,
    initialValue: options.initialValue,
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

  return {
    editor,
    patches,
    schema: options.schemaDefinition ?? {},
    seed: options.initialValue,
    seedTerse: getTersePt(editor.getSnapshot().context),
  }
}

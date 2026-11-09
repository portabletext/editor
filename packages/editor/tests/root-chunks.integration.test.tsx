import {insert, set, unset} from '@portabletext/patches'
import {
  defineSchema,
  type PortableTextBlock,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React, {StrictMode} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {userEvent} from 'vitest/browser'
import {EditorProvider, PortableTextEditable} from '../src'
import type {RangeDecoration} from '../src'
import {inTestChange} from '../src/engine/core/change.test-utils'
import type {Path} from '../src/engine/interfaces/path'
import {serializePath} from '../src/paths/serialize-path'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {getChildren} from '../src/traversal/get-children'
import {getNode} from '../src/traversal/get-node'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}, {type: 'note'}],
        },
      ],
    },
    {
      name: 'aside',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'note'}],
        },
      ],
    },
    {
      name: 'note',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'table',
      fields: [{name: 'rows', type: 'array', of: [{type: 'tableRow'}]}],
    },
    {
      name: 'tableRow',
      fields: [{name: 'cells', type: 'array', of: [{type: 'tableCell'}]}],
    },
    {
      name: 'tableCell',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'note'}],
        },
      ],
    },
  ],
})

const containers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({
    type: 'aside',
    arrayField: 'content',
    of: [defineContainer({type: 'note', arrayField: 'content'})],
  }),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'tableRow', arrayField: 'cells'}),
  defineContainer({type: 'tableCell', arrayField: 'content'}),
]

type Depth = {
  name: string
  wrap: (
    blocks: Array<PortableTextBlock>,
    keyGenerator: () => string,
  ) => {value: Array<PortableTextBlock>; prefix: Path}
}

const depths: Array<Depth> = [
  {name: 'the root', wrap: (blocks) => ({value: blocks, prefix: []})},
  {
    name: 'a callout',
    wrap: (blocks, keyGenerator) => {
      const calloutKey = keyGenerator()
      return {
        value: [{_type: 'callout', _key: calloutKey, content: blocks}] as never,
        prefix: [{_key: calloutKey}, 'content'],
      }
    },
  },
  {
    name: 'a nested callout',
    wrap: (blocks, keyGenerator) => {
      const outerKey = keyGenerator()
      const innerKey = keyGenerator()
      return {
        value: [
          {
            _type: 'callout',
            _key: outerKey,
            content: [{_type: 'callout', _key: innerKey, content: blocks}],
          },
        ] as never,
        prefix: [{_key: outerKey}, 'content', {_key: innerKey}, 'content'],
      }
    },
  },
  {
    name: 'a table cell',
    wrap: (blocks, keyGenerator) => {
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      return {
        value: [
          {
            _type: 'table',
            _key: tableKey,
            rows: [
              {
                _type: 'tableRow',
                _key: rowKey,
                cells: [{_type: 'tableCell', _key: cellKey, content: blocks}],
              },
            ],
          },
        ] as never,
        prefix: [
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
        ],
      }
    },
  },
]

const failingPatchPositions = ['first', 'middle', 'last'] as const

describe('root chunks against real engine editing', () => {
  test('Scenario: StrictMode keeps a container chunk entry after its effect replay', async () => {
    const keyGenerator = createTestKeyGenerator()
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const blocks = Array.from({length: 150}, () => block(keyGenerator))
    const wrapped = depths[1]!.wrap(blocks, keyGenerator)
    const childArrayPath = serializePath(wrapped.prefix)

    await render(
      <StrictMode>
        <EditorProvider
          initialConfig={{
            initialValue: wrapped.value,
            keyGenerator,
            schemaDefinition,
          }}
        >
          <InternalEditorEngineRefPlugin ref={engineRef} />
          <NodePlugin nodes={containers} />
          <PortableTextEditable />
        </EditorProvider>
      </StrictMode>,
    )

    await vi.waitFor(() =>
      expect(
        engineRef.current?.childChunks
          .get(childArrayPath)
          ?.map((chunk) => chunk.blocks.length),
      ).toEqual([100, 50]),
    )
  })

  test.each(depths)(
    'Scenario: Typing at $name does not rebuild elements for blocks in an untouched chunk',
    async ({wrap}) => {
      const keyGenerator = createTestKeyGenerator()
      const blocks = Array.from({length: 250}, () => block(keyGenerator))
      const editedBlock = blocks[150]!
      const untouchedBlock = blocks[10]!
      const wrapped = wrap(blocks, keyGenerator)
      let untouchedBlockTypeReads = 0
      Object.defineProperty(untouchedBlock, '_type', {
        configurable: true,
        enumerable: true,
        get: () => {
          untouchedBlockTypeReads++
          return 'block'
        },
      })
      const {editor, locator} = await createTestEditor({
        initialValue: wrapped.value as never,
        schemaDefinition,
        children: <NodePlugin nodes={containers} />,
      })

      await userEvent.click(locator.getByText(editedBlock._key, {exact: true}))
      const spanPath = [
        ...wrapped.prefix,
        {_key: editedBlock._key},
        'children',
        {_key: editedBlock.children[0]!._key},
      ] as Path
      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: editedBlock._key.length},
          focus: {path: spanPath, offset: editedBlock._key.length},
        },
      })
      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: editedBlock._key.length},
          focus: {path: spanPath, offset: editedBlock._key.length},
          backward: false,
        }),
      )

      untouchedBlockTypeReads = 0
      await userEvent.keyboard('x')
      await vi.waitFor(() =>
        expect(
          locator.getByText(`${editedBlock._key}x`, {exact: true}).elements()
            .length,
        ).toEqual(1),
      )
      expect(untouchedBlockTypeReads).toEqual(0)

      untouchedBlockTypeReads = 0
      const pathElementCount = locator
        .element()
        .querySelectorAll('[data-pt-path]').length
      editor.send({type: 'insert.break'})
      await vi.waitFor(() =>
        expect(
          locator.element().querySelectorAll('[data-pt-path]').length,
        ).toEqual(pathElementCount + 2),
      )
      expect(untouchedBlockTypeReads).toEqual(0)

      const insertedBlock = block(keyGenerator)
      untouchedBlockTypeReads = 0
      editor.send({
        type: 'insert.block',
        block: insertedBlock,
        placement: 'after',
      })
      await expect
        .element(locator.getByText(insertedBlock._key))
        .toBeInTheDocument()
      expect(untouchedBlockTypeReads).toEqual(0)

      untouchedBlockTypeReads = 0
      editor.send({
        type: 'patches',
        patches: [unset([...wrapped.prefix, {_key: insertedBlock._key}])],
        snapshot: undefined,
      })
      await vi.waitFor(() =>
        expect(locator.getByText(insertedBlock._key).elements().length).toEqual(
          0,
        ),
      )
      expect(untouchedBlockTypeReads).toEqual(0)
    },
  )

  test.each(depths)(
    'Scenario: Structural edits at $name preserve and update a range decoration in an untouched chunk',
    async ({wrap}) => {
      const keyGenerator = createTestKeyGenerator()
      const blocks = Array.from({length: 250}, () => block(keyGenerator))
      const wrapped = wrap(blocks, keyGenerator)
      const decoratedBlock = blocks[10]!
      const editedBlock = blocks[150]!
      const decorationPath = [
        ...wrapped.prefix,
        {_key: decoratedBlock._key},
        'children',
        {_key: decoratedBlock.children[0]!._key},
      ] as Path
      const decoration = (offset: number): RangeDecoration => ({
        component: ({children}) => (
          <span data-testid="untouched-decoration">{children}</span>
        ),
        selection: {
          anchor: {path: decorationPath, offset},
          focus: {path: decorationPath, offset: offset + 1},
        },
      })
      const {editor, locator, rerender} = await createTestEditor({
        initialValue: wrapped.value as never,
        schemaDefinition,
        children: <NodePlugin nodes={containers} />,
        editableProps: {rangeDecorations: [decoration(0)]},
      })
      const editedSpanPath = [
        ...wrapped.prefix,
        {_key: editedBlock._key},
        'children',
        {_key: editedBlock.children[0]!._key},
      ] as Path
      editor.send({
        type: 'select',
        at: {
          anchor: {path: editedSpanPath, offset: editedBlock._key.length},
          focus: {path: editedSpanPath, offset: editedBlock._key.length},
        },
      })
      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
          editedSpanPath,
        ),
      )

      editor.send({type: 'insert.break'})
      await vi.waitFor(() =>
        expect(
          locator
            .element()
            .querySelectorAll('[data-testid="untouched-decoration"]').length,
        ).toEqual(1),
      )

      await rerender({
        initialValue: wrapped.value as never,
        schemaDefinition,
        children: <NodePlugin nodes={containers} />,
        editableProps: {rangeDecorations: [decoration(1)]},
      })
      await vi.waitFor(() =>
        expect(
          locator
            .element()
            .querySelector('[data-testid="untouched-decoration"]')?.textContent,
        ).toEqual(decoratedBlock._key.slice(1, 2)),
      )

      await rerender({
        initialValue: wrapped.value as never,
        schemaDefinition,
        children: <NodePlugin nodes={containers} />,
        editableProps: {rangeDecorations: []},
      })
      await vi.waitFor(() =>
        expect(
          locator
            .element()
            .querySelectorAll('[data-testid="untouched-decoration"]').length,
        ).toEqual(0),
      )
    },
  )

  test.each(
    depths.flatMap((depth) =>
      failingPatchPositions.map((failingPatchPosition) => ({
        ...depth,
        failingPatchPosition,
      })),
    ),
  )(
    'Scenario: A no-op remote unset at $name costs no rebuild when it is $failingPatchPosition in a mutating batch',
    async ({wrap, failingPatchPosition}) => {
      const keyGenerator = createTestKeyGenerator()
      const engineRef = React.createRef<PortableTextEditorEngine>()
      const blocks = Array.from({length: 150}, () => block(keyGenerator))
      const wrapped = wrap(blocks, keyGenerator)
      const {editor, locator} = await createTestEditor({
        children: (
          <>
            <NodePlugin nodes={containers} />
            <InternalEditorEngineRefPlugin ref={engineRef} />
          </>
        ),
        initialValue: wrapped.value as never,
        keyGenerator,
        schemaDefinition,
      })
      const engine = engineRef.current!
      const insertedByPatch = block(keyGenerator)
      const successfulPatches = [
        insert([insertedByPatch], 'before', [
          ...wrapped.prefix,
          {_key: blocks[0]!._key},
        ]),
        unset([...wrapped.prefix, {_key: insertedByPatch._key}]),
      ]
      const missingKey = keyGenerator()
      const failingPatch = unset([...wrapped.prefix, {_key: missingKey}])
      const patches =
        failingPatchPosition === 'first'
          ? [failingPatch, ...successfulPatches]
          : failingPatchPosition === 'middle'
            ? [successfulPatches[0]!, failingPatch, successfulPatches[1]!]
            : [...successfulPatches, failingPatch]
      const clearIndexMap = vi.spyOn(engine.blockIndexMap, 'clear')

      editor.send({type: 'patches', patches, snapshot: wrapped.value})

      await vi.waitFor(() => {
        const children = getChildren(engine.snapshot, wrapped.prefix).map(
          (entry) => entry.node,
        )
        const flattened = engine.childChunks
          .get(serializePath(wrapped.prefix))!
          .flatMap((chunk) => chunk.blocks)
        expect(flattened).toEqual(children)
        expect(
          flattened.map((child, index) => child === children[index]),
        ).toEqual(Array.from({length: 150}, () => true))
      })
      expect(clearIndexMap).toHaveBeenCalledTimes(0)

      const lastBlock = blocks.at(-1)!
      const lastSpan = lastBlock.children[0]! as PortableTextSpan
      const lastSpanPath = [
        ...wrapped.prefix,
        {_key: lastBlock._key},
        'children',
        {_key: lastSpan._key},
      ] as Path
      editor.send({
        type: 'select',
        at: {
          anchor: {path: lastSpanPath, offset: lastSpan.text.length},
          focus: {path: lastSpanPath, offset: lastSpan.text.length},
        },
      })
      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
          lastSpanPath,
        ),
      )
      const insertedLocally = block(keyGenerator)
      editor.send({
        type: 'insert.block',
        block: insertedLocally,
        placement: 'after',
      })

      await expect
        .element(locator.getByText(insertedLocally._key))
        .toBeInTheDocument()
    },
  )

  test.each(depths.slice(1))(
    'Scenario: A remote container type change at $name rebuilds cached children in the new container scope',
    async ({wrap}) => {
      const keyGenerator = createTestKeyGenerator()
      const blocks = Array.from({length: 150}, () => block(keyGenerator))
      const noteKey = keyGenerator()
      const noteTextBlock = block(keyGenerator)
      blocks.splice(5, 0, {
        _type: 'note',
        _key: noteKey,
        content: [noteTextBlock],
      } as never)
      const wrapped = wrap(blocks, keyGenerator)
      const containerPath = wrapped.prefix.slice(0, -1)
      const notePath = serializePath([...wrapped.prefix, {_key: noteKey}])
      const noteTextPath = serializePath([
        ...wrapped.prefix,
        {_key: noteKey},
        'content',
        {_key: noteTextBlock._key},
      ])
      const {editor, locator} = await createTestEditor({
        initialValue: wrapped.value as never,
        keyGenerator,
        schemaDefinition,
        children: <NodePlugin nodes={containers} />,
      })

      await vi.waitFor(() =>
        expect({
          noteElement: locator
            .element()
            .querySelector(`[data-pt-path='${notePath}']`)
            ?.getAttribute('data-pt-block'),
          noteTextRendered:
            locator
              .element()
              .querySelector(`[data-pt-path='${noteTextPath}']`) !== null,
        }).toEqual({noteElement: 'object', noteTextRendered: false}),
      )

      editor.send({
        type: 'patches',
        patches: [set('aside', [...containerPath, '_type'])],
        snapshot: undefined,
      })

      await vi.waitFor(() =>
        expect({
          noteElement: locator
            .element()
            .querySelector(`[data-pt-path='${notePath}']`)
            ?.getAttribute('data-pt-block'),
          noteTextRendered:
            locator
              .element()
              .querySelector(`[data-pt-path='${noteTextPath}']`) !== null,
        }).toEqual({noteElement: 'container', noteTextRendered: true}),
      )
    },
  )

  test.each(depths)(
    'Scenario: A block at $name keeps its DOM node when its chunk splits and merges',
    async ({wrap}) => {
      const keyGenerator = createTestKeyGenerator()
      const engineRef = React.createRef<PortableTextEditorEngine>()
      const blocks = Array.from({length: 100}, () => block(keyGenerator))
      const target = blocks[50]!
      const targetSpan = target.children[0]!
      const wrapped = wrap(blocks, keyGenerator)
      const {editor, locator} = await createTestEditor({
        initialValue: wrapped.value as never,
        schemaDefinition,
        children: (
          <>
            <NodePlugin nodes={containers} />
            <InternalEditorEngineRefPlugin ref={engineRef} />
          </>
        ),
      })
      const spanPath = [
        ...wrapped.prefix,
        {_key: target._key},
        'children',
        {_key: targetSpan._key},
      ] as Path

      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
        },
      })
      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
          backward: false,
        }),
      )

      const targetPath = [...wrapped.prefix, {_key: target._key}] as Path
      const selector = `[data-pt-path='${serializePath(targetPath)}']`
      const before = locator.element().querySelector(selector)
      expect(before).not.toBeNull()

      const insertedBlocks = Array.from({length: 101}, () =>
        block(keyGenerator),
      )
      editor.send({
        type: 'insert.blocks',
        blocks: insertedBlocks,
        placement: 'before',
      })

      await vi.waitFor(() => {
        expect(
          locator
            .element()
            .querySelector(
              `[data-pt-path='${serializePath([
                ...wrapped.prefix,
                {_key: insertedBlocks[100]!._key},
              ])}']`,
            ),
        ).not.toBeNull()
      })
      const childArrayPath = serializePath(wrapped.prefix)
      expect(chunkLengths(engineRef.current!, childArrayPath)).toEqual([
        101, 100,
      ])
      expect(locator.element().querySelector(selector)).toBe(before)

      editor.send({
        type: 'patches',
        patches: insertedBlocks.map((insertedBlock) =>
          unset([...wrapped.prefix, {_key: insertedBlock._key}]),
        ),
        snapshot: undefined,
      })
      await vi.waitFor(() =>
        expect(
          locator
            .element()
            .querySelector(
              `[data-pt-path='${serializePath([
                ...wrapped.prefix,
                {_key: insertedBlocks[0]!._key},
              ])}']`,
            ),
        ).toBeNull(),
      )
      expect(chunkLengths(engineRef.current!, childArrayPath)).toEqual([100])
      expect(locator.element().querySelector(selector)).toBe(before)
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
        backward: false,
      })
    },
  )

  test('Scenario: `flatten(rootChunks)` equals the value through a mixed editing session', async () => {
    const keyGenerator = createTestKeyGenerator()
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const {editor, locator} = await createTestEditor({
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
      keyGenerator,
    })
    const value = () => editor.getSnapshot().context.value

    async function expectChunksMatchValue(label: string) {
      // The actor-side value can settle before the engine finishes
      // applying a burst of ops, so the invariant is asserted with a
      // retry.
      await vi.waitFor(() => {
        const flattened = engineRef.current!.rootChunks.flatMap(
          (chunk) => chunk.blocks,
        )
        // The chunks must hold the value's actual block objects, not
        // stale copies.
        expect(flattened, label).toEqual(value())
        flattened.forEach((chunkBlock, index) => {
          expect(chunkBlock, `${label} at ${index}`).toBe(value()[index])
        })
      })
    }

    // Programmatic bulk insert (a paste-sized batch crossing chunk
    // boundaries).
    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      blocks: Array.from({length: 250}, (_, index) => {
        const generatedBlock = block(keyGenerator)
        return {
          ...generatedBlock,
          children: [{...generatedBlock.children[0]!, text: `block ${index}`}],
        }
      }),
    })
    await vi.waitFor(() => expect(value().length).toBe(250))
    await expectChunksMatchValue('after bulk insert')

    // Real typing, splitting, and merging at a chunk-interior position.
    await userEvent.click(locator.getByText('block 125'))
    await userEvent.keyboard('typed{Enter}split{Enter}')
    await vi.waitFor(() => expect(value().length).toBe(252))
    await expectChunksMatchValue('after typing and splits')

    await userEvent.keyboard(
      '{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}',
    )
    await vi.waitFor(() => expect(value().length).toBe(251))
    await expectChunksMatchValue('after backspace merges')

    // Undo the typing session step by step (bounded so the bulk insert
    // itself stays).
    for (let undoStep = 0; undoStep < 5; undoStep++) {
      editor.send({type: 'history.undo'})
    }
    await expectChunksMatchValue('after undos')

    // Select-all delete across every chunk.
    const blockCountBeforeDelete = value().length
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: value()[0]!._key},
            'children',
            {_key: (value()[0] as PortableTextTextBlock).children[0]!._key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: value().at(-1)!._key},
            'children',
            {
              _key: (value().at(-1) as PortableTextTextBlock).children[0]!._key,
            },
          ],
          offset: 'block 249'.length,
        },
      },
    })
    editor.send({type: 'delete'})
    await vi.waitFor(() => expect(value().length).toBe(1))
    await expectChunksMatchValue('after select-all delete')

    editor.send({type: 'history.undo'})
    await vi.waitFor(() => expect(value().length).toBe(blockCountBeforeDelete))
    await expectChunksMatchValue('after undoing the delete')
  }, 120000)

  test('Scenario: A remote duplicate followed by a keyed edit renders at the root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const blocks = Array.from({length: 250}, () => fooBlock(keyGenerator))
    const target = blocks[0]!
    const spanPath = [
      {_key: target._key},
      'children',
      {_key: target.children[0]!._key},
    ] as Path
    const {editor, locator} = await createTestEditor({
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
      initialValue: blocks,
      keyGenerator,
    })

    editor.send({
      type: 'patches',
      patches: [
        insert([structuredClone(target)], 'after', [{_key: blocks[149]!._key}]),
        set('bar', [...spanPath, 'text']),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() =>
      expect(
        locator.element().querySelectorAll('[data-pt-block="text"]').length,
      ).toEqual(251),
    )
    expect(
      getNode(engineRef.current!.snapshot, [{_key: target._key}])?.node,
    ).toEqual({
      _type: 'block',
      _key: target._key,
      children: [
        {_type: 'span', _key: target.children[0]!._key, text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    })
    await vi.waitFor(() =>
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="text"]'),
          (element) => element.textContent,
        ),
      ).toEqual(
        Array.from({length: 251}, (_, index) => (index === 0 ? 'bar' : 'foo')),
      ),
    )
  })

  test('Scenario: A duplicate root ancestor followed by a deep keyed edit renders at a callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const target = fooBlock(keyGenerator)
    const {wrap} = depths[1]!
    const first = wrap([target], keyGenerator)
    const roots = [
      first.value[0]!,
      ...Array.from(
        {length: 249},
        () => wrap([fooBlock(keyGenerator)], keyGenerator).value[0]!,
      ),
    ]
    const targetPath = [...first.prefix, {_key: target._key}] as Path
    const spanPath = [
      ...targetPath,
      'children',
      {_key: target.children[0]!._key},
    ] as Path
    const {editor, locator} = await createTestEditor({
      children: (
        <>
          <NodePlugin nodes={containers} />
          <InternalEditorEngineRefPlugin ref={engineRef} />
        </>
      ),
      initialValue: roots,
      keyGenerator,
      schemaDefinition,
    })

    editor.send({
      type: 'patches',
      patches: [
        insert([structuredClone(roots[0]!)], 'after', [
          {_key: roots[149]!._key},
        ]),
        set('bar', [...spanPath, 'text']),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() =>
      expect(
        locator.element().querySelectorAll('[data-pt-block="text"]').length,
      ).toEqual(251),
    )
    expect(getNode(engineRef.current!.snapshot, targetPath)?.node).toEqual({
      _type: 'block',
      _key: target._key,
      children: [
        {_type: 'span', _key: target.children[0]!._key, text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    })
    await vi.waitFor(() =>
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="text"]'),
          (element) => element.textContent,
        ),
      ).toEqual(
        Array.from({length: 251}, (_, index) => (index === 0 ? 'bar' : 'foo')),
      ),
    )
  })

  test('Scenario: A duplicate root ancestor followed by a deep keyed edit renders at a nested callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const target = fooBlock(keyGenerator)
    const {wrap} = depths[2]!
    const first = wrap([target], keyGenerator)
    const roots = [
      first.value[0]!,
      ...Array.from(
        {length: 249},
        () => wrap([fooBlock(keyGenerator)], keyGenerator).value[0]!,
      ),
    ]
    const targetPath = [...first.prefix, {_key: target._key}] as Path
    const spanPath = [
      ...targetPath,
      'children',
      {_key: target.children[0]!._key},
    ] as Path
    const {editor, locator} = await createTestEditor({
      children: (
        <>
          <NodePlugin nodes={containers} />
          <InternalEditorEngineRefPlugin ref={engineRef} />
        </>
      ),
      initialValue: roots,
      keyGenerator,
      schemaDefinition,
    })

    editor.send({
      type: 'patches',
      patches: [
        insert([structuredClone(roots[0]!)], 'after', [
          {_key: roots[149]!._key},
        ]),
        set('bar', [...spanPath, 'text']),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() =>
      expect(
        locator.element().querySelectorAll('[data-pt-block="text"]').length,
      ).toEqual(251),
    )
    expect(getNode(engineRef.current!.snapshot, targetPath)?.node).toEqual({
      _type: 'block',
      _key: target._key,
      children: [
        {_type: 'span', _key: target.children[0]!._key, text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    })
    await vi.waitFor(() =>
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="text"]'),
          (element) => element.textContent,
        ),
      ).toEqual(
        Array.from({length: 251}, (_, index) => (index === 0 ? 'bar' : 'foo')),
      ),
    )
  })

  test('Scenario: A duplicate root ancestor followed by a deep keyed edit renders at a table cell', async () => {
    const keyGenerator = createTestKeyGenerator()
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const target = fooBlock(keyGenerator)
    const {wrap} = depths[3]!
    const first = wrap([target], keyGenerator)
    const roots = [
      first.value[0]!,
      ...Array.from(
        {length: 249},
        () => wrap([fooBlock(keyGenerator)], keyGenerator).value[0]!,
      ),
    ]
    const targetPath = [...first.prefix, {_key: target._key}] as Path
    const spanPath = [
      ...targetPath,
      'children',
      {_key: target.children[0]!._key},
    ] as Path
    const {editor, locator} = await createTestEditor({
      children: (
        <>
          <NodePlugin nodes={containers} />
          <InternalEditorEngineRefPlugin ref={engineRef} />
        </>
      ),
      initialValue: roots,
      keyGenerator,
      schemaDefinition,
    })

    editor.send({
      type: 'patches',
      patches: [
        insert([structuredClone(roots[0]!)], 'after', [
          {_key: roots[149]!._key},
        ]),
        set('bar', [...spanPath, 'text']),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() =>
      expect(
        locator.element().querySelectorAll('[data-pt-block="text"]').length,
      ).toEqual(251),
    )
    expect(getNode(engineRef.current!.snapshot, targetPath)?.node).toEqual({
      _type: 'block',
      _key: target._key,
      children: [
        {_type: 'span', _key: target.children[0]!._key, text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    })
    await vi.waitFor(() =>
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="text"]'),
          (element) => element.textContent,
        ),
      ).toEqual(
        Array.from({length: 251}, (_, index) => (index === 0 ? 'bar' : 'foo')),
      ),
    )
  })

  test('Scenario: Root chunks match normalized inserts by reference', async () => {
    const keyGenerator = createTestKeyGenerator()
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const initialValue = Array.from({length: 250}, () => block(keyGenerator))
    const firstInsertedKey = keyGenerator()
    const secondInsertedKey = keyGenerator()
    const secondInsertedSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
      initialValue,
      keyGenerator,
    })

    await vi.waitFor(() =>
      expect(engineRef.current?.snapshot.context.value.length).toEqual(250),
    )
    const engine = engineRef.current!
    inTestChange(engine, () => {
      engine.apply({
        type: 'insert',
        path: [{_key: initialValue[2]!._key}],
        position: 'after',
        node: {
          _type: 'block',
          _key: firstInsertedKey,
          children: [],
          markDefs: [],
          style: 'normal',
        },
      })
      engine.apply({
        type: 'insert',
        path: [{_key: initialValue[4]!._key}],
        position: 'after',
        node: {
          _type: 'block',
          _key: secondInsertedKey,
          children: [
            {
              _type: 'span',
              _key: secondInsertedSpanKey,
              text: secondInsertedKey,
              marks: [],
            },
          ],
          style: 'normal',
        } as PortableTextTextBlock,
      })
    })

    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value.length).toEqual(252),
    )
    const value = engine.snapshot.context.value
    const flattened = engine.rootChunks.flatMap((chunk) => chunk.blocks)
    expect({
      chunkLengthsAreBounded: engine.rootChunks.every(
        (chunk) => chunk.blocks.length > 0 && chunk.blocks.length <= 200,
      ),
      flattenedKeys: flattened.map((blockValue) => blockValue._key),
      referencesMatch: flattened.map(
        (blockValue, index) => blockValue === value[index],
      ),
    }).toEqual({
      chunkLengthsAreBounded: true,
      flattenedKeys: value.map((blockValue) => blockValue._key),
      referencesMatch: Array.from({length: 252}, () => true),
    })
  })

  test('Scenario: Root chunks match a normalized direct unset by reference', async () => {
    const keyGenerator = createTestKeyGenerator()
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const initialValue = [block(keyGenerator)]
    await createTestEditor({
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
      initialValue,
      keyGenerator,
    })
    const engine = engineRef.current!

    inTestChange(engine, () => {
      engine.apply({type: 'unset', path: [{_key: initialValue[0]!._key}]})
    })

    const value = engine.snapshot.context.value
    const flattened = engine.rootChunks.flatMap((chunk) => chunk.blocks)
    expect(flattened).toEqual(value)
    expect(
      flattened.map((blockValue, index) => blockValue === value[index]),
    ).toEqual([true])
  })

  test.each(depths)(
    'Scenario: A local insert renders at $name after a remote unset for a missing block throws',
    async ({wrap}) => {
      const keyGenerator = createTestKeyGenerator()
      const engineRef = React.createRef<PortableTextEditorEngine>()
      const blocks = Array.from({length: 150}, () => block(keyGenerator))
      const wrapped = wrap(blocks, keyGenerator)
      const {editor, locator} = await createTestEditor({
        children: (
          <>
            <NodePlugin nodes={containers} />
            <InternalEditorEngineRefPlugin ref={engineRef} />
          </>
        ),
        initialValue: wrapped.value as never,
        keyGenerator,
        schemaDefinition,
      })
      const lastBlock = blocks.at(-1)!
      const lastSpan = lastBlock.children[0]! as PortableTextSpan
      const lastSpanPath = [
        ...wrapped.prefix,
        {_key: lastBlock._key},
        'children',
        {_key: lastSpan._key},
      ] as Path

      editor.send({
        type: 'select',
        at: {
          anchor: {path: lastSpanPath, offset: lastSpan.text.length},
          focus: {path: lastSpanPath, offset: lastSpan.text.length},
        },
      })
      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
          lastSpanPath,
        ),
      )

      const missingKey = keyGenerator()
      editor.send({
        type: 'patches',
        patches: [unset([...wrapped.prefix, {_key: missingKey}])],
        snapshot: wrapped.value,
      })
      const inserted = block(keyGenerator)
      editor.send({type: 'insert.block', block: inserted, placement: 'after'})

      await expect.element(locator.getByText(inserted._key)).toBeInTheDocument()
      const engine = engineRef.current!
      const children = getChildren(engine.snapshot, wrapped.prefix).map(
        (entry) => entry.node,
      )
      const flattened = engine.childChunks
        .get(serializePath(wrapped.prefix))!
        .flatMap((chunk) => chunk.blocks)
      expect(flattened).toEqual(children)
      expect(
        flattened.map((child, index) => child === children[index]),
      ).toEqual(Array.from({length: 151}, () => true))
    },
  )

  test('Scenario: Chunks include normalization fix operations when an outer apply throws', async () => {
    const keyGenerator = createTestKeyGenerator()
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const initialValue = Array.from({length: 150}, () => block(keyGenerator))
    await createTestEditor({
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
      initialValue,
      keyGenerator,
    })
    const engine = engineRef.current!
    const insertedKey = keyGenerator()
    const throwingListener = () => {
      throw new Error('after failed')
    }
    engine.operationListeners.after.unshift(throwingListener)

    expect(() =>
      inTestChange(engine, () => {
        engine.apply({
          type: 'insert',
          path: [{_key: initialValue[2]!._key}],
          position: 'after',
          node: {
            _type: 'block',
            _key: insertedKey,
            children: [],
            markDefs: [],
            style: 'normal',
          },
        })
      }),
    ).toThrow('after failed')
    engine.operationListeners.after.shift()

    const value = engine.snapshot.context.value
    const flattened = engine.rootChunks.flatMap((chunk) => chunk.blocks)
    expect(flattened).toEqual(value)
    expect(flattened.map((child, index) => child === value[index])).toEqual(
      Array.from({length: 151}, () => true),
    )
    expect(
      (
        value.find(
          (child) => child._key === insertedKey,
        ) as PortableTextTextBlock
      ).children.length,
    ).toEqual(1)
    expect(
      value.map((child) =>
        engine.blockIndexMap.get(serializePath([{_key: child._key}])),
      ),
    ).toEqual(value.map((_, index) => index))
  })

  test.each(depths.slice(1))(
    'Scenario: Normalization fix operations render at $name after an outer apply throws',
    async ({wrap}) => {
      const keyGenerator = createTestKeyGenerator()
      const engineRef = React.createRef<PortableTextEditorEngine>()
      const blocks = Array.from({length: 150}, () => block(keyGenerator))
      const wrapped = wrap(blocks, keyGenerator)
      const {editor, locator} = await createTestEditor({
        children: (
          <>
            <NodePlugin nodes={containers} />
            <InternalEditorEngineRefPlugin ref={engineRef} />
          </>
        ),
        initialValue: wrapped.value as never,
        keyGenerator,
        schemaDefinition,
      })
      const engine = engineRef.current!
      const insertedKey = keyGenerator()
      const throwingListener = () => {
        throw new Error('after failed')
      }
      engine.operationListeners.after.unshift(throwingListener)

      expect(() =>
        inTestChange(engine, () => {
          engine.apply({
            type: 'insert',
            path: [...wrapped.prefix, {_key: blocks[2]!._key}],
            position: 'after',
            node: {
              _type: 'block',
              _key: insertedKey,
              children: [],
              markDefs: [],
              style: 'normal',
            },
          })
        }),
      ).toThrow('after failed')
      engine.operationListeners.after.shift()

      const insertedBlock = getChildren(engine.snapshot, wrapped.prefix).map(
        (entry) => entry.node,
      )[3] as PortableTextTextBlock
      const insertedSpanPath = [
        ...wrapped.prefix,
        {_key: insertedKey},
        'children',
        {_key: insertedBlock.children[0]!._key},
      ] as Path

      await vi.waitFor(() => {
        const children = getChildren(engine.snapshot, wrapped.prefix).map(
          (entry) => entry.node,
        )
        const containerPath = serializePath(wrapped.prefix.slice(0, -1))
        const containerElement = locator
          .element()
          .querySelector(`[data-pt-path='${containerPath}']`)
        const renderedChildren = Array.from(
          containerElement?.querySelectorAll('[data-pt-block]') ?? [],
        ).filter(
          (element) =>
            element.closest('[data-pt-block="container"]') === containerElement,
        )
        expect({
          childCount: children.length,
          insertedBlock: {
            key: insertedBlock._key,
            spanCount: insertedBlock.children.length,
          },
          renderedChildCount: renderedChildren.length,
          renderedKeysAroundInsert: renderedChildren
            .slice(2, 5)
            .map((element) => element.getAttribute('data-pt-path')),
          renderedSpan:
            locator
              .element()
              .querySelector(
                `[data-pt-path='${serializePath(insertedSpanPath)}']`,
              ) !== null,
        }).toEqual({
          childCount: 151,
          insertedBlock: {key: insertedKey, spanCount: 1},
          renderedChildCount: 151,
          renderedKeysAroundInsert: [
            serializePath([...wrapped.prefix, {_key: blocks[2]!._key}]),
            serializePath([...wrapped.prefix, {_key: insertedKey}]),
            serializePath([...wrapped.prefix, {_key: blocks[3]!._key}]),
          ],
          renderedSpan: true,
        })

        const flattened = engine.childChunks
          .get(serializePath(wrapped.prefix))!
          .flatMap((chunk) => chunk.blocks)
        expect(flattened).toEqual(children)
        expect(
          flattened.map((child, index) => child === children[index]),
        ).toEqual(Array.from({length: 151}, () => true))
      })

      const insertedLocally = block(keyGenerator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: insertedSpanPath, offset: 0},
          focus: {path: insertedSpanPath, offset: 0},
        },
      })
      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
          insertedSpanPath,
        ),
      )
      editor.send({
        type: 'insert.block',
        block: insertedLocally,
        placement: 'after',
      })

      await expect
        .element(locator.getByText(insertedLocally._key))
        .toBeInTheDocument()
    },
  )
})

function block(keyGenerator: () => string): PortableTextTextBlock {
  const blockKey = keyGenerator()
  return {
    _type: 'block',
    _key: blockKey,
    children: [
      {_type: 'span', _key: keyGenerator(), text: blockKey, marks: []},
    ],
    markDefs: [],
    style: 'normal',
  }
}

function fooBlock(keyGenerator: () => string): PortableTextTextBlock {
  return {
    _type: 'block',
    _key: keyGenerator(),
    children: [{_type: 'span', _key: keyGenerator(), text: 'foo', marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function chunkLengths(
  editor: PortableTextEditorEngine,
  childArrayPath: string,
): Array<number> | undefined {
  return editor.childChunks
    .get(childArrayPath)
    ?.map((chunk) => chunk.blocks.length)
}

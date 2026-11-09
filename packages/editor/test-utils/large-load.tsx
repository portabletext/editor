import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {EditorProvider, PortableTextEditable, type Editor} from '../src'
import {useEditor} from '../src/editor/use-editor'
import type {Path} from '../src/engine/interfaces/path'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'
import {
  createWrapperKeys,
  loadContainers,
  loadSchemaDefinition,
  textBlock,
  type LoadDepth,
} from './load-depths'
import {LoadOnMount} from './load-on-mount'

export const largeBlockCount = 450

export type LargeBlock = {blockKey: string; spanKey: string}

/**
 * Where a test aims inside a large value: the first chunk, a middle chunk,
 * or the last chunk, which is the one still undrawn longest.
 */
export const drawPositions = [
  {name: 'first chunk', index: 0},
  {name: 'middle chunk', index: 250},
  {name: 'last chunk', index: largeBlockCount - 1},
] as const

/**
 * Renders a large first value sent with `load` from a mount effect, and
 * returns once the first block is in the DOM. Every block's text is its own
 * `_key`, so a block is drawn when its key is found in the DOM. With
 * `tableEvery`, every that-many-th block is a table holding the text block.
 */
export async function renderLargeLoad(options: {
  depth: LoadDepth
  keyGenerator?: () => string
  tableEvery?: number
}) {
  const keyGenerator = options.keyGenerator ?? createTestKeyGenerator()
  const wrapperKey = createWrapperKeys(keyGenerator)
  const keys: Array<LargeBlock> = Array.from({length: largeBlockCount}, () => ({
    blockKey: keyGenerator(),
    spanKey: keyGenerator(),
  }))
  const blocksWith = (texts: (key: LargeBlock, index: number) => string) =>
    keys.map((key, index): PortableTextBlock => {
      const text = textBlock(key.blockKey, key.spanKey, texts(key, index))
      if (!options.tableEvery || index % options.tableEvery !== 0) {
        return text
      }
      return {
        _type: 'table',
        _key: `table-${key.blockKey}`,
        rows: [
          {
            _type: 'row',
            _key: `row-${key.blockKey}`,
            cells: [
              {_type: 'cell', _key: `cell-${key.blockKey}`, content: [text]},
            ],
          },
        ],
      }
    })
  const loaded = options.depth.wrap(
    blocksWith((key) => key.blockKey),
    wrapperKey,
  )
  const editorRef = React.createRef<Editor>()
  const engineRef = React.createRef<PortableTextEditorEngine>()
  const records: Array<never> = []
  const loads = [loaded.value]
  const userChanges: Array<unknown> = []

  const screen = await render(
    <EditorProvider
      initialConfig={{keyGenerator, schemaDefinition: loadSchemaDefinition}}
    >
      <EditorRefPlugin ref={editorRef} />
      <InternalEditorEngineRefPlugin ref={engineRef} />
      <NodePlugin nodes={loadContainers} />
      <PortableTextEditable />
      <ChangeCollector userChanges={userChanges} />
      <LoadOnMount loads={loads} records={records} />
    </EditorProvider>,
  )

  const editable = () => document.querySelector<HTMLElement>('[data-pt-editor]')
  const isDrawn = (blockKey: string) =>
    editable()?.textContent?.includes(blockKey) ?? false

  await vi.waitFor(() => expect(isDrawn(keys[0]!.blockKey)).toEqual(true), {
    timeout: 10_000,
  })

  return {
    editor: editorRef.current!,
    engine: engineRef.current!,
    keys,
    loaded,
    prefix: loaded.prefix as Path,
    wrap: (blocks: Array<PortableTextBlock>) =>
      options.depth.wrap(blocks, wrapperKey).value,
    blocksWith,
    userChanges,
    unmount: () => screen.unmount(),
    isDrawn,
    /**
     * The editor is mid-draw: the last block is not in the DOM yet and the
     * editable is not editable. Tests that act "during the draw" assert this
     * first, so they cannot pass on an editor that has no draw.
     */
    expectMidDraw() {
      expect(isDrawn(keys.at(-1)!.blockKey)).toEqual(false)
      expect(editable()?.getAttribute('contenteditable')).toEqual('false')
    },
    isEditable: () => editable()?.getAttribute('contenteditable') === 'true',
    spanPath: (index: number): Path => [
      ...loaded.prefix,
      ...(options.tableEvery && index % options.tableEvery === 0
        ? [
            {_key: `table-${keys[index]!.blockKey}`},
            'rows',
            {_key: `row-${keys[index]!.blockKey}`},
            'cells',
            {_key: `cell-${keys[index]!.blockKey}`},
            'content',
          ]
        : []),
      {_key: keys[index]!.blockKey},
      'children',
      {_key: keys[index]!.spanKey},
    ],
    /**
     * Polls until the last block is drawn, recording whether the editor was
     * editable at each poll. Editable before the last block is drawn is the
     * bug the gate prevents.
     */
    async drawToTheEnd() {
      const polls: Array<{lastDrawn: boolean; editable: boolean}> = []
      await vi.waitFor(
        () => {
          polls.push({
            lastDrawn: isDrawn(keys.at(-1)!.blockKey),
            editable: editable()?.getAttribute('contenteditable') === 'true',
          })
          expect(polls.at(-1)!.lastDrawn).toEqual(true)
        },
        {timeout: 20_000},
      )
      return polls
    },
  }
}

export type LargeLoad = Awaited<ReturnType<typeof renderLargeLoad>>

function ChangeCollector(props: {userChanges: Array<unknown>}) {
  const editor = useEditor()

  React.useEffect(() => {
    const subscription = editor.on('change', (event) => {
      if (event.origin === 'local') {
        props.userChanges.push(event)
      }
    })
    return () => subscription.unsubscribe()
  }, [editor, props.userChanges])

  return null
}

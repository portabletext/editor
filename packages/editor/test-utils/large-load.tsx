import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {createRoot} from 'react-dom/client'
import {expect, onTestFinished, vi} from 'vitest'
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

const largeBlockCount = 3000

/**
 * At a container depth the value is many sibling containers rather than one
 * container holding every block: a single container with thousands of
 * children is one root block, so it is drawn in one chunk.
 */
const blocksPerContainer = 3

type LargeBlock = {blockKey: string; spanKey: string}

/**
 * Where a test aims inside a large value: the first chunk, a middle chunk,
 * or the last chunk, which is the one still undrawn longest.
 */
export const drawPositions = [
  {name: 'first chunk', index: 0},
  {name: 'middle chunk', index: 1500},
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
  const tableKeys = new Map(
    keys.map((key) => [
      key.blockKey,
      {table: keyGenerator(), row: keyGenerator(), cell: keyGenerator()},
    ]),
  )
  const groupWrapperKeys = new Map<
    number,
    ReturnType<typeof createWrapperKeys>
  >()
  const blocksWith = (texts: (key: LargeBlock, index: number) => string) =>
    keys.map((key, index): PortableTextBlock => {
      const text = textBlock(key.blockKey, key.spanKey, texts(key, index))
      if (!options.tableEvery || index % options.tableEvery !== 0) {
        return text
      }
      return {
        _type: 'table',
        _key: tableKeys.get(key.blockKey)!.table,
        rows: [
          {
            _type: 'row',
            _key: tableKeys.get(key.blockKey)!.row,
            cells: [
              {
                _type: 'cell',
                _key: tableKeys.get(key.blockKey)!.cell,
                content: [text],
              },
            ],
          },
        ],
      }
    })
  const groupBlocks = (blocks: Array<PortableTextBlock>) => {
    if (options.depth.name === 'root') {
      return [options.depth.wrap(blocks, wrapperKey)]
    }
    const groups: Array<ReturnType<typeof options.depth.wrap>> = []
    for (let start = 0; start < blocks.length; start += blocksPerContainer) {
      let groupKeys = groupWrapperKeys.get(start)
      if (!groupKeys) {
        groupKeys = createWrapperKeys(keyGenerator)
        groupWrapperKeys.set(start, groupKeys)
      }
      groups.push(
        options.depth.wrap(
          blocks.slice(start, start + blocksPerContainer),
          groupKeys,
        ),
      )
    }
    return groups
  }
  const buildValue = (blocks: Array<PortableTextBlock>) => {
    return groupBlocks(blocks).flatMap((group) => group.value)
  }
  const loadedGroups = (() => {
    return groupBlocks(blocksWith((key) => key.blockKey))
  })()
  const loaded = {
    value: loadedGroups.flatMap((group) => group.value),
    prefix: loadedGroups[0]!.prefix,
  }
  const prefixFor = (index: number): Path =>
    options.depth.name === 'root'
      ? loaded.prefix
      : loadedGroups[Math.floor(index / blocksPerContainer)]!.prefix
  const editorRef = React.createRef<Editor>()
  const engineRef = React.createRef<PortableTextEditorEngine>()
  const records: Array<never> = []
  const loads = [loaded.value]
  const userChanges: Array<unknown> = []

  // Mounted without `act`: `act` waits for the scheduled work to settle,
  // which is the whole draw, and the tests act during it.
  const container = document.body.appendChild(document.createElement('div'))
  const root = createRoot(container)
  let unmounted = false
  const unmount = () => {
    if (!unmounted) {
      unmounted = true
      root.unmount()
      container.remove()
    }
  }
  onTestFinished(unmount)
  root.render(
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
  // A block is drawn when its element is in the DOM; its text may have been
  // changed by the test, so the key is read from the element's path.
  const isDrawn = (blockKey: string) =>
    editable()?.querySelector(
      `[data-pt-block][data-pt-path$='_key=="${blockKey}"]']`,
    ) !== null && editable() !== null

  await vi.waitFor(() => expect(isDrawn(keys[0]!.blockKey)).toEqual(true), {
    timeout: 10_000,
  })

  return {
    editor: editorRef.current!,
    engine: engineRef.current!,
    keys,
    loaded,
    prefix: loaded.prefix as Path,
    wrap: (blocks: Array<PortableTextBlock>) => buildValue(blocks),
    blocksWith,
    userChanges,
    unmount,
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
      ...prefixFor(index),
      ...(options.tableEvery && index % options.tableEvery === 0
        ? [
            {_key: tableKeys.get(keys[index]!.blockKey)!.table},
            'rows',
            {_key: tableKeys.get(keys[index]!.blockKey)!.row},
            'cells',
            {_key: tableKeys.get(keys[index]!.blockKey)!.cell},
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

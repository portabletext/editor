import type {PortableTextBlock} from '@portabletext/schema'
import {applyAll, type Patch} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {afterEach, describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
} from '../src'
import {safeStringify} from '../src/internal-utils/safe-json'
import {EventListenerPlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'

const probe = globalThis as typeof globalThis & Record<string, any>

type Variant = 'baseline' | 'budget' | 'c' | 'c-eager' | 'split-c'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
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
  ],
})

const nodes = [
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    render: ({children}) => (
      <table>
        <tbody>{children}</tbody>
      </table>
    ),
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
    render: ({children}) => <tr>{children}</tr>,
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
    render: ({children}) => <td>{children}</td>,
  }),
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <aside>{children}</aside>,
  }),
]

afterEach(() => {
  for (const key of Object.keys(probe)) {
    if (key.startsWith('__LOAD_PROBE_')) {
      delete probe[key]
    }
  }
})

describe('load stream spike', () => {
  for (const run of [1, 2]) {
    test(`pass5 gated timing run=${run}`, async () => {
      const result = await measure({
        count: 6000,
        gated: true,
        variant: 'c',
        withTables: false,
      })
      console.warn(`PASS5_GATED ${safeStringify({run, ...result})}`)
      expect(result.valueCorrect).toEqual(true)
    }, 300_000)
  }

  for (const variant of ['c', 'baseline'] as const) {
    for (const withTables of [false, true]) {
      for (const action of [
        'select-all-type',
        'select-all-backspace',
        'document-end-type',
        'extend-document-end-type',
        'page-arrow-type',
        'paste-fragment',
        'remote-during-selection',
      ] as const) {
        test(`pass5 action ${variant} tables=${withTables} ${action}`, async () => {
          const actionResult = await runPass5Action({
            action,
            variant,
            withTables,
          })
          console.warn(`PASS5_ACTION ${safeStringify(actionResult)}`)
          expect(actionResult.tailWasRendering).toEqual(true)
          expect(actionResult.errors).toEqual([])
          if (action === 'remote-during-selection') {
            expect(actionResult.remotePatchPresent).toEqual(true)
          }
        }, 300_000)
      }
    }
  }

  test('pass4 editable during chunked render tail', async () => {
    configure('c')
    const editorRef = React.createRef<Editor>()
    let resolveInteraction: (result: {
      hadCaret: boolean
      tailWasStillRendering: boolean
      typed: boolean
    }) => void
    const interaction = new Promise<{
      hadCaret: boolean
      tailWasStillRendering: boolean
      typed: boolean
    }>((resolve) => {
      resolveInteraction = resolve
    })
    let interactionStarted = false
    probe['__LOAD_PROBE_FIRST__'] = () => {
      if (interactionStarted) {
        return
      }
      interactionStarted = true
      void (async () => {
        const tailWasStillRendering = !(
          document.body.textContent ?? ''
        ).includes(lastText(20_000, false))
        const firstText = Array.from(document.querySelectorAll('span')).find(
          (element) => element.textContent?.startsWith('Block 0 has'),
        )!
        await userEvent.click(firstText)
        const hadCaret =
          editorRef.current!.getSnapshot().context.selection !== null
        await userEvent.keyboard('X')
        const typed = safeStringify(
          editorRef.current!.getSnapshot().context.value,
        ).includes('X')
        resolveInteraction({hadCaret, tailWasStillRendering, typed})
      })()
    }
    const result = await render(
      <EditorProvider
        initialConfig={{
          schemaDefinition,
          initialValue: createValue(20_000, false),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <NodePlugin nodes={nodes} />
        <PortableTextEditable />
      </EditorProvider>,
    )
    const {hadCaret, tailWasStillRendering, typed} = await interaction
    console.warn(
      `EDITABLE_RESULT ${safeStringify({hadCaret, tailWasStillRendering, typed})}`,
    )
    expect([tailWasStillRendering, hadCaret, typed]).toEqual([true, true, true])
    result.unmount()
  }, 300_000)

  for (const row of [
    {count: 1000, variant: 'c', withTables: false},
    {count: 6000, variant: 'c', withTables: false},
    {count: 20_000, variant: 'c', withTables: false},
    {count: 6000, variant: 'c', withTables: true},
    {count: 20_000, variant: 'split-c', withTables: false},
  ] as const) {
    for (const run of [1, 2]) {
      test(`pass4 measure ${row.variant} ${row.count} tables=${row.withTables} run=${run}`, async () => {
        const result = await measure(row)
        console.warn(
          `PASS4_LOAD_RESULT ${safeStringify({...row, run, ...result})}`,
        )
        expect(result.valueCorrect).toEqual(true)
      }, 600_000)
    }
  }

  for (const count of [1000, 6000]) {
    for (const withTables of [false, true]) {
      for (const variant of ['baseline', 'budget', 'c', 'split-c'] as const) {
        for (const run of [1, 2]) {
          test(`measure ${variant} ${count} tables=${withTables} run=${run}`, async () => {
            const result = await measure({count, variant, withTables})
            console.warn(
              `LOAD_RESULT ${safeStringify({count, withTables, variant, run, ...result})}`,
            )
            expect(result.valueCorrect).toEqual(true)
          }, 300_000)
        }
      }
    }
  }

  for (const variant of ['baseline', 'budget', 'c', 'split-c'] as const) {
    test(`correctness ${variant}: remote patches at every depth`, async () => {
      configure(variant)
      const count = 1000
      const value = createValue(count, true)
      const editorRef = React.createRef<Editor>()
      let sent = false
      probe['__LOAD_PROBE_FIRST__'] = () => {
        if (sent || !editorRef.current) {
          return
        }
        sendDepthPatches(editorRef.current, count)
        sent = true
      }
      const result = await render(
        <EditorProvider initialConfig={{schemaDefinition, initialValue: value}}>
          <EditorRefPlugin ref={editorRef} />
          <NodePlugin nodes={nodes} />
          <PortableTextEditable />
        </EditorProvider>,
      )

      await vi.waitFor(
        () => {
          const snapshotText = safeStringify(
            editorRef.current!.getSnapshot().context.value,
          )
          const domText = document.body.textContent ?? ''
          expect(sent).toEqual(true)
          expect([
            snapshotText.includes('ROOT RENDERED'),
            snapshotText.includes('CELL RENDERED'),
            snapshotText.includes('ROOT NOT LOADED'),
            snapshotText.includes('CELL NOT RENDERED'),
            domText.includes('ROOT RENDERED'),
            domText.includes('CELL RENDERED'),
            domText.includes('ROOT NOT LOADED'),
            domText.includes('CELL NOT RENDERED'),
          ]).toEqual([true, true, true, true, true, true, true, true])
        },
        {timeout: 120_000},
      )
      result.unmount()
    }, 300_000)

    test(`correctness ${variant}: host update and unmount mid-load`, async () => {
      configure(variant)
      const editorRef = React.createRef<Editor>()
      const replacement = createValue(20, false).map((block) => ({
        ...block,
        _key: `host-${block._key}`,
      }))
      let updatedBeforeTailPainted = false
      probe['__LOAD_PROBE_FIRST__'] = () => {
        if (!editorRef.current || updatedBeforeTailPainted) {
          return
        }
        updatedBeforeTailPainted = !(document.body.textContent ?? '').includes(
          'Block 999 has',
        )
        editorRef.current.send({type: 'update value', value: replacement})
      }
      const errors: Array<unknown> = []
      const onError = (event: ErrorEvent) => errors.push(event.error)
      globalThis.addEventListener('error', onError)
      const result = await render(
        <EditorProvider
          initialConfig={{
            schemaDefinition,
            initialValue: createValue(1000, true),
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <NodePlugin nodes={nodes} />
          <PortableTextEditable />
        </EditorProvider>,
      )
      await vi.waitFor(
        () =>
          expect(
            (document.body.textContent ?? '').includes('Block 1 has'),
          ).toEqual(true),
        {timeout: 120_000},
      )
      await vi.waitFor(
        () =>
          expect(editorRef.current!.getSnapshot().context.value).toEqual(
            replacement,
          ),
        {timeout: 120_000},
      )
      result.unmount()
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      )
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      )
      globalThis.removeEventListener('error', onError)
      expect(updatedBeforeTailPainted).toEqual(true)
      expect(errors).toEqual([])
      expect(probe['__LOAD_PROBE_PAINTED_PENDING__'] ?? 0).toEqual(0)
    }, 300_000)

    test(`correctness ${variant}: unmount mid-load`, async () => {
      configure(variant)
      let paintedAfterUnmount = false
      probe['__LOAD_PROBE_PAINTED__'] = () => {
        paintedAfterUnmount = true
      }
      const errors: Array<unknown> = []
      const onError = (event: ErrorEvent) => errors.push(event.error)
      globalThis.addEventListener('error', onError)
      await render(<UnmountHarness initialValue={createValue(6000, true)} />)
      await vi.waitFor(
        () =>
          expect(
            (document.body.textContent ?? '').includes('probe unmounted'),
          ).toEqual(true),
        {timeout: 120_000},
      )
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      )
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      )
      globalThis.removeEventListener('error', onError)
      expect(errors).toEqual([])
      expect(paintedAfterUnmount).toEqual(false)
    }, 300_000)
  }

  for (const variant of ['c-eager', 'c'] as const) {
    for (const run of [1, 2]) {
      test(`profile normalization ${variant} run=${run}`, async () => {
        probe['__LOAD_PROBE_NORMALIZE__'] = {}
        probe['__LOAD_PROBE_FALLBACK__'] = {}
        const result = await measure({
          count: 6000,
          variant,
          withTables: false,
        })
        console.warn(
          `NORMALIZE_RESULT ${safeStringify({variant, run, result, normalize: probe['__LOAD_PROBE_NORMALIZE__'], fallback: probe['__LOAD_PROBE_FALLBACK__']})}`,
        )
        expect(result.valueCorrect).toEqual(true)
      }, 300_000)
    }
  }

  for (const shape of [
    'empty-children',
    'missing-marks',
    'missing-key',
    'duplicate-keys',
    'unknown-mark',
    'non-object',
    'combined',
  ] as const) {
    test(`repair equivalence: ${shape}`, async () => {
      const value = repairFixture(shape)
      const eager = await loadRepairFixture('c-eager', value)
      const deferred = await loadRepairFixture('c', value)
      const split = await loadRepairFixture('split-c', value)
      const baseline = await loadRepairFixture('baseline', value)
      const comparePatchResults =
        shape !== 'non-object' && shape !== 'combined'
      const eagerPatched = comparePatchResults
        ? applyAll(value, correctionPatches(eager))
        : undefined
      const baselinePatched = comparePatchResults
        ? applyAll(value, correctionPatches(baseline))
        : undefined
      console.warn(
        `REPAIR_RESULT ${safeStringify({shape, eager, deferred, split, baseline, patchResultsEqual: safeStringify(eagerPatched) === safeStringify(baselinePatched), eagerPatchesReachValue: safeStringify(eagerPatched) === safeStringify(eager.value), baselinePatchesReachValue: safeStringify(baselinePatched) === safeStringify(baseline.value)})}`,
      )
      expect(deferred).toEqual(eager)
      expect(split).toEqual(eager)
    }, 300_000)
  }
})

function UnmountHarness({
  initialValue,
}: {
  initialValue: Array<PortableTextBlock>
}) {
  const [mounted, setMounted] = React.useState(true)
  if (mounted) {
    probe['__LOAD_PROBE_FIRST__'] = () => setMounted(false)
  }
  return mounted ? (
    <EditorProvider initialConfig={{schemaDefinition, initialValue}}>
      <NodePlugin nodes={nodes} />
      <PortableTextEditable />
    </EditorProvider>
  ) : (
    <>probe unmounted</>
  )
}

function correctionPatches(result: {changes: Array<unknown>}): Array<Patch> {
  return result.changes.flatMap((change) =>
    'patches' in (change as Record<string, unknown>)
      ? ((change as {patches: Array<Patch>}).patches ?? [])
      : [],
  )
}

async function measure({
  count,
  gated = false,
  variant,
  withTables,
}: {
  count: number
  gated?: boolean
  variant: Variant
  withTables: boolean
}) {
  configure(variant)
  if (gated) {
    probe['__LOAD_PROBE_PASS5_UNCHUNKED__'] = true
  }
  probe['__LOAD_PROBE_COMMITS__'] = []
  probe['__LOAD_PROBE_PROFILE__'] = {}
  let readyAt = 0
  let actualEditableAt = 0
  let paintedAt = 0
  const editorRef = React.createRef<Editor>()
  probe['__LOAD_PROBE_PAINTED__'] = () => {
    paintedAt ||= performance.now()
    if (gated && editorRef.current) {
      editorRef.current.send({type: 'update readOnly', readOnly: false})
    }
  }
  const longTasks: Array<number> = []
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      longTasks.push(entry.duration)
    }
  })
  observer.observe({type: 'longtask', buffered: false})
  let inputAt = 0
  const start = performance.now()
  const expectedInputAt = start + 500
  const onInput = () => {
    inputAt ||= performance.now()
  }
  document.addEventListener('keydown', onInput)
  document.addEventListener('click', onInput)
  const inputTimer = setTimeout(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true}))
    document.dispatchEvent(new MouseEvent('click', {bubbles: true}))
  }, 500)
  const value = createValue(count, withTables)
  probe['__LOAD_PROBE_LAST_TEXT__'] = lastText(count, withTables)
  const result = await render(
    <EditorProvider
      initialConfig={{schemaDefinition, initialValue: value, readOnly: gated}}
    >
      <EditorRefPlugin ref={editorRef} />
      <NodePlugin nodes={nodes} />
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'ready') {
            readyAt ||= performance.now()
          }
          if (event.type === 'editable') {
            actualEditableAt ||= performance.now()
          }
        }}
      />
      <PortableTextEditable />
    </EditorProvider>,
  )
  await vi.waitFor(
    () =>
      expect(
        (document.body.textContent ?? '').includes(lastText(count, withTables)),
      ).toEqual(true),
    {timeout: 240_000},
  )
  paintedAt ||= performance.now()
  await vi.waitFor(() => expect(inputAt > 0).toEqual(true), {timeout: 120_000})
  if (gated) {
    await vi.waitFor(() => expect(actualEditableAt > 0).toEqual(true), {
      timeout: 120_000,
    })
  }
  const commits = probe['__LOAD_PROBE_COMMITS__'] as Array<{
    at: number
    first: boolean
    limit: number
  }>
  const firstAt = commits.find((commit) => commit.first)?.at ?? 0
  const editableAt = gated
    ? actualEditableAt
    : variant === 'c' || variant === 'split-c'
      ? paintedAt
      : readyAt
  const snapshotValue = editorRef.current!.getSnapshot().context.value
  expect(snapshotValue).toEqual(value)
  const profile = {...probe['__LOAD_PROBE_PROFILE__']}
  clearTimeout(inputTimer)
  document.removeEventListener('keydown', onInput)
  document.removeEventListener('click', onInput)
  observer.disconnect()
  result.unmount()
  return {
    firstBlock: Math.round(firstAt - start),
    ready: Math.round(readyAt - start),
    editable: Math.round(editableAt - start),
    allPainted: Math.round(paintedAt - start),
    longestTask: Math.round(Math.max(0, ...longTasks)),
    inputDelay: Math.round(Math.max(0, inputAt - expectedInputAt)),
    commits: commits.length,
    profile,
    valueCorrect: true,
  }
}

type Pass5Action =
  | 'select-all-type'
  | 'select-all-backspace'
  | 'document-end-type'
  | 'extend-document-end-type'
  | 'page-arrow-type'
  | 'paste-fragment'
  | 'remote-during-selection'

type Pass5Interaction = {
  afterAction: ReturnType<typeof summarizeValue>
  afterUndo?: ReturnType<typeof summarizeValue>
  before: ReturnType<typeof summarizeValue>
  domSelectionBefore: {anchorOffset: number; focusOffset: number; text: string} | null
  editable: boolean
  engineSelectionBefore: unknown
  navigationDuration?: number
  tailWasRendering: boolean
}

async function runPass5Action({
  action,
  variant,
  withTables,
}: {
  action: Pass5Action
  variant: 'c' | 'baseline'
  withTables: boolean
}) {
  configure(variant)
  probe['__LOAD_PROBE_PASS5_UNCHUNKED__'] = true
  probe['__LOAD_PROBE_LAST_TEXT__'] = lastText(6000, withTables)
  const editorRef = React.createRef<Editor>()
  const changes: Array<unknown> = []
  const errors: Array<string> = []
  const onError = (event: ErrorEvent) => errors.push(String(event.error))
  globalThis.addEventListener('error', onError)
  let resolveInteraction: (result: Pass5Interaction) => void
  const interaction = new Promise<Pass5Interaction>((resolve) => {
    resolveInteraction = resolve
  })
  let started = false
  probe['__LOAD_PROBE_FIRST__'] = () => {
    if (started || !editorRef.current) return
    started = true
    void (async () => {
      const tailWasRendering = !(document.body.textContent ?? '').includes(
        lastText(6000, withTables),
      )
      const renderedTextSpans = Array.from(document.querySelectorAll('span')).filter(
        (element) =>
          element.textContent?.startsWith('Block 0 has') ||
          element.textContent?.startsWith('Table 0 cell text') ||
          element.textContent?.startsWith('Block '),
      )
      const firstText =
        action === 'page-arrow-type'
          ? renderedTextSpans.at(-1)
          : renderedTextSpans[0]
      const editable = document.querySelector('[contenteditable="true"]')
      const before = summarizeValue(editorRef.current!.getSnapshot().context.value)
      if (firstText) await userEvent.click(firstText)
      let navigationDuration: number | undefined

      if (action === 'select-all-type' || action === 'select-all-backspace' || action === 'remote-during-selection') {
        await userEvent.keyboard('{Control>}a{/Control}')
      } else if (action === 'document-end-type') {
        await userEvent.keyboard('{Control>}{ArrowDown}{/Control}')
      } else if (action === 'extend-document-end-type') {
        await userEvent.keyboard('{Shift>}{Control>}{ArrowDown}{/Control}{/Shift}')
      } else if (action === 'page-arrow-type') {
        await userEvent.keyboard('{PageDown}{PageDown}{PageDown}')
        const navigationStart = performance.now()
        do {
          await userEvent.keyboard('{ArrowDown}')
        } while (performance.now() - navigationStart < 1000)
        navigationDuration = performance.now() - navigationStart
      }

      const engineSelectionBefore = editorRef.current!.getSnapshot().context.selection
      const browserSelection = globalThis.getSelection()
      const domSelectionBefore = browserSelection
        ? {
            anchorOffset: browserSelection.anchorOffset,
            focusOffset: browserSelection.focusOffset,
            text: browserSelection.toString().slice(0, 120),
          }
        : null

      if (action === 'select-all-type' || action === 'document-end-type' || action === 'extend-document-end-type' || action === 'page-arrow-type') {
        await userEvent.keyboard('x')
      } else if (action === 'select-all-backspace') {
        await userEvent.keyboard('{Backspace}')
      } else if (action === 'paste-fragment') {
        const fragment = [textBlockWithKeys('paste-a', 'paste-a-span', 'paste a'), textBlockWithKeys('paste-b', 'paste-b-span', 'paste b'), textBlockWithKeys('paste-c', 'paste-c-span', 'paste c')]
        const dataTransfer = new DataTransfer()
        dataTransfer.setData('application/x-portable-text', safeStringify(fragment))
        dataTransfer.setData('application/json', safeStringify(fragment))
        editorRef.current!.send({
          type: 'clipboard.paste',
          originEvent: {dataTransfer},
          position: {selection: editorRef.current!.getSnapshot().context.selection!},
        })
      } else {
        editorRef.current!.send({
          type: 'patches',
          snapshot: undefined,
          patches: [{type: 'set', path: [{_key: 'b5999'}, 'children', {_key: 's5999a'}, 'text'], value: 'REMOTE PASS 5'}],
        })
      }

      const afterAction = summarizeValue(editorRef.current!.getSnapshot().context.value)
      let afterUndo: ReturnType<typeof summarizeValue> | undefined
      if (action === 'select-all-type' || action === 'paste-fragment') {
        editorRef.current!.send({type: 'history.undo'})
        afterUndo = summarizeValue(editorRef.current!.getSnapshot().context.value)
      }
      resolveInteraction({
        afterAction,
        afterUndo,
        before,
        domSelectionBefore,
        editable: Boolean(editable),
        engineSelectionBefore,
        navigationDuration,
        tailWasRendering,
      })
    })()
  }
  const rendered = await render(
    <EditorProvider initialConfig={{schemaDefinition, initialValue: createValue(6000, withTables)}}>
      <EditorRefPlugin ref={editorRef} />
      <NodePlugin nodes={nodes} />
      <EventListenerPlugin on={(event) => {
        if (event.type === 'change' && event.origin === 'local') changes.push(event)
      }} />
      <PortableTextEditable />
    </EditorProvider>,
  )
  const during = await interaction
  const expectedTailText =
    action === 'remote-during-selection'
      ? 'REMOTE PASS 5'
      : lastText(6000, withTables)
  await vi.waitFor(() => expect((document.body.textContent ?? '').includes(expectedTailText)).toEqual(true), {timeout: 240_000})
  const finalValue = editorRef.current!.getSnapshot().context.value
  const final = summarizeValue(finalValue)
  const remotePatchPresent = safeStringify(finalValue).includes('REMOTE PASS 5')
  rendered.unmount()
  globalThis.removeEventListener('error', onError)
  return {
    action,
    variant,
    withTables,
    ...during,
    final,
    remotePatchPresent,
    changeEvents: changes.map((change: any) => ({operations: change.operations?.map((operation: any) => operation.type), patches: change.patches?.map((patch: any) => patch.type)})),
    errors,
  }
}

function summarizeValue(value: Array<PortableTextBlock>) {
  const serialized = safeStringify(value)
  return {
    blocks: value.length,
    firstText: serialized.match(/"text":"([^"]*)"/)?.[1] ?? '',
    hasTypedX: serialized.includes('x'),
    hasPasteA: serialized.includes('paste a'),
    hasPasteB: serialized.includes('paste b'),
    hasPasteC: serialized.includes('paste c'),
    hasRemote: serialized.includes('REMOTE PASS 5'),
    serializedLength: serialized.length,
  }
}

function configure(variant: Variant) {
  probe['__LOAD_PROBE_ACTIVE__'] = true
  probe['__LOAD_PROBE_BUDGET__'] = variant === 'budget' ? 12 : undefined
  probe['__LOAD_PROBE_FIRST_CHUNK__'] = 12
  probe['__LOAD_PROBE_OPTION_C__'] =
    variant === 'c' || variant === 'c-eager' || variant === 'split-c'
  probe['__LOAD_PROBE_DIRECT__'] = variant === 'c' || variant === 'c-eager'
  probe['__LOAD_PROBE_DEFER_NORMALIZATION__'] = variant === 'c'
  probe['__LOAD_PROBE_PATCH_NORMALIZATION__'] =
    variant === 'c-eager' || variant === 'split-c'
  probe['__LOAD_PROBE_SPLIT_ENGINE__'] = variant === 'split-c'
  probe['__LOAD_PROBE_ENGINE_BUDGET__'] = 12
  probe['__LOAD_PROBE_RENDER_STREAM__'] =
    variant === 'c' || variant === 'c-eager' || variant === 'split-c'
  probe['__LOAD_PROBE_RENDER_COUNT__'] = 12
  probe['__LOAD_PROBE_FORCE_TIMEOUT__'] = true
}

async function loadRepairFixture(
  variant: Variant,
  initialValue: Array<PortableTextBlock>,
) {
  configure(variant)
  probe['__LOAD_PROBE_RENDER_STREAM__'] = false
  const editorRef = React.createRef<Editor>()
  const changes: Array<unknown> = []
  let rejected = false
  const result = await render(
    <EditorProvider
      initialConfig={{
        schemaDefinition,
        keyGenerator: createTestKeyGenerator(),
        initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <NodePlugin nodes={nodes} />
      <EventListenerPlugin
        on={(event) => {
          if (
            event.type === 'patch' ||
            (event.type === 'change' && event.origin === 'local')
          ) {
            changes.push(event)
          }
          if (event.type === 'invalid value') {
            rejected = true
          }
        }}
      />
      <PortableTextEditable />
    </EditorProvider>,
  )
  await vi.waitFor(
    () =>
      expect(
        rejected ||
          editorRef.current!.getSnapshot().context.value.length ===
            initialValue.length,
      ).toEqual(true),
    {timeout: 120_000},
  )
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const loaded = {
    changes,
    rejected,
    value: editorRef.current!.getSnapshot().context.value,
  }
  await result.unmount()
  return loaded
}

type RepairShape =
  | 'empty-children'
  | 'missing-marks'
  | 'missing-key'
  | 'duplicate-keys'
  | 'unknown-mark'
  | 'non-object'
  | 'combined'

function repairFixture(shape: RepairShape): Array<PortableTextBlock> {
  const invalid = (prefix: string) => {
    const shapes = {
      'empty-children': [
        {
          _type: 'block',
          _key: `${prefix}-empty`,
          children: [],
          markDefs: [],
          style: 'normal',
        },
      ],
      'missing-marks': [
        {
          _type: 'block',
          _key: `${prefix}-missing-marks`,
          children: [
            {_type: 'span', _key: `${prefix}-span-missing-marks`, text: 'foo'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      'missing-key': [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              _key: `${prefix}-span-missing-block-key`,
              text: 'bar',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      'duplicate-keys': [
        textBlockWithKeys(
          `${prefix}-duplicate`,
          `${prefix}-duplicate-span-a`,
          'baz',
        ),
        textBlockWithKeys(
          `${prefix}-duplicate`,
          `${prefix}-duplicate-span-b`,
          'foo',
        ),
      ],
      'unknown-mark': [
        {
          _type: 'block',
          _key: `${prefix}-unknown-mark`,
          children: [
            {
              _type: 'span',
              _key: `${prefix}-unknown-mark-span`,
              text: 'bar',
              marks: ['unknown'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      'non-object': [42],
    }
    return shape === 'combined' ? Object.values(shapes).flat() : shapes[shape]
  }
  return [
    ...invalid('root'),
    {_type: 'callout', _key: 'callout', content: invalid('callout')},
    {
      _type: 'table',
      _key: 'repair-table',
      rows: [
        {
          _type: 'row',
          _key: 'repair-row',
          cells: [
            {
              _type: 'cell',
              _key: 'repair-cell',
              content: invalid('cell'),
            },
          ],
        },
      ],
    },
    {
      _type: 'callout',
      _key: 'outer-callout',
      content: [
        {
          _type: 'callout',
          _key: 'inner-callout',
          content: invalid('nested'),
        },
      ],
    },
  ] as Array<PortableTextBlock>
}

function textBlockWithKeys(blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function sendDepthPatches(editor: Editor, count: number) {
  editor.send({
    type: 'patches',
    snapshot: undefined,
    patches: [
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 's1a'}, 'text'],
        value: 'ROOT RENDERED',
      },
      {
        type: 'set',
        path: [
          {_key: 't10'},
          'rows',
          {_key: 't10r'},
          'cells',
          {_key: 't10c'},
          'content',
          {_key: 't10b'},
          'children',
          {_key: 't10s'},
          'text',
        ],
        value: 'CELL RENDERED',
      },
      {
        type: 'set',
        path: [
          {_key: `b${count - 1}`},
          'children',
          {_key: `s${count - 1}a`},
          'text',
        ],
        value: 'ROOT NOT LOADED',
      },
      {
        type: 'set',
        path: [
          {_key: 't990'},
          'rows',
          {_key: 't990r'},
          'cells',
          {_key: 't990c'},
          'content',
          {_key: 't990b'},
          'children',
          {_key: 't990s'},
          'text',
        ],
        value: 'CELL NOT RENDERED',
      },
    ],
  })
}

function createValue(
  count: number,
  withTables: boolean,
): Array<PortableTextBlock> {
  return Array.from({length: count}, (_, index) =>
    withTables && index % 10 === 0 ? table(index) : textBlock(index),
  ) as Array<PortableTextBlock>
}

function textBlock(index: number) {
  return {
    _type: 'block',
    _key: `b${index}`,
    children: [
      {
        _type: 'span',
        _key: `s${index}a`,
        text: `Block ${index} has some ordinary words in it, `,
        marks: [],
      },
      {_type: 'span', _key: `s${index}b`, text: 'some bold', marks: ['strong']},
      {_type: 'span', _key: `s${index}c`, text: ' and a tail.', marks: []},
    ],
    markDefs: [],
    style: 'normal',
  }
}

function table(index: number) {
  return {
    _type: 'table',
    _key: `t${index}`,
    rows: [
      {
        _type: 'row',
        _key: `t${index}r`,
        cells: [
          {
            _type: 'cell',
            _key: `t${index}c`,
            content: [
              {
                _type: 'block',
                _key: `t${index}b`,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: `t${index}s`,
                    text: `Table ${index} cell text`,
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}

function lastText(count: number, withTables: boolean) {
  const index = count - 1
  return withTables && index % 10 === 0
    ? `Table ${index} cell text`
    : `Block ${index} has`
}

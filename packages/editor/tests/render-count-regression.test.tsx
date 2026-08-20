import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React, {Profiler} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {cleanup, render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type BlockChildRenderProps,
  type BlockDecoratorRenderProps,
  type BlockRenderProps,
  type Editor,
  type PortableTextEditableProps,
  type RegistrableNode,
} from '../src'
import {safeStringify} from '../src/internal-utils/safe-json'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineContainer,
  defineDecorator,
  defineSpan,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {getSelectionAfterText} from '../test-utils/text-selection'

/**
 * Render-count regression suite for the consumer-facing render
 * callbacks (`defineContainer.render`, `renderBlock`, etc.).
 *
 * Why: a consumer's render callback is the entry point to their own JSX
 * tree (often expensive). It must not fire on keystrokes that don't
 * affect the rendered node's visible state. Without this guard, typing
 * one character triggers re-renders proportional to document size -
 * O(N) wrapper invocations per keystroke where N is the number of
 * visible containers.
 *
 * These tests pin the contract independently of how it is enforced
 * (per-wrapper memo equality / external-store subscriptions / compiler
 * memoization). Any render-pipeline refactor MUST keep them green.
 */
describe('Render count regression', () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'list',
        fields: [
          {
            name: 'items',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'list-item',
                fields: [
                  {
                    name: 'content',
                    type: 'array',
                    of: [{type: 'block'}, {type: 'list'}],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })

  type RenderCounter = {
    counts: Map<string, number>
    reset: () => void
  }

  function createRenderCounter(): RenderCounter {
    const counts = new Map<string, number>()
    return {
      counts,
      reset: () => counts.clear(),
    }
  }

  /**
   * Build a list with `siblingCount` items. Item 0 holds a single text
   * block that the test types into; items 1..N-1 are static siblings.
   * The contract: typing into item 0 must NOT re-render items 1..N-1.
   */
  function buildSiblingList(siblingCount: number) {
    const items: Array<Record<string, unknown>> = []
    for (let i = 0; i < siblingCount; i++) {
      items.push({
        _type: 'list-item',
        _key: `li${i}`,
        content: [
          {
            _type: 'block',
            _key: `b${i}`,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: `s${i}`, text: `item ${i}`, marks: []},
            ],
          },
        ],
      })
    }
    return {
      _type: 'list',
      _key: 'root-list',
      items,
    }
  }

  test('Typing into one sibling re-renders constant work, not O(N) siblings', async () => {
    const itemCounter = createRenderCounter()

    const listContainer = defineContainer({
      type: 'list',
      arrayField: 'items',
      render: ({children, node}) => (
        <ul data-testid={`list-${node._key}`}>{children}</ul>
      ),
    })

    const listItemContainer = defineContainer({
      type: 'list-item',
      arrayField: 'content',
      render: ({children, node}) => {
        const key = node._key
        itemCounter.counts.set(key, (itemCounter.counts.get(key) ?? 0) + 1)
        return <li data-testid={`li-${key}`}>{children}</li>
      },
    })

    const SIBLINGS = 20
    const initialValue = [buildSiblingList(SIBLINGS)]

    const {editor, locator} = await createTestEditor({
      schemaDefinition,
      initialValue: initialValue as never,
      children: <NodePlugin nodes={[listContainer, listItemContainer]} />,
    })

    await vi.waitFor(() =>
      expect(locator.getByTestId(`li-li${SIBLINGS - 1}`)).toBeInTheDocument(),
    )
    await vi.waitFor(() =>
      expect(locator.getByText('item 0')).toBeInTheDocument(),
    )

    // Settle: let any pending renders finish before resetting counters.
    await new Promise((r) => setTimeout(r, 100))
    itemCounter.reset()

    // Type a character at the start of item 0's span. Only li0's
    // content has visibly changed; siblings li1..liN-1 have neither
    // their model nor their focused/selected state changed.
    editor.send({
      type: 'insert.text',
      at: [
        {_key: 'root-list'},
        'items',
        {_key: 'li0'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ] as never,
      offset: 0,
      text: 'X',
    } as never)

    await vi.waitFor(() =>
      expect(locator.getByText('Xitem 0')).toBeInTheDocument(),
    )

    const itemRerenders = Array.from(itemCounter.counts.entries()).map(
      ([key, count]) => ({key, count}),
    )
    const itemTotal = itemRerenders.reduce((a, b) => a + b.count, 0)

    console.warn(
      `Sibling re-renders after insert.text at li0 (${SIBLINGS} siblings): ${itemTotal} total across ${itemRerenders.length} keys`,
    )

    // CONTRACT: re-rendering li0 is expected (its content changed). A
    // small bounded number of other re-renders is acceptable for
    // settle-passes through React's commit phase. What's NOT acceptable
    // is every sibling re-rendering once per keystroke - that's O(N)
    // work per keystroke linear in sibling count.
    //
    // We assert each individual sibling stays at zero re-renders, and
    // the total work is bounded by a small constant - independent of
    // SIBLINGS.
    for (const {key, count} of itemRerenders) {
      if (key === 'li0') {
        expect(count, `li0 re-rendered ${count}x`).toBeLessThanOrEqual(2)
      } else {
        expect(count, `sibling ${key} re-rendered ${count}x`).toBe(0)
      }
    }
    // Absolute bound: total work is constant, not proportional to siblings.
    expect(itemTotal).toBeLessThanOrEqual(3)
  }, 60_000)

  test('Mass unmount: deleting 100 blocks in one event does not crash', async () => {
    // Forward smoke test: 100 blocks unmount in one React commit ->
    // ~200 `useSyncExternalStore` subscription cleanups -> bounded
    // `Set.delete` calls against the `SelectionStateProvider`'s local
    // subscriber Set. Pins that the per-slice external-store
    // architecture introduced by PR #2666 doesn't crash under mass
    // unmount.
    //
    // What this test does NOT do: it doesn't replay the prior crash
    // mode that motivated `6409f2ce1` (collapsing per-span
    // `useSelector` into a shared context). That crash was N x
    // actor.unsubscribe in one commit; this test's cleanup path is
    // N x local `Set.delete`, which is structurally different. The
    // selection-state architecture keeps exactly ONE
    // `editorActor.subscribe` (in the provider) regardless of consumer
    // count, so the per-consumer actor-unsubscribe pressure that
    // 6409f2ce1 fixed is not what's being exercised here.
    //
    // The N blocks are mounted via `update value` AFTER
    // `createTestEditor` returns, not via `initialValue`.
    // `createTestEditor`'s internal mount `waitFor` is a hard-coded
    // 1s that consumers can't override; passing a large
    // `initialValue` stalls that mount on slower CI runners and
    // flakes the test. Mounting empty is fast; the subsequent
    // `update value` + DOM-presence waits use generous timeouts and
    // are not subject to the internal ceiling. The architectural
    // contract (N wrappers subscribe, then mass-unmount triggers
    // bounded `Set.delete` cleanups) is identical either way.

    const BLOCKS = 100

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
      })

      // Mount the N blocks via `update value` after the editor is
      // attached. The reconciler mounts N wrappers in one commit,
      // each subscribing to the `SelectionStateProvider`'s local
      // subscriber Set.
      const initialValue: Array<Record<string, unknown>> = []
      for (let i = 0; i < BLOCKS; i++) {
        initialValue.push({
          _type: 'block',
          _key: `b${i}`,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: `s${i}`, text: `block ${i}`, marks: []},
          ],
        })
      }
      editor.send({
        type: 'update value',
        value: initialValue as never,
      } as never)

      // Wait for the first and last blocks to be in the DOM, so we
      // know all N wrappers have mounted and subscribed.
      await vi.waitFor(
        () => expect(locator.getByText('block 0')).toBeInTheDocument(),
        {timeout: 10_000},
      )
      await vi.waitFor(
        () =>
          expect(locator.getByText(`block ${BLOCKS - 1}`)).toBeInTheDocument(),
        {timeout: 10_000},
      )

      // Settle.
      await new Promise((r) => setTimeout(r, 200))

      // Clear any pre-existing console.error calls from setup
      // (testing infra noise).
      errorSpy.mockClear()

      // Replace the entire value with a single empty block in one
      // event. React reconciles by unmounting all N blocks (and
      // their child span wrappers) in a single commit.
      editor.send({
        type: 'update value',
        value: [
          {
            _type: 'block',
            _key: 'after',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's-after', text: '', marks: []}],
          },
        ],
      } as never)

      // Wait for the old blocks to be gone from the DOM (which only
      // happens after the N wrappers finish unmounting and their
      // subscription cleanups run).
      await vi.waitFor(
        () => {
          expect(
            (document.body.textContent ?? '').includes(`block ${BLOCKS - 1}`),
            'last old block should have unmounted',
          ).toBe(false)
        },
        {timeout: 10_000},
      )

      // Settle: let all cleanup callbacks run.
      await new Promise((r) => setTimeout(r, 500))

      // CONTRACT: no subscriber/unmount/cleanup errors logged. Filter
      // out unrelated noise so the assertion stays focused on the
      // architectural concern being tested.
      const subscriberErrors = errorSpy.mock.calls.filter((args) => {
        const message = args.map((a) => String(a)).join(' ')
        return /subscrib|unmount|cleanup|set state on|memory leak|external store/i.test(
          message,
        )
      })

      expect(
        subscriberErrors,
        `Expected no subscriber/unmount errors during mass delete, got:\n${subscriberErrors
          .map((c) => c.map(String).join(' '))
          .join('\n---\n')}`,
      ).toHaveLength(0)

      // The editor remains responsive: type into the survivor block.
      editor.send({
        type: 'insert.text',
        at: [{_key: 'after'}, 'children', {_key: 's-after'}] as never,
        offset: 0,
        text: 'OK',
      } as never)

      await vi.waitFor(() =>
        expect(locator.getByText('OK')).toBeInTheDocument(),
      )
    } finally {
      errorSpy.mockRestore()
    }
  }, 60_000)
})

const SIBLING_BLOCKS = 50
const KEYSTROKES = 20
const RENDER_COUNT_TOLERANCE = 5

function buildSiblingBlock(key: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}-span`, text: key, marks: []}],
  }
}

function buildDocument(
  targetBlockKey: string,
  spanKeys: [string, string, string],
): Array<PortableTextBlock> {
  const before = Array.from({length: SIBLING_BLOCKS / 2}, (_, i) =>
    buildSiblingBlock(`sibling-before-${i}`),
  )
  const after = Array.from({length: SIBLING_BLOCKS / 2}, (_, i) =>
    buildSiblingBlock(`sibling-after-${i}`),
  )
  const targetBlock: PortableTextBlock = {
    _type: 'block',
    _key: targetBlockKey,
    style: 'normal',
    markDefs: [],
    children: [
      {_type: 'span', _key: spanKeys[0], text: 'foo', marks: []},
      {_type: 'span', _key: spanKeys[1], text: 'bar', marks: ['strong']},
      {_type: 'span', _key: spanKeys[2], text: 'baz', marks: []},
    ],
  }
  return [...before, targetBlock, ...after]
}

function median(values: Array<number>): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0)
}

type TypingScenarioResult = {
  editedBlockRenders: number
  siblingBlockRenders: Array<[string, number]>
  editedSpanRenders: number
  decoratorRenders: Array<[string, number]>
  withinBlockSiblingSpanKeys: [string, string]
  withinBlockSiblingSpanRenders: Array<[string, number]>
  siblingBlockSpanRenders: Array<[string, number]>
  medianCommitDuration: number
  commitCount: number
}

/**
 * The `Profiler` wraps `PortableTextEditable` only, so recorded commit
 * durations exclude `EditorProvider`/`NodePlugin` registration effects.
 */
async function runTypingScenario(options: {
  editableProps?: PortableTextEditableProps
  nodes?: Array<RegistrableNode>
  blockRenders: Map<string, number>
  spanRenders: Map<string, number>
  decoratorRenders: Map<string, number>
}): Promise<TypingScenarioResult> {
  const keyGenerator = createTestKeyGenerator()
  const targetBlockKey = keyGenerator()
  const spanKeys: [string, string, string] = [
    keyGenerator(),
    keyGenerator(),
    keyGenerator(),
  ]
  const initialValue = buildDocument(targetBlockKey, spanKeys)
  const editorRef = React.createRef<Editor>()
  const commitDurations: Array<number> = []

  render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      {options.nodes ? <NodePlugin nodes={options.nodes} /> : null}
      <Profiler
        id="render-path-perf-probe"
        onRender={(_id, _phase, actualDuration) => {
          commitDurations.push(actualDuration)
        }}
      >
        <PortableTextEditable {...options.editableProps} />
      </Profiler>
    </EditorProvider>,
  )

  const locator = page.getByRole('textbox')
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument(), {
    timeout: 10_000,
  })
  await vi.waitFor(() => expect(locator.getByText('bar')).toBeInTheDocument(), {
    timeout: 10_000,
  })

  const editor = editorRef.current!

  // If all three spans carried equal marks, normalize would merge them
  // into one span and silently break the per-span instrumentation below.
  const mountedTargetBlock = editor
    .getSnapshot()
    .context.value.find((block) => block._key === targetBlockKey)
  expect(mountedTargetBlock).toEqual({
    _type: 'block',
    _key: targetBlockKey,
    style: 'normal',
    markDefs: [],
    children: [
      {_type: 'span', _key: spanKeys[0], text: 'foo', marks: []},
      {_type: 'span', _key: spanKeys[1], text: 'bar', marks: ['strong']},
      {_type: 'span', _key: spanKeys[2], text: 'baz', marks: []},
    ],
  })

  await userEvent.click(locator.getByText('bar'))
  const selection = getSelectionAfterText(editor.getSnapshot().context, 'bar')
  editor.send({type: 'select', at: selection})
  await vi.waitFor(
    () => expect(editor.getSnapshot().context.selection).toEqual(selection),
    {timeout: 10_000},
  )

  // Settle: let any pending renders from the click and `select`
  // finish before resetting counters.
  await new Promise((resolve) => setTimeout(resolve, 100))

  options.blockRenders.clear()
  options.spanRenders.clear()
  options.decoratorRenders.clear()
  commitDurations.length = 0

  await userEvent.type(locator, 'x'.repeat(KEYSTROKES))

  await vi.waitFor(
    () =>
      expect(
        locator.getByText(`bar${'x'.repeat(KEYSTROKES)}`),
      ).toBeInTheDocument(),
    {timeout: 10_000},
  )

  const withinBlockSiblingSpanKeys: ReadonlySet<string> = new Set([
    spanKeys[0],
    spanKeys[2],
  ])

  return {
    editedBlockRenders: options.blockRenders.get(targetBlockKey) ?? 0,
    siblingBlockRenders: Array.from(options.blockRenders.entries()).filter(
      ([key]) => key !== targetBlockKey,
    ),
    editedSpanRenders: options.spanRenders.get(spanKeys[1]) ?? 0,
    decoratorRenders: Array.from(options.decoratorRenders.entries()),
    withinBlockSiblingSpanKeys: [spanKeys[0], spanKeys[2]],
    withinBlockSiblingSpanRenders: Array.from(
      options.spanRenders.entries(),
    ).filter(([key]) => withinBlockSiblingSpanKeys.has(key)),
    siblingBlockSpanRenders: Array.from(options.spanRenders.entries()).filter(
      ([key]) => key !== spanKeys[1] && !withinBlockSiblingSpanKeys.has(key),
    ),
    medianCommitDuration: median(commitDurations),
    commitCount: commitDurations.length,
  }
}

describe('Render path parity: legacy render props vs registered nodes', () => {
  test('Typing produces zero cross-block render callbacks, re-renders same-block sibling spans on every keystroke, fires the decorator callback once per edited-span render, and keeps edited-block and edited-span callbacks bounded in both configs; registered issues no more edited-block callbacks than legacy', async () => {
    const legacyBlockRenders = new Map<string, number>()
    const legacySpanRenders = new Map<string, number>()
    const legacyDecoratorRenders = new Map<string, number>()
    const renderBlock = (props: BlockRenderProps) => {
      legacyBlockRenders.set(
        props.value._key,
        (legacyBlockRenders.get(props.value._key) ?? 0) + 1,
      )
      return props.children
    }
    const renderChild = (props: BlockChildRenderProps) => {
      legacySpanRenders.set(
        props.value._key,
        (legacySpanRenders.get(props.value._key) ?? 0) + 1,
      )
      return props.children
    }
    const renderDecorator = (props: BlockDecoratorRenderProps) => {
      legacyDecoratorRenders.set(
        props.value,
        (legacyDecoratorRenders.get(props.value) ?? 0) + 1,
      )
      return props.children
    }

    const legacy = await runTypingScenario({
      editableProps: {renderBlock, renderChild, renderDecorator},
      blockRenders: legacyBlockRenders,
      spanRenders: legacySpanRenders,
      decoratorRenders: legacyDecoratorRenders,
    })

    await cleanup()

    const registeredBlockRenders = new Map<string, number>()
    const registeredSpanRenders = new Map<string, number>()
    const registeredDecoratorRenders = new Map<string, number>()
    const textBlock = defineTextBlock({
      type: 'block',
      render: (props) => {
        registeredBlockRenders.set(
          props.node._key,
          (registeredBlockRenders.get(props.node._key) ?? 0) + 1,
        )
        return props.renderDefault(props)
      },
    })
    const span = defineSpan({
      type: 'span',
      render: (props) => {
        registeredSpanRenders.set(
          props.node._key,
          (registeredSpanRenders.get(props.node._key) ?? 0) + 1,
        )
        return props.renderDefault(props)
      },
    })

    const decorator = defineDecorator({
      type: 'strong',
      render: (props) => {
        registeredDecoratorRenders.set(
          props.decorator,
          (registeredDecoratorRenders.get(props.decorator) ?? 0) + 1,
        )
        return props.renderDefault(props)
      },
    })

    const registered = await runTypingScenario({
      nodes: [textBlock, span, decorator],
      blockRenders: registeredBlockRenders,
      spanRenders: registeredSpanRenders,
      decoratorRenders: registeredDecoratorRenders,
    })

    expect(legacy.siblingBlockRenders).toEqual([])
    expect(registered.siblingBlockRenders).toEqual([])
    expect(legacy.siblingBlockSpanRenders).toEqual([])
    expect(registered.siblingBlockSpanRenders).toEqual([])
    expect(legacy.withinBlockSiblingSpanRenders).toEqual([
      [legacy.withinBlockSiblingSpanKeys[0], KEYSTROKES],
      [legacy.withinBlockSiblingSpanKeys[1], KEYSTROKES],
    ])
    expect(registered.withinBlockSiblingSpanRenders).toEqual([
      [registered.withinBlockSiblingSpanKeys[0], KEYSTROKES],
      [registered.withinBlockSiblingSpanKeys[1], KEYSTROKES],
    ])
    expect(legacy.decoratorRenders).toEqual([
      ['strong', legacy.editedSpanRenders],
    ])
    expect(registered.decoratorRenders).toEqual([
      ['strong', registered.editedSpanRenders],
    ])
    expect(legacy.editedBlockRenders).toBeLessThanOrEqual(
      KEYSTROKES + RENDER_COUNT_TOLERANCE,
    )
    expect(registered.editedBlockRenders).toBeLessThanOrEqual(
      KEYSTROKES + RENDER_COUNT_TOLERANCE,
    )
    expect(legacy.editedSpanRenders).toBeLessThanOrEqual(
      KEYSTROKES + RENDER_COUNT_TOLERANCE,
    )
    expect(registered.editedSpanRenders).toBeLessThanOrEqual(
      KEYSTROKES + RENDER_COUNT_TOLERANCE,
    )
    expect(registered.editedBlockRenders).toBeLessThanOrEqual(
      legacy.editedBlockRenders + RENDER_COUNT_TOLERANCE,
    )

    console.warn(
      `[legacy] edited-block renders: ${legacy.editedBlockRenders}, ` +
        `sibling-block renders: ${legacy.siblingBlockRenders.length}, ` +
        `edited-span renders: ${legacy.editedSpanRenders}, ` +
        `decorator renders: ${safeStringify(legacy.decoratorRenders)}, ` +
        `within-block sibling-span renders: ${safeStringify(legacy.withinBlockSiblingSpanRenders)}, ` +
        `sibling-block span renders: ${legacy.siblingBlockSpanRenders.length}, ` +
        `median commit: ${legacy.medianCommitDuration.toFixed(3)}ms across ${legacy.commitCount} commits ` +
        `(per-block work differs from registered: legacy's default block/child render runs ` +
        `useElementDropPosition/useListIndexSelector/useBlockSubSchema and extra wrapper divs)`,
    )
    console.warn(
      `[registered] edited-block renders: ${registered.editedBlockRenders}, ` +
        `sibling-block renders: ${registered.siblingBlockRenders.length}, ` +
        `edited-span renders: ${registered.editedSpanRenders}, ` +
        `decorator renders: ${safeStringify(registered.decoratorRenders)}, ` +
        `within-block sibling-span renders: ${safeStringify(registered.withinBlockSiblingSpanRenders)}, ` +
        `sibling-block span renders: ${registered.siblingBlockSpanRenders.length}, ` +
        `median commit: ${registered.medianCommitDuration.toFixed(3)}ms across ${registered.commitCount} commits ` +
        `(per-block work differs from legacy: registered's default block render is a single div)`,
    )
  }, 120_000)
})

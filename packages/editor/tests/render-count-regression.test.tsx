import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

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
      childField: 'items',
      render: ({children, node}) => (
        <ul data-testid={`list-${node._key}`}>{children}</ul>
      ),
    })

    const listItemContainer = defineContainer({
      type: 'list-item',
      childField: 'content',
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
      children: (
        <ContainerPlugin containers={[listContainer, listItemContainer]} />
      ),
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
})

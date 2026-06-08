import {describe, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {
  createEditorSlice,
  defineSchema,
  type EditorSnapshot,
  type Path,
} from '../src'
import {createTestEditor} from '../src/test/vitest'

/**
 * Exercises the public `createEditorSlice` primitive by building a
 * minimal slice that tracks per-block existence at the root level.
 *
 * The point isn't to test list-index or any specific signal — it's to
 * prove the primitive's contract: plugin authors use only public
 * exports; consumers reading via `useSlice` work regardless of where
 * they sit in the editor tree; re-renders only happen when the
 * selected value flips.
 */
describe('createEditorSlice', () => {
  // Slice: map of block key -> block index (root level).
  function buildBlockIndexMap(snapshot: EditorSnapshot): Map<string, number> {
    const map = new Map<string, number>()
    snapshot.context.value.forEach((block, index) => {
      map.set(block._key, index)
    })
    return map
  }

  function mapsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
    if (a === b) {
      return true
    }
    if (a.size !== b.size) {
      return false
    }
    for (const [key, value] of a) {
      if (b.get(key) !== value) {
        return false
      }
    }
    return true
  }

  const blockIndexSlice = createEditorSlice<Map<string, number>>({
    defaultState: new Map(),
    compute: buildBlockIndexMap,
    equal: mapsEqual,
    displayName: 'BlockIndexSlice',
  })

  function useBlockIndex(path: Path): number | undefined {
    const first = path[0]
    const key =
      typeof first === 'object' && first !== null && '_key' in first
        ? first._key
        : undefined
    return blockIndexSlice.useSlice((map) =>
      key === undefined ? undefined : map.get(key),
    )
  }

  test('useSlice resolves the live value at the right path', async () => {
    const initialValue = [
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'one', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'two', marks: []}],
      },
    ]

    function Probe({blockKey}: {blockKey: string}) {
      const index = useBlockIndex([{_key: blockKey}])
      return <span data-testid={`probe-${blockKey}-${index ?? 'none'}`} />
    }

    await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue: initialValue as never,
      children: (
        <>
          <blockIndexSlice.Plugin />
          <Probe blockKey="b0" />
          <Probe blockKey="b1" />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('probe-b0-0')).toBeInTheDocument()
      expect(page.getByTestId('probe-b1-1')).toBeInTheDocument()
    })
  })

  test('useSlice returns defaultState selection when Plugin is not mounted', async () => {
    function Probe({blockKey}: {blockKey: string}) {
      const index = useBlockIndex([{_key: blockKey}])
      return <span data-testid={`probe-${blockKey}-${index ?? 'none'}`} />
    }

    await createTestEditor({
      schemaDefinition: defineSchema({}),
      // No <blockIndexSlice.Plugin /> in children — slice unregistered.
      children: <Probe blockKey="b0" />,
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('probe-b0-none')).toBeInTheDocument()
    })
  })

  test('consumers whose selected value did not flip do not re-render', async () => {
    const initialValue = [
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'first', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'second', marks: []}],
      },
    ]

    const renderCounts = new Map<string, number>()

    function Probe({blockKey}: {blockKey: string}) {
      const index = useBlockIndex([{_key: blockKey}])
      renderCounts.set(blockKey, (renderCounts.get(blockKey) ?? 0) + 1)
      return <span data-testid={`probe-${blockKey}-${index ?? 'none'}`} />
    }

    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue: initialValue as never,
      children: (
        <>
          <blockIndexSlice.Plugin />
          <Probe blockKey="b0" />
          <Probe blockKey="b1" />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('probe-b0-0')).toBeInTheDocument()
      expect(page.getByTestId('probe-b1-1')).toBeInTheDocument()
    })

    // Settle.
    await new Promise((r) => setTimeout(r, 100))
    const baseline = new Map(renderCounts)

    // Update value: same blocks, same indices. b0's selected value
    // does NOT flip (still 0); b1's does NOT flip (still 1). Neither
    // probe should re-render.
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: 'b0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 's0', text: 'first edited', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: 'b1',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's1', text: 'second', marks: []}],
        },
      ] as never,
    } as never)

    // Give the engine a chance to fan the snapshot change through the
    // slice host. If a re-render were going to happen, it would by now.
    await new Promise((r) => setTimeout(r, 200))

    const b0Delta = (renderCounts.get('b0') ?? 0) - (baseline.get('b0') ?? 0)
    const b1Delta = (renderCounts.get('b1') ?? 0) - (baseline.get('b1') ?? 0)

    expect(b0Delta).toBe(0)
    expect(b1Delta).toBe(0)
  })

  test('consumers whose selected value flips do re-render', async () => {
    const initialValue = [
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'one', marks: []}],
      },
    ]

    const renderCounts = new Map<string, number>()

    function Probe({blockKey}: {blockKey: string}) {
      const index = useBlockIndex([{_key: blockKey}])
      renderCounts.set(blockKey, (renderCounts.get(blockKey) ?? 0) + 1)
      return <span data-testid={`probe-${blockKey}-${index ?? 'none'}`} />
    }

    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue: initialValue as never,
      children: (
        <>
          <blockIndexSlice.Plugin />
          <Probe blockKey="b0" />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('probe-b0-0')).toBeInTheDocument()
    })

    await new Promise((r) => setTimeout(r, 100))
    const baseline = renderCounts.get('b0') ?? 0

    // Prepend a new block. b0 shifts from index 0 -> index 1.
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: 'b-new',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'sn', text: 'zero', marks: []}],
        },
        {
          _type: 'block',
          _key: 'b0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's0', text: 'one', marks: []}],
        },
      ] as never,
    } as never)

    await vi.waitFor(() => {
      expect(page.getByTestId('probe-b0-1')).toBeInTheDocument()
    })

    expect(renderCounts.get('b0') ?? 0).toBeGreaterThan(baseline)
  })
})

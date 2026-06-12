import type {Path} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {ListIndexProvider, useListIndex} from './plugin.list-index'

const schemaDefinition = defineSchema({
  lists: [{name: 'bullet'}, {name: 'number'}],
})

function numberBlock(key: string, text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}-span`, text, marks: []}],
    markDefs: [],
    style: 'normal',
    listItem: 'number',
    level: 1,
  }
}

function paragraphBlock(key: string, text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}-span`, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function ListIndexProbe(props: {
  blockKey: string
  onRender: (blockKey: string) => void
}) {
  const path: Path = [{_key: props.blockKey}]
  const listIndex = useListIndex(path)
  props.onRender(props.blockKey)
  return (
    <div data-testid={`probe-${props.blockKey}`}>
      {listIndex === undefined ? 'none' : listIndex}
    </div>
  )
}

function probes(
  probeKeys: Array<string>,
  onRender: (blockKey: string) => void,
) {
  return (
    <ListIndexProvider>
      {probeKeys.map((blockKey) => (
        <ListIndexProbe
          key={blockKey}
          blockKey={blockKey}
          onRender={onRender}
        />
      ))}
    </ListIndexProvider>
  )
}

describe('ListIndexProvider', () => {
  test('Scenario: Indices are correct on first render', async () => {
    await createTestEditor({
      schemaDefinition,
      initialValue: [
        paragraphBlock('b0', 'intro'),
        numberBlock('b1', 'one'),
        numberBlock('b2', 'two'),
      ],
      children: probes(['b0', 'b1', 'b2'], () => {}),
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('probe-b0').element().textContent).toBe('none')
      expect(page.getByTestId('probe-b1').element().textContent).toBe('1')
      expect(page.getByTestId('probe-b2').element().textContent).toBe('2')
    })
  })

  test('Scenario: A structural change shifts indices, and only changed paths re-render', async () => {
    const renders: Array<string> = []
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        paragraphBlock('b0', 'intro'),
        numberBlock('b1', 'one'),
        numberBlock('b2', 'two'),
      ],
      children: probes(['b0', 'b1', 'b2'], (blockKey) =>
        renders.push(blockKey),
      ),
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('probe-b2').element().textContent).toBe('2')
    })
    renders.length = 0

    editor.send({
      type: 'update value',
      value: [
        paragraphBlock('b0', 'intro'),
        numberBlock('b3', 'zero'),
        numberBlock('b1', 'one'),
        numberBlock('b2', 'two'),
      ],
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('probe-b1').element().textContent).toBe('2')
      expect(page.getByTestId('probe-b2').element().textContent).toBe('3')
    })

    // The paragraph's index is `undefined` before and after, so its bucket
    // is never notified.
    expect(renders).not.toContain('b0')

    // Rebuilds coalesce per microtask, so the bulk update re-renders each
    // changed probe once, not once per operation in the transaction.
    expect(renders.filter((blockKey) => blockKey === 'b1')).toHaveLength(1)
    expect(renders.filter((blockKey) => blockKey === 'b2')).toHaveLength(1)
  })

  test('Scenario: Typing inside a list item does not move indices', async () => {
    const renders: Array<string> = []
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [numberBlock('b1', 'one'), numberBlock('b2', 'two')],
      children: probes(['b1', 'b2'], (blockKey) => renders.push(blockKey)),
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('probe-b2').element().textContent).toBe('2')
    })
    renders.length = 0

    editor.send({type: 'focus'})
    editor.send({type: 'insert.text', text: ' more'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(JSON.stringify(snapshot.context.value)).toContain(' more')
    })

    expect(page.getByTestId('probe-b1').element().textContent).toBe('1')
    expect(page.getByTestId('probe-b2').element().textContent).toBe('2')
    expect(renders).toEqual([])
  })
})

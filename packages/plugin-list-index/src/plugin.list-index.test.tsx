import {defineContainer, type Path} from '@portabletext/editor'
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

function ListIndexPathProbe(props: {path: Path}) {
  const listIndex = useListIndex(props.path)
  return <div data-testid="path-probe">{listIndex ?? 'none'}</div>
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

describe(ListIndexProvider.name, () => {
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

  test('Scenario: Registering a container rebuilds indices after normalization repairs its list item', async () => {
    const containerPath: Path = [{_key: 'callout'}, 'content', {_key: 'nested'}]
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        lists: [{name: 'number'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: 'callout',
          content: [
            {
              _type: 'block',
              _key: 'nested',
              listItem: 'number',
              level: 1,
            },
          ],
        } as unknown as PortableTextBlock,
      ],
      children: (
        <ListIndexProvider>
          <ListIndexPathProbe path={containerPath} />
        </ListIndexProvider>
      ),
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('path-probe').element().textContent).toBe('none')
    })

    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })

    await vi.waitFor(() => {
      expect(page.getByTestId('path-probe').element().textContent).toBe('1')
    })
  })
})

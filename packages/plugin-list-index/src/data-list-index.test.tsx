import type {Editor, TextBlockRenderProps} from '@portabletext/editor'
import {
  defineTextBlock,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {EditorRefPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {ListIndexProvider, useListIndex} from './plugin.list-index'

/**
 * Pins the consumer story end-to-end: a `defineTextBlock` render in the new
 * pipeline uses `useListIndex` to reproduce the `data-list-index` attribute
 * the engine's default text-block render emits in the legacy pipeline. This
 * is the exact shape Studio's catch-all text-block render uses.
 */
describe('data-list-index in the new render pipeline', () => {
  test('Scenario: A registered text-block render reproduces `data-list-index`', async () => {
    const editor = await renderEditorWithListIndexRender([
      paragraph('b0'),
      numberListItem('b1'),
      numberListItem('b2'),
    ])

    await expectListIndices({b0: null, b1: '1', b2: '2'})

    editor.send({
      type: 'update value',
      value: [
        paragraph('b0'),
        numberListItem('b3'),
        numberListItem('b1'),
        numberListItem('b2'),
      ],
    })

    await expectListIndices({b0: null, b3: '1', b1: '2', b2: '3'})
  })
})

function TextBlockWithListIndex(props: TextBlockRenderProps) {
  // The registered render returns this component rather than calling hooks
  // directly: the engine invokes `render` as a plain function, so hooks
  // belong in a component the render returns.
  const listIndex = useListIndex(props.path)

  return (
    <div
      {...props.attributes}
      data-testid={`text-block-${props.node._key}`}
      {...(listIndex === undefined ? {} : {'data-list-index': listIndex})}
    >
      {props.children}
    </div>
  )
}

const textBlockNodes = [
  defineTextBlock({
    type: '*',
    render: (props) => <TextBlockWithListIndex {...props} />,
  }),
]

/**
 * Hand-rolled render instead of `createTestEditor`: the harness mounts
 * `children` as siblings after `PortableTextEditable`, but this test needs
 * `ListIndexProvider` to wrap the editable so the registered render's
 * component can read the context.
 */
async function renderEditorWithListIndexRender(
  initialValue: Array<PortableTextBlock>,
): Promise<Editor> {
  const editorRef = createRef<Editor>()

  await render(
    <EditorProvider
      initialConfig={{
        schemaDefinition: defineSchema({
          lists: [{name: 'bullet'}, {name: 'number'}],
        }),
        initialValue,
        keyGenerator: createTestKeyGenerator(),
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <NodePlugin nodes={textBlockNodes} />
      <ListIndexProvider>
        <PortableTextEditable />
      </ListIndexProvider>
    </EditorProvider>,
  )

  await vi.waitFor(() => {
    expect(editorRef.current).not.toBeNull()
  })

  return editorRef.current as Editor
}

async function expectListIndices(
  expected: Record<string, string | null>,
): Promise<void> {
  await vi.waitFor(() => {
    for (const [blockKey, listIndex] of Object.entries(expected)) {
      const textBlock = document.querySelector(
        `[data-testid="text-block-${blockKey}"]`,
      )
      expect(textBlock, `text block ${blockKey}`).not.toBeNull()
      expect(
        textBlock?.getAttribute('data-list-index'),
        `data-list-index of ${blockKey}`,
      ).toBe(listIndex)
    }
  })
}

function paragraph(key: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}-span`, text: key, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function numberListItem(key: string): PortableTextBlock {
  return {
    ...paragraph(key),
    listItem: 'number',
    level: 1,
  }
}

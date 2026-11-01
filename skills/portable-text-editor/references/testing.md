# Testing editor features

Anything that types, selects, focuses or pastes needs a real browser: selection, input events and focus do not exist in jsdom. Use Vitest browser mode with Playwright and `vitest-browser-react`. Pure functions over a snapshot or a value (your own selectors, traversal helpers, converters) can stay in a plain unit test.

`createTestEditor` from `@portabletext/editor/test/vitest` is internal to the editor monorepo. That subpath is not in the package's exports, so an app cannot import it. Write the harness yourself from public exports.

## Harness

```tsx
// test-editor.tsx
import {
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type PortableTextBlock,
  type SchemaDefinition,
} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef, type ReactNode} from 'react'
import {expect} from 'vitest'
import {render} from 'vitest-browser-react'

export async function createTestEditor(options: {
  schemaDefinition: SchemaDefinition
  initialValue?: Array<PortableTextBlock>
  children?: ReactNode
}) {
  const editorRef = createRef<Editor>()

  const screen = await render(
    <EditorProvider
      initialConfig={{
        schemaDefinition: options.schemaDefinition,
        initialValue: options.initialValue,
        keyGenerator: createTestKeyGenerator(),
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable />
      {options.children}
    </EditorProvider>,
  )

  const locator = screen.getByRole('textbox')
  await expect.element(locator).toBeInTheDocument()

  if (!editorRef.current) {
    throw new Error('The editor did not render')
  }

  return {editor: editorRef.current, locator}
}
```

`EditorRefPlugin` hands you the `Editor` through a ref. Pass the plugins under test as `children`. `createTestKeyGenerator` from `@portabletext/test` makes keys deterministic (`k0`, `k1`, and so on), so you can assert whole values.

## A test

```tsx
import {defineSchema} from '@portabletext/editor'
import {expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from './test-editor'
import {HeadingPlugin} from './heading-plugin'

test('Enter on an empty heading turns it into a paragraph', async () => {
  const {editor, locator} = await createTestEditor({
    schemaDefinition: defineSchema({styles: [{name: 'normal'}, {name: 'h2'}]}),
    initialValue: [
      {
        _key: 'b0',
        _type: 'block',
        style: 'h2',
        children: [{_key: 's0', _type: 'span', text: '', marks: []}],
        markDefs: [],
      },
    ],
    children: <HeadingPlugin />,
  })

  await userEvent.click(locator)
  await userEvent.keyboard('{Enter}')

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's0', _type: 'span', text: '', marks: []}],
        markDefs: [],
      },
    ])
  })
})
```

## Rules

- Drive the action under test with `userEvent` (typing, Enter, Tab, clicks), because that is what goes through native events and your `keyboard.keydown` guards. Use `editor.send(...)` only for setup, such as placing the caret with `select`.
- Wait on something observable (`vi.waitFor` around an assertion, or `expect.element`), never on a timeout.
- Assert the full value, not a fragment. Include the selection when the caret position is the point of the feature.
- Test the fall-through cases too: Enter where your guard should not match must still split, and Tab outside your context must still move focus or indent a list.
- In `userEvent.keyboard` and `userEvent.type`, a literal `[` or `{` must be doubled (`[[`, `{{`), because single brackets start a key descriptor.
- To check remote changes, send `{type: 'patches', patches, snapshot}` mid-typing and assert that both the typed text and the remote change survive.

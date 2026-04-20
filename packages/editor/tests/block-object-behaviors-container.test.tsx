import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {isEqualPaths} from '../src/utils/util.is-equal-paths'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
    },
    {name: 'image'},
  ],
})

const codeBlockContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..code-block',
  field: 'lines',
  render: ({attributes, children}) => (
    <pre data-testid="code-block" {...attributes}>
      {children}
    </pre>
  ),
})

describe('core block-object behaviors — container awareness', () => {
  test('Enter inside a code-block line does NOT fire `breakingBlockObject` (no sibling added at root)', async () => {
    // Before the fix, the guard used the root-only `getFocusBlockObject`
    // selector, which returned the code-block itself. The action then
    // inserted a new block "after" the focus's containing block, polluting
    // the document. The container-aware node-traversal `getFocusBlockObject`
    // does NOT fire when focus is inside an editable container.
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'foobar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await vi.waitFor(() => {
      const el = document.querySelector('[data-testid="code-block"]')
      expect(el).not.toEqual(null)
    })

    const spanElement = document.querySelector(
      `[data-testid="code-block"] [data-slate-string="true"]`,
    )!
    await userEvent.click(spanElement)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: spanKey},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: spanKey},
          ],
          offset: 3,
        },
      },
    })
    await userEvent.keyboard('{Enter}')
    await new Promise((r) => setTimeout(r, 100))

    const value = editor.getSnapshot().context.value
    expect(value).toHaveLength(1)
    expect(value?.[0]?._type).toEqual('code-block')
    const codeBlock = value?.[0] as {
      lines?: Array<{children: Array<{text: string}>}>
    }
    expect(codeBlock.lines).toHaveLength(2)
    expect(codeBlock.lines?.[0]?.children?.[0]?.text).toEqual('foo')
    expect(codeBlock.lines?.[1]?.children?.[0]?.text).toEqual('bar')
  })

  test('Enter on a root void block object still inserts a sibling text block after', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const textBlockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: textBlockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_type: 'image', _key: imageKey},
      ],
    })

    const editable = await vi.waitFor(() => {
      const el = document.querySelector('[role="textbox"]')
      expect(el).not.toEqual(null)
      return el as HTMLElement
    })

    await userEvent.click(editable)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: textBlockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: textBlockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    })
    await userEvent.keyboard('{ArrowRight}')
    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toHaveLength(3)
      expect(value?.[0]?._type).toEqual('block')
      expect(value?.[1]?._type).toEqual('image')
      expect(value?.[2]?._type).toEqual('block')
    })
  })

  test('Backspace on an empty text block after a root image still deletes the empty block', async () => {
    // Regression: root-level `deletingEmptyTextBlockAfterBlockObject`
    // continues to work after the rewrite to use the container-aware
    // node-traversal `getFocusTextBlock`
    // and `getSibling`.
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const textBlockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {_type: 'image', _key: imageKey},
        {
          _type: 'block',
          _key: textBlockKey,
          children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const imageElement = await vi.waitFor(() => {
      const el = document.querySelector('[data-slate-void="true"]')
      expect(el).not.toEqual(null)
      return el!
    })

    await userEvent.click(imageElement)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: textBlockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: textBlockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
      },
    })
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_type: 'image', _key: imageKey},
      ])
    })
  })

  test('Delete on an empty text block before a root image still deletes the empty block', async () => {
    // Regression: root-level `deletingEmptyTextBlockBeforeBlockObject`
    // continues to work.
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: textBlockKey,
          children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_type: 'image', _key: imageKey},
      ],
    })

    const imageElement = await vi.waitFor(() => {
      const el = document.querySelector('[data-slate-void="true"]')
      expect(el).not.toEqual(null)
      return el!
    })

    await userEvent.click(imageElement)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: textBlockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: textBlockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
      },
    })
    await userEvent.keyboard('{Delete}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_type: 'image', _key: imageKey},
      ])
    })
  })

  test('Backspace at start of a code-block line with a previous line merges into the previous line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await vi.waitFor(() => {
      const el = document.querySelector('[data-testid="code-block"]')
      expect(el).not.toEqual(null)
    })

    const spanElement = document.querySelectorAll(
      `[data-testid="code-block"] [data-slate-string="true"]`,
    )[1]!
    await userEvent.click(spanElement)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line2Key},
            'children',
            {_key: line2SpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line2Key},
            'children',
            {_key: line2SpanKey},
          ],
          offset: 0,
        },
      },
    })
    await userEvent.keyboard('{Backspace}')
    await new Promise((r) => setTimeout(r, 100))

    const value = editor.getSnapshot().context.value
    expect(value).toHaveLength(1)
    const codeBlock = value?.[0] as {
      lines?: Array<{children: Array<{text: string}>}>
    }
    expect(codeBlock.lines).toHaveLength(1)
    expect(codeBlock.lines?.[0]?.children?.[0]?.text).toEqual('foobar')
  })

  test('Clicking a span inside a code-block line does not snap cursor to start of that span', async () => {
    // Regression: Slate's onClick handler fell back to
    // `getAncestorObjectNode(clickPath)` when the clicked node was not itself
    // a void. Inside an editable container (code-block), the ancestor walk
    // found the container and matched both start/end, so the handler
    // forcibly set the editor selection to offset 0 of the first leaf of
    // the clicked span. That snapped the user's caret away from where the
    // browser would naturally place it on the DOM click. Text leaf (span)
    // clicks now bypass that fallback and let the browser handle selection.
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    const line1Span = await vi.waitFor(() => {
      const spans = document.querySelectorAll(
        `[data-testid="code-block"] [data-slate-string="true"]`,
      )
      expect(spans.length).toEqual(2)
      return spans[0] as HTMLElement
    })

    // Place caret at offset 2 in line 2 so there's a pre-existing selection.
    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)
    const line2Selection = {
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 2,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 2,
      },
    }
    editor.send({type: 'select', at: line2Selection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toEqual(2)
    })

    // Click line 1's span. In some test environments the DOM click does not
    // move the browser selection (chromium); in others it does (webkit). The
    // invariant across browsers: the `onClick` fallback must NOT force the
    // selection to offset 0 of line 1's span — which is what the
    // container-ancestor match used to do before the `isVoidNode`/
    // `isEditableContainer` split.
    await userEvent.click(line1Span)

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      const focusPath = selection?.focus.path ?? []
      const snappedToStartOfLine1Span =
        isEqualPaths(focusPath, [
          {_key: codeBlockKey},
          'lines',
          {_key: line1Key},
          'children',
          {_key: line1SpanKey},
        ]) && selection?.focus.offset === 0
      expect(snappedToStartOfLine1Span).toEqual(false)
    })
  })

  test('Clicking at the end of a text block inside a code-block does not snap cursor to start', async () => {
    // Regression: Slate's onClick handler fell back to matching the common
    // *object* ancestor of the clicked subtree. When the click landed on the
    // text block div itself (e.g. at the end of the line, past the text),
    // the ancestor walk found the code-block (an object node that is NOT
    // void — it contains editable content) and matched both start/end, so
    // the handler forced the editor selection to offset 0 of the first span.
    // The fallback should only match void object ancestors.
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    const line1Block = await vi.waitFor(() => {
      const blocks = document.querySelectorAll(
        `[data-testid="code-block"] [data-slate-node="element"]`,
      )
      expect(blocks.length).toEqual(2)
      return blocks[0] as HTMLElement
    })

    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)
    const line2Selection = {
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 2,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 2,
      },
    }
    editor.send({type: 'select', at: line2Selection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toEqual(2)
    })

    // Click the text block div directly (not a span). The previous
    // `onClick` fallback matched the code-block as common ancestor and
    // snapped the editor selection to offset 0 of line 1's first span. The
    // `isVoidNode`/`isEditableContainer` split removes that forced snap.
    //
    // In some test environments the DOM click does not move the browser
    // selection (chromium); in others it does (webkit). The invariant
    // across browsers: selection must NOT land exactly at offset 0 of line
    // 1's first span (the signature of the fallback bug).
    await userEvent.click(line1Block)

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      const focusPath = selection?.focus.path ?? []
      const snappedToStartOfLine1Span =
        isEqualPaths(focusPath, [
          {_key: codeBlockKey},
          'lines',
          {_key: line1Key},
          'children',
          {_key: line1SpanKey},
        ]) && selection?.focus.offset === 0
      expect(snappedToStartOfLine1Span).toEqual(false)
    })
  })
})

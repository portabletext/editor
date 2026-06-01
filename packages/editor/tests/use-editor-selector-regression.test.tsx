import {StrictMode, useEffect} from 'react'
import {expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  useEditorSelector,
  type EditorSnapshot,
} from '../src'
import {
  getActiveAnnotations,
  getFragment,
  getSelectedValue,
} from '../src/selectors'

const schema = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  styles: [{name: 'normal'}, {name: 'h1'}],
  lists: [{name: 'bullet'}],
})

function Probe({selector}: {selector: (s: EditorSnapshot) => unknown}) {
  const editor = useEditor()
  // Reading the selected value drives the test; the variable is intentionally
  // unused. We only care that the instrumented selector got invoked.
  useEditorSelector(editor, selector)
  return null
}

function FocusInitialBlock() {
  const editor = useEditor()
  useEffect(() => {
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
        focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
      },
    })
  }, [editor])
  return null
}

/**
 * Counts how many times `selector` is invoked across React's render cycle for a
 * single editor mount. With a stable upstream snapshot, `useSyncExternalStore`
 * memoizes and the selector is invoked a small, bounded number of times. With
 * an unstable upstream snapshot (the v7 regression), the selector is invoked
 * on every external store notification AND on every uncached `getSnapshot()`
 * read, producing dozens to hundreds of invocations and tripping React's
 * `Maximum update depth exceeded` guard.
 */
async function countSelectorInvocations(
  baseSelector: (s: EditorSnapshot) => unknown,
): Promise<number> {
  let count = 0
  const instrumented = (s: EditorSnapshot) => {
    count++
    return baseSelector(s)
  }
  // Suppress React's noisy `getSnapshot should be cached` warning + maximum
  // update depth error; we measure the invocation count directly.
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    render(
      <StrictMode>
        <EditorProvider
          initialConfig={{
            schemaDefinition: schema,
            initialValue: [
              {
                _type: 'block',
                _key: 'b1',
                children: [{_type: 'span', _key: 's1', text: 'hello'}],
              },
            ],
          }}
        >
          <PortableTextEditable />
          <FocusInitialBlock />
          <Probe selector={instrumented} />
        </EditorProvider>
      </StrictMode>,
    )
    // Focus the editor so selectors that early-return on null selection
    // (e.g. getFocusBlock) actually exercise the regression.
    const editable = document.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement | null
    editable?.focus()
    await new Promise((r) => setTimeout(r, 300))
    return count
  } finally {
    errorSpy.mockRestore()
  }
}

// Selectors that build fresh refs each call: every call must produce a fresh
// `[]`/`{}` because the snapshot they read from is a fresh object each tick.
// With a stable upstream snapshot, useSyncExternalStore short-circuits before
// invoking the selector, so the call count stays bounded (single-digit on
// mount; small for each commit).
//
// Note: `getFocusBlock` is also unstable (returns fresh `{node, path}`) but
// stays bounded in this harness because the editor's selection deduplication
// (apply-operation.ts transformSelection ref-stability) keeps the upstream
// snapshot stable across re-renders once the initial selection settles. The
// same selector under a noisier consumer (toolbar, popover) loops in Studio.
const UNSTABLE_SELECTORS = [
  {name: 'getActiveAnnotations', selector: getActiveAnnotations},
  {name: 'getSelectedValue', selector: getSelectedValue},
  {name: 'getFragment', selector: getFragment},
] as const

// Reasonable upper bound: even StrictMode double-render + a handful of
// external-store notifications during mount/focus settles well under 50 calls.
// The regression produces ~175 before React bails.
const BOUND = 50

for (const {name, selector} of UNSTABLE_SELECTORS) {
  test(`${name} - selector invoked a bounded number of times`, async () => {
    const calls = await countSelectorInvocations(selector)
    expect(calls).toBeLessThan(BOUND)
  })
}

test('control: reading a stable context field stays bounded', async () => {
  const calls = await countSelectorInvocations((s) => s.context.value)
  expect(calls).toBeLessThan(BOUND)
})

import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineInlineObject,
  defineSpan,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Inline pipeline mode inherits from the text block. Spans and inline
 * objects MUST NOT initiate a new-pipeline subtree on their own — if
 * they did, a legacy text block could end up with new-pipeline inline
 * children, producing inconsistent DOM (legacy attrs on the outer
 * block, clean `data-pt-*` only on the inline subtree).
 *
 * The four tests below pin both directions of the contract:
 *
 *   - Tests 1 & 2: a registered inline node inside an UNregistered
 *     text block keeps legacy attributes on its wrapper (inherits
 *     legacy from the parent text block).
 *   - Tests 3 & 4: the same inline node inside a REGISTERED text
 *     block emits clean `data-pt-*` attributes (inherits new pipeline
 *     from the parent text block).
 */

function getEditorHTML(): string {
  const root = document.querySelector('[role="textbox"]')
  if (!root) {
    throw new Error('No editor with role="textbox"')
  }
  return root.innerHTML
}

function getInlineWrapperAttrs(testid: string): string {
  const element = document.querySelector(`[data-testid="${testid}"]`)
  if (!element) {
    throw new Error(`No element with data-testid="${testid}"`)
  }
  // Extract attributes from the wrapper element itself (not children).
  return Array.from(element.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
}

describe('inline pipeline mode inherits from text block', () => {
  test('registered inline-object inside LEGACY text block keeps data-slate-* attributes on its wrapper', async () => {
    const schema = defineSchema({
      inlineObjects: [{name: 'mention', fields: []}],
    })
    const mention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-wrapper" {...attributes}>
          {children}
          <span>@alice</span>
        </span>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hi ', marks: []},
            {_key: 'm0', _type: 'mention'},
            {_key: 's1', _type: 'span', text: ' there', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[mention]} />,
    })

    await vi.waitFor(() => {
      const editorHTML = getEditorHTML()
      // Sanity: the text block is legacy (data-slate-node="element" on it).
      expect(editorHTML).toMatch(/data-slate-node="element"/)
      // The mention is rendered.
      expect(editorHTML).toContain('@alice')
      // The mention wrapper's own attributes include legacy data-slate-*.
      const attrs = getInlineWrapperAttrs('mention-wrapper')
      expect(attrs).toMatch(/data-slate-/)
    })
  })

  test('registered span inside LEGACY text block keeps data-slate-* attributes on its wrapper', async () => {
    const schema = defineSchema({})
    const span = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-wrapper" {...attributes}>
          {children}
        </span>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[span]} />,
    })

    await vi.waitFor(() => {
      const editorHTML = getEditorHTML()
      // Sanity: the text block is legacy.
      expect(editorHTML).toMatch(/data-slate-node="element"/)
      // The span is rendered.
      expect(editorHTML).toContain('hello')
      // The span wrapper's own attributes include legacy data-slate-*.
      const attrs = getInlineWrapperAttrs('span-wrapper')
      expect(attrs).toMatch(/data-slate-/)
    })
  })

  test('registered inline-object inside REGISTERED text block emits clean data-pt-* on its wrapper', async () => {
    const schema = defineSchema({
      inlineObjects: [{name: 'mention', fields: []}],
    })
    const richBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="textblock-wrapper" {...attributes}>
          {children}
        </div>
      ),
    })
    const mention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-wrapper" {...attributes}>
          {children}
          <span>@alice</span>
        </span>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hi ', marks: []},
            {_key: 'm0', _type: 'mention'},
            {_key: 's1', _type: 'span', text: ' there', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[richBlock, mention]} />,
    })

    await vi.waitFor(() => {
      // The mention is rendered.
      expect(getEditorHTML()).toContain('@alice')
      // The mention wrapper's own attributes are clean.
      const attrs = getInlineWrapperAttrs('mention-wrapper')
      expect(attrs).toMatch(/data-pt-/)
      expect(attrs).not.toMatch(/data-slate-/)
    })
  })

  test('registered span inside REGISTERED text block emits clean data-pt-* on its wrapper', async () => {
    const schema = defineSchema({})
    const richBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="textblock-wrapper" {...attributes}>
          {children}
        </div>
      ),
    })
    const span = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-wrapper" {...attributes}>
          {children}
        </span>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[richBlock, span]} />,
    })

    await vi.waitFor(() => {
      expect(getEditorHTML()).toContain('hello')
      const attrs = getInlineWrapperAttrs('span-wrapper')
      expect(attrs).toMatch(/data-pt-/)
      expect(attrs).not.toMatch(/data-slate-/)
    })
  })
})

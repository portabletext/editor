import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineContainer,
  defineInlineObject,
  defineSpan,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * The load-bearing TDD contract for PR #2681: any subtree rendered
 * through `registerNode` (the new pipeline) must emit ZERO
 * `data-slate-*` attributes. The engine's legacy pipeline still emits
 * `data-slate-*` for backwards compatibility with consumers that walk
 * engine-shaped legacy DOM; the new pipeline strictly emits `data-pt-*` only.
 *
 * One assertion per kind. If any of these fail, a registration
 * mechanism is leaking legacy attrs into the new pipeline.
 */

function getSubtreeHTML(testid: string): string {
  const root = document.querySelector(`[data-testid="${testid}"]`)
  if (!root) {
    throw new Error(`No element with data-testid="${testid}"`)
  }
  return root.innerHTML
}

describe('register-node-clean-dom', () => {
  test('container subtree emits zero data-slate-* attrs', async () => {
    const schema = defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <div
          data-testid="callout-subtree"
          {...attributes}
          {...childrenAttributes}
        >
          {children}
        </div>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      const html = getSubtreeHTML('callout-subtree')
      expect(html).toMatch(/data-pt-/)
      expect(html.match(/data-slate-/g)).toBeNull()
    })
  })

  test('text-block subtree emits zero data-slate-* attrs', async () => {
    const schema = defineSchema({})
    const richBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="textblock-subtree" {...attributes}>
          {children}
        </div>
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
      children: <NodePlugin nodes={[richBlock]} />,
    })

    await vi.waitFor(() => {
      const html = getSubtreeHTML('textblock-subtree')
      expect(html).toMatch(/data-pt-/)
      expect(html.match(/data-slate-/g)).toBeNull()
    })
  })

  test('block-object subtree emits zero data-slate-* attrs', async () => {
    const schema = defineSchema({
      blockObjects: [{name: 'divider', fields: []}],
    })
    const divider = defineBlockObject({
      type: 'divider',
      render: ({attributes, children}) => (
        <div data-testid="blockobject-subtree" {...attributes}>
          {children}
          <hr />
        </div>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [{_key: 'k0', _type: 'divider'}],
      children: <NodePlugin nodes={[divider]} />,
    })

    await vi.waitFor(() => {
      const html = getSubtreeHTML('blockobject-subtree')
      expect(html).toMatch(/data-pt-/)
      expect(html.match(/data-slate-/g)).toBeNull()
    })
  })

  test('inline-object subtree emits zero data-slate-* attrs', async () => {
    const schema = defineSchema({
      inlineObjects: [{name: 'mention', fields: []}],
    })
    // Register the text block too, otherwise inline content stays in
    // the legacy pipeline (it inherits its pipeline mode from the
    // parent text block — see `inline-pipeline-mode-inheritance.test.tsx`).
    const richBlock = defineTextBlock({type: 'block'})
    const mention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="inlineobject-subtree" {...attributes}>
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
      const html = getSubtreeHTML('inlineobject-subtree')
      expect(html).toMatch(/data-pt-/)
      expect(html.match(/data-slate-/g)).toBeNull()
    })
  })

  test('span subtree emits zero data-slate-* attrs', async () => {
    const schema = defineSchema({})
    // Register the text block too — span pipeline mode is inherited.
    const richBlock = defineTextBlock({type: 'block'})
    const span = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-subtree" {...attributes}>
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
      const html = getSubtreeHTML('span-subtree')
      expect(html).toMatch(/data-pt-/)
      expect(html.match(/data-slate-/g)).toBeNull()
    })
  })
})

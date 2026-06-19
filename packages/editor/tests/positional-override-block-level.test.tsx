import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineContainer,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Block-level positional override composition.
 *
 * For each block-level kind (container, textBlock, blockObject), the
 * resolution cases are pinned:
 *
 *   1. Global render at top-level NodePlugin fires when no positional
 *      override exists at the position.
 *   2. Positional `render: fn` in a parent container's `of` overrides
 *      any global registration at that position.
 *   3b. Positional `render: (props) => props.renderDefault(props)`
 *       renders the engine default at this position (canonical way to
 *       opt into the engine default while shadowing global).
 *   4. Positional `of: [...]` with no `render` falls through to the
 *      global render when one is registered.
 *   5. Positional `of: [...]` with no `render` falls through to engine
 *      default when no global render is registered.
 *
 * Three registration-time modes of `render`:
 * - omitted (`undefined`): no positional override registered; falls
 *   through to global.
 * - function: registers an override using the function. The function
 *   receives a `renderDefault` prop that returns the engine default
 *   when called.
 */

const calloutSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const calloutWithImageSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'object', name: 'image', fields: []}],
        },
      ],
    },
    {name: 'image', fields: []},
  ],
})

const calloutWithRowSchema = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [{type: 'block'}],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

describe('Block-level positional override: defineContainer', () => {
  test('1. Global container render fires when no positional override exists', async () => {
    const keyGenerator = createTestKeyGenerator()
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside
          data-testid="callout-global"
          {...attributes}
          {...childrenAttributes}
        >
          {children}
        </aside>
      ),
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [{_key: 's0', _type: 'span', text: 'hi', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="callout-global"]'),
      ).not.toEqual(null)
    })
  })

  test('2. Positional `render: fn` in parent container `of` overrides global', async () => {
    // A nested table → row scenario. The `row` container is registered
    // both at top-level (global render) and positionally inside table's
    // `of` (different render). Positional must win.
    const keyGenerator = createTestKeyGenerator()
    const rowGlobal = defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({attributes, childrenAttributes, children}) => (
        <div data-testid="row-global" {...attributes} {...childrenAttributes}>
          {children}
        </div>
      ),
    })
    const rowPositional = defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({attributes, childrenAttributes, children}) => (
        <div
          data-testid="row-positional"
          {...attributes}
          {...childrenAttributes}
        >
          {children}
        </div>
      ),
    })
    const table = defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: ({attributes, childrenAttributes, children}) => (
        <div data-testid="table" {...attributes} {...childrenAttributes}>
          {children}
        </div>
      ),
      of: [rowPositional],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutWithRowSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'r0',
              _type: 'row',
              cells: [
                {
                  _key: 'b0',
                  _type: 'block',
                  children: [
                    {_key: 's0', _type: 'span', text: 'cell', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[table, rowGlobal]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="row-positional"]'),
      ).not.toEqual(null)
      expect(document.querySelector('[data-testid="row-global"]')).toEqual(null)
    })
  })

  test('3b. Positional `render: (props) => props.renderDefault(props)` renders engine default at this position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rowGlobal = defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({attributes, childrenAttributes, children}) => (
        <div data-testid="row-global" {...attributes} {...childrenAttributes}>
          {children}
        </div>
      ),
    })
    const rowPositionalDefault = defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: (props) => props.renderDefault(props),
    })
    const table = defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: ({attributes, childrenAttributes, children}) => (
        <div data-testid="table" {...attributes} {...childrenAttributes}>
          {children}
        </div>
      ),
      of: [rowPositionalDefault],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutWithRowSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'r0',
              _type: 'row',
              cells: [
                {
                  _key: 'b0',
                  _type: 'block',
                  children: [
                    {_key: 's0', _type: 'span', text: 'cell', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[table, rowGlobal]} />,
    })

    await vi.waitFor(() => {
      // Global consumer-render is shadowed by the positional override.
      expect(document.querySelector('[data-testid="row-global"]')).toEqual(null)
      // The positional render delegated to `props.renderDefault(props)` so
      // the engine default wrapper is present at this position.
      const tableEl = document.querySelector('[data-testid="table"]')
      expect(tableEl).not.toEqual(null)
      const rowEl = tableEl!.querySelector(
        '[data-pt-block="container"]:not([data-testid])',
      )
      expect(rowEl).not.toEqual(null)
      expect(rowEl!.textContent).toContain('cell')
    })
  })

  test('4. Positional `of: [...]` without `render` falls through to global', async () => {
    // The positional defineContainer has no render but does add inner
    // scoping (via `of`). The outer render falls through to the global
    // registration for `row`.
    const keyGenerator = createTestKeyGenerator()
    const rowGlobal = defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({attributes, childrenAttributes, children}) => (
        <div data-testid="row-global" {...attributes} {...childrenAttributes}>
          {children}
        </div>
      ),
    })
    const rowPositionalScopeOnly = defineContainer({
      type: 'row',
      arrayField: 'cells',
      // No render; just used to provide a positional scope (no inner
      // overrides here, but the shape must work without `render`).
    })
    const table = defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: ({attributes, childrenAttributes, children}) => (
        <div data-testid="table" {...attributes} {...childrenAttributes}>
          {children}
        </div>
      ),
      of: [rowPositionalScopeOnly],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutWithRowSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'r0',
              _type: 'row',
              cells: [
                {
                  _key: 'b0',
                  _type: 'block',
                  children: [
                    {_key: 's0', _type: 'span', text: 'cell', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[table, rowGlobal]} />,
    })

    await vi.waitFor(() => {
      // Global render fires because positional has no render and no
      // null sentinel.
      expect(document.querySelector('[data-testid="row-global"]')).not.toEqual(
        null,
      )
    })
  })

  test('5. Positional `of: [...]` without `render`, no global → engine default', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rowPositionalScopeOnly = defineContainer({
      type: 'row',
      arrayField: 'cells',
    })
    const table = defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: ({attributes, childrenAttributes, children}) => (
        <div data-testid="table" {...attributes} {...childrenAttributes}>
          {children}
        </div>
      ),
      of: [rowPositionalScopeOnly],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutWithRowSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'r0',
              _type: 'row',
              cells: [
                {
                  _key: 'b0',
                  _type: 'block',
                  children: [
                    {_key: 's0', _type: 'span', text: 'cell', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[table]} />,
    })

    await vi.waitFor(() => {
      // No consumer render fires for the row; engine default carries
      // the children. Assert the table outer is the consumer render
      // and the row sits inside it as an engine-default wrapper.
      expect(document.querySelector('[data-testid="row-global"]')).toEqual(null)
      const tableEl = document.querySelector('[data-testid="table"]')
      expect(tableEl).not.toEqual(null)
      const rowEl = tableEl!.querySelector(
        '[data-pt-block="container"]:not([data-testid])',
      )
      expect(rowEl).not.toEqual(null)
      expect(rowEl!.textContent).toContain('cell')
    })
  })
})

describe('Block-level positional override: defineTextBlock', () => {
  test('1. Global text-block render fires when no positional override exists', async () => {
    const keyGenerator = createTestKeyGenerator()
    const globalBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <p data-testid="block-global" {...attributes}>
          {children}
        </p>
      ),
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hi', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[globalBlock]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="block-global"]'),
      ).not.toEqual(null)
    })
  })

  test('2. Positional `render: fn` in container `of` overrides global', async () => {
    const keyGenerator = createTestKeyGenerator()
    const globalBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <p data-testid="block-global" {...attributes}>
          {children}
        </p>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <p data-testid="block-in-callout" {...attributes}>
          {children}
        </p>
      ),
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [
                {_key: 's0', _type: 'span', text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalBlock]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="block-in-callout"]'),
      ).not.toEqual(null)
      // Outside-callout would render via global, but our value only has
      // a block inside the callout — confirm the global render isn't
      // ALSO being applied at this position.
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl!.querySelector('[data-testid="block-global"]')).toEqual(
        null,
      )
    })
  })

  test('3b. Positional `render: (props) => props.renderDefault(props)` renders engine default at this position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const globalBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <p data-testid="block-global" {...attributes}>
          {children}
        </p>
      ),
    })
    const calloutBlockDefault = defineTextBlock({
      type: 'block',
      render: (props) => props.renderDefault(props),
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutBlockDefault],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [
                {_key: 's0', _type: 'span', text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalBlock]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      // Global render shadowed by the positional override.
      expect(calloutEl!.querySelector('[data-testid="block-global"]')).toEqual(
        null,
      )
      // `props.renderDefault(props)` produced the engine default wrapper at
      // this position.
      const defaultBlock = calloutEl!.querySelector('[data-pt-block="text"]')
      expect(defaultBlock).not.toEqual(null)
      expect(defaultBlock!.textContent).toContain('inside')
    })
  })

  test('4. Positional `of: [...]` (no render) falls through to global', async () => {
    const keyGenerator = createTestKeyGenerator()
    const globalBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <p data-testid="block-global" {...attributes}>
          {children}
        </p>
      ),
    })
    const calloutBlockScopeOnly = defineTextBlock({
      type: 'block',
      // No render. The `of` would normally hold inline overrides, but
      // for this test the scoping shape itself is what matters.
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutBlockScopeOnly],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [
                {_key: 's0', _type: 'span', text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalBlock]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      // Global text-block render fires inside the callout because the
      // positional registration has no render and no null sentinel.
      expect(
        calloutEl!.querySelector('[data-testid="block-global"]'),
      ).not.toEqual(null)
    })
  })

  test('5. Positional `of: [...]` no render, no global → engine default', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutBlockScopeOnly = defineTextBlock({
      type: 'block',
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutBlockScopeOnly],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [
                {_key: 's0', _type: 'span', text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      expect(calloutEl!.querySelector('[data-testid="block-global"]')).toEqual(
        null,
      )
      // Engine default renders the text block with `data-pt-block="text"`.
      const defaultBlock = calloutEl!.querySelector('[data-pt-block="text"]')
      expect(defaultBlock).not.toEqual(null)
      expect(defaultBlock!.textContent).toContain('inside')
    })
  })
})

describe('Block-level positional override: defineBlockObject', () => {
  test('1. Global block-object render fires when no positional override exists', async () => {
    const keyGenerator = createTestKeyGenerator()
    const globalImage = defineBlockObject({
      type: 'image',
      render: ({attributes, children}) => (
        <figure data-testid="image-global" {...attributes}>
          {children}
        </figure>
      ),
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image', fields: []}],
      }),
      initialValue: [{_key: 'i0', _type: 'image'}],
      children: <NodePlugin nodes={[globalImage]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="image-global"]'),
      ).not.toEqual(null)
    })
  })

  test('2. Positional `render: fn` in container `of` overrides global', async () => {
    const keyGenerator = createTestKeyGenerator()
    const globalImage = defineBlockObject({
      type: 'image',
      render: ({attributes, children}) => (
        <figure data-testid="image-global" {...attributes}>
          {children}
        </figure>
      ),
    })
    const calloutImage = defineBlockObject({
      type: 'image',
      render: ({attributes, children}) => (
        <figure data-testid="image-in-callout" {...attributes}>
          {children}
        </figure>
      ),
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutImage],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutWithImageSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [{_key: 'i0', _type: 'image'}],
        },
      ],
      children: <NodePlugin nodes={[callout, globalImage]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="image-in-callout"]'),
      ).not.toEqual(null)
      expect(document.querySelector('[data-testid="image-global"]')).toEqual(
        null,
      )
    })
  })

  test('3b. Positional `render: (props) => props.renderDefault(props)` renders engine default at this position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const globalImage = defineBlockObject({
      type: 'image',
      render: ({attributes, children}) => (
        <figure data-testid="image-global" {...attributes}>
          {children}
        </figure>
      ),
    })
    const calloutImageDefault = defineBlockObject({
      type: 'image',
      render: (props) => props.renderDefault(props),
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutImageDefault],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutWithImageSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [{_key: 'i0', _type: 'image'}],
        },
      ],
      children: <NodePlugin nodes={[callout, globalImage]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      // Global consumer-render shadowed.
      expect(calloutEl!.querySelector('[data-testid="image-global"]')).toEqual(
        null,
      )
      // `props.renderDefault(props)` produced the engine default wrapper at
      // this position.
      expect(calloutEl!.querySelector('[data-pt-block="object"]')).not.toEqual(
        null,
      )
    })
  })

  test('4. Positional `render` absent (no `of` to provide) falls through to global', async () => {
    // defineBlockObject has no `of` field, so "scope-only" doesn't
    // apply. But `render` absent at the positional level should still
    // fall through. To exercise this, place the positional through
    // `of` with render omitted entirely.
    const keyGenerator = createTestKeyGenerator()
    const globalImage = defineBlockObject({
      type: 'image',
      render: ({attributes, children}) => (
        <figure data-testid="image-global" {...attributes}>
          {children}
        </figure>
      ),
    })
    const calloutImagePassthrough = defineBlockObject({
      type: 'image',
      // No render. Falls through to global.
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutImagePassthrough],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutWithImageSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [{_key: 'i0', _type: 'image'}],
        },
      ],
      children: <NodePlugin nodes={[callout, globalImage]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      // Global render fires inside the callout because positional has
      // no render and no null sentinel.
      expect(
        calloutEl!.querySelector('[data-testid="image-global"]'),
      ).not.toEqual(null)
    })
  })

  test('5. Positional no render, no global → engine default', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutImagePassthrough = defineBlockObject({
      type: 'image',
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutImagePassthrough],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutWithImageSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [{_key: 'i0', _type: 'image'}],
        },
      ],
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      expect(calloutEl!.querySelector('[data-testid="image-global"]')).toEqual(
        null,
      )
      expect(calloutEl!.querySelector('[data-pt-block="object"]')).not.toEqual(
        null,
      )
    })
  })
})

import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Resolution rules for the Container API.
 *
 * Two rules govern when a registered container activates at a position:
 *
 *   Rule 1 - Registration is type-keyed; activation is position-gated.
 *     A registration `defineContainer({type, arrayField})` activates at
 *     any position where the schema declares `type` with a field named
 *     `arrayField`. Same registration, multiple positions. Where the
 *     schema-at-position lacks the field, the registration is inert.
 *
 *   Rule 2 - Container chains are rooted in the editor value array.
 *     A registered type only activates inside a chain of registered
 *     container ancestors rooted in the editor's top-level value array.
 *     Descendants of unregistered object-node ancestors do NOT activate,
 *     even when their `_type` is registered.
 *
 * Each test below pins one consequence of these rules. The "Registration
 * silent-skip" group additionally pins how invalid registrations behave
 * (silent skip with dev-console warn, other registrations unaffected).
 */

const inlineOnlySchema = defineSchema({
  blockObjects: [
    {
      name: 'cell',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {type: 'block'},
            // 'list' is declared ONLY here (inline inside cell.content),
            // never at the top-level blockObjects.
            {
              type: 'object',
              name: 'list',
              fields: [
                {
                  name: 'items',
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

const calloutOnlySchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

const colonySchema = defineSchema({
  blockObjects: [
    {
      name: 'colony',
      fields: [
        {
          name: 'organisms',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'organism',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {
                          name: 'content',
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
        },
      ],
    },
  ],
})

describe('Rule 1: registration is type-keyed, activation is position-gated', () => {
  test('top-level registration of an inline-only type activates where the schema declares it', async () => {
    const keyGenerator = createTestKeyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition: inlineOnlySchema,
      initialValue: [
        {
          _type: 'cell',
          _key: 'c0',
          content: [
            {
              _type: 'list',
              _key: 'l0',
              items: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'item', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'cell',
              arrayField: 'content',
              render: ({attributes, children}) => (
                <div data-testid="cell" {...attributes}>
                  {children}
                </div>
              ),
            }),
            // 'list' is only inline-declared inside cell.content.of, never
            // in root blockObjects. The top-level registration still
            // resolves its 'items' field via inline-walk fallback.
            defineContainer({
              type: 'list',
              arrayField: 'items',
              render: ({attributes, children}) => (
                <div data-testid="list" {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)
      const list = editorElement!.querySelector('[data-testid="list"]')
      expect(list).not.toEqual(null)
      expect(list!.textContent).toContain('item')
    })
  })
})

describe('Registration silent-skip behavior', () => {
  test('top-level registration of an unknown type silently skips, other registrations unaffected', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const keyGenerator = createTestKeyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutOnlySchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'k0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'hello', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, children}) => (
                <div data-testid="callout" {...attributes}>
                  {children}
                </div>
              ),
            }),
            // 'list' is not in the schema at all.
            defineContainer({
              type: 'list',
              arrayField: 'items',
              render: ({attributes, children}) => (
                <div data-testid="list" {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)
      const callout = editorElement!.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      expect(callout!.textContent).toContain('hello')
    })

    expect(
      warn.mock.calls.some((call) => {
        const message = String(call[0])
        return (
          message.includes('"list"') && message.includes('Registration skipped')
        )
      }),
    ).toBe(true)
    warn.mockRestore()
  })

  test('nested registration of an unknown type silently skips, chain-aware warn, parent still registers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const keyGenerator = createTestKeyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutOnlySchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'k0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'hello', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, children}) => (
                <div data-testid="callout" {...attributes}>
                  {children}
                </div>
              ),
              of: [
                // 'chart' is not declared anywhere in the schema. This
                // nested entry silently drops; callout still registers.
                defineContainer({
                  type: 'chart',
                  arrayField: 'series',
                  render: ({attributes, children}) => (
                    <div data-testid="chart" {...attributes}>
                      {children}
                    </div>
                  ),
                }),
              ],
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)
      const callout = editorElement!.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      expect(callout!.textContent).toContain('hello')
    })

    expect(
      warn.mock.calls.some((call) => {
        const message = String(call[0])
        return (
          message.includes('"chart"') &&
          message.includes('nested inside "callout"')
        )
      }),
    ).toBe(true)
    warn.mockRestore()
  })

  test('registration with a arrayField that does not exist on the schema type silently skips', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const keyGenerator = createTestKeyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutOnlySchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'k0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'hello', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            // 'callout' is declared in the schema but its only array field
            // is 'content', not 'body'. Registration silently drops.
            defineContainer({
              type: 'callout',
              arrayField: 'body',
              render: ({attributes, children}) => (
                <div data-testid="callout-custom" {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)
      // Custom render did NOT apply (registration dropped); engine
      // default renders the callout block-object.
      const custom = editorElement!.querySelector(
        '[data-testid="callout-custom"]',
      )
      expect(custom).toEqual(null)
    })

    expect(
      warn.mock.calls.some((call) => {
        const message = String(call[0])
        return (
          message.includes('"body"') &&
          message.includes('"callout"') &&
          message.includes('Registration skipped')
        )
      }),
    ).toBe(true)
    warn.mockRestore()
  })
})

describe('Rule 2: container chains are rooted in the editor value array', () => {
  test('registered type does not activate inside an unregistered object-node ancestor', async () => {
    // Container chains are rooted in the editor value array. When a
    // registered type appears inside an unregistered object-node
    // ancestor (here: `organism` and `cell` registered, but `colony`
    // unregistered), the chain is broken - the registered types do
    // NOT activate inside the unregistered ancestor. A shallow
    // `colony` arriving in the value stays unchanged; PTE does not
    // reach into `colony.organisms` to normalize anything, because
    // `colony` itself is not a PTE-managed container.
    const keyGenerator = createTestKeyGenerator()
    const colonyKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: colonySchema,
      initialValue: [
        {
          _type: 'colony',
          _key: colonyKey,
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'organism',
              arrayField: 'cells',
              render: ({attributes, children}) => (
                <div data-testid="organism" {...attributes}>
                  {children}
                </div>
              ),
            }),
            defineContainer({
              type: 'cell',
              arrayField: 'content',
              render: ({attributes, children}) => (
                <div data-testid="cell" {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      // Colony stays exactly as inserted - no normalization, no
      // organisms array materialized, no cells, no content blocks.
      // The registered `organism` and `cell` types do not reach into
      // the unregistered `colony` ancestor.
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'colony',
          _key: colonyKey,
        },
      ])
    })
  })
})

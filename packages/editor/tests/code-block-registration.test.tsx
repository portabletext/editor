import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Two real-world questions about how the Container API resolves
 * `code-block` when its registration shape lines up - or doesn't - with
 * the schema:
 *
 * A) The schema permits `code-block` inside another container's
 *    `childField`, but no container declares `code-block` in its
 *    `of`. A plugin registers `code-block` at the top level. Does it
 *    activate when normalization walks into a `code-block` found
 *    inside the outer container?
 *
 * B) The plugin registers `code-block` with `childField: 'lines'`,
 *    but the schema declares `code-block` with field `content`. The
 *    registration is invalid and the engine warns at register time.
 *    What happens to a `code-block` node that survives in the initial
 *    value?
 */

function tableSchema(codeBlockField: 'lines' | 'content') {
  return defineSchema({
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
                    of: [
                      {
                        type: 'object',
                        name: 'cell',
                        fields: [
                          {
                            name: 'content',
                            type: 'array',
                            of: [
                              {type: 'block'},
                              {
                                type: 'object',
                                name: 'code-block',
                                fields: [
                                  {
                                    name: codeBlockField,
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
          },
        ],
      },
    ],
  })
}

function tableContainers() {
  return defineContainer({
    type: 'table',
    childField: 'rows',
    render: ({attributes, children}) => (
      <div data-testid="table" {...attributes}>
        {children}
      </div>
    ),
    of: [
      defineContainer({
        type: 'row',
        childField: 'cells',
        render: ({attributes, children}) => (
          <div data-testid="row" {...attributes}>
            {children}
          </div>
        ),
        of: [
          defineContainer({
            type: 'cell',
            childField: 'content',
            render: ({attributes, children}) => (
              <div data-testid="cell" {...attributes}>
                {children}
              </div>
            ),
          }),
        ],
      }),
    ],
  })
}

function initialTableValue() {
  return {
    _type: 'table',
    _key: 't0',
    rows: [
      {
        _type: 'row',
        _key: 'r0',
        cells: [
          {
            _type: 'cell',
            _key: 'c0',
            content: [
              {
                _type: 'code-block',
                _key: 'cb0',
                // Field name is filled by the caller depending on schema.
              } as Record<string, unknown>,
            ],
          },
        ],
      },
    ],
  }
}

describe('code-block resolution through normalisation', () => {
  test('A: top-level `code-block` registration activates inside cell.content even though no container declares code-block in its `of`', async () => {
    const keyGenerator = createTestKeyGenerator()

    const initialValue = initialTableValue()
    ;(initialValue.rows[0]!.cells[0]!.content[0] as Record<string, unknown>)[
      'lines'
    ] = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchema('lines'),
      initialValue: [initialValue],
      children: (
        <ContainerPlugin
          containers={[
            tableContainers(),
            // code-block registered at the top level only. The chain
            // table -> row -> cell -> code-block is reachable because
            // cell.of has no positional override and the top-level
            // entry is the global fallback.
            defineContainer({
              type: 'code-block',
              childField: 'lines',
              render: ({attributes, children}) => (
                <div data-testid="code-block" {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const codeBlock = document.querySelector('[data-testid="code-block"]')
      expect(codeBlock).not.toEqual(null)
    })

    // Normalisation activation: the empty `lines` array gets a
    // placeholder text block, exactly as it would for a top-level
    // container. If code-block had not activated, `lines` would
    // stay empty.
    const snapshot = editor.getSnapshot()
    const table = snapshot.context.value[0] as unknown as {
      rows: ReadonlyArray<{
        cells: ReadonlyArray<{
          content: ReadonlyArray<{lines?: ReadonlyArray<unknown>}>
        }>
      }>
    }
    const codeBlock = table.rows[0]!.cells[0]!.content[0]!
    expect(Array.isArray(codeBlock.lines)).toEqual(true)
    expect(codeBlock.lines!.length).toEqual(1)
  })

  test('B: registering `code-block` with a field the schema does not have warns at register time and the node renders as a non-editable placeholder', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const keyGenerator = createTestKeyGenerator()

    const initialValue = initialTableValue()
    ;(initialValue.rows[0]!.cells[0]!.content[0] as Record<string, unknown>)[
      'content'
    ] = []

    const {editor} = await createTestEditor({
      keyGenerator,
      // Schema declares code-block with field `content`:
      schemaDefinition: tableSchema('content'),
      initialValue: [initialValue],
      children: (
        <ContainerPlugin
          containers={[
            tableContainers(),
            defineContainer({
              // Plugin asks for `lines`; schema says `content`.
              type: 'code-block',
              childField: 'lines',
              render: ({attributes, children}) => (
                <div data-testid="code-block" {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalled()
    })
    const matchingMessages = warn.mock.calls
      .map((call) => String(call[0]))
      .filter((entry) =>
        /field "lines" not found on type "code-block"/.test(entry),
      )
    expect(matchingMessages.length).toEqual(1)

    // The container shells render normally; the code-block does NOT
    // render via the plugin's render callback because the registration
    // was skipped.
    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="cell"]')).not.toEqual(null)
    })
    expect(document.querySelector('[data-testid="code-block"]')).toEqual(null)

    // The code-block node still lives in the value as a block-object
    // child of the cell - normalisation did not unwrap or delete it.
    const snapshot = editor.getSnapshot()
    const table = snapshot.context.value[0] as unknown as {
      rows: ReadonlyArray<{
        cells: ReadonlyArray<{content: ReadonlyArray<{_type: string}>}>
      }>
    }
    const cellContent = table.rows[0]!.cells[0]!.content
    expect(cellContent.length).toBeGreaterThan(0)
    expect(cellContent.some((child) => child._type === 'code-block')).toBe(true)

    warn.mockRestore()
  })
})

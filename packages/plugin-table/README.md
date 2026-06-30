# `@portabletext/plugin-table`

> Add editable tables to the Portable Text Editor

**Status: alpha.** The rectangular table model (table → row → cell), its
structural editing, rendering, rectangular selection, and per-column alignment
are in place, and the data shape matches what `@portabletext/markdown`
round-trips. Keyboard cell navigation and clipboard paste are not yet
implemented (see [What's not here yet](#whats-not-here-yet)).

Tables are built entirely on the Portable Text Editor's (PTE) public container
primitives: a `table` block-object whose `rows` hold `row`s whose `cells` hold
ordinary Portable Text. There are no merged cells and no column resizing; the
rectangle is the contract.

## Installation

```sh
npm install @portabletext/plugin-table
```

## Quick start

The plugin provides the renders and editing behaviors. You declare the
`table`/`row`/`cell` shape in your schema, then mount `<TablePlugin />`.

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {TablePlugin} from '@portabletext/plugin-table'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {name: 'headerRows', type: 'number'},
        {name: 'alignment', type: 'array'},
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
                        {name: 'value', type: 'array', of: [{type: 'block'}]},
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

function App() {
  return (
    <EditorProvider initialConfig={{schemaDefinition}}>
      <PortableTextEditable />
      <TablePlugin />
    </EditorProvider>
  )
}
```

A table value is a plain Portable Text block-object:

```ts
{
  _type: 'table',
  _key: 't0',
  headerRows: 1, // optional: number of leading header rows
  alignment: ['left', 'right'], // optional: per-column, indexed by column
  rows: [
    {
      _type: 'row',
      _key: 'r0',
      cells: [
        {_type: 'cell', _key: 'c0', value: [/* Portable Text blocks */]},
      ],
    },
  ],
}
```

This is the shape `@portabletext/markdown` produces and consumes, so a table
edited with the plugin round-trips through markdown unchanged.

## Editing the table

Structural edits are dispatched as custom Behavior Events through
`editor.send(...)`. `at` is any path inside the table (the current selection
focus path works); the plugin resolves the enclosing row, column, or table.

```ts
// Insert a row/column before or after the one at `at`
editor.send({type: 'custom.insert.row', at, position: 'after'})
editor.send({type: 'custom.insert.column', at, position: 'before'})

// Move a row/column from `at` to `to`
editor.send({type: 'custom.move.row', at, to})
editor.send({type: 'custom.move.column', at, to})

// Remove the row/column at `at`, or the whole table
editor.send({type: 'custom.unset.row', at})
editor.send({type: 'custom.unset.column', at})
editor.send({type: 'custom.unset.table', at})
```

Column inserts, deletes, and moves keep the table's per-column `alignment`
array aligned with the columns. Delete and Enter inside a table are handled so
they clear cell contents rather than corrupt the table structure.

## Selection

A linear editor selection that spans more than one cell derives a rectangular
table selection. The default cell render paints selection borders around that
rectangle. The helpers backing it are exported for custom renders:
`useTableCellSelectionEdges`, `selectionBorderStyle`, and the `CellEdges` type.

## Customizing the render

`<TablePlugin />` ships default `<table>`/`<tr>`/`<td>` renders. Pass
`components` to wrap or replace any of the three; each render receives
`renderDefault` so a wrapper can re-emit the default verbatim.

```tsx
import {TablePlugin} from '@portabletext/plugin-table'

;<TablePlugin
  components={{
    table: ({renderDefault, ...props}) => (
      <div className="my-table-wrapper">{renderDefault(props)}</div>
    ),
  }}
/>
```

`defaultTableRender`, `defaultRowRender`, `defaultCellRender`, and
`buildTableContainer` are also exported for consumers that compose the
containers directly.

## What's not here yet

- **Visual alignment.** Per-column `alignment` is stored and preserved through
  column edits, so it round-trips through `@portabletext/markdown`, but the
  default cell render does not yet apply it as `text-align`.
- **Keyboard cell navigation.** No Tab/Shift-Tab cell hopping, arrow movement
  across cell boundaries, or Tab-at-last-cell appending a row.
- **Clipboard round-trips.** Pasting tables from Markdown or spreadsheet HTML
  is not handled.

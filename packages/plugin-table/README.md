# `@portabletext/plugin-table`

> First-class tables for the Portable Text Editor

Tables as real Portable Text: a table block whose cells contain ordinary
Portable Text content, edited in place with spreadsheet-grade selection
semantics. The package has two layers:

- **`@portabletext/plugin-table`**, the headless core: `defineTable`,
  behaviors, and selection derivation. It knows how tables edit, not how
  they look.
- **`@portabletext/plugin-table/ui`**, the reference UI: the table
  components and their chrome (row/column handles, drag reorder, insert
  affordances, table menu), themable through CSS custom properties and
  replaceable where it counts.

```sh
npm install @portabletext/plugin-table
```

Peer dependencies: `@portabletext/editor` (`^7.10.0` or later), `react`
(`^19.2`), and `react-dom` (`^19.2`).

## Getting a table

Define the table in a module of its own:

```tsx
// table.ts
import {defineTable} from '@portabletext/plugin-table'
import {referenceContainers} from '@portabletext/plugin-table/ui'

export const table = defineTable({containers: referenceContainers})
```

Mount its plugin inside the editor and import the stylesheet:

```tsx
// app.tsx
import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import '@portabletext/plugin-table/ui/styles.css'
import {schemaDefinition} from './schema'
import {table} from './table'

function App() {
  return (
    <EditorProvider initialConfig={{schemaDefinition}}>
      <PortableTextEditable />
      <table.Plugin />
    </EditorProvider>
  )
}
```

One thing remains: the schema. The schema always comes from the owning
editor, the plugin defines none, and it must contain the table shape under
the configured names. With the default configuration:

```ts
// schema.ts
import {defineSchema} from '@portabletext/editor'

export const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {name: 'headerRows', type: 'number'},
        {name: 'alignment', type: 'array', of: [{type: 'string'}]},
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
```

Keeping the schema and the table definition in agreement is your
responsibility; the editor warns and skips the registration when a
registered container type or its array field is missing from the schema.
The `headerRows` and `alignment` fields are optional. `headerRows` drives
the reference UI's header styling and its menu toggle; omit it if you
don't need headers. `alignment` ships no UI at all: the plugin only keeps
the positional array in lockstep when columns are inserted, removed, or
moved; reading it in your cell renders and building UI that sets it are
yours, so declare it only when you build that.

That's the whole setup. What remains is a way to insert one, for example
a toolbar button:

```tsx
import {useEditor} from '@portabletext/editor'
import {table} from './table'

function InsertTableButton() {
  const editor = useEditor()
  return (
    <button
      type="button"
      onClick={() => {
        editor.send({
          type: 'insert.block',
          block: table.createBlock({headerRows: 1}),
          placement: 'auto',
        })
        editor.send({type: 'focus'})
      }}
    >
      Table
    </button>
  )
}
```

`table.createBlock({rows, columns, headerRows})` builds the nested value
with the definition's own type names and array fields: `rows` by `columns`
cells (default 3×3), each holding one empty text block. It emits no
`_key`s; the editor generates them on insert. Pass `headerRows` only when
your schema declares it.

## What you get

- **Cells are Portable Text.** Whatever styles, decorators, annotations,
  and objects your schema declares for the cell's content array work inside
  cells, toolbars and markdown shortcuts included.
- **Navigation.** `Tab`/`Shift+Tab` move between cells. Arrow keys move
  through cell content and across cell boundaries; at the table's document
  edges they escape into (or create) an adjacent text block.
- **Rectangular selection.** Extending the selection across cells selects
  the _rectangle_ spanned by the corner cells, not the linear fragment
  between them. Every selection-scoped edit gains rectangle semantics:
  - Typing or pasting over a rectangle clears it and lands in the top-left
    cell.
  - `Backspace`/`Delete` clear the rectangle's cell contents. When the
    rectangle covers the whole table, backspace deletes the table itself.
  - Decorator, annotation, style, and list toggles fan out per member cell,
    aggregate-first: if any member is missing the mark, the toggle adds it
    everywhere it is missing; only when all members have it does it remove.
  - Copy and cut serialize the rectangle, sliced out of the table. Four
    clipboard representations are written: `application/x-portable-text`
    and `application/json` (the sliced fragment), `text/markdown`, and
    `text/plain` as tab-separated values, which pastes directly into
    spreadsheet applications.
- **Paste distribution.** Pasting a copied table fragment into a table
  distributes cell-per-cell from the anchor cell, growing rows and columns
  when the source overflows the target. Pasting non-table content stays in
  the anchor cell.
- **Chrome.** Hover-revealed row/column handles (click to select, drag to
  reorder), boundary dots that become insert buttons, extend lanes for
  appending rows and columns, a trash chip for the selected row or column,
  a table menu (header row toggle, select table, delete table), and
  horizontal scrolling for wide tables. All of it keyboard-reachable.
- **Read-only.** In read-only editors the editing chrome disappears while
  the table, its selection visuals, and copying keep working.

## Restyling it

The stylesheet ships the structural rules plus the theming contract: the
`--pt-plugin-table-*` custom properties. Override them on `:root` or any
shared ancestor; the defaults are declared at zero specificity, so any
consumer declaration wins.

Every color token defaults to a `light-dark()` pair, so declaring the color
scheme is the whole dark-mode opt-in:

```css
.dark {
  color-scheme: dark;
}
```

Hosts that resolve their own themes can ignore `color-scheme` entirely and
set resolved values per token instead.

| Token                                      | Purpose                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `--pt-plugin-table-accent`                 | Selection outline, handles' selected state, insert affordances, focus rings. |
| `--pt-plugin-table-accent-fg`              | Detail strokes rendered on top of accent surfaces.                           |
| `--pt-plugin-table-radius`                 | Corner radius of the visible surfaces (table, drag ghost, menu).             |
| `--pt-plugin-table-cell-padding`           | Cell density. Layout is measured, so any padding is safe.                    |
| `--pt-plugin-table-font-family`            | Text in the portaled layers, which cannot inherit the host font.             |
| `--pt-plugin-table-bg` / `-fg` / `-border` | The table's base surface, text, and grid.                                    |
| `--pt-plugin-table-header-bg`              | Header row background.                                                       |
| `--pt-plugin-table-selected-bg`            | The rectangle overlay's tint.                                                |
| `--pt-plugin-table-lane-*`                 | The extend lanes (background, hover, icon states).                           |
| `--pt-plugin-table-handle-*`               | Row/column handles (rest bar, expanded background, dots, ring).              |
| `--pt-plugin-table-boundary-dot`           | The insert boundary dots at rest.                                            |
| `--pt-plugin-table-trash-bg` / `-fg`       | The row/column trash chip.                                                   |
| `--pt-plugin-table-danger`                 | Destructive states (trash hover, the menu's delete item).                    |
| `--pt-plugin-table-menu-*`                 | The built-in menu (background, border, hover).                               |
| `--pt-plugin-table-toggle-*`               | The built-in menu's header-row switch.                                       |
| `--pt-plugin-table-scrollbar` / `-hover`   | The horizontal scrollbar under wide tables.                                  |

Deliberately not themable: the chrome's geometry (gutter sizes, handle and
lane dimensions, hit areas). Those values feed the hit-testing and
positioning math, so they stay uniform; the table can look like anything,
but its ergonomics are fixed.

## Owning the definitions

Everything so far used `referenceContainers`, the pre-wired definitions.
A _container_ is the editor's concept for a block object whose array field
holds nested, editable Portable Text, declared with `defineContainer` from
`@portabletext/editor`; a table is three containers deep (table → row →
cell). `defineTable` accepts your own definitions, role-keyed, and this is
where the names, the renders, and the cell content come under your
control:

```tsx
import {defineContainer} from '@portabletext/editor'
import {defineTable} from '@portabletext/plugin-table'
import {Table, TableCell} from '@portabletext/plugin-table/ui'

export const table = defineTable({
  containers: {
    table: defineContainer({
      type: 'richTable',
      arrayField: 'rows',
      render: (props) => <Table {...props} />,
    }),
    row: defineContainer({type: 'tableRow', arrayField: 'cells'}),
    cell: defineContainer({
      type: 'tableCell',
      arrayField: 'content',
      render: (props) => <TableCell {...props} />,
      of: [compactImage, callout],
    }),
  },
})
```

The reference components are `Table`, `TableRow`, and `TableCell`; they
resolve their table definition from the node they render, so they work
under renamed types without extra wiring. Mixing is fine, your own render
for the table, the reference `TableCell` for cells.

The division of ownership:

- **You own each definition**: the type name, the array field, the render,
  and, on the cell, its `of`, cell-scoped node definitions such as a
  compact image render that applies inside cells only.
- **The plugin owns the nesting**: it grafts `table.of → row.of → cell`
  itself, because the three-level shape is load-bearing for every behavior
  and the clipboard format. An `of` on the table or row definition draws
  a warning instead of being honored.

Everything is optional, and every omission falls back one level: an omitted
`render` uses the built-in bare render for that role, an omitted definition
uses the canonical one, and no argument at all yields the defaults.

Renaming the types is how you adopt a table shape that already exists in
your datasets, for example when migrating from a table plugin that used
different names. Names and field names are configurable; the nesting shape
and the `headerRows`/`alignment` fields are not. Data whose cells are not
arrays of Portable Text blocks needs a data migration regardless of
configuration. Remember that the schema follows the configuration: rename
the types in `defineTable` and your schema must declare the same names.

## Integrating it into a host app

When tokens are not enough, the chrome has three integration points, passed
as props where a container definition renders `Table`, the `render`
callbacks from the previous section. Starting from `referenceContainers`,
override just the table role, restating its canonical values (`type:
'table'`, `arrayField: 'rows'`):

```tsx
import {defineContainer} from '@portabletext/editor'
import {defineTable} from '@portabletext/plugin-table'
import {referenceContainers, Table} from '@portabletext/plugin-table/ui'

export const table = defineTable({
  containers: {
    ...referenceContainers,
    table: defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: (props) => <Table {...props} portalElement={myPortalElement} />,
    }),
  },
})
```

**`portalElement`.** The menu and the trash chip portal into
`document.body` by default. Hosts with their own portal and layering system
pass theirs, as above, so the chrome joins the host's stacking context and
inherits its styling scope.

**`renderMenu`.** The table menu is widget-shaped chrome, so it is
replaceable wholesale rather than themable: hosts with a design system
render their own menu through the slot, and the plugin keeps what only it
knows, the anchor position above the table's top-right corner, the hover
reveal, and editor-focus preservation.

```tsx
render: (props) => (
  <Table
    {...props}
    renderMenu={({
      hasHeader,
      onToggleHeader,
      onSelectTable,
      onDeleteTable,
      onOpenChange,
    }) => (
      <MyMenuButton
        onOpen={() => onOpenChange(true)}
        onClose={() => onOpenChange(false)}
        items={[
          {label: 'Header row', checked: hasHeader, onSelect: onToggleHeader},
          {label: 'Select table', onSelect: onSelectTable},
          {label: 'Delete table', tone: 'critical', onSelect: onDeleteTable},
        ]}
      />
    )}
  />
)
```

Report the widget's open state through `onOpenChange` so the anchor stays
visible while the menu is open. Without the prop, a built-in menu renders.

**`icons`.** The drawn chrome's icons accept host replacements (the menu's
icons travel with `renderMenu` instead). Icons render at the built-in scale
when sized in `em`s:

```tsx
render: (props) => <Table {...props} icons={{trash: <MyTrashIcon />}} />
```

## Driving it from your own UI

Structural edits are custom behavior events, dispatched with
`editor.send(...)`. This is what the reference UI's handles and menu send;
your own toolbar can send them too. Every event addresses the table through
a path _inside a reference cell_ (any path inside the cell's content works;
the behaviors resolve the enclosing cell, row, and table from it):

| Event                  | Payload                                     | Effect                                                         |
| ---------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `custom.insert.row`    | `{at: Path, position: 'before' \| 'after'}` | Insert an empty row beside the row containing `at`.            |
| `custom.insert.column` | `{at: Path, position: 'before' \| 'after'}` | Insert an empty column beside the column containing `at`.      |
| `custom.unset.row`     | `{at: Path}`                                | Delete the row containing `at`.                                |
| `custom.unset.column`  | `{at: Path}`                                | Delete the column containing `at`.                             |
| `custom.unset.table`   | `{at: Path}`                                | Delete the table containing `at`.                              |
| `custom.move.row`      | `{at: Path, to: Path}`                      | Move the row containing `at` to the row containing `to`.       |
| `custom.move.column`   | `{at: Path, to: Path}`                      | Move the column containing `at` to the column containing `to`. |

The caret's own path is the usual source for `at` (`Path` is exported
from `@portabletext/editor`). A toolbar button that inserts a row below
the current one:

```tsx
const selection = editor.getSnapshot().context.selection
if (selection) {
  editor.send({
    type: 'custom.insert.row',
    at: selection.focus.path,
    position: 'after',
  })
}
```

Header state is plain block data: toggle it with the editor's own
`block.set` event (`{at: tablePath, props: {headerRows: 1}}`), where
`tablePath` is the table block's keyed path (`[{_key: ...}]`), carried by
`getTableSelection` below or taken from the first segment of any path
inside the table.

To read the current rectangle, the table definition carries a selector:

```ts
const tableSelection = table.getTableSelection(editor.getSnapshot())
// undefined, or:
// {
//   tablePath: Path
//   rowRange: [number, number]
//   colRange: [number, number]
// }
```

It returns `undefined` unless the selection spans more than one cell of
one table. The reference UI paints its selection overlay from this selector
(through `useEditorSelector`); anything else that needs rectangle awareness
reads the same source. It also carries the node guards `table.isTable`,
`table.isRow`, and `table.isCell`, which narrow to the `TableNode`,
`RowNode`, and `CellNode` types.

## Going fully headless

`defineTable()` with no configuration registers bare, unstyled
`<table>`/`<tr>`/`<td>` renders, useful for tests and prototypes, or as the
base for your own renders via the `render` callbacks, with no `/ui` import
and no stylesheet.

Consumers who need to own container registration outright can skip
`table.Plugin` entirely: mount `table.behaviors` in a `BehaviorPlugin`
beside your own `NodePlugin` registration. Keeping that registration's
nesting faithful to the shape is then on you.

Multiple table definitions coexist in one editor: the behaviors only act
when the addressed cell belongs to a table matching their own definition.

## License

MIT

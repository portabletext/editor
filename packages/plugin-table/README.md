# `@portabletext/plugin-table`

> Tables as real Portable Text, edited with spreadsheet-grade selection

Table cells hold ordinary Portable Text. Whatever styles, decorators,
annotations, and objects your schema declares work inside a cell, with the
same toolbar and shortcuts as the rest of the document. Select across
cells and you get the rectangle they span, like in a spreadsheet, and
editing operations understand that rectangle.

The package has two entry points. The root export is headless and holds
`defineTable`, the behaviors, and selection derivation. The reference UI
lives in `@portabletext/plugin-table/ui`: table components and their
chrome (row/column handles, drag reorder, insert affordances, a table
menu), themable with CSS custom properties.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/table-dark.png">
  <img alt="A table in the Portable Text Editor: a plan-comparison table with bold text, links, and bulleted lists inside cells. One column is selected through its handle, showing the rectangle selection and the delete button." src="./assets/table-light.png">
</picture>

## Installation

```sh
npm install @portabletext/plugin-table
```

Peer dependencies: `@portabletext/editor` (`^7.10.0` or later), `react`
(`^19.2`), and `react-dom` (`^19.2`).

## Quick start

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

The schema comes from the owning editor. The plugin doesn't define one,
so your schema needs to declare the table shape under the configured
names. With the default configuration:

```ts
// schema.ts
import {defineSchema} from '@portabletext/editor'

export const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {name: 'headerRows', type: 'number'},
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

It's your job to keep the schema and the table definition in agreement.
If a registered container type or its array field is missing from the
schema, the editor warns and skips the registration. `headerRows` is
optional. It drives the reference UI's header styling and menu toggle, so
leave it out if you don't need headers.

Finally, you need a way to insert a table. For example a toolbar button:

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
using the definition's type names and array fields. The default is a 3×3
grid with one empty text block per cell. It emits no `_key`s; the editor
generates them on insert. Only pass `headerRows` if your schema declares
it.

## Features

- Cells are Portable Text. Styles, decorators, annotations, and objects
  declared for the cell's content array all work inside cells, including
  toolbars and markdown shortcuts.
- `Tab` and `Shift+Tab` move between cells. Arrow keys move through cell
  content and across cell boundaries. At the table's document edges they
  escape into (or create) an adjacent text block.
- Extending the selection across cells selects the _rectangle_ spanned by
  the corner cells, not the linear fragment between them. Editing
  operations understand the rectangle:
  - Typing or pasting over a rectangle clears it and lands in the top-left
    cell.
  - `Backspace` and `Delete` clear the cell contents. If the rectangle
    covers the whole table, backspace deletes the table itself.
  - Decorator, annotation, style, and list toggles apply per member cell.
    If any member is missing the mark, the toggle adds it everywhere it's
    missing. Only when all members have it does it remove.
  - Copy and cut serialize the rectangle, sliced out of the table, in four
    clipboard formats: `application/x-portable-text` and
    `application/json` (the sliced fragment), `text/markdown`, and
    `text/plain` as tab-separated values. The last one pastes directly
    into spreadsheet applications.
- Pasting a copied table fragment into a table distributes it cell by cell
  from the anchor cell, growing rows and columns if the source overflows
  the target. Non-table content is pasted into the anchor cell.
- The chrome has hover-revealed row/column handles (click to select, drag
  to reorder), boundary dots that turn into insert buttons, lanes for
  appending rows and columns, a trash chip for the selected row or column,
  a table menu (header row toggle, select table, delete table), and
  horizontal scrolling for wide tables. Everything is reachable with the
  keyboard.
- Read-only editors hide the editing chrome. The table itself, selection
  visuals, and copying keep working.

## Theming

The stylesheet ships the structural rules plus a set of
`--pt-plugin-table-*` custom properties. Override them on `:root` or any
shared ancestor. The defaults are declared at zero specificity, so any
declaration of yours wins.

Color tokens default to `light-dark()` pairs, so dark mode is a matter of
declaring the color scheme:

```css
.dark {
  color-scheme: dark;
}
```

If your app resolves its own themes, ignore `color-scheme` and set
resolved values per token instead.

| Token                                      | Purpose                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `--pt-plugin-table-accent`                 | Selection outline, handles' selected state, insert affordances, focus rings. |
| `--pt-plugin-table-accent-fg`              | Detail strokes rendered on top of accent surfaces.                           |
| `--pt-plugin-table-radius`                 | Corner radius of the visible surfaces (table, drag ghost, menu).             |
| `--pt-plugin-table-cell-padding`           | Cell density. Layout is measured, so any padding is safe.                    |
| `--pt-plugin-table-font-family`            | Text in the portaled layers, which cannot inherit the host font.             |
| `--pt-plugin-table-bg` / `-fg` / `-border` | The table's base surface, text, and grid.                                    |
| `--pt-plugin-table-header-bg`              | Header row background.                                                       |
| `--pt-plugin-table-header-weight`          | Header row font weight.                                                      |
| `--pt-plugin-table-selected-bg`            | The rectangle overlay's tint.                                                |
| `--pt-plugin-table-lane-*`                 | The extend lanes (background, hover, icon states).                           |
| `--pt-plugin-table-handle-*`               | Row/column handles (rest bar, expanded background, dots, ring).              |
| `--pt-plugin-table-boundary-dot`           | The insert boundary dots at rest.                                            |
| `--pt-plugin-table-trash-bg` / `-fg`       | The row/column trash chip.                                                   |
| `--pt-plugin-table-danger`                 | Destructive states (trash hover, the menu's delete item).                    |
| `--pt-plugin-table-menu-*`                 | The built-in menu (background, border, hover).                               |
| `--pt-plugin-table-toggle-*`               | The built-in menu's header-row switch.                                       |
| `--pt-plugin-table-scrollbar` / `-hover`   | The horizontal scrollbar under wide tables.                                  |

The chrome's geometry (gutter sizes, handle and lane dimensions, hit
areas) is deliberately not themable. Those values feed the hit-testing
and positioning math.

When the theme only exists as a runtime object (a design system resolving
colors in JavaScript), pass the same token names per instance through the
`tokens` prop instead of a stylesheet. The plugin applies them inline to
its own roots, including the portal layers, so they reach the chrome no
matter where it renders:

```tsx
render: (props) => (
  <Table
    {...props}
    tokens={{
      '--pt-plugin-table-accent': theme.focusRing,
      '--pt-plugin-table-bg': theme.bg,
      // ...any subset; the stylesheet defaults cover the rest
    }}
  />
)
```

Beyond the tokens, the plugin marks DOM state with
`data-pt-plugin-table-*` attributes for host CSS to target. The one you
are most likely to need is `data-pt-plugin-table-header` on header row
cells: the cell sets the header weight inline, but that only reaches
text that inherits, so if your text components declare their own weight,
restore it with a rule like:

```css
td[data-pt-plugin-table-header] .your-text-component {
  font-weight: var(--pt-plugin-table-header-weight, 600);
}
```

## Bringing your own containers

So far we've used `referenceContainers`, the pre-wired definitions.
`defineTable` also accepts your own, one per role. Each role is a
`defineContainer` definition (a _container_ is the editor's concept for a
block object whose array field holds nested, editable Portable Text; a
table is three of them, table → row → cell). Bringing your own
definitions is how you rename types and fields, plug in your own renders,
and decide what's allowed inside cells:

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

Who owns what:

- You own each definition: the type name, the array field, the render,
  and, on the cell, its `of` (node definitions that only apply inside
  cells, like a compact image render).
- The plugin owns the nesting. It grafts `table.of → row.of → cell`
  itself, since the three-level shape is load-bearing for every behavior
  and for the clipboard format. An `of` on the table or row definition
  logs a warning and is ignored.
- Everything is optional. Omit a `render` and you get the bare built-in
  render for that role, omit a definition and you get the canonical one,
  call `defineTable()` with no argument and you get all defaults.

The reference components `Table`, `TableRow`, and `TableCell` work under
renamed types without extra wiring; they figure out their table definition
from the node they render. Mixing is fine too, for example your own render
for the table and the reference `TableCell` for cells.

Renaming types is how you adopt a table shape that already exists in your
dataset, for example when migrating from another table plugin. Only the
type and field names are configurable; the nesting shape and the
`headerRows` field name are fixed. If your cells aren't arrays of Portable
Text blocks, you need a data migration no matter what. And the schema
follows the configuration: rename types in `defineTable` and the schema
must declare the same names.

## Host integration

Some things CSS can't do: mounting the chrome's popovers in your app's
portal and layering system, rendering your design system's menu, or using
your icon set. For those, `Table` takes three props. They're passed where
a container definition renders it, so start from `referenceContainers` and
override the table role, restating its canonical values (`type: 'table'`,
`arrayField: 'rows'`):

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

`portalElement` decides where the menu and the trash chip portal to
(`document.body` by default). Pass your app's portal element, as above,
and the chrome joins your stacking context and inherits its styling scope.

`renderMenu` replaces the built-in table menu wholesale, so a design
system's menu can take its place. The plugin keeps what only it knows: the
anchor position above the table's top-right corner, the hover reveal, and
editor-focus preservation.

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

Report the widget's open state through `onOpenChange`, otherwise the
anchor hides while your menu is open. Without the prop, the built-in menu
renders.

`icons` replaces the drawn chrome's icons (currently the trash chip; the
menu's icons travel with `renderMenu`). Icons sized in `em`s render at the
built-in scale:

```tsx
render: (props) => <Table {...props} icons={{trash: <MyTrashIcon />}} />
```

`labels` overrides the strings the chrome renders (aria-labels and
tooltips for the handles, lanes, insert dots, trash chips, and the menu
trigger, plus the built-in menu's items), merged over the English
defaults. Hosts with their own i18n resolve translations and pass the
final strings. The `menu-*` keys only render when the built-in menu does;
a `renderMenu` widget carries its own strings:

```tsx
render: (props) => (
  <Table
    {...props}
    labels={{
      'insert-here': t('table.insert-here'),
      'row-handle': t('table.row-handle'),
      'column-handle': t('table.column-handle'),
      'add-row': t('table.add-row'),
      'add-column': t('table.add-column'),
      'delete-row': t('table.delete-row'),
      'delete-column': t('table.delete-column'),
      'table-options': t('table.table-options'),
      'menu-header-row': t('table.menu-header-row'),
      'menu-select-table': t('table.menu-select-table'),
      'menu-delete-table': t('table.menu-delete-table'),
    }}
  />
)
```

## Driving it from your own UI

Structural edits are custom behavior events dispatched with
`editor.send(...)`. The reference UI's handles and menu send these, and
your own toolbar can too. Every event addresses the table with a path
_inside a reference cell_. Any path inside the cell's content works; the
behaviors resolve the enclosing cell, row, and table from it.

| Event                  | Payload                                     | Effect                                                         |
| ---------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `custom.insert.row`    | `{at: Path, position: 'before' \| 'after'}` | Insert an empty row beside the row containing `at`.            |
| `custom.insert.column` | `{at: Path, position: 'before' \| 'after'}` | Insert an empty column beside the column containing `at`.      |
| `custom.unset.row`     | `{at: Path}`                                | Delete the row containing `at`.                                |
| `custom.unset.column`  | `{at: Path}`                                | Delete the column containing `at`.                             |
| `custom.unset.table`   | `{at: Path}`                                | Delete the table containing `at`.                              |
| `custom.move.row`      | `{at: Path, to: Path}`                      | Move the row containing `at` to the row containing `to`.       |
| `custom.move.column`   | `{at: Path, to: Path}`                      | Move the column containing `at` to the column containing `to`. |

The usual source for `at` is the caret's own path (`Path` is exported
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

Header state is plain block data. Toggle it with the editor's `block.set`
event (`{at: tablePath, props: {headerRows: 1}}`), where `tablePath` is
the table block's keyed path (`[{_key: ...}]`). You get it from
`getTableSelection` below, or from the first segment of any path inside
the table.

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

It returns `undefined` unless the selection spans more than one cell of a
single table. The reference UI paints its selection overlay from this
selector (through `useEditorSelector`). The definition also carries the
node guards `table.isTable`, `table.isRow`, and `table.isCell`, which
narrow to the `TableNode`, `RowNode`, and `CellNode` types.

## Headless usage

`defineTable()` with no configuration registers bare, unstyled
`<table>`/`<tr>`/`<td>` renders. Useful for tests and prototypes, or as
the base for your own renders, with no `/ui` import and no stylesheet.

If you need to own container registration outright, skip `table.Plugin`
and mount `table.behaviors` in a `BehaviorPlugin` next to your own
`NodePlugin` registration. Keeping that registration faithful to the
nesting shape is then on you.

Multiple table definitions can coexist in one editor. The behaviors only
act when the addressed cell belongs to a table matching their own
definition.

## License

MIT

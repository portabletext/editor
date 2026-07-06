import {
  defineContainer,
  type Container,
  type EditorSnapshot,
  type PortableTextBlock,
} from '@portabletext/editor'
import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import {createDeleteBehaviors} from './behaviors/delete'
import {createFormatBehaviors} from './behaviors/format'
import {createInsertBehaviors} from './behaviors/insert'
import {createMoveBehaviors} from './behaviors/move'
import {createNavBehaviors} from './behaviors/nav'
import {createPasteBehaviors} from './behaviors/paste'
import {createSelectBehaviors} from './behaviors/select'
import {createSerializeBehaviors} from './behaviors/serialize'
import type {
  CellNode,
  RowNode,
  TableNode,
  TableSelection,
} from './behaviors/types'
import {createUnsetBehaviors} from './behaviors/unset'
import {getTableSelection} from './get-table-selection'
import {
  createTableGuards,
  registerTableConfig,
  type TableConfig,
} from './table-config'

/**
 * The container definitions `defineTable` builds on, role-keyed. Each is a
 * `defineContainer(...)` result; an omitted role falls back to the
 * canonical definition (`table`/`row`/`cell` with the bare render).
 *
 * @alpha
 */
export type TableContainers = {
  table?: Container
  row?: Container
  cell?: Container
}

/**
 * What `defineTable` returns: the plugin component, the behaviors for
 * consumers that own container registration themselves, the rectangle
 * selector, and the node guards, all bound to the definition's type names
 * and array fields.
 *
 * @alpha
 */
export type TableDefinition = {
  /**
   * Registers the containers (nested per the definition) and mounts the
   * table behaviors. Renders next to `PortableTextEditable` inside
   * `EditorProvider`.
   */
  Plugin: () => JSX.Element
  /**
   * The table behaviors, split out so a consumer that owns container
   * registration (its own `NodePlugin`) can mount them with a
   * `<BehaviorPlugin behaviors={table.behaviors} />` instead of `Plugin`.
   */
  behaviors: ReturnType<typeof createTableBehaviors>
  /**
   * The rectangle spanned by the current selection's corner cells, or
   * `undefined` unless the selection spans more than one cell of one table
   * matching this definition.
   */
  getTableSelection: (snapshot: EditorSnapshot) => TableSelection | undefined
  isTable: (node: PortableTextBlock) => node is TableNode
  isRow: (node: PortableTextBlock) => node is RowNode
  isCell: (node: PortableTextBlock) => node is CellNode
}

/**
 * Builds a table definition over role-keyed container definitions. The
 * consumer owns each definition (type name, array field, render, and the
 * cell's `of`); the plugin owns the nesting, grafting `table.of → row.of →
 * cell` itself, because the three-level shape is load-bearing for every
 * behavior and the clipboard format. An `of` on the table or row
 * definition draws a warning instead of being honored.
 *
 * No argument yields the canonical definition: `table`/`row`/`cell` type
 * names, `rows`/`cells`/`value` array fields, and bare
 * `<table>`/`<tr>`/`<td>` renders.
 *
 * @alpha
 */
export function defineTable(
  options: {containers?: TableContainers} = {},
): TableDefinition {
  const containers = options.containers ?? {}
  const table = withFallbackRender(
    containers.table ?? canonicalTableContainer,
    bareTableRender,
  )
  const row = withFallbackRender(
    containers.row ?? canonicalRowContainer,
    bareRowRender,
  )
  const cell = withFallbackRender(
    containers.cell ?? canonicalCellContainer,
    bareCellRender,
  )

  for (const [role, definition] of [
    ['table', table],
    ['row', row],
  ] as const) {
    if (definition.of) {
      console.warn(
        `[@portabletext/plugin-table] The ${role} definition ('${definition.type}') declares an \`of\`, which \`defineTable\` owns: the nesting is grafted as table.of → row.of → cell. The declared \`of\` is ignored. Cell-scoped node definitions belong on the cell definition's \`of\`.`,
      )
    }
  }

  const config: TableConfig = {
    tableType: table.type,
    rowsField: table.arrayField,
    rowType: row.type,
    cellsField: row.arrayField,
    cellType: cell.type,
    valueField: cell.arrayField,
  }
  registerTableConfig(config)

  const graftedTable: Container = {
    ...table,
    of: [{...row, of: [cell]}],
  }
  const behaviors = createTableBehaviors(config)

  function Plugin() {
    return (
      <>
        <NodePlugin nodes={[graftedTable]} />
        <BehaviorPlugin behaviors={behaviors} />
      </>
    )
  }

  return {
    Plugin,
    behaviors,
    getTableSelection: (snapshot) => getTableSelection(snapshot, config),
    ...createTableGuards(config),
  }
}

export function createTableBehaviors(config: TableConfig) {
  return [
    ...createInsertBehaviors(config),
    ...createUnsetBehaviors(config),
    ...createMoveBehaviors(config),
    ...createDeleteBehaviors(config),
    ...createNavBehaviors(config),
    ...createSelectBehaviors(config),
    ...createFormatBehaviors(config),
    ...createSerializeBehaviors(config),
    ...createPasteBehaviors(config),
  ]
}

const bareTableRender: NonNullable<Container['render']> = ({
  attributes,
  children,
}) => (
  <table {...attributes}>
    <tbody>{children}</tbody>
  </table>
)

const bareRowRender: NonNullable<Container['render']> = ({
  attributes,
  children,
}) => <tr {...attributes}>{children}</tr>

const bareCellRender: NonNullable<Container['render']> = ({
  attributes,
  children,
}) => <td {...attributes}>{children}</td>

const canonicalTableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
})

const canonicalRowContainer = defineContainer({
  type: 'row',
  arrayField: 'cells',
})

const canonicalCellContainer = defineContainer({
  type: 'cell',
  arrayField: 'value',
})

function withFallbackRender(
  definition: Container,
  fallback: NonNullable<Container['render']>,
): Container {
  return definition.render ? definition : {...definition, render: fallback}
}

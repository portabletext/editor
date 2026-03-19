import {createContext} from 'react'

/**
 * Tracks the current container scope as we render nested containers.
 *
 * The scope accumulates type names separated by dots:
 * - At the editor root: undefined
 * - Inside a table: 'table'
 * - Inside a table row: 'table.row'
 * - Inside a table row cell: 'table.row.cell'
 *
 * This is used by RenderContainer to look up the correct scoped renderer.
 * For example, a 'row' element inside a 'table' needs to resolve as
 * 'blockObject:table.row', not 'blockObject:row'.
 */
export const ContainerScopeContext = createContext<string | undefined>(
  undefined,
)

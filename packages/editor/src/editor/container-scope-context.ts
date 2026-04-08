import type {OfDefinition} from '@portabletext/schema'
import {createContext, useContext} from 'react'

/**
 * Tracks the current container scope as we render nested containers.
 * The scope name accumulates type names separated by dots:
 * - At the editor root: undefined
 * - Inside a table: 'table'
 * - Inside a table row: 'table.row'
 * - Inside a table row cell: 'table.row.cell'
 */
export type ContainerScope = {
  name: string
  schemaScope: ReadonlyArray<OfDefinition> | undefined
}

export const ContainerScopeContext = createContext<ContainerScope | undefined>(
  undefined,
)

export function useContainerScope() {
  return useContext(ContainerScopeContext)
}

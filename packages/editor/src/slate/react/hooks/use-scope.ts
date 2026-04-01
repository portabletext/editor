import type {OfDefinition} from '@portabletext/schema'
import {createContext, useContext} from 'react'

export const ScopeContext = createContext<{
  scope: ReadonlyArray<OfDefinition> | undefined
  scopePath: string
}>({scope: undefined, scopePath: ''})

export function useScope() {
  return useContext(ScopeContext)
}

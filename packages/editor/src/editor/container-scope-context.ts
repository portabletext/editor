import {createContext, useContext} from 'react'

export const ContainerScopeContext = createContext<string | undefined>(
  undefined,
)

export function useContainerScope() {
  return useContext(ContainerScopeContext)
}

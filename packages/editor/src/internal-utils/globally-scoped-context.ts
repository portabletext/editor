import {createContext, type Context} from 'react'
import {globalScope} from './global-scope'

/**
 * As `@portabletext/editor` is declared as a dependency, and may be
 * duplicated, sometimes across major versions it's critical that vital
 * React Contexts are shared even when there is a duplicate.
 *
 * We have to support a Sanity Plugin being able to call hooks like
 * `useEditor`, and then read the context setup by `sanity`, which calls
 * `EditorProvider`, even if the provider and hook are different instances in
 * memory.
 *
 * For this reason it's vital that all changes to globally scoped providers
 * remain fully backwards compatible.
 */
export function createGloballyScopedContext<
  ContextType,
  const T extends ContextType = ContextType,
>(
  /**
   * Enforce that all Symbol.for keys used for globally scoped contexts have a predictable prefix
   */
  key: `@portabletext/editor/context/${string}`,
  defaultValue: T,
): Context<ContextType> {
  const symbol = Symbol.for(key)

  /**
   * Prevent errors about re-renders on React SSR on Next.js App Router
   */
  if (typeof document === 'undefined') {
    return createContext<ContextType>(defaultValue)
  }

  globalScope[symbol] = globalScope[symbol] ?? createContext<T>(defaultValue)

  return globalScope[symbol]
}

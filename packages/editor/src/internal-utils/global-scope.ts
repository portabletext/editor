/**
 * Gets the global scope. `globalThis` is universal in every environment
 * the editor supports (browsers, Node 12+, workers, Deno, Bun), so a single
 * read suffices.
 */
export const globalScope = globalThis as any

/// <reference types="vite/client" />

declare module '*.feature?raw' {
  const content: string
  export default content
}

// The PTE editor source has a `getGlobalScope()` helper that probes
// `globalThis`/`window`/`self`/`global` in turn. Browser apps don't
// include `@types/node` so `global` is unknown to TypeScript; declare
// it here so the editor source compiles when we walk it via the
// `@portabletext/editor/test/vitest` source path.
declare const global: typeof globalThis

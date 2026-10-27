/**
 * The `@portabletext/editor` entries for `optimizeDeps.include` in a browser
 * test project. Vite doesn't pre-bundle a linked workspace package, so without
 * this the browser requests each of the editor's per-module `lib` files
 * separately, hundreds per test file.
 */
export const editorDeps = [
  '@portabletext/editor',
  '@portabletext/editor/behaviors',
  '@portabletext/editor/plugins',
  '@portabletext/editor/selectors',
  '@portabletext/editor/traversal',
  '@portabletext/editor/utils',
]

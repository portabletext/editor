type ChunkFileNames =
  | string
  | ((chunk: {name: string; isEntry: boolean}) => string)

export declare function preserveModules(): {
  name: string
  buildStart?(options: {input: string[] | Record<string, string>}): void
  outputOptions?(options: {entryFileNames?: ChunkFileNames}): {
    entryFileNames: ChunkFileNames
    preserveModules: boolean
    preserveModulesRoot: string
  }
}

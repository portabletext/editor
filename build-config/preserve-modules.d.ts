type ChunkFileNames = string | ((chunk: {name: string}) => string)

export declare function preserveModules(): {
  name: string
  outputOptions(options: {entryFileNames?: ChunkFileNames}): {
    entryFileNames: ChunkFileNames
    preserveModules: boolean
    preserveModulesRoot: string
  }
}

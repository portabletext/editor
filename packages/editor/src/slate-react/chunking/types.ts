import type {Descendant} from '../../slate'
import type {Key} from '../../slate-dom'

export interface ChunkTree {
  type: 'root'
  children: ChunkDescendant[]

  /**
   * The chunks whose descendants have been modified during the most recent
   * reconciliation
   *
   * Used to determine when the otherwise memoized React components for each
   * chunk should be re-rendered.
   */
  modifiedChunks: Set<Chunk>
}

export interface Chunk {
  type: 'chunk'
  key: Key
  parent: ChunkAncestor
  children: ChunkDescendant[]
}

// A chunk leaf is unrelated to a Slate leaf; it is a leaf of the chunk tree,
// containing a single element that is a child of the Slate node the chunk tree
// belongs to.
export interface ChunkLeaf {
  type: 'leaf'
  key: Key
  node: Descendant
  index: number
}

export type ChunkAncestor = ChunkTree | Chunk
export type ChunkDescendant = Chunk | ChunkLeaf
export type ChunkNode = ChunkTree | Chunk | ChunkLeaf

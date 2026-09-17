import type {PortableTextBlock, SchemaDefinition} from '@portabletext/editor'

/** Where the caret goes before typing: the end of a given top-level block. */
export interface CaretTarget {
  blockIndex: number
  position: 'end'
}

export interface Scenario {
  name: string
  schemaDefinition: SchemaDefinition
  /** Plain, serializable Portable Text — no functions or class instances. */
  initialValue: PortableTextBlock[]
  target: CaretTarget
}

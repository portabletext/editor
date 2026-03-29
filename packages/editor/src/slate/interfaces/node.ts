import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {Path} from './path'

export type Node = PortableTextTextBlock | PortableTextObject | PortableTextSpan

/**
 * `NodeEntry` objects are returned when iterating over the nodes in a Slate
 * document tree. They consist of the node and its `Path` relative to the root
 * node in the document.
 */
export type NodeEntry<T extends Node = Node> = [T, Path]

import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {
  Containers,
  RegisteredContainer,
} from '../schema/resolve-containers'
import {getContainerChildren} from '../traversal/get-container-children'
import {toEngineBlock} from './values'

/**
 * The value without its non-object entries, at every depth: the root and the
 * child array of every registered container. Nothing the host sent is
 * mutated; a container whose children are all objects is returned as is.
 */
export function removeNonObjects(
  context: {schema: EditorSchema; containers: Containers},
  value: ReadonlyArray<unknown>,
): Array<PortableTextBlock> {
  return cleanChildren(context, value, undefined)
}

function cleanChildren(
  context: {schema: EditorSchema; containers: Containers},
  children: ReadonlyArray<unknown>,
  parent: RegisteredContainer | undefined,
): Array<PortableTextBlock> {
  const cleaned: Array<PortableTextBlock> = []

  for (const child of children) {
    if (child === null || typeof child !== 'object' || Array.isArray(child)) {
      continue
    }

    cleaned.push(cleanContainer(context, child as Node, parent))
  }

  return cleaned
}

function cleanContainer(
  context: {schema: EditorSchema; containers: Containers},
  node: Node,
  parent: RegisteredContainer | undefined,
): PortableTextBlock {
  const resolved = getContainerChildren(context.containers, node, parent)

  if (!resolved) {
    return toEngineBlock(node as PortableTextBlock, {
      schemaTypes: context.schema,
    }) as PortableTextBlock
  }

  const cleanedChildren = cleanChildren(
    context,
    resolved.children,
    resolved.container,
  )

  return {
    ...node,
    [resolved.container.field.name]: cleanedChildren,
  } as PortableTextBlock
}

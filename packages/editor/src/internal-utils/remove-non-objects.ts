import type {Patch} from '@portabletext/patches'
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

/**
 * The patches that unset the non-object entries of `value` in the host's
 * own value: a positional `unset` at the array index, reached through the
 * keyed path of each container. Within one array the entries go last to
 * first, so an earlier unset never moves a later one.
 */
export function getNonObjectRemovalPatches(
  context: {schema: EditorSchema; containers: Containers},
  value: ReadonlyArray<unknown>,
): Array<Patch> {
  const patches: Array<Patch> = []
  collectRemovals(context, value, undefined, [], patches)
  return patches
}

function collectRemovals(
  context: {schema: EditorSchema; containers: Containers},
  children: ReadonlyArray<unknown>,
  parent: RegisteredContainer | undefined,
  arrayPath: Array<string | number | {_key: string}>,
  patches: Array<Patch>,
) {
  const junkIndexes: Array<number> = []

  children.forEach((child, index) => {
    if (child === null || typeof child !== 'object' || Array.isArray(child)) {
      junkIndexes.push(index)
      return
    }

    const node = child as Node
    const resolved = getContainerChildren(context.containers, node, parent)

    if (!resolved) {
      return
    }

    collectRemovals(
      context,
      resolved.children,
      resolved.container,
      [
        ...arrayPath,
        node._key === undefined ? index : {_key: node._key},
        resolved.container.field.name,
      ],
      patches,
    )
  })

  for (const index of junkIndexes.toReversed()) {
    patches.push({type: 'unset', path: [...arrayPath, index], origin: 'local'})
  }
}

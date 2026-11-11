import type {Patch} from '@portabletext/patches'
import {
  getSubSchema,
  type PortableTextBlock,
  type Schema,
} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {
  Containers,
  RegisteredContainer,
} from '../schema/resolve-containers'
import {getContainerChildren} from '../traversal/get-container-children'
import {toKeyedPatchPath} from './operation-to-patches'
import {toEngineBlock} from './values'

export function removeNonObjects(
  context: {schema: Schema; containers: Containers},
  value: ReadonlyArray<unknown>,
): Array<PortableTextBlock> {
  return cleanChildren(context, value, undefined)
}

function cleanChildren(
  context: {schema: Schema; containers: Containers},
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
  context: {schema: Schema; containers: Containers},
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
    {
      ...context,
      schema: getSubSchema(context.schema, resolved.container.field.of),
    },
    resolved.children,
    resolved.container,
  )

  return {
    ...node,
    [resolved.container.field.name]: cleanedChildren,
  } as PortableTextBlock
}

export function getNonObjectRemovalPatches(
  context: {schema: Schema; containers: Containers},
  value: ReadonlyArray<unknown>,
): Array<Patch> {
  const patches: Array<Patch> = []
  collectRemovals(context, value, undefined, [], patches)
  return patches.map((patch) => ({
    ...patch,
    path: toKeyedPatchPath(value, patch.path),
  }))
}

function collectRemovals(
  context: {schema: Schema; containers: Containers},
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
      [...arrayPath, index, resolved.container.field.name],
      patches,
    )
  })

  for (const index of junkIndexes.toReversed()) {
    patches.push({type: 'unset', path: [...arrayPath, index], origin: 'local'})
  }
}

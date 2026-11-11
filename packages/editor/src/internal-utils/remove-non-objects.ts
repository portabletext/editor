import type {Patch} from '@portabletext/patches'
import {
  getSubSchema,
  isTextBlockNode,
  type PortableTextBlock,
  type Schema,
} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
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
  return cleanValue(context, value).value
}

export function getNonObjectRemovalPatches(
  context: {schema: Schema; containers: Containers},
  value: ReadonlyArray<unknown>,
): Array<Patch> {
  return cleanValue(context, value).patches
}

function cleanValue(
  context: {schema: Schema; containers: Containers},
  value: ReadonlyArray<unknown>,
): {value: Array<PortableTextBlock>; patches: Array<Patch>} {
  const patches: Array<Patch> = []
  const cleaned = cleanChildren(context, value, undefined, [], patches)
  return {
    value: cleaned,
    patches: patches.map((patch) => ({
      ...patch,
      path: toKeyedPatchPath(value, patch.path),
    })),
  }
}

function cleanChildren(
  context: {schema: Schema; containers: Containers},
  children: ReadonlyArray<unknown>,
  parent: RegisteredContainer | undefined,
  arrayPath: Path,
  patches: Array<Patch>,
): Array<PortableTextBlock> {
  return cleanArray(children, arrayPath, patches, (child, index) => {
    const node = child as Node
    const resolved = getContainerChildren(context.containers, node, parent)

    if (resolved) {
      return {
        ...node,
        [resolved.container.field.name]: cleanChildren(
          {
            ...context,
            schema: getSubSchema(context.schema, resolved.container.field.of),
          },
          resolved.children,
          resolved.container,
          [...arrayPath, index, resolved.container.field.name],
          patches,
        ),
      } as PortableTextBlock
    }

    let block = node as PortableTextBlock
    if (isTextBlockNode(context, block)) {
      for (const field of ['children', 'markDefs'] as const) {
        const entries: unknown = block[field]
        if (Array.isArray(entries)) {
          const cleaned = cleanArray(
            entries,
            [...arrayPath, index, field],
            patches,
            (entry) => entry,
          )
          if (cleaned.length !== entries.length) {
            block = {...block, [field]: cleaned}
          }
        }
      }
    }

    return toEngineBlock(block, {
      schemaTypes: context.schema,
    }) as PortableTextBlock
  })
}

function cleanArray<Result>(
  entries: ReadonlyArray<unknown>,
  arrayPath: Path,
  patches: Array<Patch>,
  cleanEntry: (entry: object, index: number) => Result,
): Array<Result> {
  const cleaned: Array<Result> = []
  const junkIndexes: Array<number> = []

  entries.forEach((entry, index) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      junkIndexes.push(index)
    } else {
      cleaned.push(cleanEntry(entry, index))
    }
  })

  for (const index of junkIndexes.toReversed()) {
    patches.push({type: 'unset', path: [...arrayPath, index], origin: 'local'})
  }

  return cleaned
}

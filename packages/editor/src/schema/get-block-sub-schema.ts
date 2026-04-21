import type {
  AnnotationSchemaType,
  BaseDefinition,
  DecoratorSchemaType,
  InlineObjectSchemaType,
  ListSchemaType,
  OfDefinition,
  StyleSchemaType,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getAncestors} from '../node-traversal/get-ancestors'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {getContainerScopedName} from './get-container-scoped-name'
import type {TraversalContainers} from './resolve-containers'

/**
 * The resolved validation view for a text block at a given path. At the
 * root of the document it equals the top-level schema view. Inside a
 * container it is the sub-schema of the nearest enclosing `{type: 'block'}`
 * entry (resolved by `compileSchema`), with any fields the nested block
 * doesn't override falling back to root.
 */
export type BlockSubSchema = {
  styles: ReadonlyArray<StyleSchemaType>
  decorators: ReadonlyArray<DecoratorSchemaType>
  annotations: ReadonlyArray<AnnotationSchemaType>
  lists: ReadonlyArray<ListSchemaType>
  inlineObjects: ReadonlyArray<InlineObjectSchemaType>
}

type ResolvedBlockOfDefinition = {
  type: 'block'
  styles?: ReadonlyArray<BaseDefinition>
  decorators?: ReadonlyArray<BaseDefinition>
  annotations?: ReadonlyArray<
    BaseDefinition & {fields?: ReadonlyArray<unknown>}
  >
  lists?: ReadonlyArray<BaseDefinition>
  inlineObjects?: ReadonlyArray<
    BaseDefinition & {fields?: ReadonlyArray<unknown>}
  >
}

/**
 * Return the sub-schema that applies at a given path.
 *
 * For paths at the root of the document, or for paths where no ancestor is
 * a registered container, returns the top-level schema view. For paths
 * inside a container, walks ancestors to find the nearest container and
 * returns the sub-schema from its `{type: 'block'}` entry.
 */
export function getBlockSubSchema(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
): BlockSubSchema {
  const nestedBlock = findEnclosingNestedBlock(context, path)

  if (!nestedBlock) {
    return rootSubSchema(context.schema)
  }

  return {
    styles: asStyleSchemaTypes(nestedBlock.styles) ?? context.schema.styles,
    decorators:
      asDecoratorSchemaTypes(nestedBlock.decorators) ??
      context.schema.decorators,
    annotations:
      asAnnotationSchemaTypes(nestedBlock.annotations) ??
      context.schema.annotations,
    lists: asListSchemaTypes(nestedBlock.lists) ?? context.schema.lists,
    inlineObjects:
      asInlineObjectSchemaTypes(nestedBlock.inlineObjects) ??
      context.schema.inlineObjects,
  }
}

function rootSubSchema(schema: EditorSchema): BlockSubSchema {
  return {
    styles: schema.styles,
    decorators: schema.decorators,
    annotations: schema.annotations,
    lists: schema.lists,
    inlineObjects: schema.inlineObjects,
  }
}

/**
 * Walk ancestors from the given path, find the nearest object node that is
 * a registered container, and return the `{type: 'block'}` member of its
 * child field. Returns `undefined` when no such ancestor exists -- the
 * caller should fall back to root schema.
 */
function findEnclosingNestedBlock(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
): ResolvedBlockOfDefinition | undefined {
  const ancestors = getAncestors(context, path)

  for (const ancestor of ancestors) {
    if (!isObjectNode({schema: context.schema}, ancestor.node)) {
      continue
    }

    const scopedName = getContainerScopedName(
      context,
      ancestor.node,
      ancestor.path,
    )
    const container = context.containers.get(scopedName)
    if (!container) {
      continue
    }

    const blockMember = container.field.of.find(
      (member): member is OfDefinition & {type: 'block'} =>
        member.type === 'block',
    )
    if (!blockMember) {
      continue
    }

    return blockMember as ResolvedBlockOfDefinition
  }

  return undefined
}

function asStyleSchemaTypes(
  resolved: ReadonlyArray<BaseDefinition> | undefined,
): ReadonlyArray<StyleSchemaType> | undefined {
  if (!resolved) {
    return undefined
  }
  return resolved.map((entry) => ({...entry, value: entry.name}))
}

function asDecoratorSchemaTypes(
  resolved: ReadonlyArray<BaseDefinition> | undefined,
): ReadonlyArray<DecoratorSchemaType> | undefined {
  if (!resolved) {
    return undefined
  }
  return resolved.map((entry) => ({...entry, value: entry.name}))
}

function asListSchemaTypes(
  resolved: ReadonlyArray<BaseDefinition> | undefined,
): ReadonlyArray<ListSchemaType> | undefined {
  if (!resolved) {
    return undefined
  }
  return resolved.map((entry) => ({...entry, value: entry.name}))
}

function asAnnotationSchemaTypes(
  resolved:
    | ReadonlyArray<BaseDefinition & {fields?: ReadonlyArray<unknown>}>
    | undefined,
): ReadonlyArray<AnnotationSchemaType> | undefined {
  if (!resolved) {
    return undefined
  }
  return resolved.map((entry) => ({
    ...entry,
    fields: (entry.fields ?? []) as AnnotationSchemaType['fields'],
  }))
}

function asInlineObjectSchemaTypes(
  resolved:
    | ReadonlyArray<BaseDefinition & {fields?: ReadonlyArray<unknown>}>
    | undefined,
): ReadonlyArray<InlineObjectSchemaType> | undefined {
  if (!resolved) {
    return undefined
  }
  return resolved.map((entry) => ({
    ...entry,
    fields: (entry.fields ?? []) as InlineObjectSchemaType['fields'],
  }))
}

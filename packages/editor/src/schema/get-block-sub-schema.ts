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
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getEnclosingContainer} from './get-enclosing-container'
import type {TraversalContainers} from './resolve-containers'
import {asFieldedTypes, asNamedTypes} from './schema-type-projections'

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
    styles:
      asNamedTypes<StyleSchemaType>(nestedBlock.styles) ??
      context.schema.styles,
    decorators:
      asNamedTypes<DecoratorSchemaType>(nestedBlock.decorators) ??
      context.schema.decorators,
    annotations:
      asFieldedTypes<AnnotationSchemaType>(nestedBlock.annotations) ??
      context.schema.annotations,
    lists:
      asNamedTypes<ListSchemaType>(nestedBlock.lists) ?? context.schema.lists,
    inlineObjects:
      asFieldedTypes<InlineObjectSchemaType>(nestedBlock.inlineObjects) ??
      context.schema.inlineObjects,
  }
}

/**
 * Return `true` when the given path is inside a registered editable
 * container -- i.e. when the block sub-schema at that path is resolved
 * from a nested `{type: 'block'}` definition rather than the top-level
 * schema.
 *
 * Use this to gate narrowing checks (e.g. "skip this decorator if the
 * sub-schema doesn't declare it"). At root we want to preserve the
 * permissive top-level behaviour where operations accept unknown
 * decorators/annotations/styles and track them optimistically; inside a
 * container the sub-schema is authoritative and those operations should
 * be filtered.
 */
export function isInsideEditableContainer(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
): boolean {
  return findEnclosingNestedBlock(context, path) !== undefined
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

function findEnclosingNestedBlock(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
): ResolvedBlockOfDefinition | undefined {
  const enclosing = getEnclosingContainer(context, path)

  if (!enclosing) {
    return undefined
  }

  const blockMember = enclosing.of.find(
    (member): member is OfDefinition & {type: 'block'} =>
      member.type === 'block',
  )

  if (!blockMember) {
    return undefined
  }

  return blockMember as ResolvedBlockOfDefinition
}

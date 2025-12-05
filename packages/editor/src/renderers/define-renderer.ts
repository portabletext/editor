import type {SchemaDefinition} from '@portabletext/schema'
import type {Renderer, RendererType} from './renderer.types'

/**
 * @beta
 * Create a renderer factory with full schema type inference.
 *
 * @example
 * ```tsx
 * import {createRenderers} from '@portabletext/editor'
 * import {schema} from './schema'
 *
 * const {defineRenderer} = createRenderers(schema)
 *
 * const imageRenderer = defineRenderer({
 *   type: 'inline',
 *   name: 'image',
 *   render: ({node}) => <img src={node.src} />, // node.src is inferred!
 * })
 * ```
 */
export function createRenderers<TSchema extends SchemaDefinition>(
  schema: TSchema,
): {
  defineRenderer: <
    TType extends RendererType,
    TName extends string,
    TGuardResponse = true,
  >(
    renderer: Renderer<TSchema, TType, TName, TGuardResponse>,
  ) => Renderer<TSchema, TType, TName, TGuardResponse>
}
export function createRenderers(): {
  defineRenderer: <
    TType extends RendererType,
    TName extends string,
    TGuardResponse = true,
  >(
    renderer: Renderer<SchemaDefinition, TType, TName, TGuardResponse>,
  ) => Renderer<SchemaDefinition, TType, TName, TGuardResponse>
}
export function createRenderers<
  TSchema extends SchemaDefinition = SchemaDefinition,
>(_schema?: TSchema) {
  return {
    defineRenderer: <
      TType extends RendererType,
      TName extends string,
      TGuardResponse = true,
    >(
      renderer: Renderer<TSchema, TType, TName, TGuardResponse>,
    ): Renderer<TSchema, TType, TName, TGuardResponse> => renderer,
  }
}

/**
 * @beta
 * Define a renderer for a specific node type.
 * For full schema type inference, use `createRenderers(schema)` instead.
 *
 * @example
 * ```tsx
 * import {defineRenderer} from '@portabletext/editor'
 *
 * // Text block renderer (name: 'block')
 * const textBlockRenderer = defineRenderer({
 *   type: 'block',
 *   name: 'block',
 *   render: ({attributes, children, node}) => (
 *     <div {...attributes} className={`heading-${node.style}`}>
 *       {children}
 *     </div>
 *   ),
 * })
 *
 * // Block object renderer
 * const imageRenderer = defineRenderer({
 *   type: 'block',
 *   name: 'image',
 *   render: ({attributes, children}) => (
 *     <figure {...attributes}>
 *       {children}
 *     </figure>
 *   ),
 * })
 * ```
 */
export function defineRenderer<
  TType extends RendererType,
  TName extends string,
  TGuardResponse = true,
>(
  renderer: Renderer<SchemaDefinition, TType, TName, TGuardResponse>,
): Renderer<SchemaDefinition, TType, TName, TGuardResponse> {
  return renderer
}

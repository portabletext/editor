import {
  compileSchema,
  defineSchema,
  type AnnotationDefinition,
  type BlockObjectDefinition,
  type DecoratorDefinition,
  type ListDefinition,
  type StyleDefinition,
} from '@portabletext/schema'

/********************
 * Default style definitions
 ********************/

export const normalStyleDefinition = {
  name: 'normal',
} as const satisfies StyleDefinition

export const h1StyleDefinition = {
  name: 'h1',
} as const satisfies StyleDefinition

export const h2StyleDefinition = {
  name: 'h2',
} as const satisfies StyleDefinition

export const h3StyleDefinition = {
  name: 'h3',
} as const satisfies StyleDefinition

export const h4StyleDefinition = {
  name: 'h4',
} as const satisfies StyleDefinition

export const h5StyleDefinition = {
  name: 'h5',
} as const satisfies StyleDefinition

export const h6StyleDefinition = {
  name: 'h6',
} as const satisfies StyleDefinition

export const blockquoteStyleDefinition = {
  name: 'blockquote',
} as const satisfies StyleDefinition

/********************
 * Default list definitions
 ********************/

export const defaultOrderedListItemDefinition = {
  name: 'number',
} as const satisfies ListDefinition

export const defaultUnorderedListItemDefinition = {
  name: 'bullet',
} as const satisfies ListDefinition

export const defaultTaskListItemDefinition = {
  name: 'task',
} as const satisfies ListDefinition

/********************
 * Default decorator definitions
 ********************/

export const defaultStrongDecoratorDefinition = {
  name: 'strong',
} as const satisfies DecoratorDefinition

export const defaultEmDecoratorDefinition = {
  name: 'em',
} as const satisfies DecoratorDefinition

export const defaultCodeDecoratorDefinition = {
  name: 'code',
} as const satisfies DecoratorDefinition

export const defaultStrikeThroughDecoratorDefinition = {
  name: 'strike-through',
} as const satisfies DecoratorDefinition

/********************
 * Default annotation definitions
 ********************/

export const defaultLinkObjectDefinition = {
  name: 'link',
  fields: [
    {name: 'href', type: 'string'},
    {name: 'title', type: 'string'},
  ],
} as const satisfies AnnotationDefinition

/********************
 * Default object definitions
 ********************/

export const defaultCodeObjectDefinition = {
  name: 'code',
  fields: [
    {name: 'language', type: 'string'},
    {name: 'code', type: 'string'},
  ],
} as const satisfies BlockObjectDefinition

export const defaultImageObjectDefinition = {
  name: 'image',
  fields: [
    {name: 'src', type: 'string'},
    {name: 'alt', type: 'string'},
    {name: 'title', type: 'string'},
  ],
} as const satisfies BlockObjectDefinition

export const defaultHorizontalRuleObjectDefinition = {
  name: 'horizontal-rule',
} as const satisfies BlockObjectDefinition

export const defaultHtmlObjectDefinition = {
  name: 'html',
  fields: [{name: 'html', type: 'string'}],
} as const satisfies BlockObjectDefinition

/**
 * Default block-object definition for a `table` container with rows of
 * cells where each cell holds a `value` array of child blocks.
 *
 * Add to a schema's `blockObjects` array to opt into table-as-container.
 *
 * @public
 */
export const defaultTableObjectDefinition = {
  name: 'table',
  fields: [
    {name: 'headerRows', type: 'number'},
    {name: 'rows', type: 'array'},
  ],
} as const satisfies BlockObjectDefinition

/**
 * Default block-object definition for the structural `list` shape produced
 * by `markdownToPortableText` when a `types.list` matcher is provided.
 *
 * Add to a schema's `blockObjects` array to opt into list-as-container.
 *
 * @public
 */
export const defaultListObjectDefinition = {
  name: 'list',
  fields: [
    {name: 'kind', type: 'string'},
    {name: 'items', type: 'array'},
  ],
} as const satisfies BlockObjectDefinition

/**
 * Default block-object definition for the structural `blockquote` shape
 * produced by `markdownToPortableText` when a `types.blockquote` matcher
 * is provided.
 *
 * Add to a schema's `blockObjects` array to opt into blockquote-as-container.
 *
 * @public
 */
export const defaultBlockquoteObjectDefinition = {
  name: 'blockquote',
  fields: [{name: 'content', type: 'array'}],
} as const satisfies BlockObjectDefinition

/**
 * Default block-object definition for an editor-shaped `code-block` where
 * the source is split into an array of text blocks (one per line) instead
 * of a single `code: string` field.
 *
 * The text-block sub-schema is intentionally narrow - no styles, decorators,
 * annotations, lists, or inline objects - because a code line is plaintext.
 * The wrapping container is expected to apply the monospace presentation.
 *
 * @public
 */
export const defaultCodeBlockObjectDefinition = {
  name: 'code-block',
  fields: [
    {name: 'language', type: 'string'},
    {name: 'lines', type: 'array'},
  ],
} as const satisfies BlockObjectDefinition

export const defaultCalloutObjectDefinition = {
  name: 'callout',
  fields: [
    {name: 'tone', type: 'string'},
    {name: 'content', type: 'array'},
  ],
} as const satisfies BlockObjectDefinition

/**
 * The default schema for converting markdown to Portable Text.
 *
 * @public
 */
export const defaultSchema = compileSchema(
  defineSchema({
    block: {
      fields: [{name: 'checked', type: 'boolean'}],
    },
    styles: [
      normalStyleDefinition,
      h1StyleDefinition,
      h2StyleDefinition,
      h3StyleDefinition,
      h4StyleDefinition,
      h5StyleDefinition,
      h6StyleDefinition,
      blockquoteStyleDefinition,
    ],
    lists: [
      defaultOrderedListItemDefinition,
      defaultUnorderedListItemDefinition,
      defaultTaskListItemDefinition,
    ],
    decorators: [
      defaultStrongDecoratorDefinition,
      defaultEmDecoratorDefinition,
      defaultCodeDecoratorDefinition,
      defaultStrikeThroughDecoratorDefinition,
    ],
    annotations: [defaultLinkObjectDefinition],
    blockObjects: [
      defaultCalloutObjectDefinition,
      defaultCodeObjectDefinition,
      defaultHorizontalRuleObjectDefinition,
      defaultHtmlObjectDefinition,
      defaultImageObjectDefinition,
      defaultTableObjectDefinition,
    ],
    inlineObjects: [defaultImageObjectDefinition],
  }),
)

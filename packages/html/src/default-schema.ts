import {
  compileSchema,
  defineSchema,
  type AnnotationDefinition,
  type BlockObjectDefinition,
  type DecoratorDefinition,
  type InlineObjectDefinition,
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

export const defaultUnderlineDecoratorDefinition = {
  name: 'underline',
} as const satisfies DecoratorDefinition

export const defaultStrikeThroughDecoratorDefinition = {
  name: 'strike-through',
} as const satisfies DecoratorDefinition

/********************
 * Default annotation definitions
 ********************/

export const defaultLinkAnnotationDefinition = {
  name: 'link',
  fields: [{name: 'href', type: 'string'}],
} as const satisfies AnnotationDefinition

/********************
 * Default object definitions
 ********************/

export const defaultImageObjectDefinition = {
  name: 'image',
  fields: [
    {name: 'src', type: 'string'},
    {name: 'alt', type: 'string'},
  ],
} as const satisfies BlockObjectDefinition

export const defaultInlineImageObjectDefinition = {
  name: 'image',
  fields: [
    {name: 'src', type: 'string'},
    {name: 'alt', type: 'string'},
  ],
} as const satisfies InlineObjectDefinition

/**
 * The default schema for converting HTML to Portable Text.
 *
 * @public
 */
export const defaultSchema = compileSchema(
  defineSchema({
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
    ],
    decorators: [
      defaultStrongDecoratorDefinition,
      defaultEmDecoratorDefinition,
      defaultCodeDecoratorDefinition,
      defaultUnderlineDecoratorDefinition,
      defaultStrikeThroughDecoratorDefinition,
    ],
    annotations: [defaultLinkAnnotationDefinition],
    blockObjects: [defaultImageObjectDefinition],
    inlineObjects: [defaultInlineImageObjectDefinition],
  }),
)

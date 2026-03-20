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

const normalStyleDefinition = {
  name: 'normal',
} as const satisfies StyleDefinition

const h1StyleDefinition = {
  name: 'h1',
} as const satisfies StyleDefinition

const h2StyleDefinition = {
  name: 'h2',
} as const satisfies StyleDefinition

const h3StyleDefinition = {
  name: 'h3',
} as const satisfies StyleDefinition

const h4StyleDefinition = {
  name: 'h4',
} as const satisfies StyleDefinition

const h5StyleDefinition = {
  name: 'h5',
} as const satisfies StyleDefinition

const h6StyleDefinition = {
  name: 'h6',
} as const satisfies StyleDefinition

const blockquoteStyleDefinition = {
  name: 'blockquote',
} as const satisfies StyleDefinition

/********************
 * Default list definitions
 ********************/

const defaultOrderedListItemDefinition = {
  name: 'number',
} as const satisfies ListDefinition

const defaultUnorderedListItemDefinition = {
  name: 'bullet',
} as const satisfies ListDefinition

/********************
 * Default decorator definitions
 ********************/

const defaultStrongDecoratorDefinition = {
  name: 'strong',
} as const satisfies DecoratorDefinition

const defaultEmDecoratorDefinition = {
  name: 'em',
} as const satisfies DecoratorDefinition

const defaultCodeDecoratorDefinition = {
  name: 'code',
} as const satisfies DecoratorDefinition

const defaultStrikeThroughDecoratorDefinition = {
  name: 'strike-through',
} as const satisfies DecoratorDefinition

/********************
 * Default annotation definitions
 ********************/

const defaultLinkObjectDefinition = {
  name: 'link',
  fields: [
    {name: 'href', type: 'string'},
    {name: 'title', type: 'string'},
  ],
} as const satisfies AnnotationDefinition

/********************
 * Default object definitions
 ********************/

const defaultCodeObjectDefinition = {
  name: 'code',
  fields: [
    {name: 'language', type: 'string'},
    {name: 'code', type: 'string'},
  ],
} as const satisfies BlockObjectDefinition

const defaultImageObjectDefinition = {
  name: 'image',
  fields: [
    {name: 'src', type: 'string'},
    {name: 'alt', type: 'string'},
    {name: 'title', type: 'string'},
  ],
} as const satisfies BlockObjectDefinition

const defaultHorizontalRuleObjectDefinition = {
  name: 'horizontal-rule',
} as const satisfies BlockObjectDefinition

const defaultHtmlObjectDefinition = {
  name: 'html',
  fields: [{name: 'html', type: 'string'}],
} as const satisfies BlockObjectDefinition

const defaultTableObjectDefinition = {
  name: 'table',
  fields: [
    {name: 'headerRows', type: 'number'},
    {name: 'rows', type: 'array'},
  ],
} as const satisfies BlockObjectDefinition

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
      defaultStrikeThroughDecoratorDefinition,
    ],
    annotations: [defaultLinkObjectDefinition],
    blockObjects: [
      defaultCodeObjectDefinition,
      defaultHorizontalRuleObjectDefinition,
      defaultImageObjectDefinition,
      defaultHtmlObjectDefinition,
      defaultTableObjectDefinition,
    ],
    inlineObjects: [defaultImageObjectDefinition],
  }),
)

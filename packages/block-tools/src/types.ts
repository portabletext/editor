import type {
  ArraySchemaType,
  I18nTitledListValue,
  ObjectSchemaType,
  PortableTextObject,
  SpanSchemaType,
  TitledListValue,
} from '@sanity/types'
import type {ComponentType} from 'react'

/**
 * @public
 */
export interface BlockContentFeatures {
  styles: TitledListValue<string>[]
  decorators: TitledListValue<string>[]
  annotations: ResolvedAnnotationType[]
  lists: I18nTitledListValue<string>[]
  types: {
    block: ArraySchemaType
    span: SpanSchemaType
    inlineObjects: ObjectSchemaType[]
    blockObjects: ObjectSchemaType[]
  }
}

/**
 * @beta
 */
export interface BlockEditorSchemaProps {
  icon?: string | ComponentType
  render?: ComponentType
}

/**
 * @public
 */
export interface ResolvedAnnotationType {
  blockEditor?: BlockEditorSchemaProps
  title: string | undefined
  value: string
  type: ObjectSchemaType
  icon: ComponentType | undefined
}

/**
 * @public
 */
export interface TypedObject {
  _type: string
  _key?: string
}

/**
 * @public
 */
export interface ArbitraryTypedObject extends TypedObject {
  [key: string]: unknown
}

export interface MinimalSpan {
  _type: 'span'
  _key?: string
  text: string
  marks?: string[]
}

export interface MinimalBlock extends TypedObject {
  _type: 'block'
  children: TypedObject[]
  markDefs?: TypedObject[]
  style?: string
  level?: number
  listItem?: string
}

export interface PlaceholderDecorator {
  _type: '__decorator'
  name: string
  children: TypedObject[]
}

export interface PlaceholderAnnotation {
  _type: '__annotation'
  markDef: PortableTextObject
  children: TypedObject[]
}

/**
 * @public
 */
export type HtmlParser = (html: string) => Document

/**
 * @public
 */
export type WhiteSpacePasteMode = 'preserve' | 'remove' | 'normalize'

/**
 * @public
 */
export interface HtmlDeserializerOptions {
  keyGenerator?: () => string
  rules?: DeserializerRule[]
  parseHtml?: HtmlParser
  unstable_whitespaceOnPasteMode?: WhiteSpacePasteMode
}

/**
 * @public
 */
export interface HtmlPreprocessorOptions {
  unstable_whitespaceOnPasteMode?: WhiteSpacePasteMode
}

/**
 * @public
 */
export interface DeserializerRule {
  deserialize: (
    el: Node,
    next: (
      elements: Node | Node[] | NodeList,
    ) => TypedObject | TypedObject[] | undefined,
    createBlock: (props: ArbitraryTypedObject) => {
      _type: string
      block: ArbitraryTypedObject
    },
  ) => TypedObject | TypedObject[] | undefined
}

/**
 * @public
 */
export interface BlockEnabledFeatures {
  enabledBlockStyles: string[]
  enabledSpanDecorators: string[]
  enabledListTypes: string[]
  enabledBlockAnnotations: string[]
}

import {PortableTextBlock} from '@portabletext/editor'
import {z} from 'zod'

export declare interface PortableTextObject {
  _type: string
  _key: string
  [other: string]: unknown
}

export declare interface PortableTextSpan {
  _key: string
  _type: 'span'
  text: string
  marks?: string[]
}

export type PortableTextType =
  | PortableTextBlock
  | PortableTextObject
  | PortableTextSpan

const schemaForType =
  <T>() =>
  <S extends z.ZodType<T>>(arg: S) => {
    return arg
  }

// This is the shape of the "TypedObject" Type from Sanity
export const baseTypedObjectZ = z
  .object({
    _type: z.string(),
    _key: z.string(),
  })
  .passthrough()

export const PortableTextTypeZod =
  schemaForType<PortableTextObject>()(baseTypedObjectZ)

import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import type {MIMEType} from '../internal-utils/mime-type'
import type {PickFromUnion} from '../type-utils'

export type Converter<TMIMEType extends MIMEType = MIMEType> = {
  mimeType: TMIMEType
  serialize: Serializer<TMIMEType>
  deserialize: Deserializer<TMIMEType>
}

export function defineConverter<TMIMEType extends MIMEType>(
  converter: Converter<TMIMEType>,
): Converter<TMIMEType> {
  return converter
}

export type ConverterEvent<TMIMEType extends MIMEType = MIMEType> =
  | {
      type: 'serialize'
      originEvent: 'copy' | 'cut' | 'unknown'
    }
  | {
      type: 'serialization.failure'
      mimeType: TMIMEType
      reason: string
    }
  | {
      type: 'serialization.success'
      data: string
      mimeType: TMIMEType
      originEvent: 'copy' | 'cut' | 'unknown'
    }
  | {
      type: 'deserialize'
      data: string
    }
  | {
      type: 'deserialization.failure'
      mimeType: TMIMEType
      reason: string
    }
  | {
      type: 'deserialization.success'
      data: Array<PortableTextBlock>
      mimeType: TMIMEType
    }

export type Serializer<TMIMEType extends MIMEType> = ({
  context,
  event,
}: {
  context: EditorContext
  event: PickFromUnion<ConverterEvent<TMIMEType>, 'type', 'serialize'>
}) => PickFromUnion<
  ConverterEvent<TMIMEType>,
  'type',
  'serialization.success' | 'serialization.failure'
>

export type Deserializer<TMIMEType extends MIMEType> = ({
  context,
  event,
}: {
  context: EditorContext
  event: PickFromUnion<ConverterEvent<TMIMEType>, 'type', 'deserialize'>
}) => PickFromUnion<
  ConverterEvent<TMIMEType>,
  'type',
  'deserialization.success' | 'deserialization.failure'
>

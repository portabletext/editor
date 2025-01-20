import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import type {PickFromUnion} from '../type-utils'

export type Converter<TMIMEType extends MIMEType> = {
  mimeType: TMIMEType
  serialize: Serializer<TMIMEType>
  deserialize: Deserializer<TMIMEType>
}

export type ConverterEvent<TMIMEType extends MIMEType> =
  | {
      type: 'serialize'
      originEvent: 'drag' | 'copy' | 'cut' | 'unknown'
    }
  | {
      type: 'serialization.success'
      data: string
      mimeType: TMIMEType
    }
  | {
      type: 'serialization.failure'
      mimeType: TMIMEType
    }
  | {
      type: 'deserialize'
      data: string
    }
  | {
      type: 'deserialization.success'
      data: Array<PortableTextBlock>
      mimeType: TMIMEType
    }
  | {
      type: 'deserialization.failure'
      mimeType: TMIMEType
    }

export type MIMEType = `${string}/${string}`

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

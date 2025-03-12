import type {PortableTextBlock} from '@sanity/types'
import type {EditorSnapshot} from '../editor/editor-snapshot'
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
      originEvent: 'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
    }
  | {
      type: 'serialization.failure'
      mimeType: TMIMEType
      originEvent: 'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      reason: string
    }
  | {
      type: 'serialization.success'
      data: string
      mimeType: TMIMEType
      originEvent: 'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
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
  snapshot,
  event,
}: {
  snapshot: EditorSnapshot
  event: PickFromUnion<ConverterEvent<TMIMEType>, 'type', 'serialize'>
}) => PickFromUnion<
  ConverterEvent<TMIMEType>,
  'type',
  'serialization.success' | 'serialization.failure'
>

export type Deserializer<TMIMEType extends MIMEType> = ({
  snapshot,
  event,
}: {
  snapshot: EditorSnapshot
  event: PickFromUnion<ConverterEvent<TMIMEType>, 'type', 'deserialize'>
}) => PickFromUnion<
  ConverterEvent<TMIMEType>,
  'type',
  'deserialization.success' | 'deserialization.failure'
>

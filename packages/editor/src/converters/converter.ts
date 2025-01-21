import type {PortableTextBlock} from '@sanity/types'
import type {BehaviorEvent} from '../behaviors'
import type {EditorContext} from '../editor/editor-snapshot'
import type {MIMEType} from '../internal-utils/mime-type'
import type {PickFromUnion} from '../type-utils'

export type Converter<TMIMEType extends MIMEType = MIMEType> = {
  mimeType: TMIMEType
  serialize: Serializer<TMIMEType>
  deserialize: Deserializer<TMIMEType>
}

export type ConverterEvent<TMIMEType extends MIMEType> =
  | Omit<PickFromUnion<BehaviorEvent, 'type', 'serialize'>, 'dataTransfer'>
  | Omit<
      PickFromUnion<BehaviorEvent, 'type', 'serialization.failure'>,
      'dataTransfer'
    >
  | Omit<
      PickFromUnion<BehaviorEvent, 'type', 'serialization.success'>,
      'dataTransfer'
    >
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

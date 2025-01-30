import type {PortableTextBlock, PortableTextChild} from '@sanity/types'

export function DefaultObject(props: {
  value: PortableTextBlock | PortableTextChild
}) {
  return (
    <div style={{userSelect: 'none'}}>
      [{props.value._type}: {props.value._key}]
    </div>
  )
}

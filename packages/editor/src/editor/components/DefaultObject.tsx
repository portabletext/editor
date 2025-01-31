import type {PortableTextBlock, PortableTextChild} from '@sanity/types'

export function DefaultBlockObject(props: {
  value: PortableTextBlock | PortableTextChild
}) {
  return (
    <div style={{userSelect: 'none'}}>
      [{props.value._type}: {props.value._key}]
    </div>
  )
}

export function DefaultInlineObject(props: {
  value: PortableTextBlock | PortableTextChild
}) {
  return (
    <span style={{userSelect: 'none'}}>
      [{props.value._type}: {props.value._key}]
    </span>
  )
}

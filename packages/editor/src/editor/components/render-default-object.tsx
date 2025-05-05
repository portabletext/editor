import type {PortableTextChild, PortableTextObject} from '@sanity/types'

export function RenderDefaultBlockObject(props: {
  blockObject: PortableTextObject
}) {
  return (
    <div style={{userSelect: 'none'}}>
      [{props.blockObject._type}: {props.blockObject._key}]
    </div>
  )
}

export function RenderDefaultInlineObject(props: {
  inlineObject: PortableTextObject | PortableTextChild
}) {
  return (
    <span style={{userSelect: 'none'}}>
      [{props.inlineObject._type}: {props.inlineObject._key}]
    </span>
  )
}

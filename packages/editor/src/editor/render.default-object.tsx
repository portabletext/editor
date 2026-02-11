import type {PortableTextChild, PortableTextObject} from '@portabletext/schema'

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
  // Render as text content directly (no wrapper span) to match Slate's void pattern
  // This allows clicks on the visible content to register properly
  return (
    <>
      [{props.inlineObject._type}: {props.inlineObject._key}]
    </>
  )
}

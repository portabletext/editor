import type {PortableTextBlock, PortableTextChild} from '@sanity/types'
import type {JSX} from 'react'

type Props = {
  value: PortableTextBlock | PortableTextChild
}

const DefaultObject = (props: Props): JSX.Element => {
  return (
    <div style={{userSelect: 'none'}}>
      [{props.value._type}: {props.value._key}]
    </div>
  )
}

DefaultObject.displayName = 'DefaultObject'

export default DefaultObject

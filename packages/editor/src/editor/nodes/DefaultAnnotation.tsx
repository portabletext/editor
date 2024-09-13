import type {PortableTextObject} from '@sanity/types'
import {useCallback, type ReactNode} from 'react'

type Props = {
  annotation: PortableTextObject
  children: ReactNode
}
export function DefaultAnnotation(props: Props) {
  const handleClick = useCallback(
    () => alert(JSON.stringify(props.annotation)),
    [props.annotation],
  )
  return (
    <span style={{color: 'blue'}} onClick={handleClick}>
      {props.children}
    </span>
  )
}

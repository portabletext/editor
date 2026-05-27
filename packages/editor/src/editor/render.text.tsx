import {useContext} from 'react'
import {ParentContainerContext} from './parent-container-context'
import type {RenderTextProps} from './render-props-types'

export type {RenderTextProps}

export function RenderText(props: RenderTextProps) {
  const parentContainer = useContext(ParentContainerContext)

  if (parentContainer) {
    const {'data-slate-node': _sn, ...rest} =
      props.attributes as typeof props.attributes & {
        'data-slate-node'?: string
      }
    return (
      <span {...rest} data-pt-inline="span">
        {props.children}
      </span>
    )
  }

  return (
    <span
      {...props.attributes}
      data-child-key={props.text._key}
      data-child-name={props.text._type}
      data-child-type="span"
      data-pt-inline="span"
    >
      {props.children}
    </span>
  )
}

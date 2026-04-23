import {useContext} from 'react'
import type {Editable} from '../slate/react/components/editable'
import {ContainerScopeContext} from './container-scope-context'

export type RenderTextProps = Parameters<
  NonNullable<React.ComponentProps<typeof Editable>['renderText']>
>[0]

export function RenderText(props: RenderTextProps) {
  const containerScope = useContext(ContainerScopeContext)

  if (containerScope) {
    const {'data-slate-node': _sn, ...rest} =
      props.attributes as typeof props.attributes & {
        'data-slate-node'?: string
      }
    return (
      <span {...rest} data-child-type="span">
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
    >
      {props.children}
    </span>
  )
}

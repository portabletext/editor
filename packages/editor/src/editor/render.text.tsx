import {useContext} from 'react'
import type {Editable} from '../engine/react/components/editable'
import {NewPipelineContext} from './new-pipeline-context'

export type RenderTextProps = Parameters<
  NonNullable<React.ComponentProps<typeof Editable>['renderText']>
>[0]

export function RenderText(props: RenderTextProps) {
  const isInNewPipeline = useContext(NewPipelineContext)

  if (isInNewPipeline) {
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

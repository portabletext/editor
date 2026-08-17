import type {Editable} from '../engine/react/components/editable'

export type RenderTextProps = Parameters<
  NonNullable<React.ComponentProps<typeof Editable>['renderText']>
>[0]

export function RenderText(props: RenderTextProps) {
  return (
    <span {...props.attributes} data-pt-inline="span">
      {props.children}
    </span>
  )
}

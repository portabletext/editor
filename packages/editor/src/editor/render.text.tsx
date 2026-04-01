import type {InternalEditable} from './render.internal-editable'

export type RenderTextProps = Parameters<
  NonNullable<React.ComponentProps<typeof InternalEditable>['renderText']>
>[0]

export function RenderText(props: RenderTextProps) {
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

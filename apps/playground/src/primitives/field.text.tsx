import {TextField as RACTextField} from 'react-aria-components'
import {Input, Label} from './field'

export function TextField(props: {
  name: string
  label?: string
  autoFocus?: boolean
  defaultValue?: string
}) {
  return (
    <RACTextField
      key={props.name}
      autoFocus={props.autoFocus}
      className="flex flex-col gap-1"
      defaultValue={props.defaultValue}
    >
      <Label>{props.label ?? props.name}</Label>
      <Input name={props.name} />
    </RACTextField>
  )
}

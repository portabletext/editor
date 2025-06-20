import {NumberField as RACNumberField} from 'react-aria-components'
import {Input, Label} from './field'

export function NumberField(props: {
  name: string
  label?: string
  autoFocus?: boolean
  defaultValue?: number
}) {
  return (
    <RACNumberField
      key={props.name}
      autoFocus={props.autoFocus}
      className="flex flex-col gap-1"
      defaultValue={props.defaultValue}
    >
      <Label>{props.label ?? props.name}</Label>
      <Input name={props.name} />
    </RACNumberField>
  )
}

import {Label} from './field'
import {Select, SelectItem} from './select'

export function SelectField(props: {
  name: string
  label?: string
  defaultOption?: string
  options: Array<{
    id: string
    value: string
    label: string
  }>
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{props.label}</Label>
      <Select
        name={props.name}
        aria-label={props.label}
        defaultSelectedKey={props.defaultOption}
      >
        {props.options.map((option) => (
          <SelectItem key={option.id} id={option.id} textValue={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </Select>
    </div>
  )
}

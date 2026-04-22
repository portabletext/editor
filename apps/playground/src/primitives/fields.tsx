import {NumberField} from './field.number'
import {SelectField} from './field.select'
import {TextField} from './field.text'

export type FieldOption = {
  list?: ReadonlyArray<string | {value: string; title?: string}>
}

export function Fields(props: {
  fields: ReadonlyArray<{
    name: string
    title?: string
    type: string
  }>
  defaultValues?: {[key: string]: unknown}
  fieldOptions?: Record<string, FieldOption | undefined>
}) {
  const fields = props.fields.map((field, index) => {
    const fieldOption = props.fieldOptions?.[field.name]

    if (field.type === 'string' && fieldOption?.list) {
      const defaultValue = props.defaultValues?.[field.name]
      const options = fieldOption.list.map((entry) => {
        if (typeof entry === 'string') {
          return {id: entry, value: entry, label: entry}
        }
        return {
          id: entry.value,
          value: entry.value,
          label: entry.title ?? entry.value,
        }
      })
      return (
        <SelectField
          key={field.name}
          name={field.name}
          label={field.title}
          defaultOption={
            typeof defaultValue === 'string' ? defaultValue : options[0]?.value
          }
          options={options}
        />
      )
    }

    if (field.type === 'string') {
      const defaultValue = props.defaultValues?.[field.name]

      return (
        <TextField
          key={field.name}
          autoFocus={index === 0}
          name={field.name}
          label={field.title}
          defaultValue={
            typeof defaultValue === 'string' ? defaultValue : undefined
          }
        />
      )
    }

    if (field.type === 'number') {
      const defaultValue = props.defaultValues?.[field.name]

      return (
        <NumberField
          key={field.name}
          autoFocus={index === 0}
          name={field.name}
          label={field.title}
          defaultValue={
            typeof defaultValue === 'number' ? defaultValue : undefined
          }
        />
      )
    }

    return null
  })

  return <>{fields}</>
}

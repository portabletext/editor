import {NumberField} from './field.number'
import {SelectField} from './field.select'
import {TextField} from './field.text'

const TONE_OPTIONS = [
  {id: 'note', value: 'note', label: 'Note'},
  {id: 'tip', value: 'tip', label: 'Tip'},
  {id: 'important', value: 'important', label: 'Important'},
  {id: 'warning', value: 'warning', label: 'Warning'},
  {id: 'caution', value: 'caution', label: 'Caution'},
]

export function Fields(props: {
  fields: ReadonlyArray<{
    name: string
    title?: string
    type: string
  }>
  defaultValues?: {[key: string]: unknown}
}) {
  const fields = props.fields.map((field, index) => {
    if (field.type === 'string' && field.name === 'tone') {
      const defaultValue = props.defaultValues?.[field.name]
      return (
        <SelectField
          key={field.name}
          name={field.name}
          label={field.title}
          defaultOption={
            typeof defaultValue === 'string' ? defaultValue : 'note'
          }
          options={TONE_OPTIONS}
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

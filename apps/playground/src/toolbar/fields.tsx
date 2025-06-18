import {NumberField} from './number-field'
import {TextField} from './text-field'

export function Fields(props: {
  fields: ReadonlyArray<{
    name: string
    title?: string
    type: string
  }>
  defaultValues: {[key: string]: unknown}
}) {
  const fields = props.fields.map((field, index) => {
    if (field.type === 'string') {
      const defaultValue = props.defaultValues[field.name]

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
      const defaultValue = props.defaultValues[field.name]

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

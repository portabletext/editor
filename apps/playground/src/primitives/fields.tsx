import {TextArea} from 'react-aria-components'
import {NumberField} from './field.number'
import {TextField} from './field.text'

export function Fields(props: {
  fields: ReadonlyArray<{
    name: string
    title?: string
    type: string
  }>
  defaultValues?: {[key: string]: unknown}
}) {
  const fields = props.fields.map((field, index) => {
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

    if (field.type === 'array') {
      const defaultValue = props.defaultValues?.[field.name]

      return (
        <TextArea
          key={field.name}
          autoFocus={index === 0}
          name={field.name}
          defaultValue={
            typeof defaultValue === 'object'
              ? JSON.stringify(defaultValue, null, 2)
              : undefined
          }
        />
      )
    }

    return null
  })

  return <>{fields}</>
}

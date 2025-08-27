import type {ToolbarBlockObjectSchemaType} from '@portabletext/toolbar'
import {z} from 'zod/v4'
import {Button} from '../primitives/button'
import {Fields} from '../primitives/fields'

const FormDataSchema = z.record(z.string(), z.unknown())

export function ObjectForm(
  props: Pick<ToolbarBlockObjectSchemaType, 'fields' | 'defaultValues'> & {
    submitLabel: string
  } & {
    onSubmit: ({value}: {value: {[key: string]: unknown}}) => void
  },
) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()

        const formData = new FormData(e.target as HTMLFormElement)
        const formDataValues = Object.fromEntries(formData)
        const values = FormDataSchema.parse(formDataValues)

        for (const [key, value] of Object.entries(values)) {
          const field = props.fields.find((field) => field.name === key)
          if (field?.type === 'array') {
            values[key] = JSON.parse(value as string)
          }
        }

        props.onSubmit({
          value: values,
        })
      }}
    >
      <Fields fields={props.fields} defaultValues={props.defaultValues} />
      <Button className="self-end" type="submit" size="sm">
        {props.submitLabel}
      </Button>
    </form>
  )
}

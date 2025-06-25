import {z} from 'zod/v4'
import {Button} from '../primitives/button'
import {Fields} from '../primitives/fields'

const FormDataSchema = z.record(z.string(), z.unknown())

export function ObjectForm(
  props: {
    fields: ReadonlyArray<{
      name: string
      type: string
      title?: string
    }>
    defaultValues?: {[key: string]: unknown}
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
        const value = FormDataSchema.parse(formDataValues)

        props.onSubmit({
          value,
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

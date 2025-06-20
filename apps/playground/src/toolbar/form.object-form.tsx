import {z} from 'zod/v4'
import {Button} from '../primitives/button'
import {Fields} from '../primitives/fields'

const FormDataSchema = z.record(z.string(), z.string().or(z.number()))

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
    onSubmit: ({values}: {values: Record<string, string | number>}) => void
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

        props.onSubmit({
          values,
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

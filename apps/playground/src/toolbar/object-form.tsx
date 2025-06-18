import {z} from 'zod/v4'
import {Button} from '../components/button'
import {Fields} from './fields'

const FormDataSchema = z.record(z.string(), z.string().or(z.number()))

export function ObjectForm(
  props: {
    fields: ReadonlyArray<{
      name: string
      type: 'string' | 'number'
      title?: string
    }>
    defaultValues: Record<string, string | number>
    submitLabel: string
  } & {
    onSubmit: ({values}: {values: Record<string, string | number>}) => void
  },
) {
  return (
    <form
      className="flex flex-col gap-2"
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

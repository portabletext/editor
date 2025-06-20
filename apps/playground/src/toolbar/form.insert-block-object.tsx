import {z} from 'zod/v4'
import {Button} from '../primitives/button'
import {SelectField} from '../primitives/field.select'
import {Fields} from '../primitives/fields'

const FormDataSchema = z
  .object({
    placement: z.enum(['auto', 'before', 'after']),
  })
  .catchall(z.string().or(z.number()))

export function InsertBlockObjectForm(
  props: {
    fields: ReadonlyArray<{
      name: string
      type: string
      title?: string
    }>
    defaultValues?: Record<string, unknown>
  } & {
    onSubmit: ({
      values,
      placement,
    }: {
      values: Record<string, string | number>
      placement?: 'auto' | 'before' | 'after'
    }) => void
  },
) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()

        const formData = new FormData(e.target as HTMLFormElement)
        const formDataValues = Object.fromEntries(formData)
        const {placement, ...values} = FormDataSchema.parse(formDataValues)

        props.onSubmit({
          values,
          placement,
        })
      }}
    >
      <Fields fields={props.fields} defaultValues={props.defaultValues} />
      <SelectField
        name="placement"
        label="Placement"
        defaultOption="auto"
        options={[
          {id: 'auto', value: 'auto', label: 'Auto'},
          {id: 'before', value: 'before', label: 'Before'},
          {id: 'after', value: 'after', label: 'After'},
        ]}
      />
      <Button className="self-end" type="submit" size="sm">
        Insert
      </Button>
    </form>
  )
}

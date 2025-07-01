import type {ToolbarBlockObjectDefinition} from '@portabletext/toolbar'
import {z} from 'zod/v4'
import {Button} from '../primitives/button'
import {SelectField} from '../primitives/field.select'
import {Fields} from '../primitives/fields'

const FormDataSchema = z
  .object({
    placement: z.enum(['auto', 'before', 'after']),
  })
  .catchall(z.unknown())

export function InsertBlockObjectForm(
  props: Pick<ToolbarBlockObjectDefinition, 'fields' | 'defaultValues'> & {
    onSubmit: ({
      value,
      placement,
    }: {
      value: {[key: string]: unknown}
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
        const {placement, ...value} = FormDataSchema.parse(formDataValues)

        props.onSubmit({
          value,
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

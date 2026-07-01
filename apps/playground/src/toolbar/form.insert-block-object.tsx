import type {ToolbarBlockObjectSchemaType} from '@portabletext/toolbar'
import {z} from 'zod/v4'
import {Button} from '../primitives/button'
import {SelectField} from '../primitives/field.select'
import {Fields, type FieldOption} from '../primitives/fields'

const FormDataSchema = z
  .object({
    placement: z.enum(['auto', 'before', 'after']),
  })
  .catchall(z.unknown())

export function InsertBlockObjectForm(
  props: Pick<ToolbarBlockObjectSchemaType, 'fields' | 'defaultValues'> & {
    fieldOptions?: Record<string, FieldOption | undefined>
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
        const {placement, ...formValue} = FormDataSchema.parse(formDataValues)

        // `FormData` values are all strings; coerce `number` fields back to
        // numbers so e.g. a table's `headerRows` is stored as `1`, not `"1"`.
        const numberFields = new Set(
          props.fields
            .filter((field) => field.type === 'number')
            .map((field) => field.name),
        )
        const value: {[key: string]: unknown} = {...(props.defaultValues ?? {})}
        for (const [key, fieldValue] of Object.entries(formValue)) {
          if (numberFields.has(key) && typeof fieldValue === 'string') {
            if (fieldValue !== '') {
              value[key] = Number(fieldValue)
            }
          } else {
            value[key] = fieldValue
          }
        }

        props.onSubmit({
          value,
          placement,
        })
      }}
    >
      <Fields
        fields={props.fields}
        defaultValues={props.defaultValues}
        fieldOptions={props.fieldOptions}
      />
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
      <Button
        autoFocus={
          props.fields.filter(
            (field) => field.type === 'string' || field.type === 'number',
          ).length === 0
        }
        className="self-end"
        type="submit"
        size="sm"
      >
        Insert
      </Button>
    </form>
  )
}

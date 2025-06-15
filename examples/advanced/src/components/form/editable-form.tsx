import {FormError} from '@/components/form/form-error'
import {portableTextComponents} from '@/components/rich-text/components'
import {RichTextEditor} from '@/components/rich-text/editor'
import {sanitizePortableTextBlock} from '@/components/rich-text/validation'
import {StyledButton} from '@/components/styled-button'
import {PortableTextTypeZod} from '@/types/rich-text'
import {standardSchemaResolver} from '@hookform/resolvers/standard-schema'
import {type PortableTextBlock} from '@portabletext/editor'
import {PortableText} from '@portabletext/react'
import {Pen} from 'lucide-react'
import {BaseSyntheticEvent, useState} from 'react'
import {SubmitHandler, useForm} from 'react-hook-form'
import {z} from 'zod'

const formSchema = z.object({
  content: z.array(PortableTextTypeZod),
})

export type IEditableForm = z.infer<typeof formSchema> &
  Partial<BaseSyntheticEvent>

interface IEditableFormProps extends React.HTMLAttributes<HTMLDivElement> {
  blockContent: Array<PortableTextBlock>
}
export const EditableForm: React.FC<IEditableFormProps> = ({
  blockContent = [],
}) => {
  const {
    handleSubmit,
    trigger,
    reset,
    setValue,
    formState: {errors, isValid},
  } = useForm<z.infer<typeof formSchema>>({
    mode: 'onChange',
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      content: undefined,
    },
  })

  const [editorValue, setEditorValue] = useState<
    Array<PortableTextBlock> | undefined
  >(() => blockContent)

  const [lastValue, setLastValue] = useState<
    Array<PortableTextBlock> | undefined
  >(() => blockContent)

  const [isEditorVisible, setIsEditorVisible] = useState(false)
  const [pageContent, setPageContent] = useState(blockContent)

  const submit = async (formData: IEditableForm) => {
    const sanitizedValue = sanitizePortableTextBlock(
      formData.content as Array<PortableTextBlock>,
    ) as Array<PortableTextBlock>

    setLastValue(sanitizedValue)
    setIsEditorVisible(false)
    reset()

    setPageContent(sanitizedValue)
  }

  const onCancel = () => {
    setIsEditorVisible(false)
    setEditorValue(lastValue)
    reset()
  }

  const onEditClicked = () => {
    setIsEditorVisible(!isEditorVisible)
  }

  return (
    <form
      onSubmit={handleSubmit(submit as SubmitHandler<IEditableForm>)}
      className="w-full p-4"
    >
      {isEditorVisible ? (
        <>
          <RichTextEditor
            value={editorValue}
            onChange={(value) => {
              setEditorValue(value)
              setValue(
                'content',
                value as z.infer<typeof PortableTextTypeZod>[],
              )
              trigger('content')
            }}
          />

          <div className="flex justify-end items-center gap-1 m-1">
            {errors.content && (
              <FormError
                error="There was an error parsing the form."
                className="mr-2"
              />
            )}
            <StyledButton
              type="submit"
              variant="accent"
              className="w-fit"
              disabled={!isValid || Object.keys(errors).length !== 0}
            >
              Save
            </StyledButton>

            <StyledButton onClick={onCancel}>Cancel</StyledButton>
          </div>
        </>
      ) : (
        <div className="flex flex-col mx-3">
          <div className="flex items-center justify-end">
            <StyledButton
              onClick={onEditClicked}
              type="button"
              variant="outline"
              size="icon-sm"
              title="Edit"
            >
              <Pen />
            </StyledButton>
          </div>

          <div className="portable-text">
            <PortableText
              value={pageContent}
              components={portableTextComponents}
            />
          </div>
        </div>
      )}
    </form>
  )
}

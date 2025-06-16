import {FormError, requiredFieldText} from '@/components/form/form-error'
import {
  ModalDrawer,
  ModalDrawerFooter,
  ModalDrawerHeader,
} from '@/components/modal-drawer'
import {StyledButton} from '@/components/styled-button'
import {StyledInput} from '@/components/styled-input'
import {Label} from '@/components/ui/label'
import {isClean} from '@/lib/sanitize'
import {standardSchemaResolver} from '@hookform/resolvers/standard-schema'
import {LinkIcon} from 'lucide-react'
import {BaseSyntheticEvent, startTransition, useState} from 'react'
import {SubmitHandler, useForm} from 'react-hook-form'
import {toast} from 'sonner'
import {z} from 'zod'

const formSchema = z.object({
  name: z
    .string()
    .min(1, requiredFieldText)
    .refine((val) => isClean(val)),
  url: z.url().refine((val) => isClean(val)),
})

export type IEditorLinkForm = z.infer<typeof formSchema> &
  Partial<BaseSyntheticEvent>

interface EditorLinkProps {
  onSubmit: (formData: IEditorLinkForm) => void
}

export const EditorLink: React.FC<EditorLinkProps> = ({onSubmit}) => {
  const [isModalDrawerOpen, setModalDrawerOpen] = useState<boolean>(false)

  const {
    handleSubmit,
    register,
    reset,
    formState: {errors, isValid},
  } = useForm<z.infer<typeof formSchema>>({
    mode: 'onTouched',
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
    },
  })

  const submit = async (formData: IEditorLinkForm) => {
    startTransition(async () => {
      try {
        onSubmit(formData)
        setModalDrawerOpen(false)
        reset()
      } catch {
        toast.error('There was an error creating the link')
      }
    })
  }

  return (
    <ModalDrawer
      trigger={
        <StyledButton
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => setModalDrawerOpen(true)}
        >
          <LinkIcon width={16} height={16} />
        </StyledButton>
      }
      isOpen={isModalDrawerOpen}
      onCancel={() => reset()}
      content={
        <form className="grid items-start gap-2">
          <ModalDrawerHeader>Create Link</ModalDrawerHeader>

          <div className="flex flex-col space-y-3 mt-2">
            <Label htmlFor="email">
              Link name
              <FormError error={errors?.name?.message} />
            </Label>
            <StyledInput
              type="text"
              {...register('name')}
              placeholder="Enter link name"
            />
          </div>
          <div className="flex flex-col space-y-3 mt-2">
            <Label htmlFor="url">
              URL
              <FormError error={errors?.url?.message} />
            </Label>
            <StyledInput
              type="text"
              {...register('url')}
              placeholder="Enter URL"
            />
          </div>

          <ModalDrawerFooter asChild>
            <StyledButton
              type="button"
              onClick={handleSubmit(submit as SubmitHandler<IEditorLinkForm>)}
              disabled={!isValid || Object.keys(errors).length !== 0}
            >
              Create
            </StyledButton>
          </ModalDrawerFooter>
        </form>
      }
    />
  )
}

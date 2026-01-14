import {Button} from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import type {ToolbarAnnotationSchemaType} from '@portabletext/toolbar'
import {useAnnotationButton} from '@portabletext/toolbar'
import {useState} from 'react'
import {ButtonTooltip} from './button-tooltip'

export function AnnotationButton(props: {
  schemaType: ToolbarAnnotationSchemaType
}) {
  const annotationButton = useAnnotationButton(props)
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  const isActive =
    annotationButton.snapshot.matches({disabled: 'active'}) ||
    annotationButton.snapshot.matches({enabled: 'active'})
  const isDisabled = annotationButton.snapshot.matches('disabled')
  const isDialogOpen = annotationButton.snapshot.matches({
    enabled: {inactive: 'showing dialog'},
  })
  const Icon = props.schemaType.icon

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const value = {...props.schemaType.defaultValues, ...formValues}
    annotationButton.send({type: 'add', annotation: {value}})
    setFormValues({})
  }

  if (isActive) {
    return (
      <ButtonTooltip
        label={`Remove ${props.schemaType.title ?? props.schemaType.name}`}
        shortcutKeys={props.schemaType.shortcut?.keys}
      >
        <Button
          aria-label={`Remove ${props.schemaType.title ?? props.schemaType.name}`}
          aria-pressed={true}
          size="icon-sm"
          variant="default"
          disabled={isDisabled}
          onClick={() => {
            annotationButton.send({type: 'remove'})
          }}
        >
          {Icon ? (
            <Icon className="size-4" />
          ) : (
            <span className="text-xs">
              {props.schemaType.title ?? props.schemaType.name}
            </span>
          )}
        </Button>
      </ButtonTooltip>
    )
  }

  return (
    <>
      <ButtonTooltip
        label={`Add ${props.schemaType.title ?? props.schemaType.name}`}
        shortcutKeys={props.schemaType.shortcut?.keys}
      >
        <Button
          aria-label={`Add ${props.schemaType.title ?? props.schemaType.name}`}
          size="icon-sm"
          variant="ghost"
          disabled={isDisabled}
          onClick={() => {
            annotationButton.send({type: 'open dialog'})
          }}
        >
          {Icon ? (
            <Icon className="size-4" />
          ) : (
            <span className="text-xs">
              {props.schemaType.title ?? props.schemaType.name}
            </span>
          )}
        </Button>
      </ButtonTooltip>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            annotationButton.send({type: 'close dialog'})
            setFormValues({})
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {Icon && <Icon className="size-4" />}
              Add {props.schemaType.title ?? props.schemaType.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {props.schemaType.fields?.map((field) => (
                <div key={field.name} className="grid gap-2">
                  <Label htmlFor={field.name}>
                    {field.title ?? field.name}
                  </Label>
                  <Input
                    id={field.name}
                    defaultValue={
                      (props.schemaType.defaultValues?.[
                        field.name
                      ] as string) ?? ''
                    }
                    onChange={(event) => {
                      setFormValues((prev) => ({
                        ...prev,
                        [field.name]: event.target.value,
                      }))
                    }}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="submit">Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

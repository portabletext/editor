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
import {useBlockObjectButton} from '@portabletext/toolbar'
import type {ToolbarBlockObjectSchemaType} from '@portabletext/toolbar'
import {useState} from 'react'
import {ButtonTooltip} from './button-tooltip'

export function BlockObjectButton(props: {
  schemaType: ToolbarBlockObjectSchemaType
}) {
  const {snapshot, send} = useBlockObjectButton(props)
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  const isDisabled = snapshot.matches('disabled')
  const isDialogOpen = snapshot.matches({enabled: 'showing dialog'})
  const Icon = props.schemaType.icon

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const value = {...props.schemaType.defaultValues, ...formValues}
    send({type: 'insert', value, placement: 'auto'})
    setFormValues({})
  }

  return (
    <>
      <ButtonTooltip
        label={`Insert ${props.schemaType.title ?? props.schemaType.name}`}
      >
        <Button
          aria-label={`Insert ${props.schemaType.title ?? props.schemaType.name}`}
          size="icon-sm"
          variant="ghost"
          disabled={isDisabled}
          onClick={() => {
            send({type: 'open dialog'})
          }}
        >
          {Icon ? (
            <Icon className="size-4" />
          ) : (
            <span className="text-xs">
              {(props.schemaType.title ?? props.schemaType.name).slice(0, 1)}
            </span>
          )}
        </Button>
      </ButtonTooltip>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            send({type: 'close dialog'})
            setFormValues({})
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {Icon && <Icon className="size-4" />}
              Insert {props.schemaType.title ?? props.schemaType.name}
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
              <Button type="submit">Insert</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

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
import {Separator} from '@/components/ui/separator'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {useAnnotationPopover} from '@portabletext/toolbar'
import type {ToolbarAnnotationSchemaType} from '@portabletext/toolbar'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {ExternalLinkIcon, PencilIcon, TrashIcon} from 'lucide-react'
import {useState} from 'react'

export function AnnotationPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarAnnotationSchemaType>
}) {
  const annotationPopover = useAnnotationPopover(props)
  const [editingAnnotation, setEditingAnnotation] = useState<{
    schemaType: ToolbarAnnotationSchemaType
    at: unknown
    values: Record<string, string>
  } | null>(null)

  if (
    annotationPopover.snapshot.matches('disabled') ||
    annotationPopover.snapshot.matches({enabled: 'inactive'})
  ) {
    return null
  }

  const annotations = annotationPopover.snapshot.context.annotations
  const elementRef = annotationPopover.snapshot.context.elementRef

  return (
    <>
      <PopoverPrimitive.Root open={true}>
        <PopoverPrimitive.Anchor
          virtualRef={elementRef as React.RefObject<HTMLElement>}
        />
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className="z-50 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
            sideOffset={8}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <div className="flex flex-col gap-2">
              {annotations.map((annotation, index) => {
                const href = (annotation.value as {href?: string}).href
                const isExternal =
                  href &&
                  (href.startsWith('http://') || href.startsWith('https://'))
                return (
                  <div
                    key={`${annotation.schemaType.name}-${annotation.value._key}`}
                  >
                    {index > 0 && <Separator className="my-2" />}
                    {href && (
                      <a
                        href={href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline mb-2 max-w-[250px] truncate"
                      >
                        {isExternal && (
                          <ExternalLinkIcon className="size-3 shrink-0" />
                        )}
                        <span className="truncate">{href}</span>
                      </a>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium">
                        {annotation.schemaType.title ??
                          annotation.schemaType.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Edit"
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingAnnotation({
                                  schemaType: annotation.schemaType,
                                  at: annotation.at,
                                  values: annotation.value as Record<
                                    string,
                                    string
                                  >,
                                })
                              }}
                            >
                              <PencilIcon className="size-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Remove"
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                annotationPopover.send({
                                  type: 'remove',
                                  schemaType: annotation.schemaType,
                                })
                              }}
                            >
                              <TrashIcon className="size-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {editingAnnotation && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAnnotation(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingAnnotation.schemaType.icon && (
                  <editingAnnotation.schemaType.icon className="size-4" />
                )}
                Edit{' '}
                {editingAnnotation.schemaType.title ??
                  editingAnnotation.schemaType.name}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                const value: Record<string, string> = {}
                formData.forEach((val, key) => {
                  value[key] = val as string
                })
                annotationPopover.send({
                  type: 'edit',
                  at: editingAnnotation.at,
                  props: value,
                })
                setEditingAnnotation(null)
              }}
            >
              <div className="grid gap-4 py-4">
                {editingAnnotation.schemaType.fields?.map((field) => (
                  <div key={field.name} className="grid gap-2">
                    <Label htmlFor={field.name}>
                      {field.title ?? field.name}
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      defaultValue={
                        (editingAnnotation.values[field.name] as string) ?? ''
                      }
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

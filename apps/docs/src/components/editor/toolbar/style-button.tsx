import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import type {ToolbarStyleSchemaType} from '@portabletext/toolbar'
import {useStyleSelector} from '@portabletext/toolbar'

export function StyleButton(props: {
  schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
}) {
  const styleSelector = useStyleSelector(props)

  const activeStyle = props.schemaTypes.find(
    (s) => s.name === styleSelector.snapshot.context.activeStyle,
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Select
            disabled={styleSelector.snapshot.matches('disabled')}
            value={styleSelector.snapshot.context.activeStyle ?? ''}
            onValueChange={(style) => {
              styleSelector.send({type: 'toggle', style})
            }}
          >
            <SelectTrigger
              className="w-[100px] sm:w-[120px] h-7 text-xs"
              aria-label="Style"
            >
              <SelectValue placeholder="Style">
                {activeStyle ? (
                  <span className="flex items-center gap-1.5">
                    {activeStyle.icon && (
                      <activeStyle.icon className="size-3.5" />
                    )}
                    <span>{activeStyle.title ?? activeStyle.name}</span>
                  </span>
                ) : (
                  'Style'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {props.schemaTypes.map((schemaType) => {
                const Icon = schemaType.icon
                return (
                  <SelectItem key={schemaType.name} value={schemaType.name}>
                    <span className="flex items-center gap-2">
                      {Icon && <Icon className="size-4" />}
                      <span>{schemaType.title ?? schemaType.name}</span>
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </TooltipTrigger>
      <TooltipContent>Select style</TooltipContent>
    </Tooltip>
  )
}

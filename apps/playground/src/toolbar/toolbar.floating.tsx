import {isSelectionExpanded} from '@portabletext/editor/selectors'
import {usePopover} from '@portabletext/toolbar'
import {Popover} from '../primitives/popover'
import {Toolbar} from '../primitives/toolbar'
import {DecoratorButton} from './button.decorator'
import {usePlaygroundToolbarSchema} from './toolbar-schema'

export function FloatingToolbar() {
  const toolbarSchema = usePlaygroundToolbarSchema()
  const popover = usePopover({
    guard: isSelectionExpanded,
    placement: 'top',
  })

  if (popover.snapshot.matches('inactive')) {
    return null
  }

  return (
    <Popover
      isNonModal
      triggerRef={popover.snapshot.context.anchorRef}
      crossOffset={popover.snapshot.context.crossOffset}
      placement={popover.snapshot.context.placement}
      isOpen={true}
    >
      <Toolbar>
        {toolbarSchema.decorators?.map((decorator) => (
          <DecoratorButton key={decorator.name} schemaType={decorator} />
        ))}
      </Toolbar>
    </Popover>
  )
}

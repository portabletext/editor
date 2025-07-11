import {isSelectionExpanded} from '@portabletext/editor/selectors'
import {usePopover} from '@portabletext/toolbar'
import {Popover} from '../primitives/popover'

export function FloatingToolbar() {
  const popover = usePopover({
    guard: isSelectionExpanded,
    placement: 'right',
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
      <div>Floating toolbar</div>
    </Popover>
  )
}

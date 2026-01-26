import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type ReferenceType,
} from '@floating-ui/react-dom'
import type {ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {tv} from 'tailwind-variants'

interface FloatingPanelProps {
  getAnchorRect: () => DOMRect | null
  children: ReactNode
  offset?: number
}

const styles = tv({
  base: 'bg-white dark:bg-gray-800 z-50 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200',
})

export function FloatingPanel({
  getAnchorRect,
  children,
  offset: offsetValue = 4,
}: FloatingPanelProps) {
  const {floatingStyles, refs} = useFloating({
    placement: 'bottom-start',
    middleware: [
      offset(offsetValue),
      flip({fallbackPlacements: ['top-start']}),
      shift({padding: 8}),
    ],
    whileElementsMounted: autoUpdate,
    elements: {
      reference: createVirtualElement(getAnchorRect),
    },
  })
  const {setFloating} = refs

  return createPortal(
    <div ref={setFloating} className={styles()} style={floatingStyles}>
      {children}
    </div>,
    document.body,
  )
}

function createVirtualElement(
  getRect: () => DOMRect | null,
): ReferenceType | null {
  return {
    getBoundingClientRect: () => getRect() ?? new DOMRect(),
  }
}

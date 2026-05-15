import {useEditor, useEditorSelector} from '@portabletext/editor'
import {
  useApplicableSchema,
  useDecoratorButton,
  useToolbarSchema,
  type ToolbarDecoratorSchemaType,
} from '@portabletext/toolbar'
import {useLayoutEffect, useState} from 'react'
import {BoldIcon, InlineCodeIcon, ItalicIcon, StrikethroughIcon} from '../icons'

/**
 * Bubble menu - selection-anchored inline-mark toolbar.
 *
 * Renders only when the editor selection is non-collapsed and points
 * at a text range. The menu is positioned with `position: fixed` just
 * above the selection's bounding rect, with a downward-pointing tip.
 * When the selection collides with the viewport top, the menu flips
 * below the selection.
 *
 * Buttons read their active state from the engine via
 * `useDecoratorButton` and `useApplicableSchema` so the menu stays
 * in sync with the actual mark state at the caret.
 *
 * Inline objects, leaves (image, hr), and container chrome are out
 * of scope for v1; the bubble hides whenever the focus is not in a
 * text block.
 */
const decoratorIcons: Record<
  string,
  (props: {size?: number}) => React.ReactElement
> = {
  'strong': BoldIcon,
  'em': ItalicIcon,
  'code': InlineCodeIcon,
  'strike-through': StrikethroughIcon,
}

const MENU_HEIGHT = 36
const MENU_GAP = 8

type Position = {top: number; left: number; side: 'top' | 'bottom'}

function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }
  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return null
  }
  return rect
}

function computePosition(): Position | null {
  const rect = getSelectionRect()
  if (!rect) {
    return null
  }
  const flipBelow = rect.top < MENU_HEIGHT + MENU_GAP + 8
  const top = flipBelow
    ? rect.bottom + MENU_GAP + MENU_HEIGHT / 2
    : rect.top - MENU_GAP - MENU_HEIGHT / 2
  return {
    top,
    left: rect.left + rect.width / 2,
    side: flipBelow ? 'bottom' : 'top',
  }
}

function DecoratorBubbleButton(props: {
  schemaType: ToolbarDecoratorSchemaType
}) {
  const decoratorButton = useDecoratorButton(props)
  const applicable = useApplicableSchema()
  const Icon = decoratorIcons[props.schemaType.name]
  const label = props.schemaType.title ?? props.schemaType.name

  const isActive =
    decoratorButton.snapshot.matches({disabled: 'active'}) ||
    decoratorButton.snapshot.matches({enabled: 'active'})
  const isDisabled =
    !applicable.decorators.has(props.schemaType.name) ||
    decoratorButton.snapshot.matches('disabled')

  if (!Icon) {
    return null
  }

  return (
    <button
      type="button"
      className={`pc-bubble-button${isActive ? ' pc-bubble-button-active' : ''}`}
      disabled={isDisabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        decoratorButton.send({type: 'toggle'})
      }}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
    >
      <Icon />
    </button>
  )
}

function BubbleMenuShell() {
  const schema = useToolbarSchema({})
  const editor = useEditor()
  const hasSelection = useEditorSelector(editor, (snapshot) => {
    const sel = snapshot.context.selection
    if (!sel) {
      return false
    }
    return (
      sel.anchor.offset !== sel.focus.offset ||
      JSON.stringify(sel.anchor.path) !== JSON.stringify(sel.focus.path)
    )
  })

  const [position, setPosition] = useState<Position | null>(null)

  useLayoutEffect(() => {
    if (!hasSelection) {
      setPosition(null)
      return
    }
    const update = () => setPosition(computePosition())
    update()
    const id = window.requestAnimationFrame(update)
    document.addEventListener('selectionchange', update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(id)
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [hasSelection])

  if (!hasSelection || !position) {
    return null
  }

  return (
    <div
      className={`pc-bubble-wrap pc-bubble-side-${position.side}`}
      style={{top: position.top, left: position.left}}
      role="toolbar"
      aria-label="Inline formatting"
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="pc-bubble-menu">
        {schema.decorators.map((decorator) => (
          <DecoratorBubbleButton key={decorator.name} schemaType={decorator} />
        ))}
      </div>
    </div>
  )
}

export function BubbleMenuPlugin() {
  return <BubbleMenuShell />
}

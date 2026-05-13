import {defineLeaf} from '@portabletext/editor'
import {LeafPlugin} from '@portabletext/editor/plugins'
import {LinkIcon, PencilIcon} from 'lucide-react'
import type {JSX} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'
import {Button} from '../primitives/button'
import {Tooltip} from '../primitives/tooltip'

const imageStyle = tv({
  base: 'grid grid-cols-[auto_1fr] my-1 items-start gap-1 border-2 border-gray-300 dark:border-gray-600 rounded text-sm',
  variants: {
    selected: {true: 'border-blue-300 dark:border-blue-600'},
    focused: {true: 'bg-blue-50 dark:bg-blue-900/30'},
  },
})

const inlineImageStyle = tv({
  base: 'max-w-35 grid grid-cols-[auto_1fr] items-start gap-1 border-2 border-gray-300 dark:border-gray-600 rounded text-sm',
  variants: {
    selected: {true: 'border-blue-300 dark:border-blue-600'},
    focused: {true: 'bg-blue-100 dark:bg-blue-800/60'},
  },
})

// Single image leaf. Branches on `isInline` for the inline-in-textblock
// position. Cell-positioned images are handled by the cell container's
// own `renderChild.image` in plugin.table.tsx (not here).
const imageLeaf = defineLeaf<typeof playgroundSchemaDefinition>({
  type: 'image',
  render: ({
    attributes,
    children,
    node,
    focused,
    readOnly,
    selected,
    isInline,
  }) => {
    const image = node as {src?: string; alt?: string}
    if (isInline) {
      return (
        <span {...attributes}>
          {children}
          <span
            draggable={!readOnly}
            className={inlineImageStyle({focused, selected})}
          >
            <span className="bg-gray-100 dark:bg-gray-700 size-5 overflow-clip flex items-center justify-center">
              <img
                className="object-scale-down max-w-full"
                src={image.src}
                alt={image.alt ?? ''}
              />
            </span>
            <span className="text-ellipsis overflow-hidden whitespace-nowrap">
              {image.src}
            </span>
          </span>
        </span>
      )
    }
    return (
      <div {...attributes}>
        {children}
        <div
          contentEditable={false}
          draggable={!readOnly}
          className={imageStyle({selected, focused})}
        >
          <div className="bg-gray-100 dark:bg-gray-700 size-20 overflow-clip flex items-center justify-center">
            <img
              className="object-scale-down max-w-full"
              src={image.src}
              alt={image.alt ?? ''}
            />
          </div>
          <div className="flex flex-col gap-1 p-1 overflow-hidden">
            <div className="flex items-center gap-1">
              <TooltipTrigger>
                <Button variant="ghost" size="sm">
                  <LinkIcon className="size-3 shrink-0" />
                </Button>
                <Tooltip className="max-w-120">
                  <span className="wrap-anywhere">{image.src}</span>
                </Tooltip>
              </TooltipTrigger>
              <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                {image.src}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <PencilIcon className="size-3 shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {image.alt}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  },
})

export function ImagePlugin(): JSX.Element {
  return <LeafPlugin leafs={[imageLeaf]} />
}

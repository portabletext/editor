import {defineBlockObject} from '@portabletext/editor'
import {tv} from 'tailwind-variants'

const cellImageStyle = tv({
  base: 'grid grid-cols-[auto_1fr] my-0.5 items-center gap-1 border border-gray-300 dark:border-gray-600 rounded text-xs',
  variants: {
    selected: {true: 'border-blue-300 dark:border-blue-600'},
    focused: {true: 'bg-blue-50 dark:bg-blue-900/30'},
  },
})

/**
 * Positional `image` override inside table cells. Rendered as a
 * compact card so multiple images can fit per row. Top-level images
 * use the legacy `renderBlock` pipeline (the v6 image render that
 * showcases the legacy pipeline still works alongside the new Node
 * API). Wired into `tableContainer.of[0].of[0].of` in
 * `plugin.table.tsx`.
 */
export const cellImageLeaf = defineBlockObject({
  type: 'image',
  render: ({attributes, children, node, focused, readOnly, selected}) => {
    const image = node as {src?: string; alt?: string}
    return (
      <div {...attributes}>
        {children}
        <div
          contentEditable={false}
          draggable={!readOnly}
          className={cellImageStyle({selected, focused})}
        >
          <div className="bg-gray-100 dark:bg-gray-700 size-8 overflow-clip flex items-center justify-center">
            <img
              className="object-scale-down max-w-full"
              src={image.src}
              alt={image.alt ?? ''}
            />
          </div>
          <span className="text-ellipsis overflow-hidden whitespace-nowrap px-1">
            {image.alt || image.src}
          </span>
        </div>
      </div>
    )
  },
})

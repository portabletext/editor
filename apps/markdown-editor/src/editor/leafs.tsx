import {defineLeaf} from '@portabletext/editor'
import type {schemaDefinition} from './schema'

export const codeBlockSpanLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..code-block.block.span',
  render: ({attributes, children}) => (
    <span {...attributes} className="font-mono">
      {children}
    </span>
  ),
})

export const horizontalRuleLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..horizontal-rule',
  render: ({attributes, children}) => (
    <div {...attributes} className="my-4">
      <div contentEditable={false}>
        <hr className="border-0 border-t border-gray-200 dark:border-gray-700" />
      </div>
      {children}
    </div>
  ),
})

// Block-level image (root, inside lists/callouts/blockquotes).
export const imageLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..image',
  render: ({attributes, children, node, focused, selected}) => {
    const v = node as {src?: string; alt?: string; title?: string}
    return (
      <div {...attributes}>
        {children}
        <figure
          contentEditable={false}
          className={[
            'my-3 inline-flex flex-col gap-1 rounded border-2',
            selected
              ? 'border-blue-400 dark:border-blue-500'
              : 'border-gray-200 dark:border-gray-700',
            focused ? 'bg-blue-50 dark:bg-blue-900/30' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <img
            src={v.src}
            alt={v.alt ?? ''}
            title={v.title}
            className="max-w-full rounded-t object-contain"
          />
          {v.alt && (
            <figcaption className="px-2 pb-1 text-gray-500 text-xs dark:text-gray-400">
              {v.alt}
            </figcaption>
          )}
        </figure>
      </div>
    )
  },
})

// Inline image (used in paragraphs as ![alt](src) inline). Cannot render
// <figure>/<figcaption> here because those are flow content and would
// produce an invalid descendant of <p> at hydration time.
export const inlineImageLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..block.image',
  render: ({attributes, children, node, focused, selected}) => {
    const v = node as {src?: string; alt?: string; title?: string}
    return (
      <span {...attributes}>
        {children}
        <span
          contentEditable={false}
          className={[
            'mx-0.5 inline-block align-middle rounded border',
            selected
              ? 'border-blue-400 dark:border-blue-500'
              : 'border-gray-200 dark:border-gray-700',
            focused ? 'bg-blue-50 dark:bg-blue-900/30' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <img
            src={v.src}
            alt={v.alt ?? ''}
            title={v.title}
            className="inline-block max-h-6 align-middle"
          />
        </span>
      </span>
    )
  },
})

// Raw HTML block. Container holds the source as a single editable text-block
// inside `code`, mirroring the code-block shape so the user types raw HTML
// directly without escaping. Markdown matcher (md→pt) splits the html string
// into one text-block per line; pt→md joins them back.
//
// Defined as a defineContainer below; the leaf below renders the inner spans
// in a monospace style.
export const htmlSpanLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..html.block.span',
  render: ({attributes, children}) => (
    <span {...attributes} className="font-mono">
      {children}
    </span>
  ),
})

export const allLeafs = [
  codeBlockSpanLeaf,
  horizontalRuleLeaf,
  imageLeaf,
  inlineImageLeaf,
  htmlSpanLeaf,
]

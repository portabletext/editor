import type {
  PortableTextListComponent,
  PortableTextListItemComponent,
} from '../types'

const LIST_INDENT = '  '

export const defaultLists: Record<
  'number' | 'bullet',
  PortableTextListComponent
> = {
  number: ({children}) => children || '',
  bullet: ({children}) => children || '',
}

export const DefaultListItem: PortableTextListItemComponent = ({
  children,
  value,
  index,
}) => {
  const listStyle = value.listItem || 'bullet'
  const level = value.level || 1

  // Use consistent 2-space indentation per level for both bullet and numbered lists
  const indent = LIST_INDENT.repeat(level - 1)

  // Check if children already ends with a newline (from nested lists)
  const hasTrailingNewline = children?.endsWith('\n') || false
  const trailingNewline = hasTrailingNewline ? '' : '\n'

  if (listStyle === 'number') {
    return `${indent}${index + 1}. ${children}${trailingNewline}`
  }
  return `${indent}- ${children}${trailingNewline}`
}

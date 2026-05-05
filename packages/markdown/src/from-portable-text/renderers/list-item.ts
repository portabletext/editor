import type {PortableTextListItemRenderer} from '../types'

/**
 * @public
 */
export const DefaultListItemRenderer: PortableTextListItemRenderer = ({
  children,
  value,
  listIndex,
}) => {
  const listStyle = value.listItem || 'bullet'
  const level = value.level || 1
  const indent = '   '.repeat(level - 1)

  if (listStyle === 'number') {
    return `${indent}${listIndex ?? 1}. ${children}`
  }

  if (listStyle === 'task') {
    const checked =
      'checked' in value && typeof value.checked === 'boolean'
        ? value.checked
        : false
    const marker = checked ? '[x]' : '[ ]'
    return `${indent}- ${marker} ${children}`
  }

  return `${indent}- ${children}`
}

/**
 * @public
 */
export const DefaultUnknownListItemRenderer: PortableTextListItemRenderer = ({
  children,
}) => {
  return `- ${children}\n`
}

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

  if (listStyle === 'number') {
    const indent = '   '.repeat(level - 1)

    return `${indent}${listIndex ?? 1}. ${children}`
  }

  const indent = '   '.repeat(level - 1)

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

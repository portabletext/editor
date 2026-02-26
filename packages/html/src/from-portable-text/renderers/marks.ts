import type {PortableTextMarkRenderer} from '../../types'
import {escapeHtml, uriLooksSafe} from '../escape'

export const DefaultEmRenderer: PortableTextMarkRenderer = ({children}) =>
  `<em>${children}</em>`

export const DefaultStrongRenderer: PortableTextMarkRenderer = ({children}) =>
  `<strong>${children}</strong>`

export const DefaultCodeRenderer: PortableTextMarkRenderer = ({children}) =>
  `<code>${children}</code>`

export const DefaultUnderlineRenderer: PortableTextMarkRenderer = ({children}) =>
  `<span style="text-decoration:underline">${children}</span>`

export const DefaultStrikeThroughRenderer: PortableTextMarkRenderer = ({children}) =>
  `<del>${children}</del>`

export const DefaultLinkRenderer: PortableTextMarkRenderer = ({children, value}) => {
  const href = value?.href as string | undefined
  if (!href || !uriLooksSafe(href)) {
    return children
  }
  return `<a href="${escapeHtml(href)}">${children}</a>`
}

export const defaultMarkRenderers: Record<string, PortableTextMarkRenderer> = {
  em: DefaultEmRenderer,
  strong: DefaultStrongRenderer,
  code: DefaultCodeRenderer,
  underline: DefaultUnderlineRenderer,
  'strike-through': DefaultStrikeThroughRenderer,
  link: DefaultLinkRenderer,
}

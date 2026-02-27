import type {PortableTextListRenderer} from '../../types'

export const DefaultBulletListRenderer: PortableTextListRenderer = ({children}) =>
  `<ul>${children}</ul>`

export const DefaultNumberListRenderer: PortableTextListRenderer = ({children}) =>
  `<ol>${children}</ol>`

export const defaultListRenderers: Record<string, PortableTextListRenderer> = {
  bullet: DefaultBulletListRenderer,
  number: DefaultNumberListRenderer,
}

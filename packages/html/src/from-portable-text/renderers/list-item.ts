import type {PortableTextListItemRenderer} from '../../types'

export const DefaultListItemRenderer: PortableTextListItemRenderer = ({children}) =>
  `<li>${children}</li>`

export const defaultListItemRenderer = DefaultListItemRenderer

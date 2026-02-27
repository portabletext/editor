import type {PortableTextBlockRenderer} from '../../types'

export const DefaultNormalRenderer: PortableTextBlockRenderer = ({children}) =>
  `<p>${children}</p>`

export const DefaultBlockquoteRenderer: PortableTextBlockRenderer = ({children}) =>
  `<blockquote>${children}</blockquote>`

export const DefaultH1Renderer: PortableTextBlockRenderer = ({children}) =>
  `<h1>${children}</h1>`

export const DefaultH2Renderer: PortableTextBlockRenderer = ({children}) =>
  `<h2>${children}</h2>`

export const DefaultH3Renderer: PortableTextBlockRenderer = ({children}) =>
  `<h3>${children}</h3>`

export const DefaultH4Renderer: PortableTextBlockRenderer = ({children}) =>
  `<h4>${children}</h4>`

export const DefaultH5Renderer: PortableTextBlockRenderer = ({children}) =>
  `<h5>${children}</h5>`

export const DefaultH6Renderer: PortableTextBlockRenderer = ({children}) =>
  `<h6>${children}</h6>`

export const defaultBlockRenderers: Record<string, PortableTextBlockRenderer> = {
  normal: DefaultNormalRenderer,
  blockquote: DefaultBlockquoteRenderer,
  h1: DefaultH1Renderer,
  h2: DefaultH2Renderer,
  h3: DefaultH3Renderer,
  h4: DefaultH4Renderer,
  h5: DefaultH5Renderer,
  h6: DefaultH6Renderer,
}

export const defaultComponents = defaultBlockRenderers

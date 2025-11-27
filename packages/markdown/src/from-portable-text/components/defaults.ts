import type {PortableTextBlockStyle} from '@portabletext/types'
import type {
  PortableTextBlockComponent,
  PortableTextHtmlComponents,
} from '../types'
import {DefaultListItem, defaultLists} from './list'
import {defaultMarks} from './marks'
import {
  DefaultUnknownBlockStyle,
  DefaultUnknownList,
  DefaultUnknownListItem,
  DefaultUnknownMark,
  DefaultUnknownType,
} from './unknown'

// Must be exactly two spaces followed by a newline to conform to Markdown spec
export const DefaultHardBreak = (): string => '  \n'

export const defaultPortableTextBlockStyles: Record<
  PortableTextBlockStyle,
  PortableTextBlockComponent | undefined
> = {
  normal: ({children}) => {
    // Empty blocks should not add extra spacing
    if (!children || children.trim() === '') {
      return ''
    }
    return children
  },
  blockquote: ({children}) => `> ${children}`,
  h1: ({children}) => `# ${children}`,
  h2: ({children}) => `## ${children}`,
  h3: ({children}) => `### ${children}`,
  h4: ({children}) => `#### ${children}`,
  h5: ({children}) => `##### ${children}`,
  h6: ({children}) => `###### ${children}`,
}

export const defaultComponents: PortableTextHtmlComponents = {
  types: {},

  block: defaultPortableTextBlockStyles,
  marks: defaultMarks,
  list: defaultLists,
  listItem: DefaultListItem,
  hardBreak: DefaultHardBreak,

  unknownType: DefaultUnknownType,
  unknownMark: DefaultUnknownMark,
  unknownList: DefaultUnknownList,
  unknownListItem: DefaultUnknownListItem,
  unknownBlockStyle: DefaultUnknownBlockStyle,
}

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
    return `${children}\n\n`
  },
  blockquote: ({children}) => `> ${children}\n\n`,
  h1: ({children}) => `# ${children}\n\n`,
  h2: ({children}) => `## ${children}\n\n`,
  h3: ({children}) => `### ${children}\n\n`,
  h4: ({children}) => `#### ${children}\n\n`,
  h5: ({children}) => `##### ${children}\n\n`,
  h6: ({children}) => `###### ${children}\n\n`,
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

import type {PortableTextHtmlComponents} from '../types'

export const DefaultUnknownType: PortableTextHtmlComponents['unknownType'] =
  () => {
    return ''
  }

export const DefaultUnknownMark: PortableTextHtmlComponents['unknownMark'] = ({
  children,
}) => {
  return children
}

export const DefaultUnknownBlockStyle: PortableTextHtmlComponents['unknownBlockStyle'] =
  ({children}) => {
    return `${children}\n\n`
  }

export const DefaultUnknownList: PortableTextHtmlComponents['unknownList'] = ({
  children,
}) => {
  return children || ''
}

export const DefaultUnknownListItem: PortableTextHtmlComponents['unknownListItem'] =
  ({children}) => {
    return `* ${children}\n`
  }

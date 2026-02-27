import type {PortableTextHtmlComponents, PortableTextToHtmlOptions} from '../types'
import {
  defaultBlockRenderers,
} from './renderers/style'
import {defaultMarkRenderers} from './renderers/marks'
import {defaultListRenderers} from './renderers/list'
import {defaultListItemRenderer} from './renderers/list-item'
import {DefaultHardBreakRenderer} from './renderers/hard-break'

const defaultUnknownType = ({value, isInline}: {value: {_type: string}; isInline: boolean}) => {
  const warning = `Unknown block type "${value._type}", specify a component for it in the \`types\` option`
  return isInline
    ? `<span style="display:none">${warning}</span>`
    : `<div style="display:none">${warning}</div>`
}

const defaultUnknownMark = ({children, markType}: {children: string; markType: string}) => {
  return `<span class="unknown__pt__mark__${markType}">${children}</span>`
}

const defaultUnknownBlockStyle = ({children}: {children: string}) => {
  return `<p>${children}</p>`
}

const defaultUnknownList = ({children}: {children: string}) => {
  return `<ul>${children}</ul>`
}

const defaultUnknownListItem = ({children}: {children: string}) => {
  return `<li>${children}</li>`
}

export function mergeComponents(
  options: PortableTextToHtmlOptions,
): PortableTextHtmlComponents {
  const block = options.block
    ? typeof options.block === 'function'
      ? options.block
      : {...defaultBlockRenderers, ...options.block}
    : defaultBlockRenderers

  const list = options.list
    ? typeof options.list === 'function'
      ? options.list
      : {...defaultListRenderers, ...options.list}
    : defaultListRenderers

  const listItem = options.listItem
    ? typeof options.listItem === 'function'
      ? options.listItem
      : {bullet: defaultListItemRenderer, number: defaultListItemRenderer, ...options.listItem}
    : {bullet: defaultListItemRenderer, number: defaultListItemRenderer}

  return {
    types: options.types || {},
    marks: {...defaultMarkRenderers, ...(options.marks || {})},
    block,
    list,
    listItem,
    hardBreak: options.hardBreak === false ? false : (options.hardBreak || DefaultHardBreakRenderer),
    unknownType: options.unknownType || defaultUnknownType,
    unknownMark: options.unknownMark || defaultUnknownMark,
    unknownBlockStyle: options.unknownBlockStyle || defaultUnknownBlockStyle,
    unknownList: options.unknownList || defaultUnknownList,
    unknownListItem: options.unknownListItem || defaultUnknownListItem,
  }
}

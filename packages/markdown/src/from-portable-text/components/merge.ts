import type {PortableTextComponents, PortableTextHtmlComponents} from '../types'

export function mergeComponents(
  parent: PortableTextHtmlComponents,
  overrides: PortableTextComponents,
): PortableTextHtmlComponents {
  const {
    block: _block,
    list: _list,
    listItem: _listItem,
    marks: _marks,
    types: _types,
    ...rest
  } = overrides
  // @todo figure out how to not `as ...` these
  return {
    ...parent,
    block: mergeDeeply(
      parent,
      overrides,
      'block',
    ) as PortableTextHtmlComponents['block'],
    list: mergeDeeply(
      parent,
      overrides,
      'list',
    ) as PortableTextHtmlComponents['list'],
    listItem: mergeDeeply(
      parent,
      overrides,
      'listItem',
    ) as PortableTextHtmlComponents['listItem'],
    marks: mergeDeeply(
      parent,
      overrides,
      'marks',
    ) as PortableTextHtmlComponents['marks'],
    types: mergeDeeply(
      parent,
      overrides,
      'types',
    ) as PortableTextHtmlComponents['types'],
    ...rest,
  }
}

function mergeDeeply(
  parent: PortableTextHtmlComponents,
  overrides: PortableTextComponents,
  key: 'block' | 'list' | 'listItem' | 'marks' | 'types',
): PortableTextHtmlComponents[typeof key] {
  const override = overrides[key]
  const parentVal = parent[key]

  if (typeof override === 'function') {
    return override
  }

  if (override && typeof parentVal === 'function') {
    return override
  }

  if (override) {
    return {...parentVal, ...override} as PortableTextHtmlComponents[typeof key]
  }

  return parentVal
}

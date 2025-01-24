import {
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {isTypedObject} from './asserters'

export function parseBlock({
  context,
  block,
  options,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  block: unknown
  options: {
    refreshKeys: boolean
  }
}): PortableTextBlock | undefined {
  if (!isTypedObject(block)) {
    return undefined
  }

  if (
    block._type !== context.schema.block.name &&
    !context.schema.blockObjects.some(
      (blockObject) => blockObject.name === block._type,
    )
  ) {
    return undefined
  }

  if (block._type !== context.schema.block.name) {
    const _key = options.refreshKeys
      ? context.keyGenerator()
      : typeof block._key === 'string'
        ? block._key
        : context.keyGenerator()
    return {
      ...block,
      _key,
    }
  }

  if (!isPortableTextTextBlock(block)) {
    return {
      _type: context.schema.block.name,
      _key: options.refreshKeys
        ? context.keyGenerator()
        : typeof block._key === 'string'
          ? block._key
          : context.keyGenerator(),
      children: [
        {
          _key: context.keyGenerator(),
          _type: context.schema.span.name,
          text: '',
          marks: [],
        },
      ],
      markDefs: [],
      style: context.schema.styles[0].value,
    }
  }

  const markDefKeyMap = new Map<string, string>()
  const markDefs = (block.markDefs ?? []).flatMap((markDef) => {
    if (
      context.schema.annotations.some(
        (annotation) => annotation.name === markDef._type,
      )
    ) {
      const _key = options.refreshKeys ? context.keyGenerator() : markDef._key
      markDefKeyMap.set(markDef._key, _key)

      return [
        {
          ...markDef,
          _key,
        },
      ]
    }

    return []
  })

  const children = block.children.flatMap((child) => {
    if (!isTypedObject(child)) {
      return []
    }

    if (
      child._type !== context.schema.span.name &&
      !context.schema.inlineObjects.some(
        (inlineObject) => inlineObject.name === child._type,
      )
    ) {
      return []
    }

    if (!isPortableTextSpan(child)) {
      return [
        {
          ...child,
          _key: options.refreshKeys ? context.keyGenerator() : child._key,
        },
      ]
    }

    const marks = (child.marks ?? []).flatMap((mark) => {
      if (markDefKeyMap.has(mark)) {
        return [markDefKeyMap.get(mark)]
      }

      if (
        context.schema.decorators.some((decorator) => decorator.value === mark)
      ) {
        return [mark]
      }

      return []
    })

    return [
      {
        ...child,
        _key: options.refreshKeys ? context.keyGenerator() : child._key,
        marks,
      },
    ]
  })

  const parsedBlock = {
    ...block,
    _key: options.refreshKeys ? context.keyGenerator() : block._key,
    children:
      children.length > 0
        ? children
        : [
            {
              _key: context.keyGenerator(),
              _type: context.schema.span.name,
              text: '',
              marks: [],
            },
          ],
    markDefs,
  }

  if (!context.schema.styles.find((style) => style.value === block.style)) {
    const defaultStyle = context.schema.styles[0].value

    if (defaultStyle !== undefined) {
      parsedBlock.style = defaultStyle
    } else {
      delete parsedBlock.style
    }
  }

  if (!context.schema.lists.find((list) => list.value === block.listItem)) {
    delete parsedBlock.listItem
    delete parsedBlock.level
  }

  return parsedBlock
}

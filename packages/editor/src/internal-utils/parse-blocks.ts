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
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  block: unknown
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

  if (!isPortableTextTextBlock(block)) {
    return {
      ...block,
      _key: context.keyGenerator(),
    }
  }

  const markDefKeyMap = new Map<string, string>()
  const markDefs = (block.markDefs ?? []).flatMap((markDef) => {
    if (
      context.schema.annotations.some(
        (annotation) => annotation.name === markDef._type,
      )
    ) {
      const _key = context.keyGenerator()
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
          _key: context.keyGenerator(),
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
        _key: context.keyGenerator(),
        marks,
      },
    ]
  })

  const parsedBlock = {
    ...block,
    _key: context.keyGenerator(),
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

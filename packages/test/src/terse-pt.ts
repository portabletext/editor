import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextTextBlock,
  type Schema,
} from '@portabletext/schema'

type SerializeConfig = {
  style?: (context: {schema: Schema; name: string | undefined}) => string
  listItem?: (context: {schema: Schema; name: string | undefined}) => string
  level?: (context: {schema: Schema; level: number | undefined}) => string
}

const defaultSerializeConfig = {
  style: (context) => {
    const name =
      context.name === undefined || context.name === 'normal'
        ? ''
        : context.name === 'blockquote'
          ? 'q'
          : `${context.name}`

    return name
  },
  listItem: (context) => {
    const name =
      context.name === undefined
        ? ''
        : context.name === 'number'
          ? '#'
          : context.name === 'bullet'
            ? '-'
            : ''

    return name
  },
  level: (context) => {
    const level = context.level === undefined ? 0 : context.level

    return level > 0 ? '>'.repeat(level) : ''
  },
} satisfies SerializeConfig

type DeserializeConfig = {
  blockObject?: (context: {schema: Schema; name: string}) =>
    | {
        _type: string
      }
    | undefined
  inlineObject?: (context: {schema: Schema; name: string}) =>
    | {
        _type: string
      }
    | undefined
  style?: (context: {
    schema: Schema
    symbol: string
  }) => Schema['styles'][number]['name'] | undefined
  listItem?: (context: {
    schema: Schema
    symbol: string
  }) => Schema['lists'][number]['name'] | undefined
  level?: (context: {schema: Schema; symbol: string}) => number | undefined
}

const defaultDeserializeConfig = {
  blockObject: (context) => {
    const type = context.schema.blockObjects.find(
      (blockObject) => blockObject.name === context.name,
    )?.name

    return type ? {_type: type} : undefined
  },
  inlineObject: (context) => {
    const type = context.schema.inlineObjects.find(
      (inlineObject) => inlineObject.name === context.name,
    )?.name

    return type ? {_type: type} : undefined
  },
  style: (context) => {
    const name = context.symbol === 'q' ? 'blockquote' : context.symbol

    return (
      context.schema.styles.find((style) => style.name === name)?.name ??
      undefined
    )
  },
  listItem: (context) => {
    const name =
      context.symbol === '#'
        ? 'number'
        : context.symbol === '-'
          ? 'bullet'
          : undefined

    return (
      context.schema.lists.find((list) => list.name === name)?.name ?? undefined
    )
  },
  level: (context) => {
    const level = context.symbol.split('').filter((part) => part === '>').length

    return level > 0 ? level : undefined
  },
} satisfies DeserializeConfig

type Context = {
  keyGenerator: () => string
  schema: Schema
  value: Array<PortableTextBlock>
}

/**
 * @public
 */
export function getTersePt(
  context: Pick<Context, 'schema' | 'value'>,
): Array<string> {
  const blocks: Array<string> = []

  for (const block of context.value) {
    let terseBlock = ''

    if (isTextBlock(context, block)) {
      const blockPrefix = [
        defaultSerializeConfig.level({
          schema: context.schema,
          level: block.level,
        }),
        defaultSerializeConfig.listItem({
          schema: context.schema,
          name: block.listItem,
        }),
        defaultSerializeConfig.style({
          schema: context.schema,
          name: block.style,
        }),
      ].join('')

      if (blockPrefix) {
        terseBlock = `${blockPrefix}:`
      }

      let index = -1
      for (const child of block.children) {
        index++

        if (isSpan(context, child)) {
          terseBlock = `${terseBlock}${index > 0 ? ',' : ''}${child.text}`
        } else {
          terseBlock = `${terseBlock}${index > 0 ? ',' : ''}{${child._type}}`
        }
      }
    } else {
      terseBlock = `{${block._type}}`
    }

    blocks.push(terseBlock)
  }

  return blocks
}

/**
 * @public
 */
export function parseTersePt(
  context: Pick<Context, 'keyGenerator' | 'schema'>,
  tersePt: Array<string>,
): Array<PortableTextBlock> {
  const blocks: Array<PortableTextBlock> = []

  for (const terseBlock of tersePt) {
    if (terseBlock.startsWith('{')) {
      const blockObject = defaultDeserializeConfig.blockObject({
        schema: context.schema,
        name: terseBlock.slice(1, -1),
      })

      if (blockObject) {
        blocks.push({
          ...blockObject,
          _key: context.keyGenerator(),
        })
      }

      continue
    }

    const block: PortableTextTextBlock = {
      _key: context.keyGenerator(),
      _type: context.schema.block.name,
      children: [],
    }

    if (terseBlock.includes(':')) {
      const [prefix = '', ...contentParts] = terseBlock.split(':')
      const content = contentParts.join(':')

      const listItemSymbol = prefix.includes('#')
        ? '#'
        : prefix.includes('-')
          ? '-'
          : undefined
      const listItem = listItemSymbol
        ? defaultDeserializeConfig.listItem({
            schema: context.schema,
            symbol: listItemSymbol,
          })
        : undefined

      if (listItem !== undefined) {
        block.listItem = listItem
      }

      const initialLevel = listItem !== undefined ? 1 : 0
      const level =
        defaultDeserializeConfig.level({
          schema: context.schema,
          symbol: prefix
            .split('')
            .filter((part) => part === '>')
            .join(''),
        }) ?? 0

      if (level > 0) {
        block.level = level
      } else if (initialLevel > 0) {
        block.level = initialLevel
      }

      const styleSymbol = prefix
        .split('')
        .filter((part) => !['#', '-', '>'].includes(part))
        .join('')

      const style = defaultDeserializeConfig.style({
        schema: context.schema,
        symbol: styleSymbol,
      })

      if (style) {
        block.style = style
      }

      const textRuns =
        !styleSymbol && !listItemSymbol
          ? `:${content}`.split(',')
          : content.split(',')

      for (const textRun of textRuns) {
        if (textRun.startsWith('{')) {
          const inlineObject = defaultDeserializeConfig.inlineObject({
            schema: context.schema,
            name: textRun.slice(1, -1),
          })

          if (inlineObject) {
            block.children.push({
              ...inlineObject,
              _key: context.keyGenerator(),
            })
          }
        } else {
          block.children.push({
            _key: context.keyGenerator(),
            _type: context.schema.span.name,
            text: textRun,
          })
        }
      }
    } else {
      const textRuns = terseBlock.split(',')

      for (const textRun of textRuns) {
        if (textRun.startsWith('{')) {
          const inlineObject = defaultDeserializeConfig.inlineObject({
            schema: context.schema,
            name: textRun.slice(1, -1),
          })

          if (inlineObject) {
            block.children.push({
              ...inlineObject,
              _key: context.keyGenerator(),
            })
          }
        } else {
          block.children.push({
            _key: context.keyGenerator(),
            _type: context.schema.span.name,
            text: textRun,
          })
        }
      }
    }

    blocks.push(block)
  }

  return blocks
}

/**
 * @public
 */
export function parseTersePtString(text: string) {
  return text.split('|').map((span) => span.replace(/\\n/g, '\n'))
}

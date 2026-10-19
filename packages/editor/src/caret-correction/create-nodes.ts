import type {PortableTextTextBlock, Schema} from '@portabletext/schema'

export function createSpan(context: {
  schema: Schema
  keyGenerator: () => string
}): {_type: string; _key: string; text: string; marks: Array<string>} {
  return {
    _type: context.schema.span.name,
    _key: context.keyGenerator(),
    text: '',
    marks: [],
  }
}

export function createTextBlock(
  context: {schema: Schema; keyGenerator: () => string},
  style: string,
): PortableTextTextBlock {
  return {
    _type: context.schema.block.name,
    _key: context.keyGenerator(),
    style,
    markDefs: [],
    children: [
      {
        _type: context.schema.span.name,
        _key: context.keyGenerator(),
        text: '',
        marks: [],
      },
    ],
  }
}

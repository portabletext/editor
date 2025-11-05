import type {MarkdownShortcutsPluginProps} from '@portabletext/plugin-markdown-shortcuts'

export const markdownShortcutsPluginProps: MarkdownShortcutsPluginProps = {
  boldDecorator: ({context}) =>
    context.schema.decorators.find((decorator) => decorator.name === 'strong')
      ?.name,
  codeDecorator: ({context}) =>
    context.schema.decorators.find((decorator) => decorator.name === 'code')
      ?.name,
  italicDecorator: ({context}) =>
    context.schema.decorators.find((decorator) => decorator.name === 'em')
      ?.name,
  strikeThroughDecorator: ({context}) =>
    context.schema.decorators.find(
      (decorator) => decorator.name === 'strike-through',
    )?.name,
  horizontalRuleObject: ({context}) => {
    const schemaType = context.schema.blockObjects.find(
      (object) => object.name === 'break',
    )

    if (!schemaType) {
      return undefined
    }

    return {_type: schemaType.name}
  },
  linkObject: ({context, props}) => {
    const schemaType = context.schema.annotations.find(
      (annotation) => annotation.name === 'link',
    )
    const hrefField = schemaType?.fields.find(
      (field) => field.name === 'href' && field.type === 'string',
    )

    if (!schemaType || !hrefField) {
      return undefined
    }

    return {
      _type: schemaType.name,
      [hrefField.name]: props.href,
    }
  },
  defaultStyle: ({context}) => context.schema.styles[0].value,
  headingStyle: ({context, props}) =>
    context.schema.styles.find((style) => style.name === `h${props.level}`)
      ?.name,
  blockquoteStyle: ({context}) =>
    context.schema.styles.find((style) => style.name === 'blockquote')?.name,
  unorderedList: ({context}) =>
    context.schema.lists.find((list) => list.name === 'bullet')?.name,
  orderedList: ({context}) =>
    context.schema.lists.find((list) => list.name === 'number')?.name,
}

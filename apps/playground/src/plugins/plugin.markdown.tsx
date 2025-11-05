import type {MarkdownShortcutsPluginProps} from '@portabletext/plugin-markdown-shortcuts'

export const markdownShortcutsPluginProps: MarkdownShortcutsPluginProps = {
  boldDecorator: ({schema}) =>
    schema.decorators.find((decorator) => decorator.name === 'strong')?.name,
  codeDecorator: ({schema}) =>
    schema.decorators.find((decorator) => decorator.name === 'code')?.name,
  italicDecorator: ({schema}) =>
    schema.decorators.find((decorator) => decorator.name === 'em')?.name,
  strikeThroughDecorator: ({schema}) =>
    schema.decorators.find((decorator) => decorator.name === 'strike-through')
      ?.name,
  horizontalRuleObject: ({schema}) => {
    const schemaType = schema.blockObjects.find(
      (object) => object.name === 'break',
    )

    if (!schemaType) {
      return undefined
    }

    return {_type: schemaType.name}
  },
  linkObject: ({schema, href}) => {
    const schemaType = schema.annotations.find(
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
      [hrefField.name]: href,
    }
  },
  defaultStyle: ({schema}) => schema.styles[0].value,
  headingStyle: ({schema, level}) =>
    schema.styles.find((style) => style.name === `h${level}`)?.name,
  blockquoteStyle: ({schema}) =>
    schema.styles.find((style) => style.name === 'blockquote')?.name,
  unorderedList: ({schema}) =>
    schema.lists.find((list) => list.name === 'bullet')?.name,
  orderedList: ({schema}) =>
    schema.lists.find((list) => list.name === 'number')?.name,
}

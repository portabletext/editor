import type {MarkdownShortcutsPluginProps} from '@portabletext/plugin-markdown-shortcuts'

export const markdownShortcutsProps: MarkdownShortcutsPluginProps = {
  boldDecorator: ({context}) =>
    context.schema.decorators.find((d) => d.name === 'strong')?.name,
  italicDecorator: ({context}) =>
    context.schema.decorators.find((d) => d.name === 'em')?.name,
  codeDecorator: ({context}) =>
    context.schema.decorators.find((d) => d.name === 'code')?.name,
  strikeThroughDecorator: ({context}) =>
    context.schema.decorators.find((d) => d.name === 'strike-through')?.name,
  defaultStyle: ({context}) =>
    context.schema.styles[0]?.value ?? context.schema.styles[0]?.name,
  headingStyle: ({context, props}) =>
    context.schema.styles.find((s) => s.name === `h${props.level}`)?.name,
  horizontalRuleObject: ({context}) => {
    const schemaType = context.schema.blockObjects.find(
      (o) => o.name === 'horizontal-rule',
    )
    if (!schemaType) {
      return undefined
    }
    return {_type: schemaType.name}
  },
  linkObject: ({context, props}) => {
    const schemaType = context.schema.annotations.find((a) => a.name === 'link')
    const hrefField = schemaType?.fields.find(
      (f) => f.name === 'href' && f.type === 'string',
    )
    if (!schemaType || !hrefField) {
      return undefined
    }
    return {_type: schemaType.name, [hrefField.name]: props.href}
  },
}

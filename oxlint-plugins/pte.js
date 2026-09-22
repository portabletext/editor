const noWeakValueAssertions = {
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression') return
        if (callee.property.type !== 'Identifier') return

        const methodName = callee.property.name
        if (methodName !== 'toMatchObject' && methodName !== 'toBeDefined')
          return

        const object = callee.object
        if (object.type !== 'CallExpression') return
        if (
          object.callee.type !== 'Identifier' ||
          object.callee.name !== 'expect'
        )
          return

        if (methodName === 'toMatchObject') {
          context.report({
            node,
            message:
              'Use `toEqual` for exact deep equality instead of `toMatchObject`.',
          })
        } else {
          context.report({
            node,
            message:
              'Use `toEqual` with the expected value instead of `toBeDefined`.',
          })
        }
      },
    }
  },
}

const FORBIDDEN_DATA_ATTRIBUTE = 'data-slate-editor'
const noDataSlateEditorMessage =
  '`data-slate-editor` exists only as a Grammarly fingerprint on the editable root and may be removed without warning; target `data-pt-editor` instead.'

const noDataSlateEditor = {
  create(context) {
    return {
      Literal(node) {
        if (
          typeof node.value === 'string' &&
          node.value.includes(FORBIDDEN_DATA_ATTRIBUTE)
        ) {
          context.report({node, message: noDataSlateEditorMessage})
        }
      },
      TemplateElement(node) {
        if (node.value.raw.includes(FORBIDDEN_DATA_ATTRIBUTE)) {
          context.report({node, message: noDataSlateEditorMessage})
        }
      },
      JSXIdentifier(node) {
        if (node.name.includes(FORBIDDEN_DATA_ATTRIBUTE)) {
          context.report({node, message: noDataSlateEditorMessage})
        }
      },
      Identifier(node) {
        if (node.name.includes(FORBIDDEN_DATA_ATTRIBUTE)) {
          context.report({node, message: noDataSlateEditorMessage})
        }
      },
    }
  },
}

const plugin = {
  meta: {
    name: 'pte',
  },
  rules: {
    'no-weak-value-assertions': noWeakValueAssertions,
    'no-data-slate-editor': noDataSlateEditor,
  },
}

export default plugin

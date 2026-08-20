const rule = {
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

const plugin = {
  meta: {
    name: 'pte',
  },
  rules: {
    'no-weak-value-assertions': rule,
  },
}

export default plugin

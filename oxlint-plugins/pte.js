const weakAsymmetricMatcherMessages = {
  objectContaining:
    'Use `toEqual` with the full literal object instead of `expect.objectContaining`.',
  arrayContaining:
    'Use `toEqual` with the full array in the order the code produces instead of `expect.arrayContaining`.',
  any: 'Assert the literal value instead of `expect.any`: keys from `createTestKeyGenerator` are deterministic (`k0`, `k1`, ...).',
  anything: 'Assert the literal value instead of `expect.anything`.',
}

const weakNegatedAsymmetricMatcherMessages = {
  objectContaining:
    'Use `toEqual` with the full literal object instead of `expect.not.objectContaining`.',
  arrayContaining:
    'Use `toEqual` with the full array in the order the code produces instead of `expect.not.arrayContaining`.',
}

const noWeakValueAssertions = {
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression') return
        const methodName = getStaticPropertyName(callee)
        if (methodName === undefined) return

        const asymmetricMatcherMessage = getWeakAsymmetricMatcherMessage(
          callee.object,
          methodName,
        )
        if (asymmetricMatcherMessage) {
          context.report({node, message: asymmetricMatcherMessage})
          return
        }

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

function getWeakAsymmetricMatcherMessage(object, matcherName) {
  if (object.type === 'Identifier' && object.name === 'expect') {
    return Object.hasOwn(weakAsymmetricMatcherMessages, matcherName)
      ? weakAsymmetricMatcherMessages[matcherName]
      : undefined
  }

  if (
    object.type === 'MemberExpression' &&
    object.object.type === 'Identifier' &&
    object.object.name === 'expect' &&
    getStaticPropertyName(object) === 'not'
  ) {
    return Object.hasOwn(weakNegatedAsymmetricMatcherMessages, matcherName)
      ? weakNegatedAsymmetricMatcherMessages[matcherName]
      : undefined
  }

  return undefined
}

function getStaticPropertyName(memberExpression) {
  const property = memberExpression.property
  if (!memberExpression.computed) {
    return property.type === 'Identifier' ? property.name : undefined
  }
  if (property.type === 'Literal' && typeof property.value === 'string') {
    return property.value
  }
  return undefined
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

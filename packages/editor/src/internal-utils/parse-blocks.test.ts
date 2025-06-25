import {describe, expect, test} from 'vitest'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import {parseBlock, parseSpan} from './parse-blocks'
import {createTestKeyGenerator} from './test-key-generator'

describe(parseBlock.name, () => {
  test('null', () => {
    expect(
      parseBlock({
        block: null,
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
        },
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('undefined', () => {
    expect(
      parseBlock({
        block: undefined,
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
        },
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toBe(undefined)
  })

  describe('block object', () => {
    test('empty', () => {
      expect(
        parseBlock({
          block: {},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchemaDefinition(defineSchema({})),
          },
          options: {refreshKeys: false, validateFields: true},
        }),
      ).toBe(undefined)
    })

    test('missing _type', () => {
      expect(
        parseBlock({
          block: {_key: 'k0'},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchemaDefinition(
              defineSchema({blockObjects: [{name: 'image'}]}),
            ),
          },
          options: {refreshKeys: false, validateFields: true},
        }),
      ).toBe(undefined)
    })

    test('missing _key', () => {
      expect(
        parseBlock({
          block: {_type: 'image'},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchemaDefinition(
              defineSchema({blockObjects: [{name: 'image'}]}),
            ),
          },
          options: {refreshKeys: false, validateFields: true},
        }),
      ).toEqual({
        _key: 'k0',
        _type: 'image',
      })
    })
  })

  describe('text block', () => {
    test('only _type', () => {
      expect(
        parseBlock({
          block: {_type: 'block'},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchemaDefinition(defineSchema({})),
          },
          options: {refreshKeys: false, validateFields: true},
        }),
      ).toEqual({
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      })
    })

    test('custom _type', () => {
      const schema = compileSchemaDefinition(defineSchema({}))
      expect(
        parseBlock({
          block: {_type: 'text'},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: {...schema, block: {...schema.block, name: 'text'}},
          },
          options: {refreshKeys: false, validateFields: true},
        }),
      ).toEqual({
        _key: 'k0',
        _type: 'text',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      })
    })

    test('only children', () => {
      expect(
        parseBlock({
          block: {
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'foo',
                marks: [],
              },
            ],
          },
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchemaDefinition(defineSchema({})),
          },
          options: {refreshKeys: false, validateFields: true},
        }),
      ).toBe(undefined)
    })

    test('invalid children', () => {
      expect(
        parseBlock({
          block: {
            _type: 'block',
            children: [
              undefined,
              null,
              'foo',
              42,
              {foo: 'bar'},
              {
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'stock-ticker',
              },
              {_type: 'span'},
              {_type: 'span', text: 'foo'},
              {_type: 'span', marks: ['strong']},
              {_type: 'span', marks: ['em']},
            ],
          },
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchemaDefinition(
              defineSchema({
                inlineObjects: [{name: 'stock-ticker'}],
                decorators: [{name: 'em'}],
              }),
            ),
          },
          options: {refreshKeys: false, validateFields: true},
        }),
      ).toEqual({
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'stock-ticker',
          },
          {
            _key: 'k2',
            _type: 'span',
            text: '',
            marks: [],
          },
          {
            _key: 'k3',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
          {
            _key: 'k4',
            _type: 'span',
            text: '',
            marks: [],
          },
          {
            _key: 'k5',
            _type: 'span',
            text: '',
            marks: ['em'],
          },
        ],
        markDefs: [],
        style: 'normal',
      })
    })

    test('only (known) listItem', () => {
      expect(
        parseBlock({
          block: {_type: 'block', listItem: 'bullet'},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchemaDefinition(
              defineSchema({lists: [{name: 'bullet'}]}),
            ),
          },
          options: {refreshKeys: false, validateFields: true},
        }),
      ).toEqual({
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        listItem: 'bullet',
        style: 'normal',
      })
    })

    test('only (unknown) listItem', () => {
      expect(
        parseBlock({
          block: {_type: 'block', listItem: 'number'},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchemaDefinition(
              defineSchema({lists: [{name: 'bullet'}]}),
            ),
          },
          options: {refreshKeys: false, validateFields: true},
        }),
      ).toEqual({
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      })
    })
  })
})

describe(parseSpan.name, () => {
  test('undefined', () => {
    expect(
      parseSpan({
        span: undefined,
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('null', () => {
    expect(
      parseSpan({
        span: null,
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('empty object', () => {
    expect(
      parseSpan({
        span: {},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('invalid _type', () => {
    expect(
      parseSpan({
        span: {_type: 'stock-ticker'},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('only _type', () => {
    expect(
      parseSpan({
        span: {_type: 'span'},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toEqual({
      _key: 'k0',
      _type: 'span',
      text: '',
      marks: [],
    })
  })

  test('custom props', () => {
    expect(
      parseSpan({
        span: {_type: 'span', foo: 'bar'},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toEqual({
      _key: 'k0',
      _type: 'span',
      text: '',
      marks: [],
    })
  })

  test('invalid marks array', () => {
    expect(
      parseSpan({
        span: {
          _type: 'span',
          marks: 42,
        },
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toEqual({
      _key: 'k0',
      _type: 'span',
      text: '',
      marks: [],
    })
  })

  test('invalid marks', () => {
    expect(
      parseSpan({
        span: {
          _type: 'span',
          marks: [null, undefined, 'foo', 42, {foo: 'bar'}, 'strong'],
        },
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(
            defineSchema({decorators: [{name: 'strong'}]}),
          ),
        },
        markDefKeyMap: new Map(),
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toEqual({
      _key: 'k0',
      _type: 'span',
      text: '',
      marks: ['strong'],
    })
  })

  test('unknown decorator', () => {
    expect(
      parseSpan({
        span: {
          _type: 'span',
          marks: ['strong', 'em'],
        },
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(
            defineSchema({decorators: [{name: 'strong'}]}),
          ),
        },
        markDefKeyMap: new Map(),
        options: {refreshKeys: false, validateFields: true},
      }),
    ).toEqual({
      _key: 'k0',
      _type: 'span',
      text: '',
      marks: ['strong'],
    })
  })
})

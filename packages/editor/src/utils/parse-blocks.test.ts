import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {
  parseBlock,
  parseChild,
  parseInlineObject,
  parseSpan,
} from './parse-blocks'

describe(parseBlock.name, () => {
  test('null', () => {
    expect(
      parseBlock({
        block: null,
        keyGenerator: createTestKeyGenerator(),
        options: {
          normalize: false,
          removeUnusedMarkDefs: true,
          validateFields: true,
        },
        schema: compileSchema(defineSchema({})),
      }),
    ).toBe(undefined)
  })

  test('undefined', () => {
    expect(
      parseBlock({
        block: undefined,
        keyGenerator: createTestKeyGenerator(),
        options: {
          normalize: false,
          removeUnusedMarkDefs: true,
          validateFields: true,
        },
        schema: compileSchema(defineSchema({})),
      }),
    ).toBe(undefined)
  })

  describe('block object', () => {
    test('empty', () => {
      expect(
        parseBlock({
          block: {},
          keyGenerator: createTestKeyGenerator(),
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
          schema: compileSchema(defineSchema({})),
        }),
      ).toBe(undefined)
    })

    test('missing _type', () => {
      expect(
        parseBlock({
          block: {_key: 'k0'},
          keyGenerator: createTestKeyGenerator(),
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
          schema: compileSchema(
            defineSchema({blockObjects: [{name: 'image'}]}),
          ),
        }),
      ).toBe(undefined)
    })

    test('missing _key', () => {
      expect(
        parseBlock({
          block: {_type: 'image'},
          keyGenerator: createTestKeyGenerator(),
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
          schema: compileSchema(
            defineSchema({blockObjects: [{name: 'image'}]}),
          ),
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
          keyGenerator: createTestKeyGenerator(),
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
          schema: compileSchema(defineSchema({})),
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
      })
    })

    test('custom _type', () => {
      const schema = compileSchema(defineSchema({}))
      expect(
        parseBlock({
          block: {_type: 'text'},
          keyGenerator: createTestKeyGenerator(),
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
          schema: {
            ...schema,
            block: {...schema.block, name: 'text'},
          },
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
          keyGenerator: createTestKeyGenerator(),
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
          schema: compileSchema(defineSchema({})),
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
                _key: 'some key',
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
              {_type: 'image', text: 'inline object or span?'},
            ],
          },
          keyGenerator: createTestKeyGenerator(),
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
          schema: compileSchema(
            defineSchema({
              inlineObjects: [{name: 'stock-ticker'}],
              decorators: [{name: 'em'}],
            }),
          ),
        }),
      ).toEqual({
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'some key',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
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
      })
    })

    test('only (known) listItem', () => {
      expect(
        parseBlock({
          block: {_type: 'block', listItem: 'bullet'},
          keyGenerator: createTestKeyGenerator(),
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
          schema: compileSchema(defineSchema({lists: [{name: 'bullet'}]})),
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
        listItem: 'bullet',
      })
    })

    test('only (unknown) listItem', () => {
      expect(
        parseBlock({
          block: {_type: 'block', listItem: 'number'},
          keyGenerator: createTestKeyGenerator(),
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
          schema: compileSchema(defineSchema({lists: [{name: 'bullet'}]})),
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
      })
    })

    describe('validating custom fields', () => {
      test('none defined', () => {
        expect(
          parseBlock({
            block: {_type: 'block', map: {}},
            keyGenerator: createTestKeyGenerator(),
            options: {
              normalize: false,
              removeUnusedMarkDefs: true,
              validateFields: true,
            },
            schema: compileSchema(defineSchema({})),
          }),
        ).toEqual({
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
        })
      })

      test('field defined', () => {
        expect(
          parseBlock({
            block: {_type: 'block', map: {}},
            keyGenerator: createTestKeyGenerator(),
            options: {
              normalize: false,
              removeUnusedMarkDefs: true,
              validateFields: true,
            },
            schema: compileSchema(
              defineSchema({
                block: {fields: [{name: 'map', type: 'object'}]},
              }),
            ),
          }),
        ).toEqual({
          _type: 'block',
          _key: 'k0',
          map: {},
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
        })
      })

      test('different field defined', () => {
        expect(
          parseBlock({
            block: {_type: 'block', foo: {}},
            keyGenerator: createTestKeyGenerator(),
            options: {
              normalize: false,
              removeUnusedMarkDefs: true,
              validateFields: true,
            },
            schema: compileSchema(
              defineSchema({
                block: {fields: [{name: 'map', type: 'object'}]},
              }),
            ),
          }),
        ).toEqual({
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
        })
      })
    })
  })
})

describe(parseSpan.name, () => {
  test('undefined', () => {
    expect(
      parseSpan({
        span: undefined,
        keyGenerator: createTestKeyGenerator(),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
        schema: compileSchema(defineSchema({})),
      }),
    ).toBe(undefined)
  })

  test('null', () => {
    expect(
      parseSpan({
        span: null,
        keyGenerator: createTestKeyGenerator(),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
        schema: compileSchema(defineSchema({})),
      }),
    ).toBe(undefined)
  })

  test('empty object', () => {
    expect(
      parseSpan({
        span: {},
        keyGenerator: createTestKeyGenerator(),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
        schema: compileSchema(defineSchema({})),
      }),
    ).toBe(undefined)
  })

  test('invalid _type', () => {
    expect(
      parseSpan({
        span: {_type: 'stock-ticker'},
        keyGenerator: createTestKeyGenerator(),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
        schema: compileSchema(defineSchema({})),
      }),
    ).toBe(undefined)
  })

  test('only _type', () => {
    expect(
      parseSpan({
        span: {_type: 'span'},
        keyGenerator: createTestKeyGenerator(),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
        schema: compileSchema(defineSchema({})),
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
        keyGenerator: createTestKeyGenerator(),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
        schema: compileSchema(defineSchema({})),
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
        keyGenerator: createTestKeyGenerator(),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
        schema: compileSchema(defineSchema({})),
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
        keyGenerator: createTestKeyGenerator(),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
        schema: compileSchema(defineSchema({decorators: [{name: 'strong'}]})),
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
        keyGenerator: createTestKeyGenerator(),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
        schema: compileSchema(defineSchema({decorators: [{name: 'strong'}]})),
      }),
    ).toEqual({
      _key: 'k0',
      _type: 'span',
      text: '',
      marks: ['strong'],
    })
  })
})

describe(parseInlineObject.name, () => {
  test('undefined', () => {
    expect(
      parseInlineObject({
        inlineObject: undefined,
        keyGenerator: createTestKeyGenerator(),
        options: {validateFields: true},
        schema: compileSchema(
          defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
        ),
      }),
    ).toBe(undefined)
  })

  test('null', () => {
    expect(
      parseInlineObject({
        inlineObject: null,
        keyGenerator: createTestKeyGenerator(),
        options: {validateFields: true},
        schema: compileSchema(
          defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
        ),
      }),
    ).toBe(undefined)
  })

  test('empty object', () => {
    expect(
      parseInlineObject({
        inlineObject: {},
        keyGenerator: createTestKeyGenerator(),
        options: {validateFields: true},
        schema: compileSchema(
          defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
        ),
      }),
    ).toBe(undefined)
  })

  test('invalid _type', () => {
    expect(
      parseInlineObject({
        inlineObject: {_type: 'image'},
        keyGenerator: createTestKeyGenerator(),
        options: {validateFields: true},
        schema: compileSchema(
          defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
        ),
      }),
    ).toBe(undefined)
  })

  test('only _type', () => {
    expect(
      parseInlineObject({
        inlineObject: {_type: 'stock-ticker'},
        keyGenerator: createTestKeyGenerator(),
        options: {validateFields: true},
        schema: compileSchema(
          defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
        ),
      }),
    ).toEqual({
      _key: 'k0',
      _type: 'stock-ticker',
    })
  })

  describe('looks like text node', () => {
    test('known inline object _type', () => {
      expect(
        parseInlineObject({
          inlineObject: {_type: 'stock-ticker', text: 'foo'},
          keyGenerator: createTestKeyGenerator(),
          options: {validateFields: true},
          schema: compileSchema(
            defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
          ),
        }),
      ).toEqual({_key: 'k0', _type: 'stock-ticker'})
    })

    test('unknown inline object _type', () => {
      expect(
        parseInlineObject({
          inlineObject: {_type: 'image', text: 'foo'},
          keyGenerator: createTestKeyGenerator(),
          options: {validateFields: true},
          schema: compileSchema(
            defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
          ),
        }),
      ).toBe(undefined)
    })
  })

  describe('custom props', () => {
    describe('unknown prop', () => {
      test('validateFields: true', () => {
        expect(
          parseInlineObject({
            inlineObject: {_type: 'stock-ticker', foo: 'bar'},
            keyGenerator: createTestKeyGenerator(),
            options: {validateFields: true},
            schema: compileSchema(
              defineSchema({
                inlineObjects: [{name: 'stock-ticker'}],
              }),
            ),
          }),
        ).toEqual({
          _key: 'k0',
          _type: 'stock-ticker',
        })
      })

      test('validateFields: false', () => {
        expect(
          parseInlineObject({
            inlineObject: {_type: 'stock-ticker', foo: 'bar'},
            keyGenerator: createTestKeyGenerator(),
            options: {validateFields: false},
            schema: compileSchema(
              defineSchema({
                inlineObjects: [{name: 'stock-ticker'}],
              }),
            ),
          }),
        ).toEqual({
          _key: 'k0',
          _type: 'stock-ticker',
          foo: 'bar',
        })
      })
    })

    describe('known prop', () => {
      test('validateFields: true', () => {
        expect(
          parseInlineObject({
            inlineObject: {_type: 'stock-ticker', foo: 'bar'},
            keyGenerator: createTestKeyGenerator(),
            options: {validateFields: true},
            schema: compileSchema(
              defineSchema({
                inlineObjects: [
                  {
                    name: 'stock-ticker',
                    fields: [{name: 'foo', type: 'string'}],
                  },
                ],
              }),
            ),
          }),
        ).toEqual({
          _key: 'k0',
          _type: 'stock-ticker',
          foo: 'bar',
        })
      })
    })

    test('validateFields: false', () => {
      expect(
        parseInlineObject({
          inlineObject: {_type: 'stock-ticker', foo: 'bar'},
          keyGenerator: createTestKeyGenerator(),
          options: {validateFields: false},
          schema: compileSchema(
            defineSchema({
              inlineObjects: [
                {
                  name: 'stock-ticker',
                  fields: [{name: 'foo', type: 'string'}],
                },
              ],
            }),
          ),
        }),
      ).toEqual({
        _key: 'k0',
        _type: 'stock-ticker',
        foo: 'bar',
      })
    })
  })
})

describe(parseChild.name, () => {
  describe('inline object', () => {
    describe('looks like text node', () => {
      test('known inline object _type', () => {
        expect(
          parseChild({
            keyGenerator: createTestKeyGenerator(),
            markDefKeyMap: new Map(),
            options: {validateFields: true},
            child: {_type: 'stock-ticker', text: 'foo'},
            schema: compileSchema(
              defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
            ),
          }),
        ).toEqual({_key: 'k0', _type: 'stock-ticker'})
      })

      test('unknown inline object _type', () => {
        expect(
          parseChild({
            keyGenerator: createTestKeyGenerator(),
            markDefKeyMap: new Map(),
            options: {validateFields: true},
            child: {_type: 'image', text: 'foo'},
            schema: compileSchema(
              defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
            ),
          }),
        ).toBe(undefined)
      })
    })
  })
})

describe('container-aware parsing', () => {
  const containerSchema = defineSchema({
    decorators: [{name: 'strong'}, {name: 'em'}],
    annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    inlineObjects: [{name: 'rootMention'}],
    blockObjects: [
      {
        name: 'tableCell',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [
              {
                type: 'block',
                decorators: [{name: 'strong'}],
                inlineObjects: [
                  {name: 'cellMention', fields: [{name: 'id', type: 'string'}]},
                ],
              },
            ],
          },
        ],
      },
    ],
  })

  test('nested span strips decorators not allowed by the container sub-schema', () => {
    const schema = compileSchema(containerSchema)
    const parsed = parseBlock({
      block: {
        _type: 'tableCell',
        _key: 'cell0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {
                _type: 'span',
                _key: 's0',
                text: 'hi',
                marks: ['strong', 'em'],
              },
            ],
          },
        ],
      },
      keyGenerator: createTestKeyGenerator(),
      options: {
        normalize: false,
        removeUnusedMarkDefs: false,
        validateFields: true,
      },
      schema,
    })

    expect(parsed).toEqual({
      _type: 'tableCell',
      _key: 'cell0',
      content: [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {
              _type: 'span',
              _key: 's0',
              text: 'hi',
              marks: ['strong'],
            },
          ],
        },
      ],
    })
  })

  test('nested inline object from root is rejected when the container declares its own list', () => {
    const schema = compileSchema(containerSchema)
    const parsed = parseBlock({
      block: {
        _type: 'tableCell',
        _key: 'cell0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'before', marks: []},
              {_type: 'rootMention', _key: 'x0'},
              {_type: 'cellMention', _key: 'x1', id: 'alice'},
              {_type: 'span', _key: 's1', text: 'after', marks: []},
            ],
          },
        ],
      },
      keyGenerator: createTestKeyGenerator(),
      options: {
        normalize: false,
        removeUnusedMarkDefs: false,
        validateFields: true,
      },
      schema,
    })

    expect(parsed).toEqual({
      _type: 'tableCell',
      _key: 'cell0',
      content: [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 's0', text: 'before', marks: []},
            {_type: 'cellMention', _key: 'x1', id: 'alice'},
            {_type: 'span', _key: 's1', text: 'after', marks: []},
          ],
        },
      ],
    })
  })

  test('nested blocks inherit annotations and lists from root when not overridden', () => {
    const schema = compileSchema(containerSchema)
    const parsed = parseBlock({
      block: {
        _type: 'tableCell',
        _key: 'cell0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            markDefs: [{_type: 'link', _key: 'L', href: 'https://example.com'}],
            children: [
              {_type: 'span', _key: 's0', text: 'linked', marks: ['L']},
            ],
          },
        ],
      },
      keyGenerator: createTestKeyGenerator(),
      options: {
        normalize: false,
        removeUnusedMarkDefs: false,
        validateFields: true,
      },
      schema,
    })

    expect(parsed).toEqual({
      _type: 'tableCell',
      _key: 'cell0',
      content: [
        {
          _type: 'block',
          _key: 'b0',
          markDefs: [{_type: 'link', _key: 'L', href: 'https://example.com'}],
          children: [{_type: 'span', _key: 's0', text: 'linked', marks: ['L']}],
        },
      ],
    })
  })
})

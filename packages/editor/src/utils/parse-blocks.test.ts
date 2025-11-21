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
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({})),
        },
        options: {
          normalize: false,
          removeUnusedMarkDefs: true,
          validateFields: true,
        },
      }),
    ).toBe(undefined)
  })

  test('undefined', () => {
    expect(
      parseBlock({
        block: undefined,
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({})),
        },
        options: {
          normalize: false,
          removeUnusedMarkDefs: true,
          validateFields: true,
        },
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
            schema: compileSchema(defineSchema({})),
          },
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
        }),
      ).toBe(undefined)
    })

    test('missing _type', () => {
      expect(
        parseBlock({
          block: {_key: 'k0'},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchema(
              defineSchema({blockObjects: [{name: 'image'}]}),
            ),
          },
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
        }),
      ).toBe(undefined)
    })

    test('missing _key', () => {
      expect(
        parseBlock({
          block: {_type: 'image'},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchema(
              defineSchema({blockObjects: [{name: 'image'}]}),
            ),
          },
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
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
            schema: compileSchema(defineSchema({})),
          },
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
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
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: {...schema, block: {...schema.block, name: 'text'}},
          },
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
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
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchema(defineSchema({})),
          },
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
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
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchema(
              defineSchema({
                inlineObjects: [{name: 'stock-ticker'}],
                decorators: [{name: 'em'}],
              }),
            ),
          },
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
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
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchema(defineSchema({lists: [{name: 'bullet'}]})),
          },
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
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
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchema(defineSchema({lists: [{name: 'bullet'}]})),
          },
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: true,
          },
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
            context: {
              keyGenerator: createTestKeyGenerator(),
              schema: compileSchema(defineSchema({})),
            },
            options: {
              normalize: false,
              removeUnusedMarkDefs: true,
              validateFields: true,
            },
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
            context: {
              keyGenerator: createTestKeyGenerator(),
              schema: compileSchema(
                defineSchema({
                  block: {fields: [{name: 'map', type: 'object'}]},
                }),
              ),
            },
            options: {
              normalize: false,
              removeUnusedMarkDefs: true,
              validateFields: true,
            },
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
            context: {
              keyGenerator: createTestKeyGenerator(),
              schema: compileSchema(
                defineSchema({
                  block: {fields: [{name: 'map', type: 'object'}]},
                }),
              ),
            },
            options: {
              normalize: false,
              removeUnusedMarkDefs: true,
              validateFields: true,
            },
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
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('null', () => {
    expect(
      parseSpan({
        span: null,
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('empty object', () => {
    expect(
      parseSpan({
        span: {},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('invalid _type', () => {
    expect(
      parseSpan({
        span: {_type: 'stock-ticker'},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('only _type', () => {
    expect(
      parseSpan({
        span: {_type: 'span'},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {validateFields: true},
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
          schema: compileSchema(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {validateFields: true},
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
          schema: compileSchema(defineSchema({})),
        },
        markDefKeyMap: new Map(),
        options: {validateFields: true},
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
          schema: compileSchema(defineSchema({decorators: [{name: 'strong'}]})),
        },
        markDefKeyMap: new Map(),
        options: {validateFields: true},
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
          schema: compileSchema(defineSchema({decorators: [{name: 'strong'}]})),
        },
        markDefKeyMap: new Map(),
        options: {validateFields: true},
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
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(
            defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
          ),
        },
        options: {validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('null', () => {
    expect(
      parseInlineObject({
        inlineObject: null,
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(
            defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
          ),
        },
        options: {validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('empty object', () => {
    expect(
      parseInlineObject({
        inlineObject: {},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(
            defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
          ),
        },
        options: {validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('invalid _type', () => {
    expect(
      parseInlineObject({
        inlineObject: {_type: 'image'},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(
            defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
          ),
        },
        options: {validateFields: true},
      }),
    ).toBe(undefined)
  })

  test('only _type', () => {
    expect(
      parseInlineObject({
        inlineObject: {_type: 'stock-ticker'},
        context: {
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchema(
            defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
          ),
        },
        options: {validateFields: true},
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
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchema(
              defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
            ),
          },
          options: {validateFields: true},
        }),
      ).toEqual({_key: 'k0', _type: 'stock-ticker'})
    })

    test('unknown inline object _type', () => {
      expect(
        parseInlineObject({
          inlineObject: {_type: 'image', text: 'foo'},
          context: {
            keyGenerator: createTestKeyGenerator(),
            schema: compileSchema(
              defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
            ),
          },
          options: {validateFields: true},
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
            context: {
              keyGenerator: createTestKeyGenerator(),
              schema: compileSchema(
                defineSchema({
                  inlineObjects: [{name: 'stock-ticker'}],
                }),
              ),
            },
            options: {validateFields: true},
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
            context: {
              keyGenerator: createTestKeyGenerator(),
              schema: compileSchema(
                defineSchema({
                  inlineObjects: [{name: 'stock-ticker'}],
                }),
              ),
            },
            options: {validateFields: false},
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
            context: {
              keyGenerator: createTestKeyGenerator(),
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
            },
            options: {validateFields: true},
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
          context: {
            keyGenerator: createTestKeyGenerator(),
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
          },
          options: {validateFields: false},
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
            context: {
              keyGenerator: createTestKeyGenerator(),
              schema: compileSchema(
                defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
              ),
            },
            markDefKeyMap: new Map(),
            options: {validateFields: true},
            child: {_type: 'stock-ticker', text: 'foo'},
          }),
        ).toEqual({_key: 'k0', _type: 'stock-ticker'})
      })

      test('unknown inline object _type', () => {
        expect(
          parseChild({
            context: {
              keyGenerator: createTestKeyGenerator(),
              schema: compileSchema(
                defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
              ),
            },
            markDefKeyMap: new Map(),
            options: {validateFields: true},
            child: {_type: 'image', text: 'foo'},
          }),
        ).toBe(undefined)
      })
    })
  })
})

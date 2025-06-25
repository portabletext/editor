import {describe, expect, test} from 'vitest'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import type {EditorSelection} from '../types/editor'
import {createTestSnapshot} from './create-test-snapshot'
import {getDragSelection} from './drag-selection'
import {createTestKeyGenerator} from './test-key-generator'

describe(getDragSelection.name, () => {
  const keyGenerator = createTestKeyGenerator()
  const foo = {
    _key: keyGenerator(),
    _type: 'block',
    children: [
      {
        _key: keyGenerator(),
        _type: 'span',
        text: 'foo',
      },
      {
        _key: keyGenerator(),
        _type: 'stock-ticker',
      },
      {
        _key: keyGenerator(),
        _type: 'span',
        text: 'bar',
      },
    ],
  }
  const fooPath = [{_key: foo._key}, 'children', {_key: foo.children[0]._key}]
  const stockTickerPath = [
    {_key: foo._key},
    'children',
    {_key: foo.children[1]._key},
  ]
  const barPath = [{_key: foo._key}, 'children', {_key: foo.children[2]._key}]
  const baz = {
    _key: keyGenerator(),
    _type: 'block',
    children: [
      {
        _key: keyGenerator(),
        _type: 'span',
        text: 'baz',
      },
    ],
  }
  const bazPath = [{_key: baz._key}, 'children', {_key: baz.children[0]._key}]
  const image = {
    _key: keyGenerator(),
    _type: 'image',
  }
  const imagePath = [{_key: image._key}]

  function snapshot(selection: EditorSelection) {
    return createTestSnapshot({
      context: {
        keyGenerator,
        schema: compileSchemaDefinition(
          defineSchema({blockObjects: [{name: 'image'}]}),
        ),
        selection,
        value: [foo, baz, image],
      },
    })
  }

  test('dragging one text block', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 0,
          },
        },
        snapshot: snapshot(null),
      }),
    ).toEqual({
      anchor: {
        path: fooPath,
        offset: 0,
      },
      focus: {
        path: barPath,
        offset: 3,
      },
    })
  })

  test('dragging one text block with an existing selection', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 3,
          },
        }),
      }),
    )
  })

  test('dragging one text block with a selection elsewhere', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: imagePath,
            offset: 0,
          },
          focus: {
            path: imagePath,
            offset: 0,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: fooPath,
        offset: 0,
      },
      focus: {
        path: barPath,
        offset: 3,
      },
    })
  })

  test('dragging one block object with a selection elsewhere', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: imagePath,
            offset: 0,
          },
          focus: {
            path: imagePath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 0,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: imagePath,
        offset: 0,
      },
      focus: {
        path: imagePath,
        offset: 0,
      },
    })
  })

  test('dragging one block object with an expanded selection elsewhere', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: imagePath,
            offset: 0,
          },
          focus: {
            path: imagePath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 1,
          },
          focus: {
            path: fooPath,
            offset: 2,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: imagePath,
        offset: 0,
      },
      focus: {
        path: imagePath,
        offset: 0,
      },
    })
  })

  test('dragging a text block with an expanded selected', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: imagePath,
            offset: 0,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: fooPath,
        offset: 0,
      },
      focus: {
        path: imagePath,
        offset: 0,
      },
    })
  })

  test('dragging two text blocks with the top drag handle', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 1,
          },
          focus: {
            path: bazPath,
            offset: 3,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: fooPath,
        offset: 0,
      },
      focus: {
        path: bazPath,
        offset: 3,
      },
    })
  })

  test('dragging two text blocks with the bottom drag handle', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: bazPath,
            offset: 0,
          },
          focus: {
            path: bazPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 1,
          },
          focus: {
            path: bazPath,
            offset: 3,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: fooPath,
        offset: 0,
      },
      focus: {
        path: bazPath,
        offset: 3,
      },
    })
  })

  test('dragging a block object with an expanded selected', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: imagePath,
            offset: 0,
          },
          focus: {
            path: imagePath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: imagePath,
            offset: 0,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: fooPath,
        offset: 0,
      },
      focus: {
        path: imagePath,
        offset: 0,
      },
    })
  })

  test('dragging inline object', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: stockTickerPath,
            offset: 0,
          },
          focus: {
            path: stockTickerPath,
            offset: 0,
          },
        },
        snapshot: snapshot(null),
      }),
    ).toEqual({
      anchor: {
        path: stockTickerPath,
        offset: 0,
      },
      focus: {
        path: stockTickerPath,
        offset: 0,
      },
    })
  })

  test('dragging inline object already selected', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: stockTickerPath,
            offset: 0,
          },
          focus: {
            path: stockTickerPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: stockTickerPath,
            offset: 0,
          },
          focus: {
            path: stockTickerPath,
            offset: 0,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: stockTickerPath,
        offset: 0,
      },
      focus: {
        path: stockTickerPath,
        offset: 0,
      },
    })
  })

  test('dragging inline object with selection elsewhere', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: stockTickerPath,
            offset: 0,
          },
          focus: {
            path: stockTickerPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 0,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: stockTickerPath,
        offset: 0,
      },
      focus: {
        path: stockTickerPath,
        offset: 0,
      },
    })
  })

  test('dragging inline object with expanded selection elsewhere', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: stockTickerPath,
            offset: 0,
          },
          focus: {
            path: stockTickerPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 3,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: stockTickerPath,
        offset: 0,
      },
      focus: {
        path: stockTickerPath,
        offset: 0,
      },
    })
  })

  test('dragging inline object in an expanded selection', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: stockTickerPath,
            offset: 0,
          },
          focus: {
            path: stockTickerPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: fooPath,
            offset: 2,
          },
          focus: {
            path: bazPath,
            offset: 2,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: stockTickerPath,
        offset: 0,
      },
      focus: {
        path: stockTickerPath,
        offset: 0,
      },
    })
  })

  test('dragging text block with inline object selected', () => {
    expect(
      getDragSelection({
        eventSelection: {
          anchor: {
            path: fooPath,
            offset: 0,
          },
          focus: {
            path: fooPath,
            offset: 0,
          },
        },
        snapshot: snapshot({
          anchor: {
            path: stockTickerPath,
            offset: 0,
          },
          focus: {
            path: stockTickerPath,
            offset: 0,
          },
        }),
      }),
    ).toEqual({
      anchor: {
        path: fooPath,
        offset: 0,
      },
      focus: {
        path: barPath,
        offset: 3,
      },
    })
  })
})

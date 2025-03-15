import {describe, expect, test} from 'vitest'
import {compileSchemaDefinition, defineSchema} from '../editor/define-schema'
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
    ],
  }
  const fooPath = [{_key: foo._key}, 'children', {_key: foo.children[0]._key}]
  const bar = {
    _key: keyGenerator(),
    _type: 'block',
    children: [
      {
        _key: keyGenerator(),
        _type: 'span',
        text: 'bar',
      },
    ],
  }
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
        value: [foo, bar, image],
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
        path: fooPath,
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
        path: fooPath,
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
})

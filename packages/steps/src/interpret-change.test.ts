import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import type {Patch} from '@portabletext/patches'
import {
  compileSchema,
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextTextBlock,
  type Schema,
  type SchemaDefinition,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {isNonArrayObject as isRecord, pathEquals} from '@portabletext/traversal'
import {makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test} from 'vitest'
import {interpretChange, mapPoint, mapRange, type Point} from './index'
import type {StepPath} from './step-mapper'

type Capture = {
  scenario: string
  seed: string
  result: string
  schema: SchemaDefinition
  seedValue: Array<PortableTextBlock>
  resultValue: Array<PortableTextBlock>
  patches: Array<Patch>
  editorPoints: Array<{point: Point}>
}

type PointTable = {
  scenario: string
  seed: string
  result: string
  rows: Array<{point: string; expected: string; backward?: string}>
}
const fixtures = join(import.meta.dirname, '../fixtures')
const captures = readdirSync(join(fixtures, 'wire-catalogue'))
  .filter((file) => file.includes('@'))
  .sort()

describe(interpretChange.name, () => {
  test('returns undefined for missing input', () => {
    const patches: Array<Patch> = []
    // @ts-expect-error Invalid input from a JavaScript caller.
    expect(interpretChange(undefined, patches)).toEqual(undefined)
  })

  test('returns undefined for null input', () => {
    const patches: Array<Patch> = []
    // @ts-expect-error Invalid input from a JavaScript caller.
    expect(interpretChange(null, patches)).toEqual(undefined)
  })

  test('returns undefined for null value', () => {
    const patches: Array<Patch> = []
    // @ts-expect-error Invalid input from a JavaScript caller.
    expect(interpretChange({value: null}, patches)).toEqual(undefined)
  })

  test('returns undefined for string value', () => {
    const patches: Array<Patch> = []
    // @ts-expect-error Invalid input from a JavaScript caller.
    expect(interpretChange({value: 'x'}, patches)).toEqual(undefined)
  })

  test("maps every captured caret through root four-block all to its reference or where the deleting editor's caret goes", () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
      caret: {anchor: Point}
      editorPoints: Array<{point: Point; editor: Point | null}>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/root-all.json'),
        'utf8',
      ),
    )
    const steps = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.seedValue,
      },
      capture.patches,
    )
    expect(steps === undefined).toEqual(false)
    for (const {point} of capture.editorPoints) {
      expect(mapPoint(steps, point)).toEqual(capture.caret.anchor)
    }
  })

  test("maps every captured caret through root four-block delete to its reference or where the deleting editor's caret goes", () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
      caret: {anchor: Point}
      editorPoints: Array<{point: Point; editor: Point | null}>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/root-delete.json'),
        'utf8',
      ),
    )
    const steps = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.seedValue,
      },
      capture.patches,
    )
    expect(steps === undefined).toEqual(false)
    for (const {point, editor} of capture.editorPoints) {
      expect(mapPoint(steps, point)).toEqual(editor ?? capture.caret.anchor)
    }
  })

  test("maps every captured caret through root four-block type to its reference or where the deleting editor's caret goes", () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
      caret: {anchor: Point}
      editorPoints: Array<{point: Point; editor: Point | null}>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/root-type.json'),
        'utf8',
      ),
    )
    const steps = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.seedValue,
      },
      capture.patches,
    )
    expect(steps === undefined).toEqual(false)
    for (const {point, editor} of capture.editorPoints) {
      expect(mapPoint(steps, point)).toEqual(editor ?? capture.caret.anchor)
    }
  })

  test("maps every captured caret through callout four-block all to its reference or where the deleting editor's caret goes", () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
      caret: {anchor: Point}
      editorPoints: Array<{point: Point; editor: Point | null}>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/callout-all.json'),
        'utf8',
      ),
    )
    const steps = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.seedValue,
      },
      capture.patches,
    )
    expect(steps === undefined).toEqual(false)
    for (const {point, editor} of capture.editorPoints) {
      expect(mapPoint(steps, point)).toEqual(editor ?? capture.caret.anchor)
    }
  })

  test("maps every captured caret through callout four-block delete to its reference or where the deleting editor's caret goes", () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
      caret: {anchor: Point}
      editorPoints: Array<{point: Point; editor: Point | null}>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/callout-delete.json'),
        'utf8',
      ),
    )
    const steps = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.seedValue,
      },
      capture.patches,
    )
    expect(steps === undefined).toEqual(false)
    for (const {point, editor} of capture.editorPoints) {
      expect(mapPoint(steps, point)).toEqual(editor ?? capture.caret.anchor)
    }
  })

  test("maps every captured caret through callout four-block type to its reference or where the deleting editor's caret goes", () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
      caret: {anchor: Point}
      editorPoints: Array<{point: Point; editor: Point | null}>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/callout-type.json'),
        'utf8',
      ),
    )
    const steps = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.seedValue,
      },
      capture.patches,
    )
    expect(steps === undefined).toEqual(false)
    for (const {point, editor} of capture.editorPoints) {
      expect(mapPoint(steps, point)).toEqual(editor ?? capture.caret.anchor)
    }
  })

  test("maps every captured caret through table four-block all to its reference or where the deleting editor's caret goes", () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
      caret: {anchor: Point}
      editorPoints: Array<{point: Point; editor: Point | null}>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/table-all.json'),
        'utf8',
      ),
    )
    const steps = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.seedValue,
      },
      capture.patches,
    )
    expect(steps === undefined).toEqual(false)
    for (const {point, editor} of capture.editorPoints) {
      expect(mapPoint(steps, point)).toEqual(editor ?? capture.caret.anchor)
    }
  })

  test("maps every captured caret through table four-block delete to its reference or where the deleting editor's caret goes", () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
      caret: {anchor: Point}
      editorPoints: Array<{point: Point; editor: Point | null}>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/table-delete.json'),
        'utf8',
      ),
    )
    const steps = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.seedValue,
      },
      capture.patches,
    )
    expect(steps === undefined).toEqual(false)
    for (const {point, editor} of capture.editorPoints) {
      expect(mapPoint(steps, point)).toEqual(editor ?? capture.caret.anchor)
    }
  })

  test("maps every captured caret through table four-block type to its reference or where the deleting editor's caret goes", () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
      caret: {anchor: Point}
      editorPoints: Array<{point: Point; editor: Point | null}>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/table-type.json'),
        'utf8',
      ),
    )
    const steps = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.seedValue,
      },
      capture.patches,
    )
    expect(steps === undefined).toEqual(false)
    for (const {point, editor} of capture.editorPoints) {
      expect(mapPoint(steps, point)).toEqual(editor ?? capture.caret.anchor)
    }
  })

  test('declines a root join with a gap in its removals', () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/root-delete.json'),
        'utf8',
      ),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.seedValue,
        },
        capture.patches.filter((_, index) => index !== 2),
      ),
    ).toEqual(undefined)
  })

  test('declines a root join with a duplicate in its removals', () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/root-delete.json'),
        'utf8',
      ),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.seedValue,
        },
        [
          ...capture.patches.slice(0, 2),
          capture.patches[1]!,
          ...capture.patches.slice(2),
        ],
      ),
    ).toEqual(undefined)
  })

  test('declines a root join with a removal before its receiver', () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/root-delete.json'),
        'utf8',
      ),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.seedValue,
        },
        [
          capture.patches[0]!,
          {
            type: 'unset',
            path: [{_key: 'k0'}],
            origin: 'local',
          },
          ...capture.patches.slice(1),
        ],
      ),
    ).toEqual(undefined)
  })

  test('declines a callout join with a gap in its removals', () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/callout-delete.json'),
        'utf8',
      ),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.seedValue,
        },
        capture.patches.filter((_, index) => index !== 2),
      ),
    ).toEqual(undefined)
  })

  test('declines a callout join with a duplicate in its removals', () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/callout-delete.json'),
        'utf8',
      ),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.seedValue,
        },
        [
          ...capture.patches.slice(0, 2),
          capture.patches[1]!,
          ...capture.patches.slice(2),
        ],
      ),
    ).toEqual(undefined)
  })

  test('declines a callout join with a removal before its receiver', () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/callout-delete.json'),
        'utf8',
      ),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.seedValue,
        },
        [
          capture.patches[0]!,
          {
            type: 'unset',
            path: [{_key: 'k12'}, 'content', {_key: 'k0'}],
            origin: 'local',
          },
          ...capture.patches.slice(1),
        ],
      ),
    ).toEqual(undefined)
  })

  test('declines a table join with a gap in its removals', () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/table-delete.json'),
        'utf8',
      ),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.seedValue,
        },
        capture.patches.filter((_, index) => index !== 2),
      ),
    ).toEqual(undefined)
  })

  test('declines a table join with a duplicate in its removals', () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/table-delete.json'),
        'utf8',
      ),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.seedValue,
        },
        [
          ...capture.patches.slice(0, 2),
          capture.patches[1]!,
          ...capture.patches.slice(2),
        ],
      ),
    ).toEqual(undefined)
  })

  test('declines a table join with a removal before its receiver', () => {
    const capture: {
      schemaDefinition: SchemaDefinition
      seedValue: Array<PortableTextBlock>
      patches: Array<Patch>
    } = JSON.parse(
      readFileSync(
        join(fixtures, 'range-delete-many-blocks/table-delete.json'),
        'utf8',
      ),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.seedValue,
        },
        [
          capture.patches[0]!,
          {
            type: 'unset',
            path: [
              {_key: 'k14'},
              'rows',
              {_key: 'k13'},
              'cells',
              {_key: 'k12'},
              'content',
              {_key: 'k0'},
            ],
            origin: 'local',
          },
          ...capture.patches.slice(1),
        ],
      ),
    ).toEqual(undefined)
  })

  test("reads each span's text a bounded number of times for select-all delete and root unset", () => {
    const keyGenerator = createTestKeyGenerator()
    let reads = 0
    const value: Array<PortableTextTextBlock> = Array.from(
      {length: 500},
      () => ({
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          new Proxy(
            {
              _key: keyGenerator(),
              _type: 'span',
              marks: [],
              text: 'foo',
            },
            {
              get(target, property, receiver) {
                if (property === 'text') {
                  reads++
                }
                return Reflect.get(target, property, receiver)
              },
            },
          ),
        ],
      }),
    )
    const patches: Array<Patch> = [
      {
        type: 'diffMatchPatch',
        path: [
          {_key: value[0]!._key},
          'children',
          {_key: value[0]!.children[0]!._key},
          'text',
        ],
        value: '@@ -1,3 +0,0 @@\n-foo\n',
      },
      ...value
        .slice(1)
        .map((block): Patch => ({type: 'unset', path: [{_key: block._key}]})),
      {type: 'unset', path: []},
    ]

    expect(interpretChange({value}, patches) === undefined).toEqual(false)
    expect(reads).toBeLessThan(value.length * 50)
  })

  for (const file of captures) {
    for (const containerField of ['content', 'children']) {
      const capture: Capture = JSON.parse(
        readFileSync(join(fixtures, 'wire-catalogue', file), 'utf8').replaceAll(
          '"content"',
          `"${containerField}"`,
        ),
      )
      const table: PointTable = JSON.parse(
        readFileSync(
          join(fixtures, 'wire-catalogue-points', `${capture.scenario}.json`),
          'utf8',
        ),
      )
      for (const affinity of ['backward', 'forward'] as const) {
        test(`keeps every ${affinity} caret valid in ${file} with ${containerField} fields`, () => {
          const schema = compileSchema(capture.schema)
          const change = interpretChange(
            {
              schema,
              value: capture.seedValue,
            },
            capture.patches,
          )
          expect(change === undefined).toEqual(false)
          const dangling: Array<Point> = []
          for (const block of textBlocks(schema, capture.seedValue)) {
            for (const child of block.node.children) {
              if (!isSpan({schema}, child)) {
                continue
              }
              for (let offset = 0; offset <= child.text.length; offset++) {
                const point = {
                  path: [...block.path, 'children', {_key: child._key}],
                  offset,
                }
                const mapped = mapPoint(change, point, {affinity})
                if (
                  location(schema, capture.resultValue, mapped) === 'dangling'
                ) {
                  dangling.push(point)
                }
              }
            }
          }
          expect(dangling).toEqual([])
        })
      }
      test(`keeps every range valid in ${file} with ${containerField} fields`, () => {
        const schema = compileSchema(capture.schema)
        const change = interpretChange(
          {
            schema,
            value: capture.seedValue,
          },
          capture.patches,
        )
        expect(change === undefined).toEqual(false)
        const points: Array<Point> = []
        for (const block of textBlocks(schema, capture.seedValue)) {
          for (const child of block.node.children) {
            if (!isSpan({schema}, child)) {
              continue
            }
            for (let offset = 0; offset <= child.text.length; offset++) {
              points.push({
                path: [...block.path, 'children', {_key: child._key}],
                offset,
              })
            }
          }
        }
        const dangling = []
        for (const anchor of points) {
          for (const focus of points) {
            if (anchor === focus) {
              continue
            }
            const mapped = mapRange(change, {
              backward: points.indexOf(anchor) > points.indexOf(focus),
              anchor,
              focus,
            })
            if (
              mapped !== null &&
              (location(schema, capture.resultValue, mapped.anchor) ===
                'dangling' ||
                location(schema, capture.resultValue, mapped.focus) ===
                  'dangling')
            ) {
              dangling.push({anchor, focus})
            }
          }
        }
        expect(dangling).toEqual([])
      })
      if (capture.scenario === 'annotation-remove') {
        test(`preserves a comment ending at the joined span's start in ${file} with ${containerField} fields`, () => {
          const schema = compileSchema(capture.schema)
          const change = interpretChange(
            {
              schema,
              value: capture.seedValue,
            },
            capture.patches,
          )
          const block = textBlocks(schema, capture.seedValue)[0]!
          const anchor = {
            path: [...block.path, 'children', {_key: 'k1'}],
            offset: 0,
          }
          const focus = {
            path: [...block.path, 'children', {_key: 'k3'}],
            offset: 0,
          }
          expect(mapRange(change, {anchor, focus})).toEqual({
            anchor,
            focus: {path: anchor.path, offset: 4},
          })
        })
      }
      if (
        /^(span-merge-cosmetic|block-merge-|annotation-remove|decorator-remove-whole-span|range-delete-|range-type-across-blocks)/.test(
          capture.scenario,
        )
      ) {
        for (const affinity of ['forward', 'backward'] as const) {
          test(`preserves surviving text positions with ${affinity} affinity in ${file} with ${containerField} fields`, () => {
            const schema = compileSchema(capture.schema)
            const change = interpretChange(
              {
                schema,
                value: capture.seedValue,
              },
              capture.patches,
            )
            for (const [blockIndex, block] of textBlocks(
              schema,
              capture.seedValue,
            ).entries()) {
              for (const [childIndex, child] of block.node.children.entries()) {
                if (!isSpan({schema}, child)) {
                  continue
                }
                for (let offset = 0; offset <= child.text.length; offset++) {
                  const expected = table.rows.find(
                    (row) =>
                      row.point === `b${blockIndex}.c${childIndex}@${offset}`,
                  )
                  if (!expected) {
                    throw new Error('Missing point table row')
                  }
                  if (expected.expected === 'null') {
                    continue
                  }
                  const point = {
                    path: [...block.path, 'children', {_key: child._key}],
                    offset,
                  }
                  const expectedLocation =
                    affinity === 'backward'
                      ? (expected.backward ?? expected.expected)
                      : expected.expected
                  expect(
                    location(
                      schema,
                      capture.resultValue,
                      mapPoint(change, point, {affinity}),
                    ),
                    expected.point,
                  ).toEqual(expectedLocation)
                }
              }
            }
          })
        }
      }
      test(`maps every caret in ${file} with ${containerField} fields`, () => {
        expect(table.scenario).toEqual(capture.scenario)
        if (file.endsWith('@root.json')) {
          expect(table.seed).toEqual(capture.seed)
          expect(table.result).toEqual(capture.result)
        }
        const schema = compileSchema(capture.schema)
        const change = interpretChange(
          {
            schema,
            value: capture.seedValue,
          },
          capture.patches,
        )
        expect(change === undefined).toEqual(false)
        const blocks = textBlocks(schema, capture.seedValue)
        for (const [blockIndex, block] of blocks.entries()) {
          for (const [childIndex, child] of block.node.children.entries()) {
            if (!isSpan({schema}, child)) {
              continue
            }
            for (let offset = 0; offset <= child.text.length; offset++) {
              const point = {
                path: [...block.path, 'children', {_key: child._key}],
                offset,
              }
              const expected = table.rows.find(
                (row) =>
                  row.point === `b${blockIndex}.c${childIndex}@${offset}`,
              )
              if (!expected) {
                throw new Error('Missing point table row')
              }
              expect(
                location(schema, capture.resultValue, mapPoint(change, point)),
              ).toEqual(expected.expected)
            }
          }
        }
      })
    }
  }

  for (const file of readdirSync(
    join(fixtures, 'wire-catalogue-received'),
  ).sort()) {
    test(`maps every received caret in ${file}`, () => {
      const capture: Capture = JSON.parse(
        readFileSync(join(fixtures, 'wire-catalogue', file), 'utf8'),
      )
      const received: {patches: Array<Patch>} = JSON.parse(
        readFileSync(join(fixtures, 'wire-catalogue-received', file), 'utf8'),
      )
      const table: PointTable = JSON.parse(
        readFileSync(
          join(fixtures, 'wire-catalogue-points', `${capture.scenario}.json`),
          'utf8',
        ),
      )
      const schema = compileSchema(capture.schema)
      const change = interpretChange(
        {
          schema,
          value: capture.seedValue,
        },
        received.patches,
      )
      expect(change === undefined).toEqual(false)
      const blocks = textBlocks(schema, capture.seedValue)
      for (const [blockIndex, block] of blocks.entries()) {
        for (const [childIndex, child] of block.node.children.entries()) {
          if (!isSpan({schema}, child)) {
            continue
          }
          for (let offset = 0; offset <= child.text.length; offset++) {
            const point = {
              path: [...block.path, 'children', {_key: child._key}],
              offset,
            }
            const expected = table.rows.find(
              (row) => row.point === `b${blockIndex}.c${childIndex}@${offset}`,
            )
            if (!expected) {
              throw new Error('Missing point table row')
            }
            expect(
              location(schema, capture.resultValue, mapPoint(change, point)),
            ).toEqual(expected.expected)
          }
        }
      }
    })
  }

  test('an unrecognized change maps every catalogue point and range to null', () => {
    for (const file of captures) {
      const capture: Capture = JSON.parse(
        readFileSync(join(fixtures, 'wire-catalogue', file), 'utf8'),
      )
      const change = interpretChange({value: capture.seedValue}, [
        {type: 'set', path: [], value: []},
      ])
      expect(change).toEqual(undefined)
      for (const {point} of capture.editorPoints) {
        expect(mapPoint(change, point)).toEqual(null)
        expect(mapRange(change, {anchor: point, focus: point})).toEqual(null)
      }
    }
  })
})

function location(
  schema: Schema,
  value: Array<PortableTextBlock>,
  point: Point | null,
): string {
  if (point === null) {
    return 'null'
  }
  for (const [blockIndex, block] of textBlocks(schema, value).entries()) {
    if (!pathEquals(point.path.slice(0, -2), block.path)) {
      continue
    }
    let textOffset = 0
    for (const child of block.node.children) {
      if (
        pathEquals(point.path, [...block.path, 'children', {_key: child._key}])
      ) {
        return isSpan({schema}, child) &&
          point.offset >= 0 &&
          point.offset <= child.text.length
          ? `b${blockIndex}@${textOffset + point.offset}`
          : 'dangling'
      }
      textOffset += isSpan({schema}, child) ? child.text.length : 1
    }
  }
  return 'dangling'
}

function textBlocks(
  schema: Schema,
  value: unknown,
  path: StepPath = [],
): Array<{path: StepPath; node: PortableTextTextBlock}> {
  if (isTextBlock({schema}, value)) {
    return [{path, node: value}]
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      isRecord(item) && typeof item['_key'] === 'string'
        ? textBlocks(schema, item, [...path, {_key: item['_key']}])
        : [],
    )
  }
  if (!isRecord(value)) {
    return []
  }
  return Object.entries(value).flatMap(([field, fieldValue]) =>
    Array.isArray(fieldValue) && field !== 'markDefs'
      ? textBlocks(schema, fieldValue, [...path, field])
      : [],
  )
}

describe('change validation', () => {
  test('keeps untouched split spans in place', () => {
    const base = [regressionBlock('foo'), regressionBlock('foo', 'k4', 'k1')]
    const change = interpretChange({value: base}, [
      {type: 'unset', path: [{_key: 'k0'}]},
      {
        type: 'insert',
        path: [{_key: 'k4'}],
        position: 'after',
        items: [regressionBlock('foo')],
      },
    ])
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k4'}, 'children', {_key: 'k1'}],
        offset: 2,
      }),
    ).toEqual({path: [{_key: 'k4'}, 'children', {_key: 'k1'}], offset: 2})
  })
  test('keeps untouched split spans in place inside children', () => {
    const base = [
      {
        _key: 'c0',
        _type: 'callout',
        children: [regressionBlock('foo'), regressionBlock('foo', 'k4', 'k1')],
      },
    ]
    const change = interpretChange({value: base}, [
      {type: 'unset', path: [{_key: 'c0'}, 'children', {_key: 'k0'}]},
      {
        type: 'insert',
        path: [{_key: 'c0'}, 'children', {_key: 'k4'}],
        position: 'after',
        items: [regressionBlock('foo')],
      },
    ])
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'c0'},
          'children',
          {_key: 'k4'},
          'children',
          {_key: 'k1'},
        ],
        offset: 2,
      }),
    ).toEqual({
      path: [{_key: 'c0'}, 'children', {_key: 'k4'}, 'children', {_key: 'k1'}],
      offset: 2,
    })
  })
  test('rejects shifted text diff on xxfoo bar baz', () => {
    expect(
      interpretChange({value: [regressionBlock('xxfoo bar baz')]}, [
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: regressionDiff('foo bar baz', 'foo bar baz foo'),
        },
      ]),
    ).toEqual(undefined)
  })
  test('rejects shifted text diff on xxfoo bar', () => {
    expect(
      interpretChange({value: [regressionBlock('xxfoo bar')]}, [
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: regressionDiff('foo bar', 'foo baz bar'),
        },
      ]),
    ).toEqual(undefined)
  })
  test('rejects a copied span after typing', () => {
    expect(
      interpretChange(
        {value: [regressionBlock('foo'), regressionBlock('bar', 'k2', 's9')]},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foo', 'fxoo'),
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}],
            position: 'after',
            items: [regressionBlock('bar', 'kN', 's9')],
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects a changed block reinsert', () => {
    expect(
      interpretChange(
        {
          value: [
            regressionBlock('foobar'),
            regressionBlock('baz', 'k2', 's2'),
          ],
        },
        [
          {type: 'unset', path: [{_key: 'k0'}]},
          {
            type: 'insert',
            path: [{_key: 'k2'}],
            position: 'after',
            items: [regressionBlock('x')],
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects a nonadjacent join', () => {
    expect(
      interpretChange(
        {
          value: [
            regressionBlock('x'),
            regressionBlock('y', 'k2', 's2'),
            regressionBlock('foo', 'k4', 's4'),
          ],
        },
        [
          {type: 'unset', path: [{_key: 'k4'}]},
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('x', 'xfoo'),
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects a different split anchor', () => {
    expect(
      interpretChange(
        {value: [regressionBlock('foobar'), regressionBlock('q', 'k2', 's2')]},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foobar', 'foo'),
          },
          {
            type: 'insert',
            path: [{_key: 'k2'}],
            position: 'after',
            items: [regressionBlock('bar', 'k9', 's9')],
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects a split before its anchor', () => {
    expect(
      interpretChange(
        {value: [regressionBlock('foobar'), regressionBlock('q', 'k2', 's2')]},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foobar', 'foo'),
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}],
            position: 'before',
            items: [regressionBlock('bar', 'k9', 's9')],
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects a different split suffix', () => {
    expect(
      interpretChange(
        {value: [regressionBlock('foobar'), regressionBlock('q', 'k2', 's2')]},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foobar', 'foo'),
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}],
            position: 'after',
            items: [regressionBlock('qux', 'k9', 's9')],
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects numeric path 0', () => {
    expect(
      interpretChange({value: [regressionBlock('foo')]}, [
        {
          type: 'diffMatchPatch',
          path: [0, 'children', 0, 'text'],
          value: regressionDiff('foo', 'Xfoo'),
        },
      ]),
    ).toEqual(undefined)
  })
  test('rejects numeric path -1', () => {
    expect(
      interpretChange({value: [regressionBlock('foo')]}, [
        {
          type: 'diffMatchPatch',
          path: [-1, 'children', -1, 'text'],
          value: regressionDiff('foo', 'Xfoo'),
        },
      ]),
    ).toEqual(undefined)
  })
  test('rejects empty span key', () => {
    expect(
      interpretChange(
        {value: [regressionBlock('foo', 'k0', '')] as Array<PortableTextBlock>},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: ''}, 'text'],
            value: regressionDiff('foo', 'foXo'),
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects empty block key', () => {
    expect(
      interpretChange(
        {value: [regressionBlock('foo', '', 'k1')] as Array<PortableTextBlock>},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: ''}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foo', 'foXo'),
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects null sibling', () => {
    expect(
      interpretChange(
        {value: [null, regressionBlock('foo')] as Array<PortableTextBlock>},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foo', 'foXo'),
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects string child', () => {
    expect(
      interpretChange(
        {
          value: [
            {
              ...regressionBlock('foo'),
              children: ['zz', regressionBlock('foo').children[0]],
            },
          ] as Array<PortableTextBlock>,
        },
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foo', 'foXo'),
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects missing key', () => {
    expect(
      interpretChange(
        {
          value: [
            {...regressionBlock('foo'), other: [{_type: 'object'}]},
          ] as Array<PortableTextBlock>,
        },
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foo', 'foXo'),
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects stale received style h2', () => {
    expect(
      interpretChange({value: [{...regressionBlock('foo'), style: 'h2'}]}, [
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'style'],
          value: regressionDiff('normal', 'h1'),
        },
      ]),
    ).toEqual(undefined)
  })
  test('rejects stale received style blockquote', () => {
    expect(
      interpretChange(
        {value: [{...regressionBlock('foo'), style: 'blockquote'}]},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'style'],
            value: regressionDiff('normal', 'h1'),
          },
        ],
      ),
    ).toEqual(undefined)
  })
  test('rejects stale received key s9', () => {
    expect(
      interpretChange({value: [regressionBlock('foo', 'k0', 's9')]}, [
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 's9'}, '_key'],
          value: '@@ -1,2 +1,2 @@\n-s1\n+k2\n',
        },
      ]),
    ).toEqual(undefined)
  })
  test('rejects stale received key zz', () => {
    expect(
      interpretChange({value: [regressionBlock('foo', 'k0', 'zz')]}, [
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'zz'}, '_key'],
          value: '@@ -1,2 +1,2 @@\n-s1\n+k2\n',
        },
      ]),
    ).toEqual(undefined)
  })
  test('rejects a received join whose carried text is stale', () => {
    const capture: Capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'wire-catalogue',
          'block-merge-duplicate-keys@root.json',
        ),
        'utf8',
      ),
    )
    const received: {patches: Array<Patch>} = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'wire-catalogue-received',
          'block-merge-duplicate-keys@root.json',
        ),
        'utf8',
      ),
    )
    const stale: Array<PortableTextBlock> = JSON.parse(
      JSON.stringify(capture.seedValue),
    )
    const block = stale.find((node) => node._key === 'kB')
    if (!isTextBlock({schema: compileSchema(capture.schema)}, block)) {
      throw new Error('Missing text block')
    }
    const span = block.children[0]
    if (!isSpan({schema: compileSchema(capture.schema)}, span)) {
      throw new Error('Missing span')
    }
    span.text = `X${span.text}`
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schema),
          value: stale,
        },
        received.patches,
      ),
    ).toEqual(undefined)
  })
  test('rejects a stale received rename in a join', () => {
    const capture: Capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'wire-catalogue',
          'block-merge-duplicate-keys@root.json',
        ),
        'utf8',
      ),
    )
    const received: {patches: Array<Patch>} = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'wire-catalogue-received',
          'block-merge-duplicate-keys@root.json',
        ),
        'utf8',
      ),
    )
    const stale = JSON.parse(
      JSON.stringify(capture.seedValue).replaceAll('"s1"', '"s9"'),
    )
    const patches = JSON.parse(
      JSON.stringify(received.patches).replaceAll('"s1"', '"s9"'),
    )
    expect(
      interpretChange(
        {
          schema: compileSchema(capture.schema),
          value: stale,
        },
        patches,
      ),
    ).toEqual(undefined)
  })
  test('merges spans in a text block declared only by a container field', () => {
    const capture: Capture = JSON.parse(
      readFileSync(
        join(fixtures, 'wire-catalogue', 'span-merge-cosmetic@root.json'),
        'utf8',
      ),
    )
    const schema = compileSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block', name: 'paragraph'}],
            },
          ],
        },
      ],
    })
    const base = [
      {
        _type: 'callout',
        _key: 'c0',
        content: capture.seedValue.map((block) => ({
          ...block,
          _type: 'paragraph',
        })),
      },
    ]
    const patches = capture.patches.map((patch) => ({
      ...patch,
      path: [{_key: 'c0'}, 'content', ...patch.path],
    }))
    const change = interpretChange({schema, value: base}, patches)
    expect(
      mapPoint(change, {
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's1'}],
        offset: 1,
      }),
    ).toEqual({
      path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 5,
    })
  })
  test('maps text blocks declared only by a container field', () => {
    const schema = compileSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block', name: 'paragraph'}],
            },
          ],
        },
      ],
    })
    const base = [
      {
        _type: 'callout',
        _key: 'c0',
        content: [{...regressionBlock('foo'), _type: 'paragraph'}],
      },
    ]
    const path = [
      {_key: 'c0'},
      'content',
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
    ]
    const change = interpretChange({schema, value: base}, [
      {
        type: 'diffMatchPatch',
        path: [...path, 'text'],
        value: regressionDiff('foo', 'Xfoo'),
      },
    ])
    expect(mapPoint(change, {path, offset: 1})).toEqual({path, offset: 2})
  })
})

describe('Unicode text diffs', () => {
  for (const text of [
    'åæø foo bar baz',
    'foo a\u0301 bar baz',
    'foo 😀 bar baz',
  ]) {
    for (const position of ['start', 'middle', 'end']) {
      test(`inserts at the ${position} of ${text}`, () => {
        const offset =
          position === 'start'
            ? 0
            : position === 'end'
              ? text.length
              : text.indexOf('bar')
        const path = [{_key: 'k0'}, 'children', {_key: 'k1'}]
        const change = interpretChange({value: [regressionBlock(text)]}, [
          {
            type: 'diffMatchPatch',
            path: [...path, 'text'],
            value: regressionDiff(
              text,
              `${text.slice(0, offset)}ø😀${text.slice(offset)}`,
            ),
          },
        ])
        expect(change).toEqual([{type: 'insert.text', path, offset, length: 3}])
        expect(mapPoint(change, {path, offset: text.length})).toEqual({
          path,
          offset: text.length + 3,
        })
      })
      test(`deletes at the ${position} of ${text}`, () => {
        const offset =
          position === 'start'
            ? 0
            : position === 'end'
              ? text.length
              : text.indexOf('bar')
        const before = `${text.slice(0, offset)}ø😀${text.slice(offset)}`
        const path = [{_key: 'k0'}, 'children', {_key: 'k1'}]
        const change = interpretChange({value: [regressionBlock(before)]}, [
          {
            type: 'diffMatchPatch',
            path: [...path, 'text'],
            value: regressionDiff(before, text),
          },
        ])
        expect(change).toEqual([{type: 'remove.text', path, offset, length: 3}])
        expect(mapPoint(change, {path, offset: before.length})).toEqual({
          path,
          offset: text.length,
        })
      })
    }
  }
  test('maps multiple hunks after Unicode insertions and deletions', () => {
    const before = 'åæø foo bar baz foo bar baz foo bar baz 😀'
    const after = 'åæø 😀foo bar baz foo bar baz foo bar baz'
    const path = [{_key: 'k0'}, 'children', {_key: 'k1'}]
    const diff = regressionDiff(before, after)
    expect(diff.split('@@').length).toEqual(5)
    const change = interpretChange({value: [regressionBlock(before)]}, [
      {type: 'diffMatchPatch', path: [...path, 'text'], value: diff},
    ])
    expect(change).toEqual([
      {type: 'insert.text', path, offset: 4, length: 2},
      {type: 'remove.text', path, offset: 41, length: 3},
    ])
    expect(mapPoint(change, {path, offset: before.length})).toEqual({
      path,
      offset: after.length,
    })
  })
  test('decodes a received string diff with Unicode on either side', () => {
    expect(
      interpretChange(
        {value: [{...regressionBlock('foo'), style: 'åæø foo bar 😀'}]},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'style'],
            value: regressionDiff('åæø foo bar 😀', 'åæø foo baz 😀'),
          },
        ],
      ),
    ).toEqual([])
  })
})

describe('primitive array data', () => {
  test('edits with a string array on another block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const base = [
      regressionBlock('foo', blockKey, spanKey),
      {_key: keyGenerator(), _type: 'image', tags: ['a', 'b']},
    ]
    expect(
      interpretChange({value: base}, [
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: regressionDiff('foo', 'foXo'),
        },
      ]),
    ).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        length: 1,
      },
    ])
  })
  test('edits with a string array on the edited block', () => {
    expect(
      interpretChange(
        {value: [{...regressionBlock('foo'), tags: ['a', 'b']}]},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foo', 'foXo'),
          },
        ],
      ),
    ).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        length: 1,
      },
    ])
  })
  test('edits with a number array', () => {
    expect(
      interpretChange(
        {value: [{...regressionBlock('foo'), coordinates: [55.6, 12.5]}]},
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foo', 'foXo'),
          },
        ],
      ),
    ).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        length: 1,
      },
    ])
  })
  test('edits with a primitive array inside an inline object', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const inlineKey = keyGenerator()
    const block = regressionBlock('foo', blockKey, spanKey)
    expect(
      interpretChange(
        {
          value: [
            {
              ...block,
              children: [
                ...block.children,
                {_key: inlineKey, _type: 'link', tags: ['a', 'b']},
              ],
            },
          ],
        },
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foo', 'foXo'),
          },
        ],
      ),
    ).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        length: 1,
      },
    ])
  })
  test('edits with a primitive array inside an annotation', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const annotationKey = keyGenerator()
    expect(
      interpretChange(
        {
          value: [
            {
              ...regressionBlock('foo', blockKey, spanKey),
              markDefs: [{_key: annotationKey, _type: 'link', rel: ['a', 'b']}],
            },
          ],
        },
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: regressionDiff('foo', 'foXo'),
          },
        ],
      ),
    ).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        length: 1,
      },
    ])
  })
})

function regressionBlock(text: string, blockKey?: string, spanKey?: string) {
  const keyGenerator = createTestKeyGenerator()
  return {
    _type: 'block',
    _key: blockKey ?? keyGenerator(),
    children: [
      {_type: 'span', _key: spanKey ?? keyGenerator(), text, marks: []},
    ],
    markDefs: [],
    style: 'normal',
  }
}

function regressionDiff(before: string, after: string) {
  return stringifyPatches(makePatches(before, after))
}

describe('editor-emitted compositional changes', () => {
  test('recognizes root control-replace type-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-control-replace-type-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k7'}], offset: 1},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k7'}], offset: 4},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k7'}], offset: 1},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k7'}], offset: 4},
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k7'}], offset: 1})
  })

  test('recognizes container control-replace type-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'container-control-replace-type-after.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k8'},
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k8'},
          ],
          offset: 4,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k8'}],
      offset: 1,
    })
  })

  test('recognizes nested control-replace type-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'nested-control-replace-type-after.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 1,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        nearest: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 4,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k9'},
      ],
      offset: 1,
    })
  })

  test('recognizes root control-new-span type-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'root-control-new-span-type-after.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 0})
  })

  test('recognizes container control-new-span type-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'container-control-new-span-type-after.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
      offset: 0,
    })
  })

  test('recognizes nested control-new-span type-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'nested-control-new-span-type-after.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k3'},
      ],
      offset: 0,
    })
  })

  test('recognizes root control select-left-type', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-control-select-left-type.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        length: 1,
      },
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        length: 1,
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container control select-left-type', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'container-control-select-left-type.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        length: 1,
      },
      {
        type: 'insert.text',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        length: 1,
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested control select-left-type', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-control-select-left-type.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 2,
        length: 1,
      },
      {
        type: 'insert.text',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 2,
        length: 1,
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('recognizes root control select-right-type', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-control-select-right-type.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
        length: 1,
      },
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 3,
        length: 1,
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 1,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 0})
  })

  test('recognizes container control select-right-type', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'container-control-select-right-type.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
        length: 1,
      },
      {
        type: 'insert.text',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 3,
        length: 1,
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 1,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
      offset: 0,
    })
  })

  test('recognizes nested control select-right-type', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'nested-control-select-right-type.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        offset: 0,
        length: 1,
      },
      {
        type: 'insert.text',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 3,
        length: 1,
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        offset: 1,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k3'},
      ],
      offset: 0,
    })
  })

  test('recognizes root middle select-left-backspace', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'root-middle-select-left-backspace.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3})
  })

  test('recognizes container middle select-left-backspace', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'container-middle-select-left-backspace.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 3,
    })
  })

  test('recognizes nested middle select-left-backspace', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'nested-middle-select-left-backspace.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        nearest: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 3,
    })
  })

  test('recognizes root control decorator-add', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-control-decorator-add.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 2,
          length: 1,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k7'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k7'}], offset: 1},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 1,
          length: 2,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 2},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 2,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 2},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 2,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 4},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 2},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 4},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k7'}],
          offset: 0,
          length: 1,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 4},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k7'}],
          offset: 1,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 5},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k7'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 4},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k7'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 5},
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 0})
  })

  test('recognizes container control decorator-add', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'container-control-decorator-add.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 2,
          length: 1,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 2,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 2,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 2,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 2,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
          length: 1,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 5,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 4,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k8'}],
        nearest: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 5,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k9'}],
      offset: 0,
    })
  })

  test('recognizes nested control decorator-add', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-control-decorator-add.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 2,
          length: 1,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 2,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 2,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 2,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 2,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        nearest: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
          length: 1,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 1,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 5,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 4,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k9'},
        ],
        nearest: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 5,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 1,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k10'},
      ],
      offset: 0,
    })
  })

  test('recognizes root control annotation-add', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-control-annotation-add.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 2,
          length: 1,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k8'}], offset: 1},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 1,
          length: 2,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k9'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k9'}], offset: 2},
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k9'}], offset: 0})
  })

  test('recognizes container control annotation-add', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'container-control-annotation-add.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 2,
          length: 1,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k9'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 2,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k10'}],
      offset: 0,
    })
  })

  test('recognizes nested control annotation-add', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-control-annotation-add.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 2,
          length: 1,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k10'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k11'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k11'},
          ],
          offset: 2,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 1,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k11'},
      ],
      offset: 0,
    })
  })

  test('recognizes root control insert-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-control-insert-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container control insert-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'container-control-insert-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested control insert-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-control-insert-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('recognizes root merge-control delete-child', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-merge-control-delete-child.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        offset: 0,
        length: 3,
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 2,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5})
  })

  test('recognizes container merge-control delete-child', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'container-merge-control-delete-child.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k2'}],
        offset: 0,
        length: 3,
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 2,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 5,
    })
  })

  test('recognizes nested merge-control delete-child', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'nested-merge-control-delete-child.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k2'},
        ],
        offset: 0,
        length: 3,
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        nearest: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        offset: 2,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 5,
    })
  })

  test('recognizes root control enter-before', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-control-enter-before.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {path: [{_key: 'k7'}, 'children', {_key: 'k3'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k7'}, 'children', {_key: 'k3'}], offset: 3},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k7'}, 'children', {_key: 'k1'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k7'}, 'children', {_key: 'k3'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k7'}, 'children', {_key: 'k3'}], offset: 0})
  })

  test('recognizes container control enter-before', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'container-control-enter-before.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k8'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k8'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k8'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k8'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k8'}, 'children', {_key: 'k3'}],
      offset: 0,
    })
  })

  test('recognizes nested control enter-before', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-control-enter-before.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k9'},
        'children',
        {_key: 'k3'},
      ],
      offset: 0,
    })
  })

  test('recognizes root end enter-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-end-enter-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container end enter-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'container-end-enter-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested end enter-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-end-enter-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('recognizes root control paste-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-control-paste-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 3,
        length: 3,
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container control paste-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'container-control-paste-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 3,
        length: 3,
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested control paste-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-control-paste-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'insert.text',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 3,
        length: 3,
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('recognizes root paste-multiblock undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-root-paste-multiblock-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
        length: 3,
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k15'}, 'children', {_key: 'k13'}],
          offset: 3,
          length: 2,
        },
        to: {path: [{_key: 'k15'}, 'children', {_key: 'k14'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k15'}, 'children', {_key: 'k13'}],
          offset: 5,
          length: 0,
        },
        to: {path: [{_key: 'k15'}, 'children', {_key: 'k14'}], offset: 2},
      },
      {
        type: 'remove.text',
        path: [{_key: 'k15'}, 'children', {_key: 'k13'}],
        offset: 0,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [{_key: 'k15'}, 'children', {_key: 'k16'}],
        nearest: {path: [{_key: 'k15'}, 'children', {_key: 'k13'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k15'}, 'children', {_key: 'k14'}],
          offset: 0,
          length: 2,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k14'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k15'}, 'children', {_key: 'k14'}],
          offset: 2,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k14'}], offset: 2},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k15'}, 'children', {_key: 'k14'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k14'}], offset: 0},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k15'}, 'children', {_key: 'k14'}],
        nearest: {path: [{_key: 'k3'}, 'children', {_key: 'k4'}], offset: 0},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k15'}],
        nearest: {path: [{_key: 'k3'}, 'children', {_key: 'k4'}], offset: 0},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k13'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k14'}],
          offset: 0,
          length: 2,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k14'}],
          offset: 2,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k14'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k14'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k15'}, 'children', {_key: 'k13'}],
        offset: 3,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1})
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 4,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1})
  })

  test('recognizes container paste-multiblock undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-container-paste-multiblock-undo.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
        length: 3,
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k16'},
            'children',
            {_key: 'k14'},
          ],
          offset: 3,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k16'},
            'children',
            {_key: 'k15'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k16'},
            'children',
            {_key: 'k14'},
          ],
          offset: 5,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k16'},
            'children',
            {_key: 'k15'},
          ],
          offset: 2,
        },
      },
      {
        type: 'remove.text',
        path: [
          {_key: 'k7'},
          'content',
          {_key: 'k16'},
          'children',
          {_key: 'k14'},
        ],
        offset: 0,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k7'},
          'content',
          {_key: 'k16'},
          'children',
          {_key: 'k17'},
        ],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k16'},
            'children',
            {_key: 'k14'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k16'},
            'children',
            {_key: 'k15'},
          ],
          offset: 0,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k15'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k16'},
            'children',
            {_key: 'k15'},
          ],
          offset: 2,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k15'},
          ],
          offset: 2,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k16'},
            'children',
            {_key: 'k15'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k15'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k7'},
          'content',
          {_key: 'k16'},
          'children',
          {_key: 'k15'},
        ],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k7'}, 'content', {_key: 'k16'}],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k14'},
        ],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k15'},
          ],
          offset: 0,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k15'},
          ],
          offset: 2,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k15'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k15'},
        ],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k7'},
          'content',
          {_key: 'k16'},
          'children',
          {_key: 'k14'},
        ],
        offset: 3,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 1,
    })
    expect(
      mapPoint(change, {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 4,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 1,
    })
  })

  test('recognizes nested paste-multiblock undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-nested-paste-multiblock-undo.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 1,
        length: 3,
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k17'},
            'children',
            {_key: 'k15'},
          ],
          offset: 3,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k17'},
            'children',
            {_key: 'k16'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k17'},
            'children',
            {_key: 'k15'},
          ],
          offset: 5,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k17'},
            'children',
            {_key: 'k16'},
          ],
          offset: 2,
        },
      },
      {
        type: 'remove.text',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k17'},
          'children',
          {_key: 'k15'},
        ],
        offset: 0,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k17'},
          'children',
          {_key: 'k18'},
        ],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k17'},
            'children',
            {_key: 'k15'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k17'},
            'children',
            {_key: 'k16'},
          ],
          offset: 0,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k16'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k17'},
            'children',
            {_key: 'k16'},
          ],
          offset: 2,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k16'},
          ],
          offset: 2,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k17'},
            'children',
            {_key: 'k16'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k16'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k17'},
          'children',
          {_key: 'k16'},
        ],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k8'}, 'content', {_key: 'k7'}, 'content', {_key: 'k17'}],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k15'},
        ],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k16'},
          ],
          offset: 0,
          length: 2,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k16'},
          ],
          offset: 2,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k16'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k16'},
        ],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k17'},
          'children',
          {_key: 'k15'},
        ],
        offset: 3,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 1,
    })
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 4,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 1,
    })
  })

  test('recognizes root cut undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-root-cut-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 1,
          length: 1,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k6'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 2,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k6'}], offset: 1},
      },
      {
        type: 'move.node',
        from: [{_key: 'k0'}, 'children', {_key: 'k6'}],
        to: [{_key: 'k5'}, 'children', {_key: 'k6'}],
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k6'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      },
      {
        type: 'insert.text',
        path: [{_key: 'k5'}, 'children', {_key: 'k6'}],
        offset: 0,
        length: 2,
      },
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
        length: 2,
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
      }),
    ).toEqual({path: [{_key: 'k5'}, 'children', {_key: 'k6'}], offset: 2})
  })

  test('recognizes container cut undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-container-cut-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
          length: 1,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k6'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 2,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k6'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.node',
        from: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k6'}],
        to: [{_key: 'k7'}, 'content', {_key: 'k5'}, 'children', {_key: 'k6'}],
      },
      {
        type: 'remove.node',
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k6'}],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
      {
        type: 'insert.text',
        path: [{_key: 'k7'}, 'content', {_key: 'k5'}, 'children', {_key: 'k6'}],
        offset: 0,
        length: 2,
      },
      {
        type: 'insert.text',
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
        length: 2,
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k5'}, 'children', {_key: 'k6'}],
      offset: 2,
    })
  })

  test('recognizes nested cut undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-nested-cut-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
          length: 1,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k6'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 2,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k6'},
          ],
          offset: 1,
        },
      },
      {
        type: 'move.node',
        from: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k6'},
        ],
        to: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k5'},
          'children',
          {_key: 'k6'},
        ],
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k6'},
        ],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
      {
        type: 'insert.text',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k5'},
          'children',
          {_key: 'k6'},
        ],
        offset: 0,
        length: 2,
      },
      {
        type: 'insert.text',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 1,
        length: 2,
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 1,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k5'},
        'children',
        {_key: 'k6'},
      ],
      offset: 2,
    })
  })

  test('recognizes root image-insert edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-root-image-insert-edit.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container image-insert edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-container-image-insert-edit.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested image-insert edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-nested-image-insert-edit.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('recognizes root image-api-delete edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-image-api-delete-edit.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.node',
        path: [{_key: 'k2'}],
        nearest: {path: [{_key: 'k3'}, 'children', {_key: 'k4'}], offset: 0},
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container image-api-delete edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'container-image-api-delete-edit.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.node',
        path: [{_key: 'k7'}, 'content', {_key: 'k2'}],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested image-api-delete edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-image-api-delete-edit.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.node',
        path: [{_key: 'k8'}, 'content', {_key: 'k7'}, 'content', {_key: 'k2'}],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('recognizes root list edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-root-list-edit.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container list edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-container-list-edit.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested list edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-nested-list-edit.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('recognizes root text-block-insert edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-root-text-block-insert-edit.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container text-block-insert edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-container-text-block-insert-edit.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested text-block-insert edit', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-nested-text-block-insert-edit.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('recognizes root list undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-list-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container list undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'container-list-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested list undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-list-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('recognizes root text-block-insert undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-text-block-insert-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.node',
        path: [{_key: 'k9'}],
        nearest: {path: [{_key: 'k3'}, 'children', {_key: 'k4'}], offset: 0},
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container text-block-insert undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'container-text-block-insert-undo.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.node',
        path: [{_key: 'k7'}, 'content', {_key: 'k10'}],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested text-block-insert undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-text-block-insert-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.node',
        path: [{_key: 'k8'}, 'content', {_key: 'k7'}, 'content', {_key: 'k11'}],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
      },
    ])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('collapses root cleared ranges and maps removed carets to the retained span', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-root-select-all-delete-edit.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(
      mapRange(change, {
        anchor: {path: [{_key: 'k3'}, 'children', {_key: 'k4'}], offset: 0},
        focus: {path: [{_key: 'k3'}, 'children', {_key: 'k4'}], offset: 3},
      }),
    ).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
    })
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'children', {_key: 'k6'}],
        offset: 1,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [{_key: 'k3'}],
        nearest: {path: [{_key: 'k5'}, 'children', {_key: 'k6'}], offset: 0},
      },
      {
        type: 'remove.text',
        path: [{_key: 'k5'}, 'children', {_key: 'k6'}],
        offset: 0,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [{_key: 'k5'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      },
    ])
  })

  test('collapses container cleared ranges and maps removed carets to the retained span', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-container-select-all-delete-edit.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(
      mapRange(change, {
        anchor: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 3,
        },
      }),
    ).toEqual({
      anchor: {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      },
    })
    expect(
      mapPoint(change, {
        path: [{_key: 'k7'}, 'content', {_key: 'k5'}, 'children', {_key: 'k6'}],
        offset: 1,
      }),
    ).toEqual({
      path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k7'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [{_key: 'k7'}, 'content', {_key: 'k3'}],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.text',
        path: [{_key: 'k7'}, 'content', {_key: 'k5'}, 'children', {_key: 'k6'}],
        offset: 0,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [{_key: 'k7'}, 'content', {_key: 'k5'}],
        nearest: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
      },
    ])
  })

  test('collapses nested cleared ranges and maps removed carets to the retained span', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-nested-select-all-delete-edit.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(
      mapRange(change, {
        anchor: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 3,
        },
      }),
    ).toEqual({
      anchor: {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      },
    })
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k5'},
          'children',
          {_key: 'k6'},
        ],
        offset: 1,
      }),
    ).toEqual({
      path: [
        {_key: 'k8'},
        'content',
        {_key: 'k7'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [{_key: 'k8'}, 'content', {_key: 'k7'}, 'content', {_key: 'k3'}],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.text',
        path: [
          {_key: 'k8'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k5'},
          'children',
          {_key: 'k6'},
        ],
        offset: 0,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [{_key: 'k8'}, 'content', {_key: 'k7'}, 'content', {_key: 'k5'}],
        nearest: {
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
      },
    ])
  })

  test('recognizes root end delete-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-end-delete-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('recognizes container end delete-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'container-end-delete-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      }),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('recognizes nested end delete-after', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-end-delete-after.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([])
    expect(
      mapPoint(change, {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 0,
      }),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 0,
    })
  })

  test('keeps the inline object selected through root Enter undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'root-inline-enter-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(
      mapRange(change, {
        anchor: {path: [{_key: 'k7'}, 'children', {_key: 'k2'}], offset: 0},
        focus: {path: [{_key: 'k7'}, 'children', {_key: 'k3'}], offset: 0},
      }),
    ).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 0},
    })
    expect(change).toEqual([
      {
        type: 'move.node',
        from: [{_key: 'k7'}, 'children', {_key: 'k2'}],
        to: [{_key: 'k0'}, 'children', {_key: 'k2'}],
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k7'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k7'}, 'children', {_key: 'k3'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 3},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k7'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 0},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k7'}, 'children', {_key: 'k3'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 0},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k7'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 0},
      },
    ])
  })

  test('keeps the inline object selected through container Enter undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'container-inline-enter-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(
      mapRange(change, {
        anchor: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k8'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k8'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      }),
    ).toEqual({
      anchor: {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k2'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k3'}],
        offset: 0,
      },
    })
    expect(change).toEqual([
      {
        type: 'move.node',
        from: [{_key: 'k5'}, 'content', {_key: 'k8'}, 'children', {_key: 'k2'}],
        to: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k2'}],
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k8'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k8'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k8'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k5'}, 'content', {_key: 'k8'}, 'children', {_key: 'k3'}],
        nearest: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k5'}, 'content', {_key: 'k8'}],
        nearest: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
    ])
  })

  test('keeps the inline object selected through nested Enter undo', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'nested-inline-enter-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(
      mapRange(change, {
        anchor: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      }),
    ).toEqual({
      anchor: {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k2'},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k3'},
        ],
        offset: 0,
      },
    })
    expect(change).toEqual([
      {
        type: 'move.node',
        from: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k9'},
          'children',
          {_key: 'k2'},
        ],
        to: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k2'},
        ],
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 3,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k9'},
          'children',
          {_key: 'k3'},
        ],
        nearest: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
      {
        type: 'remove.node',
        path: [{_key: 'k6'}, 'content', {_key: 'k5'}, 'content', {_key: 'k9'}],
        nearest: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
    ])
  })

  test('recognizes the edit after a root clear', () => {
    const change = interpretChange(
      {
        value: [
          {
            _key: 'k0',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k1', _type: 'span', marks: [], text: ''}],
          },
        ],
      },
      [
        {type: 'setIfMissing', path: [], value: [], origin: 'local'},
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [
            {
              _key: 'k0',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k1', _type: 'span', marks: [], text: ''}],
            },
          ],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -0,0 +1 @@\n+x\n',
          origin: 'local',
        },
      ],
    )
    expect(change).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
        length: 1,
      },
    ])
    expect(
      mapRange(change, {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      }),
    ).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
    })
  })

  test('collapses deleted paste text in the surviving span at root', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-root-control-paste-after-undo.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 3,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k9'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
    ])
    expect(
      mapPoint(
        change,
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        {affinity: 'forward'},
      ),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3})
    expect(
      mapPoint(
        change,
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        {affinity: 'backward'},
      ),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3})
    expect(
      mapPoint(
        change,
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        {affinity: 'forward'},
      ),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3})
    expect(
      mapPoint(
        change,
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        {affinity: 'backward'},
      ),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3})
  })
  test('collapses deleted paste text in the surviving span at container', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-container-control-paste-after-undo.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 3,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k10'},
        ],
        nearest: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
    ])
    expect(
      mapPoint(
        change,
        {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
        {affinity: 'forward'},
      ),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 3,
    })
    expect(
      mapPoint(
        change,
        {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
        {affinity: 'backward'},
      ),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 3,
    })
    expect(
      mapPoint(
        change,
        {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
        {affinity: 'forward'},
      ),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 3,
    })
    expect(
      mapPoint(
        change,
        {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
        {affinity: 'backward'},
      ),
    ).toEqual({
      path: [{_key: 'k5'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 3,
    })
  })
  test('collapses deleted paste text in the surviving span at nested', () => {
    const capture = JSON.parse(
      readFileSync(
        join(
          fixtures,
          'compositional',
          'fold-nested-control-paste-after-undo.json',
        ),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 3,
        length: 3,
      },
      {
        type: 'remove.node',
        path: [
          {_key: 'k6'},
          'content',
          {_key: 'k5'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k11'},
        ],
        nearest: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      },
    ])
    expect(
      mapPoint(
        change,
        {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
        {affinity: 'forward'},
      ),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 3,
    })
    expect(
      mapPoint(
        change,
        {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
        {affinity: 'backward'},
      ),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 3,
    })
    expect(
      mapPoint(
        change,
        {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
        {affinity: 'forward'},
      ),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 3,
    })
    expect(
      mapPoint(
        change,
        {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
        {affinity: 'backward'},
      ),
    ).toEqual({
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 3,
    })
  })

  test('follows cut-undo text into the surviving destination at root', () => {
    const capture = JSON.parse(
      readFileSync(
        join(fixtures, 'compositional', 'fold-root-cut-undo.json'),
        'utf8',
      ),
    )
    const change = interpretChange(
      {
        schema: compileSchema(capture.schemaDefinition),
        value: capture.before,
      },
      capture.patches,
    )
    expect(
      mapPoint(
        change,
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        {affinity: 'forward'},
      ),
    ).toEqual({path: [{_key: 'k5'}, 'children', {_key: 'k6'}], offset: 3})
    expect(
      mapPoint(
        change,
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        {affinity: 'backward'},
      ),
    ).toEqual({path: [{_key: 'k5'}, 'children', {_key: 'k6'}], offset: 3})
  })
})

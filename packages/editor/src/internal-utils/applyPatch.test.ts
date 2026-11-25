import {diffMatchPatch, unset, type Patch} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {inTestChange} from '../engine/core/change.test-utils'
import {createEditor} from '../engine/create-editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {createApplyPatch} from './applyPatch'

describe(createApplyPatch.name, () => {
  describe('unset', () => {
    test('an `unset` of a range on a value that is not an array changes nothing', () => {
      const {editor, blockKey, spanKey} = createFooEditor()

      expect(
        applyPatch(editor, unset([{_key: blockKey}, 'style', [0, '']])),
      ).toEqual(false)
      expect(editor.snapshot.context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('diffMatchPatch', () => {
    test('a `diffMatchPatch` on a string outside span text whose hunks match in part changes the string', () => {
      const {editor, blockKey, spanKey} = createFooEditor()

      expect(
        applyPatch(editor, {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'style'],
          value:
            '@@ -1,6 +1,2 @@\n-normal\n+h1\n@@ -1,15 +1,15 @@\n baz baz ba\n-z\n+r\n  baz\n',
        }),
      ).toEqual(true)
      expect(editor.snapshot.context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'h1',
        },
      ])
    })

    test('a stale `diffMatchPatch` on a string outside span text changes nothing', () => {
      const {editor, blockKey, spanKey} = createFooEditor()

      expect(
        applyPatch(
          editor,
          diffMatchPatch('baz baz baz baz', 'baz baz bar baz', [
            {_key: blockKey},
            'style',
          ]),
        ),
      ).toEqual(false)
      expect(editor.snapshot.context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('a `diffMatchPatch` without changes on a string outside span text changes nothing', () => {
      const {editor, blockKey, spanKey} = createFooEditor()

      expect(
        applyPatch(
          editor,
          diffMatchPatch('normal', 'normal', [{_key: blockKey}, 'style']),
        ),
      ).toEqual(false)
      expect(editor.snapshot.context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})

function applyPatch(editor: PortableTextEditorEngine, patch: Patch) {
  const apply = createApplyPatch({
    schema: editor.snapshot.context.schema,
    keyGenerator: editor.snapshot.context.keyGenerator,
    initialValue: undefined,
  })
  let changed: boolean | undefined

  inTestChange(editor, () => {
    changed = apply(editor, patch)
  })

  return changed
}

function createFooEditor() {
  const keyGenerator = createTestKeyGenerator()
  const block = createBlock(keyGenerator, 'foo')
  const schema = compileSchema(defineSchema({}))
  const snapshot = createTestSnapshot({
    context: {schema, keyGenerator, value: [block]},
  })
  const editor = createEditor() as PortableTextEditorEngine

  editor.containers = new Map()
  editor.blockIndexMap = new Map(snapshot.blockIndexMap)
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    ...snapshot,
    blockIndexMap: editor.blockIndexMap,
  } as PortableTextEditorEngine['snapshot']

  return {
    editor,
    keyGenerator,
    blockKey: block._key,
    spanKey: block.children[0]!._key,
  }
}

function createBlock(keyGenerator: () => string, text: string) {
  return {
    _type: 'block',
    _key: keyGenerator(),
    children: [{_type: 'span', _key: keyGenerator(), text, marks: []}],
    markDefs: [],
    style: 'normal',
  } satisfies PortableTextBlock
}

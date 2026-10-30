import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {withRemoteChanges} from '../../engine-plugins/engine-plugin.remote-changes'
import {buildIndexMaps} from '../../internal-utils/build-index-maps'
import {serializePath} from '../../paths/serialize-path'
import {resolveContainers} from '../../schema/resolve-containers-batch'
import type {PortableTextEditorEngine} from '../../types/editor-engine'
import {createEditor} from '../create-editor'
import {applyOperation} from './apply-operation'
import {inTestChange} from './change.test-utils'

describe(applyOperation.name, () => {
  describe('set on a node property', () => {
    test('an object set on the node path replaces the whole node', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', alt: 'foo'},
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: imageKey}],
          value: {_key: imageKey, _type: 'image', title: 'bar'},
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', title: 'bar'},
      ])
    })

    test('a non-object set on the node path changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', alt: 'foo'},
      ])

      inTestChange(editor, () =>
        editor.apply({type: 'set', path: [{_key: imageKey}], value: 'bar'}),
      )
      inTestChange(editor, () =>
        editor.apply({type: 'set', path: [{_key: imageKey}], value: ['bar']}),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', alt: 'foo'},
      ])
    })

    test('a single property segment replaces the property', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', alt: 'foo'},
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: imageKey}, 'alt'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', alt: 'bar'},
      ])
    })

    test('two property segments set the field inside the nested object and keep its siblings', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', asset: {ref: 'foo', title: 'baz'}},
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: imageKey}, 'asset', 'ref'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', asset: {ref: 'bar', title: 'baz'}},
      ])
    })

    test('three property segments set the field two objects deep and keep the siblings on every level', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {
          _key: imageKey,
          _type: 'image',
          asset: {ref: 'foo', crop: {top: 1, left: 2}},
        },
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: imageKey}, 'asset', 'crop', 'top'],
          value: 3,
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          asset: {ref: 'foo', crop: {top: 3, left: 2}},
        },
      ])
    })

    test('a block index segment sets the field on the block at that index', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const otherImageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image'},
        {_key: otherImageKey, _type: 'image', asset: {ref: 'foo'}},
      ])

      inTestChange(editor, () =>
        editor.apply({type: 'set', path: [1, 'asset', 'ref'], value: 'bar'}),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image'},
        {_key: otherImageKey, _type: 'image', asset: {ref: 'bar'}},
      ])
    })

    test('missing intermediate objects are created on every level', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([{_key: imageKey, _type: 'image'}])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: imageKey}, 'asset', 'crop', 'top'],
          value: 3,
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', asset: {crop: {top: 3}}},
      ])
    })

    test('primitive and null intermediates are replaced by objects', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', asset: 'foo', meta: {crop: null}},
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: imageKey}, 'asset', 'ref'],
          value: 'bar',
        }),
      )
      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: imageKey}, 'meta', 'crop', 'top'],
          value: 3,
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          asset: {ref: 'bar'},
          meta: {crop: {top: 3}},
        },
      ])
    })

    test('an array intermediate is spread into an object with index keys', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', meta: {tags: ['foo', 'bar']}},
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: imageKey}, 'meta', 'tags', 'baz'],
          value: true,
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          meta: {tags: {0: 'foo', 1: 'bar', baz: true}},
        },
      ])
    })
  })

  describe('set on a path the node walk cannot reach', () => {
    test('a keyed markDefs path is applied on the root block', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}, 'href'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'bar'}),
      ])
    })

    test('an indexed array path is applied on the root block', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', hotspots: [{x: 1}, {x: 2}]},
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: imageKey}, 'hotspots', 1, 'x'],
          value: 3,
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', hotspots: [{x: 1}, {x: 3}]},
      ])
    })

    test('a path through a missing field on the root block changes nothing instead of creating the field', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [
            {_key: blockKey},
            'markDefs',
            {_key: markDefKey},
            'meta',
            'title',
          ],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })

    test('a path that does not start with a block segment changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: ['markDefs', {_key: markDefKey}, 'href'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })

    test('a block key that is not in the value changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const missingKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: missingKey}, 'markDefs', {_key: markDefKey}, 'href'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })

    test('a block index past the end changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [1, 'markDefs', 0, 'href'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })

    test('a negative block index with no block behind it changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [-2, 'markDefs', 0, 'href'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })
  })

  describe('unset on a node property', () => {
    test('a single property segment removes the property', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', alt: 'foo', title: 'bar'},
      ])

      inTestChange(editor, () =>
        editor.apply({type: 'unset', path: [{_key: imageKey}, 'alt']}),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', title: 'bar'},
      ])
    })

    test('two property segments remove the field inside the nested object and keep its siblings', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', asset: {ref: 'foo', title: 'baz'}},
      ])

      inTestChange(editor, () =>
        editor.apply({type: 'unset', path: [{_key: imageKey}, 'asset', 'ref']}),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', asset: {title: 'baz'}},
      ])
    })

    test('three property segments remove the field two objects deep and keep the siblings on every level', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {
          _key: imageKey,
          _type: 'image',
          asset: {ref: 'foo', crop: {top: 1, left: 2}},
        },
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'unset',
          path: [{_key: imageKey}, 'asset', 'crop', 'top'],
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', asset: {ref: 'foo', crop: {left: 2}}},
      ])
    })

    test('a block index segment removes the field on the block at that index', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const otherImageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', asset: {ref: 'foo'}},
        {_key: otherImageKey, _type: 'image', asset: {ref: 'foo'}},
      ])

      inTestChange(editor, () =>
        editor.apply({type: 'unset', path: [1, 'asset', 'ref']}),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', asset: {ref: 'foo'}},
        {_key: otherImageKey, _type: 'image', asset: {}},
      ])
    })

    test('a missing key changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', asset: {ref: 'foo'}},
      ])

      inTestChange(editor, () =>
        editor.apply({type: 'unset', path: [{_key: imageKey}, 'alt']}),
      )
      inTestChange(editor, () =>
        editor.apply({
          type: 'unset',
          path: [{_key: imageKey}, 'asset', 'crop', 'top'],
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', asset: {ref: 'foo'}},
      ])
    })

    test('a remote unset of a missing key changes nothing on any depth', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', asset: {ref: 'foo', crop: 'bar'}},
      ])

      inTestChange(editor, () =>
        withRemoteChanges(editor, 'patches', () => {
          editor.apply({type: 'unset', path: [{_key: imageKey}, 'alt']})
          editor.apply({
            type: 'unset',
            path: [{_key: imageKey}, 'asset', 'title'],
          })
          editor.apply({
            type: 'unset',
            path: [{_key: imageKey}, 'meta', 'title'],
          })
          editor.apply({
            type: 'unset',
            path: [{_key: imageKey}, 'asset', 'crop', 'top'],
          })
          editor.apply({
            type: 'unset',
            path: [{_key: imageKey}, 'asset', 'meta', 'title'],
          })
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', asset: {ref: 'foo', crop: 'bar'}},
      ])
    })

    test('an array intermediate is spread into an object with index keys', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', meta: {tags: ['foo', 'bar']}},
      ])

      inTestChange(editor, () =>
        withRemoteChanges(editor, 'patches', () => {
          editor.apply({
            type: 'unset',
            path: [{_key: imageKey}, 'meta', 'tags', 'baz'],
          })
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', meta: {tags: {0: 'foo', 1: 'bar'}}},
      ])
    })
  })

  describe('unset on a path the node walk cannot reach', () => {
    test('a keyed markDefs path is applied on the root block', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'unset',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}, 'href'],
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {
          ...textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
          markDefs: [{_key: markDefKey, _type: 'link'}],
        },
      ])
    })

    test('an indexed array path is applied on the root block', () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image', hotspots: [{x: 1}, {x: 2, y: 3}]},
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'unset',
          path: [{_key: imageKey}, 'hotspots', 1, 'x'],
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image', hotspots: [{x: 1}, {y: 3}]},
      ])
    })

    test('a path that does not start with a block segment changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        withRemoteChanges(editor, 'patches', () => {
          editor.apply({
            type: 'unset',
            path: ['markDefs', {_key: markDefKey}, 'href'],
          })
        }),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })

    test('a block key that is not in the value changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const missingKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        withRemoteChanges(editor, 'patches', () => {
          editor.apply({
            type: 'unset',
            path: [{_key: missingKey}, 'markDefs', {_key: markDefKey}, 'href'],
          })
        }),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })

    test('a negative block index with no block behind it changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        withRemoteChanges(editor, 'patches', () => {
          editor.apply({type: 'unset', path: [-2, 'markDefs', 0, 'href']})
        }),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })
  })

  describe('sidecar array members', () => {
    test('an insert into markDefs is applied on the root block', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const newMarkDefKey = keyGenerator()
      const editor = createBareEditor([
        {
          ...textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'foo',
              marks: [markDefKey, newMarkDefKey],
            },
          ],
        },
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'insert',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}],
          position: 'after',
          node: {_key: newMarkDefKey, _type: 'link', href: 'bar'},
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          style: 'normal',
          markDefs: [
            {_key: markDefKey, _type: 'link', href: 'foo'},
            {_key: newMarkDefKey, _type: 'link', href: 'bar'},
          ],
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'foo',
              marks: [markDefKey, newMarkDefKey],
            },
          ],
        },
      ])
    })

    test('a set of a span mark by index is applied on the root block', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        {
          ...textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'foo',
              marks: [markDefKey, 'em'],
            },
          ],
        },
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks', 1],
          value: 'strong',
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {
          ...textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'foo',
              marks: [markDefKey, 'strong'],
            },
          ],
        },
      ])
    })

    test('an unset of a markDefs member is applied on the root block', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'unset',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}],
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {
          ...textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
          markDefs: [],
        },
      ])
    })

    test('a path that does not start with a block segment changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        editor.apply({type: 'unset', path: ['markDefs', {_key: markDefKey}]}),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })

    test('a block key that is not in the value changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const missingKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        editor.apply({
          type: 'unset',
          path: [{_key: missingKey}, 'markDefs', {_key: markDefKey}],
        }),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })

    test('a negative block index with no block behind it changes nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      const value = editor.snapshot.context.value

      inTestChange(editor, () =>
        editor.apply({type: 'unset', path: [-2, 'markDefs', 0]}),
      )

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })
  })

  describe('child resolution', () => {
    test('a keyed sibling segment resolves the sibling through the index map', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const newSpanKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          position: 'before',
          node: {_key: newSpanKey, _type: 'span', text: 'bar', marks: []},
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {
          ...textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
          children: [
            {_key: newSpanKey, _type: 'span', text: 'bar', marks: []},
            {_key: spanKey, _type: 'span', text: 'foo', marks: [markDefKey]},
          ],
        },
      ])
    })

    test('a keyed child segment falls back to a scan when the index map points elsewhere', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const otherSpanKey = keyGenerator()
      const editor = createBareEditor([
        {
          ...textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
          children: [
            {_key: otherSpanKey, _type: 'span', text: 'bar', marks: []},
            {_key: spanKey, _type: 'span', text: 'foo', marks: [markDefKey]},
          ],
        },
      ])
      editor.blockIndexMap.set(
        serializePath([{_key: blockKey}, 'children', {_key: spanKey}]),
        0,
      )

      inTestChange(editor, () =>
        withRemoteChanges(editor, 'patches', () => {
          editor.apply({
            type: 'unset',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
          })
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {
          ...textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
          children: [
            {_key: otherSpanKey, _type: 'span', text: 'bar', marks: []},
          ],
        },
      ])
    })

    test('a keyed sibling segment that is not there throws', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const missingKey = keyGenerator()
      const newSpanKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      expect(() =>
        inTestChange(editor, () =>
          editor.apply({
            type: 'insert',
            path: [{_key: blockKey}, 'children', {_key: missingKey}],
            position: 'after',
            node: {_key: newSpanKey, _type: 'span', text: 'bar', marks: []},
          }),
        ),
      ).toThrow(
        `Cannot apply an "insert" operation at path [_key=="k0"].children[_key=="k3"] because the sibling was not found.`,
      )
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })

    test('a keyed child segment that is not there throws on removal', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const missingKey = keyGenerator()
      const editor = createBareEditor([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      expect(() =>
        inTestChange(editor, () =>
          editor.apply({
            type: 'unset',
            path: [{_key: blockKey}, 'children', {_key: missingKey}],
          }),
        ),
      ).toThrow(
        `Cannot apply an "unset" (node removal) operation at path [_key=="k0"].children[_key=="k3"] because the node was not found.`,
      )
      expect(editor.snapshot.context.value).toEqual([
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
    })
  })

  describe('root block resolution', () => {
    test('a block index segment resolves the block at that index', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image'},
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [1, 'markDefs', 0, 'href'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image'},
        textBlock({blockKey, spanKey, markDefKey, href: 'bar'}),
      ])
    })

    test('a keyed block segment resolves the block through the index map', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image'},
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}, 'href'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image'},
        textBlock({blockKey, spanKey, markDefKey, href: 'bar'}),
      ])
    })

    test('a keyed block segment falls back to a scan when the index map points elsewhere', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const markDefKey = keyGenerator()
      const imageKey = keyGenerator()
      const editor = createBareEditor([
        {_key: imageKey, _type: 'image'},
        textBlock({blockKey, spanKey, markDefKey, href: 'foo'}),
      ])
      editor.blockIndexMap.set(serializePath([{_key: blockKey}]), 0)

      inTestChange(editor, () =>
        editor.apply({
          type: 'set',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}, 'href'],
          value: 'bar',
        }),
      )

      expect(editor.snapshot.context.value).toEqual([
        {_key: imageKey, _type: 'image'},
        textBlock({blockKey, spanKey, markDefKey, href: 'bar'}),
      ])
    })
  })
})

function textBlock({
  blockKey,
  spanKey,
  markDefKey,
  href,
}: {
  blockKey: string
  spanKey: string
  markDefKey: string
  href: string
}): PortableTextBlock {
  return {
    _key: blockKey,
    _type: 'block',
    style: 'normal',
    markDefs: [{_key: markDefKey, _type: 'link', href}],
    children: [
      {_key: spanKey, _type: 'span', text: 'foo', marks: [markDefKey]},
    ],
  }
}

function createBareEditor(
  value: Array<PortableTextBlock>,
): PortableTextEditorEngine {
  const schema = compileSchema(
    defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      blockObjects: [{name: 'image'}],
      decorators: [{name: 'strong'}, {name: 'em'}],
    }),
  )
  const editor = createEditor() as PortableTextEditorEngine
  const containers = resolveContainers(schema, [])
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps({schema, containers, value}, {blockIndexMap})

  editor.containers = new Map()
  editor.blockIndexMap = blockIndexMap
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap,
    context: {
      containers,
      converters: [],
      keyGenerator: createTestKeyGenerator('generated-'),
      readOnly: false,
      schema,
      selection: null,
      value,
    },
    decoratorState: {},
  } as PortableTextEditorEngine['snapshot']

  return editor
}

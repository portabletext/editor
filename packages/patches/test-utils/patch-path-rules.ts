import type {Patch} from '../src/types'

/**
 * Patch path rules measured against Sanity (API version
 * `v2025-02-19`) on 2026-11-05. Sanity is the reference: each row records
 * the array before the patch, a patch whose path is relative to that array,
 * and either the array Sanity produced or the message it rejected the
 * mutation with. Sanity's outcome is the same with the array at the root, in
 * a container, in a container in a container and in a block object's field.
 */
export const patchPathRules: Array<PatchPathRule> = [
  {
    id: 'index--1-set',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [-1], value: block('replacement', 'baz')},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('replacement', 'baz'),
      ],
    },
  },
  {
    id: 'index--1-unset',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [-1]},
    sanity: {result: [block('block-a'), block('block-b', 'bar')]},
  },
  {
    id: 'index--1-insert-before',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [-1],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('replacement', 'baz'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--1-insert-after',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [-1],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
        block('replacement', 'baz'),
      ],
    },
  },
  {
    id: 'index--1-insert-replace',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [-1],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('replacement', 'baz'),
      ],
    },
  },
  {
    id: 'index--1-inc',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [-1, 'count'], value: 2},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz', {count: 6}),
      ],
    },
  },
  {
    id: 'index--1-dec',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [-1, 'count'], value: 2},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz', {count: 2}),
      ],
    },
  },
  {
    id: 'index--1-dmp',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [-1, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'bazd'),
      ],
    },
  },
  {
    id: 'index--2-set',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [-2], value: block('replacement', 'baz')},
    sanity: {
      result: [
        block('block-a'),
        block('replacement', 'baz'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--2-unset',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [-2]},
    sanity: {result: [block('block-a'), block('block-c', 'baz')]},
  },
  {
    id: 'index--2-insert-before',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [-2],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('replacement', 'baz'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--2-insert-after',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [-2],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('replacement', 'baz'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--2-insert-replace',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [-2],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('replacement', 'baz'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--2-inc',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [-2, 'count'], value: 2},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar', {count: 6}),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--2-dec',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [-2, 'count'], value: 2},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar', {count: 2}),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--2-dmp',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [-2, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bard'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--4-set',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [-4], value: block('replacement', 'baz')},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--4-unset',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [-4]},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--4-insert-before',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [-4],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--4-insert-after',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [-4],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--4-insert-replace',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [-4],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index--4-inc',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [-4, 'count'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[-4].count" because it is not present',
    },
  },
  {
    id: 'index--4-dec',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [-4, 'count'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[-4].count" because it is not present',
    },
  },
  {
    id: 'index--4-dmp',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [-4, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-0-set',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [0], value: block('replacement', 'baz')},
    sanity: {
      result: [
        block('replacement', 'baz'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-0-unset',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [0]},
    sanity: {result: [block('block-b', 'bar'), block('block-c', 'baz')]},
  },
  {
    id: 'index-0-insert-before',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('replacement', 'baz'),
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-0-insert-after',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [0],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('replacement', 'baz'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-0-insert-replace',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [0],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('replacement', 'baz'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-0-inc',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [0, 'count'], value: 2},
    sanity: {
      result: [
        block('block-a', 'foo', {count: 6}),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-0-dec',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [0, 'count'], value: 2},
    sanity: {
      result: [
        block('block-a', 'foo', {count: 2}),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-0-dmp',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [0, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a', 'food'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-2-set',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [2], value: block('replacement', 'baz')},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('replacement', 'baz'),
      ],
    },
  },
  {
    id: 'index-2-unset',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [2]},
    sanity: {result: [block('block-a'), block('block-b', 'bar')]},
  },
  {
    id: 'index-2-insert-before',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [2],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('replacement', 'baz'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-2-insert-after',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [2],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
        block('replacement', 'baz'),
      ],
    },
  },
  {
    id: 'index-2-insert-replace',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [2],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('replacement', 'baz'),
      ],
    },
  },
  {
    id: 'index-2-inc',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [2, 'count'], value: 2},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz', {count: 6}),
      ],
    },
  },
  {
    id: 'index-2-dec',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [2, 'count'], value: 2},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz', {count: 2}),
      ],
    },
  },
  {
    id: 'index-2-dmp',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [2, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'bazd'),
      ],
    },
  },
  {
    id: 'index-3-set',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [3], value: block('replacement', 'baz')},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-3-unset',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [3]},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-3-insert-before',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [3],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-3-insert-after',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [3],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-3-insert-replace',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [3],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-3-inc',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [3, 'count'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[3].count" because it is not present',
    },
  },
  {
    id: 'index-3-dec',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [3, 'count'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[3].count" because it is not present',
    },
  },
  {
    id: 'index-3-dmp',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [3, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-8-set',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [8], value: block('replacement', 'baz')},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-8-unset',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [8]},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-8-insert-before',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [8],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-8-insert-after',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [8],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-8-insert-replace',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [8],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'index-8-inc',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [8, 'count'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[8].count" because it is not present',
    },
  },
  {
    id: 'index-8-dec',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [8, 'count'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[8].count" because it is not present',
    },
  },
  {
    id: 'index-8-dmp',
    rule: 'numeric-index',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [8, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'absent-set',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'set',
      path: [{_key: 'absent'}],
      value: block('replacement', 'baz'),
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'absent-property-set',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [{_key: 'absent'}, 'status'], value: 'baz'},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'absent-unset',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [{_key: 'absent'}]},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'absent-property-unset',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [{_key: 'absent'}, 'status']},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'absent-insert-before',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [{_key: 'absent'}],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'absent-insert-after',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [{_key: 'absent'}],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'absent-insert-replace',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [{_key: 'absent'}],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'absent-inc',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [{_key: 'absent'}, 'count'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[_key==\\"absent\\"].count" because it is not present',
    },
  },
  {
    id: 'absent-dec',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [{_key: 'absent'}, 'count'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[_key==\\"absent\\"].count" because it is not present',
    },
  },
  {
    id: 'absent-dmp',
    rule: 'key-selector',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [{_key: 'absent'}, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'duplicate-set',
    rule: 'key-selector',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {
      type: 'set',
      path: [{_key: 'duplicate'}],
      value: block('replacement', 'baz'),
    },
    sanity: {
      result: [
        block('replacement', 'baz'),
        block('replacement', 'baz'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'duplicate-property-set',
    rule: 'key-selector',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {type: 'set', path: [{_key: 'duplicate'}, 'status'], value: 'baz'},
    sanity: {
      result: [
        block('duplicate', 'foo', {status: 'baz'}),
        block('duplicate', 'bar', {status: 'baz'}),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'duplicate-unset',
    rule: 'key-selector',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {type: 'unset', path: [{_key: 'duplicate'}]},
    sanity: {result: [block('block-c', 'baz')]},
  },
  {
    id: 'duplicate-property-unset',
    rule: 'key-selector',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {type: 'unset', path: [{_key: 'duplicate'}, 'status']},
    sanity: {
      result: [
        block('duplicate'),
        block('duplicate', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'duplicate-insert-before',
    rule: 'key-selector',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {
      type: 'insert',
      path: [{_key: 'duplicate'}],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('replacement', 'baz'),
        block('duplicate'),
        block('duplicate', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'duplicate-insert-after',
    rule: 'key-selector',
    defect:
      'Sanity inserts after the first match and overwrites that match with the last match',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {
      type: 'insert',
      path: [{_key: 'duplicate'}],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('duplicate', 'bar'),
        block('replacement', 'baz'),
        block('duplicate', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'duplicate-insert-replace',
    rule: 'key-selector',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {
      type: 'insert',
      path: [{_key: 'duplicate'}],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('replacement', 'baz'),
        block('replacement', 'baz'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'duplicate-inc',
    rule: 'key-selector',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {type: 'inc', path: [{_key: 'duplicate'}, 'count'], value: 2},
    sanity: {
      result: [
        block('duplicate', 'foo', {count: 6}),
        block('duplicate', 'bar', {count: 6}),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'duplicate-dec',
    rule: 'key-selector',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {type: 'dec', path: [{_key: 'duplicate'}, 'count'], value: 2},
    sanity: {
      result: [
        block('duplicate', 'foo', {count: 2}),
        block('duplicate', 'bar', {count: 2}),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'duplicate-dmp',
    rule: 'key-selector',
    start: [
      block('duplicate'),
      block('duplicate', 'bar'),
      block('block-c', 'baz'),
    ],
    patch: {
      type: 'diffMatchPatch',
      path: [{_key: 'duplicate'}, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('duplicate', 'food'),
        block('duplicate', 'bard'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'insert-before-1',
    rule: 'insert-position',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [{_key: 'block-b'}],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('replacement', 'baz'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'insert-before-3',
    rule: 'insert-position',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [{_key: 'block-b'}],
      position: 'before',
      items: [
        block('replacement', 'baz'),
        block('insert-two'),
        block('insert-three'),
      ],
    },
    sanity: {
      result: [
        block('block-a'),
        block('replacement', 'baz'),
        block('insert-two'),
        block('insert-three'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'insert-after-1',
    rule: 'insert-position',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [{_key: 'block-b'}],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('replacement', 'baz'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'insert-after-3',
    rule: 'insert-position',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [{_key: 'block-b'}],
      position: 'after',
      items: [
        block('replacement', 'baz'),
        block('insert-two'),
        block('insert-three'),
      ],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('replacement', 'baz'),
        block('insert-two'),
        block('insert-three'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'insert-replace-1',
    rule: 'insert-position',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [{_key: 'block-b'}],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('replacement', 'baz'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'insert-replace-3',
    rule: 'insert-position',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'insert',
      path: [{_key: 'block-b'}],
      position: 'replace',
      items: [
        block('replacement', 'baz'),
        block('insert-two'),
        block('insert-three'),
      ],
    },
    sanity: {
      result: [
        block('block-a'),
        block('replacement', 'baz'),
        block('insert-two'),
        block('insert-three'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'empty-0-before',
    rule: 'empty-array-insert',
    start: [],
    patch: {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('replacement', 'baz')]},
  },
  {
    id: 'empty-0-after',
    rule: 'empty-array-insert',
    start: [],
    patch: {
      type: 'insert',
      path: [0],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('replacement', 'baz')]},
  },
  {
    id: 'empty-0-replace',
    rule: 'empty-array-insert',
    start: [],
    patch: {
      type: 'insert',
      path: [0],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('replacement', 'baz')]},
  },
  {
    id: 'empty--1-before',
    rule: 'empty-array-insert',
    start: [],
    patch: {
      type: 'insert',
      path: [-1],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('replacement', 'baz')]},
  },
  {
    id: 'empty--1-after',
    rule: 'empty-array-insert',
    start: [],
    patch: {
      type: 'insert',
      path: [-1],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('replacement', 'baz')]},
  },
  {
    id: 'empty--1-replace',
    rule: 'empty-array-insert',
    start: [],
    patch: {
      type: 'insert',
      path: [-1],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('replacement', 'baz')]},
  },
  {
    id: 'missing-direct-set',
    rule: 'missing-field',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [0, 'missing'], value: 'baz'},
    sanity: {
      result: [
        block('block-a', 'foo', {missing: 'baz'}),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'missing-direct-unset',
    rule: 'missing-field',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [0, 'missing']},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'missing-direct-setIfMissing',
    rule: 'missing-field',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'setIfMissing', path: [0, 'missing'], value: 'baz'},
    sanity: {
      result: [
        block('block-a', 'foo', {missing: 'baz'}),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'missing-direct-inc',
    rule: 'missing-field',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [0, 'missing'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].missing" because it is not present',
    },
  },
  {
    id: 'missing-direct-dec',
    rule: 'missing-field',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [0, 'missing'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].missing" because it is not present',
    },
  },
  {
    id: 'missing-intermediate-set',
    rule: 'missing-intermediate',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [0, 'analysis', 'status'], value: 'baz'},
    sanity: {
      result: [
        block('block-a', 'foo', {analysis: {status: 'baz'}}),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'missing-intermediate-unset',
    rule: 'missing-intermediate',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [0, 'analysis', 'status']},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'missing-intermediate-setIfMissing',
    rule: 'missing-intermediate',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'setIfMissing',
      path: [0, 'analysis', 'status'],
      value: 'baz',
    },
    sanity: {
      result: [
        block('block-a', 'foo', {analysis: {status: 'baz'}}),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'missing-intermediate-inc',
    rule: 'missing-intermediate',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'inc', path: [0, 'analysis', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].analysis.status" because it is not present',
    },
  },
  {
    id: 'missing-intermediate-dec',
    rule: 'missing-intermediate',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'dec', path: [0, 'analysis', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].analysis.status" because it is not present',
    },
  },
  {
    id: 'array-empty-setIfMissing',
    rule: 'setIfMissing',
    start: [],
    patch: {
      type: 'setIfMissing',
      path: [],
      value: [block('replacement', 'baz')],
    },
    sanity: {result: []},
  },
  {
    id: 'array-nonempty-setIfMissing',
    rule: 'setIfMissing',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'setIfMissing',
      path: [],
      value: [block('replacement', 'baz')],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'present-null-setIfMissing',
    rule: 'setIfMissing',
    start: [block('block-a', 'foo', {target: null})],
    patch: {type: 'setIfMissing', path: [0, 'target'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: 'baz'})]},
  },
  {
    id: 'present-"foo"-setIfMissing',
    rule: 'setIfMissing',
    start: [block('block-a', 'foo', {target: 'foo'})],
    patch: {type: 'setIfMissing', path: [0, 'target'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: 'foo'})]},
  },
  {
    id: 'present-4-setIfMissing',
    rule: 'setIfMissing',
    start: [block('block-a', 'foo', {target: 4})],
    patch: {type: 'setIfMissing', path: [0, 'target'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: 4})]},
  },
  {
    id: 'present-[]-setIfMissing',
    rule: 'setIfMissing',
    start: [block('block-a', 'foo', {target: []})],
    patch: {type: 'setIfMissing', path: [0, 'target'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: []})]},
  },
  {
    id: 'present-{}-setIfMissing',
    rule: 'setIfMissing',
    start: [block('block-a', 'foo', {target: {}})],
    patch: {type: 'setIfMissing', path: [0, 'target'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {}})]},
  },
  {
    id: 'primitive-null-deep-set',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: null})],
    patch: {type: 'set', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-null-deep-unset',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: null})],
    patch: {type: 'unset', path: [0, 'target', 'status']},
    sanity: {result: [block('block-a', 'foo', {target: null})]},
  },
  {
    id: 'primitive-null-deep-setIfMissing',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: null})],
    patch: {type: 'setIfMissing', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-null-deep-inc',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: null})],
    patch: {type: 'inc', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'primitive-null-deep-dec',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: null})],
    patch: {type: 'dec', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'primitive-"foo"-deep-set',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 'foo'})],
    patch: {type: 'set', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-"foo"-deep-unset',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 'foo'})],
    patch: {type: 'unset', path: [0, 'target', 'status']},
    sanity: {result: [block('block-a', 'foo', {target: 'foo'})]},
  },
  {
    id: 'primitive-"foo"-deep-setIfMissing',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 'foo'})],
    patch: {type: 'setIfMissing', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-"foo"-deep-inc',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 'foo'})],
    patch: {type: 'inc', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'primitive-"foo"-deep-dec',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 'foo'})],
    patch: {type: 'dec', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'primitive-4-deep-set',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 4})],
    patch: {type: 'set', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-4-deep-unset',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 4})],
    patch: {type: 'unset', path: [0, 'target', 'status']},
    sanity: {result: [block('block-a', 'foo', {target: 4})]},
  },
  {
    id: 'primitive-4-deep-setIfMissing',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 4})],
    patch: {type: 'setIfMissing', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-4-deep-inc',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 4})],
    patch: {type: 'inc', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'primitive-4-deep-dec',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: 4})],
    patch: {type: 'dec', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'primitive-[]-deep-set',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: []})],
    patch: {type: 'set', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-[]-deep-unset',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: []})],
    patch: {type: 'unset', path: [0, 'target', 'status']},
    sanity: {result: [block('block-a', 'foo', {target: []})]},
  },
  {
    id: 'primitive-[]-deep-setIfMissing',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: []})],
    patch: {type: 'setIfMissing', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-[]-deep-inc',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: []})],
    patch: {type: 'inc', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'primitive-[]-deep-dec',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: []})],
    patch: {type: 'dec', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'primitive-{}-deep-set',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: {}})],
    patch: {type: 'set', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-{}-deep-unset',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: {}})],
    patch: {type: 'unset', path: [0, 'target', 'status']},
    sanity: {result: [block('block-a', 'foo', {target: {}})]},
  },
  {
    id: 'primitive-{}-deep-setIfMissing',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: {}})],
    patch: {type: 'setIfMissing', path: [0, 'target', 'status'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {target: {status: 'baz'}})]},
  },
  {
    id: 'primitive-{}-deep-inc',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: {}})],
    patch: {type: 'inc', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'primitive-{}-deep-dec',
    rule: 'primitive-path',
    start: [block('block-a', 'foo', {target: {}})],
    patch: {type: 'dec', path: [0, 'target', 'status'], value: 2},
    sanity: {
      rejected:
        'Mutation failed: Cannot increment "body[0].target.status" because it is not present',
    },
  },
  {
    id: 'missing-span-dmp',
    rule: 'missing-span',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [0, 'children', {_key: 'absent'}, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-number-compact-set',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [0, 0, 'text'], value: 'baz'},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-number-compact-unset',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [0, 0, 'text']},
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-number-compact-diffMatchPatch',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [0, 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-number-explicit-set',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'set', path: [0, 'children', 0, 'text'], value: 'baz'},
    sanity: {
      result: [
        block('block-a', 'baz'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-number-explicit-unset',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {type: 'unset', path: [0, 'children', 0, 'text']},
    sanity: {
      result: [
        {
          _key: 'block-a',
          _type: 'block',
          children: [{_key: 'block-a-span', _type: 'span', marks: []}],
          count: 4,
          markDefs: [],
          style: 'normal',
        },
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-number-explicit-diffMatchPatch',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [0, 'children', 0, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a', 'food'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-object-compact-set',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'set',
      path: [{_key: 'block-a'}, {_key: 'block-a-span'}, 'text'],
      value: 'baz',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-object-compact-unset',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'unset',
      path: [{_key: 'block-a'}, {_key: 'block-a-span'}, 'text'],
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-object-compact-diffMatchPatch',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [{_key: 'block-a'}, {_key: 'block-a-span'}, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-object-explicit-set',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'set',
      path: [{_key: 'block-a'}, 'children', {_key: 'block-a-span'}, 'text'],
      value: 'baz',
    },
    sanity: {
      result: [
        block('block-a', 'baz'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-object-explicit-unset',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'unset',
      path: [{_key: 'block-a'}, 'children', {_key: 'block-a-span'}, 'text'],
    },
    sanity: {
      result: [
        {
          _key: 'block-a',
          _type: 'block',
          children: [{_key: 'block-a-span', _type: 'span', marks: []}],
          count: 4,
          markDefs: [],
          style: 'normal',
        },
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'path-object-explicit-diffMatchPatch',
    rule: 'compact-path',
    start: [block('block-a'), block('block-b', 'bar'), block('block-c', 'baz')],
    patch: {
      type: 'diffMatchPatch',
      path: [{_key: 'block-a'}, 'children', {_key: 'block-a-span'}, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+d\n',
    },
    sanity: {
      result: [
        block('block-a', 'food'),
        block('block-b', 'bar'),
        block('block-c', 'baz'),
      ],
    },
  },
  {
    id: 'nested-array-set',
    rule: 'nested-array',
    start: [
      block('block-a', 'foo', {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }),
    ],
    patch: {type: 'set', path: [0, 'matrix', 0, 1], value: 9},
    sanity: {
      result: [
        block('block-a', 'foo', {
          matrix: [
            [1, 9],
            [3, 4],
          ],
        }),
      ],
    },
  },
  {
    id: 'nested-array-unset',
    rule: 'nested-array',
    start: [
      block('block-a', 'foo', {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }),
    ],
    patch: {type: 'unset', path: [0, 'matrix', 0, 1]},
    sanity: {result: [block('block-a', 'foo', {matrix: [[1], [3, 4]]})]},
  },
  {
    id: 'nested-array-inc',
    rule: 'nested-array',
    start: [
      block('block-a', 'foo', {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }),
    ],
    patch: {type: 'inc', path: [0, 'matrix', 0, 1], value: 9},
    sanity: {
      result: [
        block('block-a', 'foo', {
          matrix: [
            [1, 11],
            [3, 4],
          ],
        }),
      ],
    },
  },
  {
    id: 'nested-array-dec',
    rule: 'nested-array',
    start: [
      block('block-a', 'foo', {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }),
    ],
    patch: {type: 'dec', path: [0, 'matrix', 0, 1], value: 9},
    sanity: {
      result: [
        block('block-a', 'foo', {
          matrix: [
            [1, -7],
            [3, 4],
          ],
        }),
      ],
    },
  },
  {
    id: 'nested-array-setIfMissing',
    rule: 'nested-array',
    start: [
      block('block-a', 'foo', {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }),
    ],
    patch: {type: 'setIfMissing', path: [0, 'matrix', 0, 1], value: 9},
    sanity: {
      result: [
        block('block-a', 'foo', {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        }),
      ],
    },
  },
  {
    id: 'nested-array-insert-before',
    rule: 'nested-array',
    start: [
      block('block-a', 'foo', {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }),
    ],
    patch: {
      type: 'insert',
      path: [0, 'matrix', 0, 1],
      position: 'before',
      items: [8, 9],
    },
    sanity: {
      result: [
        block('block-a', 'foo', {
          matrix: [
            [1, 8, 9, 2],
            [3, 4],
          ],
        }),
      ],
    },
  },
  {
    id: 'nested-array-insert-after',
    rule: 'nested-array',
    start: [
      block('block-a', 'foo', {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }),
    ],
    patch: {
      type: 'insert',
      path: [0, 'matrix', 0, 1],
      position: 'after',
      items: [8, 9],
    },
    sanity: {
      result: [
        block('block-a', 'foo', {
          matrix: [
            [1, 2, 8, 9],
            [3, 4],
          ],
        }),
      ],
    },
  },
  {
    id: 'nested-array-insert-replace',
    rule: 'nested-array',
    start: [
      block('block-a', 'foo', {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }),
    ],
    patch: {
      type: 'insert',
      path: [0, 'matrix', 0, 1],
      position: 'replace',
      items: [8, 9],
    },
    sanity: {
      result: [
        block('block-a', 'foo', {
          matrix: [
            [1, 8, 9],
            [3, 4],
          ],
        }),
      ],
    },
  },
  {
    id: 'null-0-set',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {type: 'set', path: [0], value: block('replacement', 'baz')},
    sanity: {result: [block('replacement', 'baz'), block('block-a')]},
  },
  {
    id: 'null-0-unset',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {type: 'unset', path: [0]},
    sanity: {result: [block('block-a')]},
  },
  {
    id: 'null-0-setIfMissing',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {
      type: 'setIfMissing',
      path: [0],
      value: block('replacement', 'baz'),
    },
    sanity: {result: [block('replacement', 'baz'), block('block-a')]},
  },
  {
    id: 'null-0-deep-set',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {type: 'set', path: [0, 'status'], value: 'baz'},
    sanity: {result: [null, block('block-a')]},
  },
  {
    id: 'null-0-deep-unset',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {type: 'unset', path: [0, 'status']},
    sanity: {result: [null, block('block-a')]},
  },
  {
    id: 'null-0-key-set',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {type: 'set', path: [{_key: 'block-a'}, 'style'], value: 'baz'},
    sanity: {result: [null, block('block-a', 'foo', {style: 'baz'})]},
  },
  {
    id: 'null-0-key-unset',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {type: 'unset', path: [{_key: 'block-a'}, 'style']},
    sanity: {
      result: [
        null,
        {
          _key: 'block-a',
          _type: 'block',
          children: [
            {_key: 'block-a-span', _type: 'span', marks: [], text: 'foo'},
          ],
          count: 4,
          markDefs: [],
        },
      ],
    },
  },
  {
    id: 'null-0-insert-before',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('replacement', 'baz'), null, block('block-a')]},
  },
  {
    id: 'null-0-insert-after',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {
      type: 'insert',
      path: [0],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [null, block('replacement', 'baz'), block('block-a')]},
  },
  {
    id: 'null-0-insert-replace',
    rule: 'null-array-items',
    start: [null, block('block-a')],
    patch: {
      type: 'insert',
      path: [0],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('replacement', 'baz'), block('block-a')]},
  },
  {
    id: 'null-1-set',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {type: 'set', path: [1], value: block('replacement', 'baz')},
    sanity: {result: [block('block-a'), block('replacement', 'baz')]},
  },
  {
    id: 'null-1-unset',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {type: 'unset', path: [1]},
    sanity: {result: [block('block-a')]},
  },
  {
    id: 'null-1-setIfMissing',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {
      type: 'setIfMissing',
      path: [1],
      value: block('replacement', 'baz'),
    },
    sanity: {result: [block('block-a'), block('replacement', 'baz')]},
  },
  {
    id: 'null-1-deep-set',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {type: 'set', path: [1, 'status'], value: 'baz'},
    sanity: {result: [block('block-a'), null]},
  },
  {
    id: 'null-1-deep-unset',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {type: 'unset', path: [1, 'status']},
    sanity: {result: [block('block-a'), null]},
  },
  {
    id: 'null-1-key-set',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {type: 'set', path: [{_key: 'block-a'}, 'style'], value: 'baz'},
    sanity: {result: [block('block-a', 'foo', {style: 'baz'}), null]},
  },
  {
    id: 'null-1-key-unset',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {type: 'unset', path: [{_key: 'block-a'}, 'style']},
    sanity: {
      result: [
        {
          _key: 'block-a',
          _type: 'block',
          children: [
            {_key: 'block-a-span', _type: 'span', marks: [], text: 'foo'},
          ],
          count: 4,
          markDefs: [],
        },
        null,
      ],
    },
  },
  {
    id: 'null-1-insert-before',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {
      type: 'insert',
      path: [1],
      position: 'before',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('block-a'), block('replacement', 'baz'), null]},
  },
  {
    id: 'null-1-insert-after',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {
      type: 'insert',
      path: [1],
      position: 'after',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('block-a'), null, block('replacement', 'baz')]},
  },
  {
    id: 'null-1-insert-replace',
    rule: 'null-array-items',
    start: [block('block-a'), null],
    patch: {
      type: 'insert',
      path: [1],
      position: 'replace',
      items: [block('replacement', 'baz')],
    },
    sanity: {result: [block('block-a'), block('replacement', 'baz')]},
  },
]

export type PatchPathRule = {
  id: string
  rule:
    | 'numeric-index'
    | 'key-selector'
    | 'insert-position'
    | 'empty-array-insert'
    | 'missing-field'
    | 'missing-intermediate'
    | 'setIfMissing'
    | 'primitive-path'
    | 'missing-span'
    | 'compact-path'
    | 'nested-array'
    | 'null-array-items'
  start: Array<Value>
  patch: Patch
  sanity: {result: Array<Value>} | {rejected: string}
  /**
   * Set when Sanity's measured outcome is a defect that the packages must not
   * copy. The row keeps what Sanity does so the defect stays visible.
   */
  defect?: string
}

type Value =
  | null
  | boolean
  | number
  | string
  | Array<Value>
  | {[key: string]: Value}

function block<Fields extends {[key: string]: Value} = Record<never, never>>(
  key: string,
  text = 'foo',
  fields?: Fields,
) {
  return {
    _key: key,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_key: `${key}-span`, _type: 'span', marks: [], text}],
    count: 4,
    ...fields,
  }
}

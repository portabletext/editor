import {describe, expect, test} from 'vitest'
import {buildOverrides} from './overrides'

describe('buildOverrides', () => {
  test('maps each packed package to a file: spec pointing at its tarball', () => {
    const tarballs = new Map([
      ['@portabletext/editor', '/tmp/tarballs/portabletext-editor-8.1.5.tgz'],
      ['@portabletext/schema', '/tmp/tarballs/portabletext-schema-3.0.0.tgz'],
    ])
    expect(buildOverrides(tarballs)).toEqual({
      '@portabletext/editor':
        'file:/tmp/tarballs/portabletext-editor-8.1.5.tgz',
      '@portabletext/schema':
        'file:/tmp/tarballs/portabletext-schema-3.0.0.tgz',
    })
  })

  test('is empty for an empty closure', () => {
    expect(buildOverrides(new Map())).toEqual({})
  })
})

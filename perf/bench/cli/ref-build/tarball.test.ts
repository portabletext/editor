import {describe, expect, test} from 'vitest'
import {tarballFilename} from './tarball'

describe('tarballFilename', () => {
  test('drops the scope and replaces the slash with a dash', () => {
    expect(tarballFilename('@portabletext/editor', '8.1.5')).toBe(
      'portabletext-editor-8.1.5.tgz',
    )
  })

  test('leaves an unscoped package name untouched', () => {
    expect(tarballFilename('racejar', '3.0.0')).toBe('racejar-3.0.0.tgz')
  })
})

import {describe, expect, test} from 'vitest'
import {localhostPort, prefixedPageUrl} from './page-url.ts'

describe(prefixedPageUrl.name, () => {
  test('a bare origin gets the path Chrome reports for it', () => {
    expect(prefixedPageUrl('http://localhost:8765', 'x')).toEqual(
      'http://localhost:8765/?prefix=x',
    )
  })

  test('the prefix goes in the query, before the fragment', () => {
    expect(
      prefixedPageUrl('http://localhost:8765/editor.html#field', 'x'),
    ).toEqual('http://localhost:8765/editor.html?prefix=x#field')
  })

  test('an existing query keeps its parameters and the fragment stays last', () => {
    expect(
      prefixedPageUrl('http://localhost:8765/editor.html?mode=a#field', 'あ'),
    ).toEqual('http://localhost:8765/editor.html?mode=a&prefix=%E3%81%82#field')
  })

  test('an existing prefix is replaced', () => {
    expect(
      prefixedPageUrl('http://localhost:8765/editor.html?prefix=old', 'x'),
    ).toEqual('http://localhost:8765/editor.html?prefix=x')
  })

  test('a default port is dropped as Chrome drops it', () => {
    expect(prefixedPageUrl('http://localhost:80/editor.html', '')).toEqual(
      'http://localhost/editor.html?prefix=',
    )
  })
})

describe(localhostPort.name, () => {
  test('an explicit port is reversed', () => {
    expect(localhostPort('http://localhost:8765/editor.html')).toEqual('8765')
  })

  test('a default port is reversed, explicit or not', () => {
    expect([
      localhostPort('http://localhost:80/editor.html'),
      localhostPort('http://localhost/editor.html'),
      localhostPort('https://localhost/editor.html'),
    ]).toEqual(['80', '80', '443'])
  })

  test('a page on another host is not reversed', () => {
    expect(localhostPort('http://example.com:8765/editor.html')).toEqual(
      undefined,
    )
  })
})

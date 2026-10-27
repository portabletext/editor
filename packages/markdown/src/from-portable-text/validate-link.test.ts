import markdownit from 'markdown-it'
import {describe, expect, test} from 'vitest'
import {validateLink} from './validate-link'

describe(validateLink.name, () => {
  const md = markdownit()

  test.each([
    ['http://example.com/foo.png', true],
    ['https://example.com/foo.png', true],
    ['HTTPS://EXAMPLE.COM/FOO.PNG', true],
    ['mailto:foo@example.com', true],
    ['/foo/bar.png', true],
    ['./foo.png', true],
    ['../foo.png', true],
    ['foo.png', true],
    ['#foo', true],
    ['?foo=bar', true],
    ['//example.com/foo.png', true],
    ['', true],
    ['ftp://example.com/foo.png', true],
    ['javascript:alert(1)', false],
    ['JavaScript:alert(1)', false],
    ['JAVASCRIPT:alert(1)', false],
    [' javascript:alert(1)', false],
    ['\tjavascript:alert(1)', false],
    ['\njavascript:alert(1)', false],
    [' javascript:alert(1)', false],
    ['﻿javascript:alert(1)', false],
    ['javascript:alert(1) ', false],
    ['javascript :alert(1)', true],
    ['java\tscript:alert(1)', true],
    ['javascript&colon;alert(1)', true],
    ['&#106;avascript:alert(1)', true],
    ['javascript%3Aalert(1)', true],
    ['vbscript:msgbox(1)', false],
    ['VBScript:msgbox(1)', false],
    ['file:///etc/passwd', false],
    ['FILE:///etc/passwd', false],
    ['data:image/png;base64,Zm9v', true],
    ['data:image/gif;base64,Zm9v', true],
    ['data:image/jpeg;base64,Zm9v', true],
    ['data:image/webp;base64,Zm9v', true],
    ['DATA:IMAGE/PNG;BASE64,Zm9v', true],
    [' data:image/png;base64,Zm9v', true],
    ['data:image/svg+xml;base64,Zm9v', false],
    ['data:image/jpg;base64,Zm9v', false],
    ['data:image/png,Zm9v', false],
    ['data:image/pngx;base64,Zm9v', false],
    ['data:text/html;base64,Zm9v', false],
    ['data:,foo', false],
    ['xdata:image/svg+xml;base64,Zm9v', true],
  ])('%j is %s', (url, expected) => {
    expect(validateLink(url)).toBe(expected)
    expect(md.validateLink(url)).toBe(expected)
  })
})

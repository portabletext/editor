import {describe, expect, test} from 'vitest'
import {pyRepr} from './util.ts'

describe(pyRepr.name, () => {
  test("quotes and escapes match Python's repr", () => {
    expect(pyRepr("a'b")).toEqual(`"a'b"`)
    expect(pyRepr('a\'b"c')).toEqual(`'a\\'b"c'`)
    expect(pyRepr('　')).toEqual("'\\u3000'")
    expect(pyRepr({package: 'x', pid: 4264, ok: true, none: null})).toEqual(
      "{'package': 'x', 'pid': 4264, 'ok': True, 'none': None}",
    )
  })
})

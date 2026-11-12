import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

describe('Setup', () => {
  test('Scenario: Unknown block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _key: keyGenerator(),
        _type: 'block',
        children: [{_type: 'span', _key: keyGenerator(), text: 'foo'}],
      },
      {
        _key: keyGenerator(),
        _type: 'image',
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        children: [{_type: 'span', _key: keyGenerator(), text: 'bar'}],
      },
    ]
    const {editor} = await createTestEditor({initialValue, keyGenerator})

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'B: foo\n{IMAGE}\nB: bar',
    )
  })
})

import {describe, expect, test, vi} from 'vitest'
import {compileSchema} from './compile-schema'
import {isContainer} from './types'

describe(compileSchema.name, () => {
  describe('containers', () => {
    test('compiles container definitions', () => {
      const schema = compileSchema({
        containers: [{name: 'codeBlock', child: 'content'}],
      })

      expect(schema.containers).toEqual([
        {name: 'codeBlock', child: 'content', fields: []},
      ])
    })

    test('defaults to empty containers array', () => {
      const schema = compileSchema({})

      expect(schema.containers).toEqual([])
    })

    test('isContainer returns true for container types', () => {
      const schema = compileSchema({
        containers: [{name: 'codeBlock', child: 'content'}],
      })

      expect(isContainer({schema}, 'codeBlock')).toBe(true)
    })

    test('isContainer returns false for non-container types', () => {
      const schema = compileSchema({
        containers: [{name: 'codeBlock', child: 'content'}],
      })

      expect(isContainer({schema}, 'image')).toBe(false)
      expect(isContainer({schema}, 'block')).toBe(false)
    })

    test('containers with fields', () => {
      const schema = compileSchema({
        containers: [
          {
            name: 'codeBlock',
            child: 'content',
            fields: [{name: 'language', type: 'string'}],
          },
        ],
      })

      expect(schema.containers).toEqual([
        {
          name: 'codeBlock',
          child: 'content',
          fields: [{name: 'language', type: 'string'}],
        },
      ])
    })
  })

  describe('block fields', () => {
    test('reserved fields are ignored and warned about', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      expect(
        compileSchema({block: {fields: [{name: '_type', type: 'string'}]}}),
      ).toEqual({
        block: {name: 'block'},
        span: {name: 'span'},
        styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
        lists: [],
        decorators: [],
        annotations: [],
        blockObjects: [],
        inlineObjects: [],
        containers: [],
      })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '"_type" is a reserved field name on Portable Text blocks',
      )

      consoleWarnSpy.mockRestore()
    })

    test('custom fields are included', () => {
      expect(
        compileSchema({block: {fields: [{name: 'foo', type: 'string'}]}}),
      ).toEqual({
        block: {name: 'block', fields: [{name: 'foo', type: 'string'}]},
        span: {name: 'span'},
        styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
        lists: [],
        decorators: [],
        annotations: [],
        blockObjects: [],
        inlineObjects: [],
        containers: [],
      })
    })
  })
})

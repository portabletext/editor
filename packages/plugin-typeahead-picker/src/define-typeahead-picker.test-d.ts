import {describe, test} from 'vitest'
import {defineTypeaheadPicker} from './define-typeahead-picker'
import type {AutoCompleteMatch} from './typeahead-picker.types'

type TestMatch = {
  key: string
  label: string
}

type TestAutoCompleteMatch = AutoCompleteMatch & {
  key: string
  label: string
}

describe(defineTypeaheadPicker.name, () => {
  describe('with type parameter', () => {
    test('accepts sync getMatches when mode is omitted', () => {
      defineTypeaheadPicker<TestMatch>({
        trigger: /:/,
        keyword: /\w*/,
        getMatches: () => [],
        onSelect: [() => []],
      })
    })

    test('accepts sync getMatches when mode is sync', () => {
      defineTypeaheadPicker<TestMatch>({
        mode: 'sync',
        trigger: /:/,
        keyword: /\w*/,
        getMatches: () => [],
        onSelect: [() => []],
      })
    })

    test('accepts async getMatches when mode is async', () => {
      defineTypeaheadPicker<TestMatch>({
        mode: 'async',
        trigger: /@/,
        keyword: /\w*/,
        getMatches: async () => [],
        onSelect: [() => []],
      })
    })

    test('rejects async getMatches when mode is omitted', () => {
      // @ts-expect-error - async function not allowed when mode is omitted (sync)
      defineTypeaheadPicker<TestMatch>({
        trigger: /:/,
        keyword: /\w*/,
        getMatches: async () => [],
        onSelect: [() => []],
      })
    })

    test('rejects async getMatches when mode is sync', () => {
      // @ts-expect-error - async function not allowed when mode is sync
      defineTypeaheadPicker<TestMatch>({
        mode: 'sync',
        trigger: /:/,
        keyword: /\w*/,
        getMatches: async () => [],
        onSelect: [() => []],
      })
    })

    test('rejects sync getMatches when mode is async', () => {
      // @ts-expect-error - sync function not allowed when mode is async
      defineTypeaheadPicker<TestMatch>({
        mode: 'async',
        trigger: /@/,
        keyword: /\w*/,
        getMatches: () => [],
        onSelect: [() => []],
      })
    })
  })

  describe('without type parameter', () => {
    test('accepts sync getMatches when mode is omitted', () => {
      defineTypeaheadPicker({
        trigger: /:/,
        keyword: /\w*/,
        getMatches: () => [],
        onSelect: [() => []],
      })
    })
  })

  describe('conditional type field requirement', () => {
    test('accepts match without type field when delimiter is not configured', () => {
      defineTypeaheadPicker<TestMatch>({
        trigger: /@/,
        keyword: /\w*/,
        getMatches: () => [{key: '1', label: 'Test'}],
        onSelect: [() => []],
      })
    })

    test('accepts match without type field when delimiter is undefined', () => {
      defineTypeaheadPicker<TestMatch>({
        trigger: /@/,
        keyword: /\w*/,
        delimiter: undefined,
        getMatches: () => [{key: '1', label: 'Test'}],
        onSelect: [() => []],
      })
    })

    test('accepts match with type field when delimiter is configured', () => {
      defineTypeaheadPicker<TestAutoCompleteMatch>({
        trigger: /:/,
        keyword: /\w*/,
        delimiter: ':',
        getMatches: () => [{key: '1', label: 'Test', type: 'partial'}],
        onSelect: [() => []],
      })
    })

    test('rejects match without type field when delimiter is configured', () => {
      defineTypeaheadPicker<TestMatch>({
        trigger: /:/,
        keyword: /\w*/,
        // @ts-expect-error - delimiter requires AutoCompleteMatch which has type field
        delimiter: ':',
        getMatches: () => [{key: '1', label: 'Test'}],
        onSelect: [() => []],
      })
    })

    test('allows optional type field on matches without delimiter', () => {
      defineTypeaheadPicker<TestAutoCompleteMatch>({
        trigger: /@/,
        keyword: /\w*/,
        getMatches: () => [{key: '1', label: 'Test', type: 'exact'}],
        onSelect: [() => []],
      })
    })

    test('accepts async match without type field when delimiter is not configured', () => {
      defineTypeaheadPicker<TestMatch>({
        mode: 'async',
        trigger: /@/,
        keyword: /\w*/,
        getMatches: async () => [{key: '1', label: 'Test'}],
        onSelect: [() => []],
      })
    })

    test('accepts async match with type field when delimiter is configured', () => {
      defineTypeaheadPicker<TestAutoCompleteMatch>({
        mode: 'async',
        trigger: /:/,
        keyword: /\w*/,
        delimiter: ':',
        getMatches: async (): Promise<Array<TestAutoCompleteMatch>> => [
          {key: '1', label: 'Test', type: 'partial'},
        ],
        onSelect: [() => []],
      })
    })

    test('rejects async match without type field when delimiter is configured', () => {
      defineTypeaheadPicker<TestMatch>({
        mode: 'async',
        trigger: /:/,
        keyword: /\w*/,
        // @ts-expect-error - delimiter requires AutoCompleteMatch which has type field
        delimiter: ':',
        getMatches: async () => [{key: '1', label: 'Test'}],
        onSelect: [() => []],
      })
    })
  })
})

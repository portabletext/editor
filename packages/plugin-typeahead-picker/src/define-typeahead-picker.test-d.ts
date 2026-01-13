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
        pattern: /:(\w*)/,
        getMatches: () => [],
        actions: [],
      })
    })

    test('accepts sync getMatches when mode is sync', () => {
      defineTypeaheadPicker<TestMatch>({
        mode: 'sync',
        pattern: /:(\w*)/,
        getMatches: () => [],
        actions: [],
      })
    })

    test('accepts async getMatches when mode is async', () => {
      defineTypeaheadPicker<TestMatch>({
        mode: 'async',
        pattern: /@(\w*)/,
        getMatches: async () => [],
        actions: [],
      })
    })

    test('rejects async getMatches when mode is omitted', () => {
      // @ts-expect-error - async function not allowed when mode is omitted (sync)
      defineTypeaheadPicker<TestMatch>({
        pattern: /:(\w*)/,
        getMatches: async () => [],
        actions: [],
      })
    })

    test('rejects async getMatches when mode is sync', () => {
      // @ts-expect-error - async function not allowed when mode is sync
      defineTypeaheadPicker<TestMatch>({
        mode: 'sync',
        pattern: /:(\w*)/,
        getMatches: async () => [],
        actions: [],
      })
    })

    test('rejects sync getMatches when mode is async', () => {
      // @ts-expect-error - sync function not allowed when mode is async
      defineTypeaheadPicker<TestMatch>({
        mode: 'async',
        pattern: /@(\w*)/,
        getMatches: () => [],
        actions: [],
      })
    })
  })

  describe('without type parameter', () => {
    test('accepts sync getMatches when mode is omitted', () => {
      defineTypeaheadPicker({
        pattern: /:(\w*)/,
        getMatches: () => [],
        actions: [],
      })
    })
  })

  describe('conditional type field requirement', () => {
    test('accepts match without type field when autoCompleteWith is not configured', () => {
      defineTypeaheadPicker<TestMatch>({
        pattern: /@(\w*)/,
        getMatches: () => [{key: '1', label: 'Test'}],
        actions: [],
      })
    })

    test('accepts match without type field when autoCompleteWith is undefined', () => {
      defineTypeaheadPicker<TestMatch>({
        pattern: /@(\w*)/,
        autoCompleteWith: undefined,
        getMatches: () => [{key: '1', label: 'Test'}],
        actions: [],
      })
    })

    test('accepts match with type field when autoCompleteWith is configured', () => {
      defineTypeaheadPicker<TestAutoCompleteMatch>({
        pattern: /:(\w*)/,
        autoCompleteWith: ':',
        getMatches: () => [{key: '1', label: 'Test', type: 'partial'}],
        actions: [],
      })
    })

    test('rejects match without type field when autoCompleteWith is configured', () => {
      defineTypeaheadPicker<TestMatch>({
        pattern: /:(\w*)/,
        // @ts-expect-error - autoCompleteWith requires AutoCompleteMatch which has type field
        autoCompleteWith: ':',
        getMatches: () => [{key: '1', label: 'Test'}],
        actions: [],
      })
    })

    test('allows optional type field on matches without autoCompleteWith', () => {
      defineTypeaheadPicker<TestAutoCompleteMatch>({
        pattern: /@(\w*)/,
        getMatches: () => [{key: '1', label: 'Test', type: 'exact'}],
        actions: [],
      })
    })

    test('accepts async match without type field when autoCompleteWith is not configured', () => {
      defineTypeaheadPicker<TestMatch>({
        mode: 'async',
        pattern: /@(\w*)/,
        getMatches: async () => [{key: '1', label: 'Test'}],
        actions: [],
      })
    })

    test('accepts async match with type field when autoCompleteWith is configured', () => {
      defineTypeaheadPicker<TestAutoCompleteMatch>({
        mode: 'async',
        pattern: /:(\w*)/,
        autoCompleteWith: ':',
        getMatches: async (): Promise<Array<TestAutoCompleteMatch>> => [
          {key: '1', label: 'Test', type: 'partial'},
        ],
        actions: [],
      })
    })

    test('rejects async match without type field when autoCompleteWith is configured', () => {
      defineTypeaheadPicker<TestMatch>({
        mode: 'async',
        pattern: /:(\w*)/,
        // @ts-expect-error - autoCompleteWith requires AutoCompleteMatch which has type field
        autoCompleteWith: ':',
        getMatches: async () => [{key: '1', label: 'Test'}],
        actions: [],
      })
    })
  })
})

import {describe, expect, test} from 'vitest'
import {createNodeTraversalTestbed} from '../node-traversal/node-traversal-testbed'
import {serializePath} from '../paths/serialize-path'
import {getSelectionState} from './get-selection-state'

describe(getSelectionState.name, () => {
  test('returns defaults when selection is null', () => {
    const testbed = createNodeTraversalTestbed()

    expect(getSelectionState(testbed.context, null)).toEqual({
      focusedLeafPath: undefined,
      selectedLeafPaths: new Set(),
      focusedContainerPath: undefined,
      selectedContainerPaths: new Set(),
    })
  })

  describe('collapsed selection on a root text block span', () => {
    const testbed = createNodeTraversalTestbed()
    const focusPath = [
      {_key: testbed.textBlock1._key},
      'children',
      {_key: testbed.span1._key},
    ]

    const result = getSelectionState(testbed.context, {
      anchorPath: focusPath,
      focusPath,
      isCollapsed: true,
    })

    test('focused leaf is the span', () => {
      expect(result.focusedLeafPath).toEqual(serializePath(focusPath))
    })

    test('focused container is the text block', () => {
      expect(result.focusedContainerPath).toEqual(
        serializePath([{_key: testbed.textBlock1._key}]),
      )
    })

    test('selected leaves contain only the span', () => {
      expect(result.selectedLeafPaths).toEqual(
        new Set([serializePath(focusPath)]),
      )
    })

    test('selected containers contain only the text block', () => {
      expect(result.selectedContainerPaths).toEqual(
        new Set([serializePath([{_key: testbed.textBlock1._key}])]),
      )
    })
  })

  describe('collapsed selection on a root void block object', () => {
    const testbed = createNodeTraversalTestbed()
    const focusPath = [{_key: testbed.image._key}]

    const result = getSelectionState(testbed.context, {
      anchorPath: focusPath,
      focusPath,
      isCollapsed: true,
    })

    test('focused leaf is the image', () => {
      expect(result.focusedLeafPath).toEqual(serializePath(focusPath))
    })

    test('no focused container (image is root-level leaf)', () => {
      expect(result.focusedContainerPath).toBeUndefined()
    })

    test('selected leaves contain the image', () => {
      expect(result.selectedLeafPaths).toEqual(
        new Set([serializePath(focusPath)]),
      )
    })

    test('no selected containers', () => {
      expect(result.selectedContainerPaths).toEqual(new Set())
    })
  })

  describe('collapsed selection on an inline object in a text block', () => {
    const testbed = createNodeTraversalTestbed()
    const focusPath = [
      {_key: testbed.textBlock1._key},
      'children',
      {_key: testbed.stockTicker1._key},
    ]

    const result = getSelectionState(testbed.context, {
      anchorPath: focusPath,
      focusPath,
      isCollapsed: true,
    })

    test('focused leaf is the inline object', () => {
      expect(result.focusedLeafPath).toEqual(serializePath(focusPath))
    })

    test('focused container is the text block', () => {
      expect(result.focusedContainerPath).toEqual(
        serializePath([{_key: testbed.textBlock1._key}]),
      )
    })
  })

  describe('collapsed selection inside a table cell', () => {
    const testbed = createNodeTraversalTestbed()
    const focusPath = [
      {_key: testbed.table._key},
      'rows',
      {_key: testbed.row1._key},
      'cells',
      {_key: testbed.cell1._key},
      'content',
      {_key: testbed.cellBlock1._key},
      'children',
      {_key: testbed.cellSpan1._key},
    ]

    const result = getSelectionState(testbed.context, {
      anchorPath: focusPath,
      focusPath,
      isCollapsed: true,
    })

    test('focused leaf is the span', () => {
      expect(result.focusedLeafPath).toEqual(serializePath(focusPath))
    })

    test('focused container is the nearest ancestor (text block)', () => {
      expect(result.focusedContainerPath).toEqual(
        serializePath([
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
          'cells',
          {_key: testbed.cell1._key},
          'content',
          {_key: testbed.cellBlock1._key},
        ]),
      )
    })

    test('all container ancestors are in selectedContainerPaths', () => {
      expect(result.selectedContainerPaths).toEqual(
        new Set([
          serializePath([{_key: testbed.table._key}]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
          ]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell1._key},
          ]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell1._key},
            'content',
            {_key: testbed.cellBlock1._key},
          ]),
        ]),
      )
    })

    test('the span is in selectedLeafPaths', () => {
      expect(result.selectedLeafPaths).toEqual(
        new Set([serializePath(focusPath)]),
      )
    })
  })

  describe('collapsed selection on an inline object inside a table cell', () => {
    const testbed = createNodeTraversalTestbed()
    const focusPath = [
      {_key: testbed.table._key},
      'rows',
      {_key: testbed.row1._key},
      'cells',
      {_key: testbed.cell1._key},
      'content',
      {_key: testbed.cellBlock1._key},
      'children',
      {_key: testbed.stockTicker2._key},
    ]

    const result = getSelectionState(testbed.context, {
      anchorPath: focusPath,
      focusPath,
      isCollapsed: true,
    })

    test('focused leaf is the inline object', () => {
      expect(result.focusedLeafPath).toEqual(serializePath(focusPath))
    })

    test('focused container is the nearest text block', () => {
      expect(result.focusedContainerPath).toEqual(
        serializePath([
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
          'cells',
          {_key: testbed.cell1._key},
          'content',
          {_key: testbed.cellBlock1._key},
        ]),
      )
    })
  })

  describe('expanded selection within a text block', () => {
    const testbed = createNodeTraversalTestbed()
    const anchorPath = [
      {_key: testbed.textBlock1._key},
      'children',
      {_key: testbed.span1._key},
    ]
    const focusPath = [
      {_key: testbed.textBlock1._key},
      'children',
      {_key: testbed.span2._key},
    ]

    const result = getSelectionState(testbed.context, {
      anchorPath,
      focusPath,
      isCollapsed: false,
    })

    test('no focused leaf (selection is expanded)', () => {
      expect(result.focusedLeafPath).toBeUndefined()
    })

    test('no focused container (selection is expanded)', () => {
      expect(result.focusedContainerPath).toBeUndefined()
    })

    test('selected leaves include all three children of the text block', () => {
      expect(result.selectedLeafPaths).toEqual(
        new Set([
          serializePath(anchorPath),
          serializePath([
            {_key: testbed.textBlock1._key},
            'children',
            {_key: testbed.stockTicker1._key},
          ]),
          serializePath(focusPath),
        ]),
      )
    })

    test('selected containers include the text block', () => {
      expect(result.selectedContainerPaths).toEqual(
        new Set([serializePath([{_key: testbed.textBlock1._key}])]),
      )
    })
  })

  describe('expanded selection across two root text blocks', () => {
    const testbed = createNodeTraversalTestbed()
    const anchorPath = [
      {_key: testbed.textBlock1._key},
      'children',
      {_key: testbed.span1._key},
    ]
    const focusPath = [
      {_key: testbed.textBlock2._key},
      'children',
      {_key: testbed.span3._key},
    ]

    const result = getSelectionState(testbed.context, {
      anchorPath,
      focusPath,
      isCollapsed: false,
    })

    test('selected containers include both text blocks', () => {
      expect(result.selectedContainerPaths).toEqual(
        new Set([
          serializePath([{_key: testbed.textBlock1._key}]),
          serializePath([{_key: testbed.textBlock2._key}]),
        ]),
      )
    })

    test('selected leaves include all children of both text blocks plus the image between them', () => {
      expect(result.selectedLeafPaths).toEqual(
        new Set([
          serializePath(anchorPath),
          serializePath([
            {_key: testbed.textBlock1._key},
            'children',
            {_key: testbed.stockTicker1._key},
          ]),
          serializePath([
            {_key: testbed.textBlock1._key},
            'children',
            {_key: testbed.span2._key},
          ]),
          serializePath([{_key: testbed.image._key}]),
          serializePath(focusPath),
        ]),
      )
    })
  })

  describe('expanded selection across table cells', () => {
    const testbed = createNodeTraversalTestbed()
    const anchorPath = [
      {_key: testbed.table._key},
      'rows',
      {_key: testbed.row1._key},
      'cells',
      {_key: testbed.cell1._key},
      'content',
      {_key: testbed.cellBlock1._key},
      'children',
      {_key: testbed.cellSpan1._key},
    ]
    const focusPath = [
      {_key: testbed.table._key},
      'rows',
      {_key: testbed.row1._key},
      'cells',
      {_key: testbed.cell2._key},
      'content',
      {_key: testbed.cellBlock3._key},
      'children',
      {_key: testbed.cellSpan3._key},
    ]

    const result = getSelectionState(testbed.context, {
      anchorPath,
      focusPath,
      isCollapsed: false,
    })

    test('selected containers include the table, row, both cells, and text blocks in range', () => {
      expect(result.selectedContainerPaths).toEqual(
        new Set([
          serializePath([{_key: testbed.table._key}]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
          ]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell1._key},
          ]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell1._key},
            'content',
            {_key: testbed.cellBlock1._key},
          ]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell1._key},
            'content',
            {_key: testbed.cellBlock2._key},
          ]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell2._key},
          ]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell2._key},
            'content',
            {_key: testbed.cellBlock3._key},
          ]),
        ]),
      )
    })

    test('selected leaves include spans and inline objects across both cells', () => {
      expect(result.selectedLeafPaths).toEqual(
        new Set([
          serializePath(anchorPath),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell1._key},
            'content',
            {_key: testbed.cellBlock1._key},
            'children',
            {_key: testbed.stockTicker2._key},
          ]),
          serializePath([
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell1._key},
            'content',
            {_key: testbed.cellBlock2._key},
            'children',
            {_key: testbed.cellSpan2._key},
          ]),
          serializePath(focusPath),
        ]),
      )
    })
  })
})

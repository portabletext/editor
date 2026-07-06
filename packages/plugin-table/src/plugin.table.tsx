import type {JSX} from 'react'
import {defineTable} from './define-table'

const defaultTable = defineTable()

/**
 * The canonical table definition's plugin: registers the `table` -> `row`
 * -> `cell` containers with bare renders and mounts the table behaviors.
 * Equivalent to `defineTable().Plugin`.
 *
 * @public
 */
export function TablePlugin(): JSX.Element {
  return <defaultTable.Plugin />
}

/**
 * The table behaviors bound to the canonical type names and array fields,
 * split out so a consumer that brings its own table render (its own
 * `NodePlugin` containers) can add them with a
 * `<BehaviorPlugin behaviors={tableBehaviors} />` instead of `TablePlugin`.
 *
 * @public
 */
export const tableBehaviors = defaultTable.behaviors

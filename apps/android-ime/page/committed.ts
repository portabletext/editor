import {Component} from 'react'

/**
 * Passes `value` to `record` once per commit that changes it: on mount, and before each later commit's DOM
 * mutations, from `getSnapshotBeforeUpdate`. React calls neither for a render it abandons or supersedes,
 * so `record` sees only values that committed. Rendered before the component that uses `value`, its mount
 * is recorded before that component's layout effects.
 */
export class Committed<Value> extends Component<{
  value: Value
  record: (value: Value) => void
}> {
  override componentDidMount(): void {
    this.props.record(this.props.value)
  }

  override shouldComponentUpdate(next: {value: Value}): boolean {
    return next.value !== this.props.value
  }

  override getSnapshotBeforeUpdate(): null {
    this.props.record(this.props.value)
    return null
  }

  // React warns about a `getSnapshotBeforeUpdate` without a `componentDidUpdate`.
  override componentDidUpdate(): void {}

  override render(): null {
    return null
  }
}

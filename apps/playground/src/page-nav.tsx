import {Link} from '@tanstack/react-router'
import {button} from './primitives/button'

export function PageNav() {
  return (
    <nav className="flex items-center gap-1">
      <Link
        to="/"
        inactiveProps={{className: button({variant: 'ghost', size: 'sm'})}}
        activeProps={{
          className: button({variant: 'ghost', size: 'sm', isSelected: true}),
        }}
        activeOptions={{exact: true}}
      >
        Playground
      </Link>
      <Link
        to="/minimal"
        inactiveProps={{className: button({variant: 'ghost', size: 'sm'})}}
        activeProps={{
          className: button({variant: 'ghost', size: 'sm', isSelected: true}),
        }}
      >
        Minimal
      </Link>
    </nav>
  )
}

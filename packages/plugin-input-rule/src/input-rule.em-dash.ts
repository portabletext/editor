import type {InputRule} from './input-rule'

/**
 * @beta
 */
export const emDashRule: InputRule = {
  matcher: /--/g,
  transform: () => '—',
}

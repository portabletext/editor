/**
 * @public
 */
export type Hook<TContext extends Record<string, any> = object> = {
  type: 'Before' | 'After'
  callback: HookCallback<TContext>
}

/**
 * @public
 */
export type HookCallback<TContext extends Record<string, any> = object> = (
  context: TContext,
) => Promise<void> | void

/**
 * @public
 */
export function Before<TContext extends Record<string, any> = object>(
  callback: HookCallback<TContext>,
): Hook<TContext> {
  return {type: 'Before', callback}
}

/**
 * @public
 */
export function After<TContext extends Record<string, any> = object>(
  callback: HookCallback<TContext>,
): Hook<TContext> {
  return {type: 'After', callback}
}

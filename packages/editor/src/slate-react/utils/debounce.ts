/**
 * A debounced function with cancel and flush support.
 */
export type DebouncedFunc<T extends (...args: Array<unknown>) => unknown> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void
  flush: () => void
}

/**
 * Creates a debounced version of a function that delays invocation until
 * `wait` milliseconds have elapsed since the last call.
 *
 * The returned function has `.cancel()` and `.flush()` methods.
 */
export function debounce<T extends (...args: Array<unknown>) => unknown>(
  func: T,
  wait: number,
): DebouncedFunc<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let lastArgs: Parameters<T> | undefined

  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      timeoutId = undefined
      const args = lastArgs
      lastArgs = undefined
      if (args) {
        func(...args)
      }
    }, wait)
  }) as DebouncedFunc<T>

  debounced.cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
    lastArgs = undefined
  }

  debounced.flush = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
      const args = lastArgs
      lastArgs = undefined
      if (args) {
        func(...args)
      }
    }
  }

  return debounced
}

/**
 * Creates a throttled version of a function that invokes at most once per
 * `wait` milliseconds. Calls on both the leading and trailing edge.
 *
 * The returned function has `.cancel()` and `.flush()` methods.
 */
export function throttle<T extends (...args: Array<unknown>) => unknown>(
  func: T,
  wait: number,
): DebouncedFunc<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let lastArgs: Parameters<T> | undefined
  let lastCallTime: number | undefined

  const invoke = () => {
    const args = lastArgs
    lastArgs = undefined
    lastCallTime = Date.now()
    if (args) {
      func(...args)
    }
  }

  const startTimer = (remaining: number) => {
    timeoutId = setTimeout(() => {
      timeoutId = undefined
      if (lastArgs) {
        invoke()
      }
    }, remaining)
  }

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now()
    lastArgs = args

    if (lastCallTime === undefined) {
      // Leading edge: invoke immediately on first call
      invoke()
      return
    }

    const elapsed = now - lastCallTime

    if (elapsed >= wait) {
      // Enough time has passed, invoke immediately
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
        timeoutId = undefined
      }
      invoke()
    } else if (timeoutId === undefined) {
      // Schedule trailing edge invocation
      startTimer(wait - elapsed)
    }
  }) as DebouncedFunc<T>

  throttled.cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
    lastArgs = undefined
    lastCallTime = undefined
  }

  throttled.flush = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
    if (lastArgs) {
      invoke()
    }
  }

  return throttled
}

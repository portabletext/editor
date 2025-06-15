import * as React from 'react'

export function useMediaQuery(
  query: string,
  callback: (value: boolean) => void,
) {
  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      if (callback) {
        callback(event.matches)
      }
    }

    const result = matchMedia(query)
    result.addEventListener('change', onChange)

    //initialize value in whatever FC this hook is first used
    if (callback) {
      callback(result.matches)
    }

    return () => result.removeEventListener('change', onChange)
  }, [query])
}

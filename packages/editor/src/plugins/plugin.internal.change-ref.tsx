import {useEffect} from 'react'
import {usePortableTextEditor} from '../editor/hooks/usePortableTextEditor'
import type {EditorChange} from '../types/editor'

export function InternalChange$Plugin(props: {
  onChange: (change: EditorChange) => void
}) {
  const change$ = usePortableTextEditor().change$

  useEffect(() => {
    const subscription = change$.subscribe(props.onChange)

    return () => {
      subscription.unsubscribe()
    }
  }, [change$, props.onChange])

  return null
}

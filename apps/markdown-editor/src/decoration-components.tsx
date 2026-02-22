import type {PropsWithChildren} from 'react'

export function BoldContent({children}: PropsWithChildren) {
  return <strong className="font-bold">{children}</strong>
}

export function ItalicContent({children}: PropsWithChildren) {
  return <em className="italic">{children}</em>
}

export function CodeContent({children}: PropsWithChildren) {
  return (
    <code className="bg-stone-200 px-1 py-0.5 rounded text-sm font-mono text-rose-600">
      {children}
    </code>
  )
}

export function StrikethroughContent({children}: PropsWithChildren) {
  return <del className="line-through text-stone-500">{children}</del>
}

export function SyntaxChars({children}: PropsWithChildren) {
  return (
    <span className="text-stone-400 font-normal not-italic no-underline">
      {children}
    </span>
  )
}

export function HeadingSyntax({children}: PropsWithChildren) {
  return <span className="text-stone-300 font-normal">{children}</span>
}

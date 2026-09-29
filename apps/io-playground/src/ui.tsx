import {useEffect, useRef, useState, type ReactNode} from 'react'
import type {Applicability} from './applicable'
import {definitionOf, revisionTitle, type ConceptName} from './concepts'

const badgeTones = {
  gray: 'bg-gray-200 text-gray-700',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
}

export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof badgeTones
  children: ReactNode
}) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Section({
  title,
  concept,
  suffix,
  className = '',
  children,
}: {
  title: string
  concept?: ConceptName
  /** Shown after the title and its info mark. */
  suffix?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className={`flex flex-col gap-1 ${className}`}>
      <h3 className="flex flex-wrap items-center gap-1 text-xs font-semibold text-gray-500">
        {title}
        {concept ? <InfoMark concept={concept} /> : null}
        {suffix ? <span className="font-normal">{suffix}</span> : null}
      </h3>
      {children}
    </section>
  )
}

/**
 * A small "i" after a label: the definition as a native tooltip, and as a
 * popover on click.
 */
export function InfoMark({concept}: {concept: ConceptName}) {
  const [position, setPosition] = useState<{
    left: number
    top: number
  } | null>(null)
  const definition = definitionOf(concept)

  return (
    <>
      <button
        type="button"
        title={definition}
        aria-label={`What "${concept}" means`}
        aria-expanded={position !== null}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setPosition((current) =>
            current === null
              ? {
                  left: Math.min(rect.left, window.innerWidth - 272),
                  top: rect.bottom + 4,
                }
              : null,
          )
        }}
        onBlur={() => setPosition(null)}
        className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border border-gray-400 font-serif text-[9px] leading-none font-normal text-gray-500 italic hover:border-blue-500 hover:text-blue-600"
      >
        i
      </button>
      {position ? (
        <span
          role="tooltip"
          // A fixed position escapes the scrolling panels, which would clip an absolutely positioned popover.
          style={{left: position.left, top: position.top}}
          className="fixed z-50 w-64 rounded bg-gray-900 p-2 text-xs font-normal text-white normal-case shadow-lg"
        >
          <span className="font-semibold">{concept}:</span> {definition}
        </span>
      ) : null}
    </>
  )
}

export function Label({
  concept,
  children,
}: {
  concept: ConceptName
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <InfoMark concept={concept} />
    </span>
  )
}

export function Revision({rev}: {rev: string | null}) {
  return (
    <span
      title={revisionTitle(rev)}
      className="cursor-help font-mono underline decoration-gray-300 decoration-dotted"
    >
      {rev ?? '∅'}
    </span>
  )
}

export function RevisionStep({
  from,
  to,
}: {
  from: string | null
  to: string | null
}) {
  return (
    <span className="font-mono">
      <Revision rev={from} /> → <Revision rev={to} />
    </span>
  )
}

/**
 * A textspec value that toggles the Portable Text blocks behind it.
 */
export function TextspecValue({
  textspec,
  blocks,
}: {
  textspec: string
  blocks: unknown
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        title="Show the Portable Text blocks behind this textspec"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`self-start rounded bg-white px-1.5 py-0.5 text-left font-mono text-sm break-all ring-1 hover:ring-blue-400 ${
          open ? 'ring-blue-400' : 'ring-gray-200'
        }`}
      >
        {textspec === '' ? 'an empty list' : textspec}
      </button>
      {open ? <JsonView value={blocks} /> : null}
    </div>
  )
}

export function JsonView({value}: {value: unknown}) {
  return (
    <pre className="max-h-72 overflow-auto rounded bg-gray-900 p-2 font-mono text-[11px] leading-snug text-gray-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export function Empty({children}: {children: ReactNode}) {
  return <p className="text-xs text-gray-400 italic">{children}</p>
}

export function ItemList({children}: {children: ReactNode}) {
  return <ul className="flex flex-col gap-1 font-mono text-xs">{children}</ul>
}

/** A text button that opens the details drawer. */
export function DetailsLink({
  label,
  onClick,
  children,
}: {
  /** The accessible name, like "Details of transaction A-1". */
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-left font-mono underline decoration-gray-300 underline-offset-2 hover:text-blue-700 hover:decoration-blue-400"
    >
      {children}
    </button>
  )
}

export function Button({
  onClick,
  disabled,
  suggested,
  title,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  /** Rings the button when the state calls for it. */
  suggested?: boolean
  title?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded border border-gray-300 bg-white px-2 py-0.5 text-xs whitespace-nowrap hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:opacity-60 ${
        suggested ? 'ring-2 ring-amber-400' : ''
      }`}
    >
      {children}
    </button>
  )
}

/** A button whose state comes from the protocol's applicability rules. */
export function ActionButton({
  applicability,
  onClick,
  children,
}: {
  applicability: Applicability
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      onClick={onClick}
      disabled={!applicability.enabled}
      suggested={applicability.suggested !== undefined}
      title={applicability.why ?? applicability.suggested}
    >
      {children}
    </Button>
  )
}

/** Prompts the state calls for, one per line. */
export function Prompts({prompts}: {prompts: Array<string>}) {
  return prompts.length === 0 ? null : (
    <ul aria-label="suggestions" className="flex flex-col gap-0.5">
      {prompts.map((prompt) => (
        <li key={prompt} className="text-xs text-amber-700">
          {prompt}
        </li>
      ))}
    </ul>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  width = 'w-28',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  width?: string
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`rounded border border-gray-300 px-1.5 py-0.5 font-mono text-xs ${width}`}
    />
  )
}

/**
 * The background classes for a panel: a short highlight whenever its data
 * changes.
 */
export function useFlash(signature: string): string {
  const previousSignature = useRef(signature)
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    if (previousSignature.current === signature) {
      return
    }

    previousSignature.current = signature
    setFlashing(true)
    const timeout = setTimeout(() => setFlashing(false), 700)

    return () => clearTimeout(timeout)
  }, [signature])

  return `transition-colors duration-500 ${flashing ? 'bg-yellow-100' : 'bg-gray-50'}`
}

export function plural(count: number, noun: string): string {
  if (count === 1) {
    return `${count} ${noun}`
  }

  return `${count} ${noun}${/(ch|sh|s|x)$/.test(noun) ? 'es' : 's'}`
}

/** Renders the backticked parts of a sentence as code. */
export function WithCode({text}: {text: string}) {
  return (
    <>
      {text.split('`').map((part, index) =>
        index % 2 === 1 ? (
          <code key={index} className="font-mono text-[0.92em]">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}

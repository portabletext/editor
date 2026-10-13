import {useEffect, useRef} from 'react'
import type {NarrationEntry} from './narration'
import {Empty, WithCode} from './ui'

export function NarrationLog({entries}: {entries: Array<NarrationEntry>}) {
  const endRef = useRef<HTMLDivElement>(null)
  const sentenceCount = entries.reduce(
    (count, entry) => count + entry.sentences.length,
    0,
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({block: 'end'})
  }, [sentenceCount])

  return (
    <section aria-label="Narration" className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold text-gray-500">
        what happened, step by step
      </h3>
      {entries.length === 0 ? (
        <Empty>Nothing yet. Run a step to see what it does.</Empty>
      ) : (
        <div
          role="log"
          className="flex flex-col gap-1.5 rounded bg-white p-2 ring-1 ring-gray-200"
        >
          {entries.map((entry, index) => (
            <div key={index}>
              <p className="font-mono text-[11px] text-gray-400">
                {entry.step}
              </p>
              <ul className="flex flex-col text-sm">
                {entry.sentences.map((sentence, sentenceIndex) => (
                  <li key={sentenceIndex}>
                    <WithCode text={sentence} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </section>
  )
}

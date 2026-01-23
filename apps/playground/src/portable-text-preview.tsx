import {useActorRef, useSelector} from '@xstate/react'
import {CheckIcon, CopyIcon, InfoIcon} from 'lucide-react'
import {useEffect} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {highlightMachine} from './highlight-json-machine'
import type {PlaygroundActorRef} from './playground-machine'
import {Button} from './primitives/button'
import {Container} from './primitives/container'
import {Spinner} from './primitives/spinner'
import {Tooltip} from './primitives/tooltip'

export function PortableTextPreview(props: {
  playgroundRef: PlaygroundActorRef
}) {
  const highlightRef = useActorRef(highlightMachine, {
    input: {
      code: JSON.stringify(
        props.playgroundRef.getSnapshot().context.value ?? null,
      ),
      variant: 'default',
    },
  })
  const highlightedPortableText = useSelector(
    highlightRef,
    (s) => s.context.highlightedCode,
  )
  const isCopied = useSelector(props.playgroundRef, (s) =>
    s.matches({'copying value': 'copied'}),
  )

  useEffect(() => {
    props.playgroundRef.subscribe((s) => {
      highlightRef.send({
        type: 'update code',
        code: JSON.stringify(s.context.value ?? null),
      })
    })
  }, [props.playgroundRef, highlightRef])

  return (
    <Container className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          Portable Text
          <TooltipTrigger delay={0}>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 size-4 min-w-0"
              aria-label="Info"
            >
              <InfoIcon className="size-3 text-gray-400 dark:text-gray-500" />
            </Button>
            <Tooltip>
              The current editor value as Portable Text, a JSON-based rich text
              specification.
            </Tooltip>
          </TooltipTrigger>
        </span>
        <TooltipTrigger>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              props.playgroundRef.send({type: 'copy value'})
            }}
          >
            {isCopied ? (
              <CheckIcon className="size-3 text-green-600 dark:text-green-400" />
            ) : (
              <CopyIcon className="size-3" />
            )}
          </Button>
          <Tooltip>{isCopied ? 'Copied!' : 'Copy to clipboard'}</Tooltip>
        </TooltipTrigger>
      </div>
      {highlightedPortableText ? (
        <div
          className="[&>pre]:max-h-none overflow-y-auto"
          dangerouslySetInnerHTML={{__html: highlightedPortableText}}
        />
      ) : (
        <Spinner />
      )}
    </Container>
  )
}

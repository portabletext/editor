import {useSelector} from '@xstate/react'
import {Editor} from './editor'
import {PlaygroundFeatureFlagsContext} from './feature-flags'
import {Inspector} from './inspector'
import type {PlaygroundActorRef} from './playground-machine'
import {LatencyYjsProvider} from './yjs-latency-provider'
import {YjsOperationLogProvider} from './yjs-operation-log'
import {YjsProvider} from './yjs-plugin'

export function Editors(props: {playgroundRef: PlaygroundActorRef}) {
  const showInspector = useSelector(props.playgroundRef, (s) =>
    s.matches({'inspector visibility': 'shown'}),
  )
  const playgroundFeatureFlags = useSelector(
    props.playgroundRef,
    (s) => s.context.featureFlags,
  )
  const editors = useSelector(props.playgroundRef, (s) => s.context.editors)
  const rangeDecorations = useSelector(
    props.playgroundRef,
    (s) => s.context.rangeDecorations,
  )

  return (
    <div className="p-3 md:p-4 flex-1 min-w-0">
      <PlaygroundFeatureFlagsContext.Provider value={playgroundFeatureFlags}>
        <YjsOperationLogProvider>
          <LatencyYjsProvider
            editorCount={editors.length}
            latencyMs={playgroundFeatureFlags.yjsLatency}
          >
            <YjsProvider>
              <div
                className={`grid gap-4 items-start grid-cols-1 h-full ${
                  showInspector ? 'md:grid-cols-2' : ''
                }`}
              >
                <div className="flex flex-col gap-4">
                  {editors.map((editor, index) => (
                    <Editor
                      key={editor.id}
                      editorRef={editor}
                      editorIndex={index}
                      rangeDecorations={rangeDecorations}
                    />
                  ))}
                </div>
                {showInspector ? (
                  <Inspector playgroundRef={props.playgroundRef} />
                ) : null}
              </div>
            </YjsProvider>
          </LatencyYjsProvider>
        </YjsOperationLogProvider>
      </PlaygroundFeatureFlagsContext.Provider>
    </div>
  )
}

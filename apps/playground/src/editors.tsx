import {useSelector} from '@xstate/react'
import {ActivityIcon, PlusIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {Editor} from './editor'
import {PlaygroundFeatureFlagsContext} from './feature-flags'
import {GlobalPatchesPanel} from './global-patches-panel'
import type {PlaygroundActorRef} from './playground-machine'
import {PortableTextPreview} from './portable-text-preview'
import {Button} from './primitives/button'
import {Switch} from './primitives/switch'
import {Tooltip} from './primitives/tooltip'

export function Editors(props: {playgroundRef: PlaygroundActorRef}) {
  const showPortableTextPreview = useSelector(props.playgroundRef, (s) =>
    s.matches({'value visibility': 'shown'}),
  )
  const showPatchesPanel = useSelector(props.playgroundRef, (s) =>
    s.matches({'patches visibility': 'shown'}),
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

  const panelCount =
    (showPatchesPanel ? 1 : 0) + (showPortableTextPreview ? 1 : 0)
  const gridCols =
    panelCount === 0
      ? 'md:grid-cols-1'
      : panelCount === 1
        ? 'md:grid-cols-3'
        : 'md:grid-cols-4'
  const editorSpan = panelCount === 0 ? 'md:col-span-1' : 'md:col-span-2'

  return (
    <div className="p-2 md:p-4 flex flex-col gap-2 md:gap-4 flex-1 min-w-0">
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            props.playgroundRef.send({type: 'add editor'})
          }}
        >
          <PlusIcon className="w-4 h-4" /> Add editor
        </Button>
        <TooltipTrigger>
          <Switch
            isSelected={showPortableTextPreview}
            onChange={() => {
              props.playgroundRef.send({type: 'toggle value'})
            }}
          >
            Portable Text
          </Switch>
          <Tooltip>Toggle Portable Text preview</Tooltip>
        </TooltipTrigger>
        <TooltipTrigger>
          <Switch
            isSelected={showPatchesPanel}
            onChange={() => {
              props.playgroundRef.send({type: 'toggle patches'})
            }}
          >
            <ActivityIcon className="size-4" /> Patches
          </Switch>
          <Tooltip>Toggle Patches panel</Tooltip>
        </TooltipTrigger>
        <TooltipTrigger>
          <Switch
            isSelected={playgroundFeatureFlags.toolbar}
            onChange={() => {
              props.playgroundRef.send({
                type: 'toggle feature flag',
                flag: 'toolbar',
              })
            }}
          >
            Toolbar
          </Switch>
          <Tooltip>Toggle Toolbar</Tooltip>
        </TooltipTrigger>
      </div>
      <div className={`grid gap-4 items-start grid-cols-1 ${gridCols} flex-1`}>
        <div className={`flex flex-col gap-2 md:gap-4 ${editorSpan}`}>
          <div className="flex flex-col gap-6">
            <PlaygroundFeatureFlagsContext.Provider
              value={playgroundFeatureFlags}
            >
              {editors.map((editor) => (
                <Editor
                  key={editor.id}
                  editorRef={editor}
                  rangeDecorations={rangeDecorations}
                />
              ))}
            </PlaygroundFeatureFlagsContext.Provider>
          </div>
        </div>
        {showPatchesPanel ? (
          <GlobalPatchesPanel playgroundRef={props.playgroundRef} />
        ) : null}
        {showPortableTextPreview ? (
          <PortableTextPreview playgroundRef={props.playgroundRef} />
        ) : null}
      </div>
    </div>
  )
}

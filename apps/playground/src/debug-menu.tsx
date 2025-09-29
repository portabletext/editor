import {useEditor} from '@portabletext/editor'
import {useSelector} from '@xstate/react'
import {CopyIcon, TrashIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {reverse} from 'remeda'
import {EditorPatchesPreview} from './editor-patches-preview'
import type {EditorActorRef} from './playground-machine'
import {Button} from './primitives/button'
import {Container} from './primitives/container'
import {Separator} from './primitives/separator'
import {Switch} from './primitives/switch'
import {Toolbar} from './primitives/toolbar'
import {Tooltip} from './primitives/tooltip'
import {SelectionPreview} from './selection-preview'
import {ValuePreview} from './value-preview'

export function DebugMenu(props: {
  editorRef: EditorActorRef
  readOnly: boolean
}) {
  const featureFlags = useSelector(
    props.editorRef,
    (s) => s.context.featureFlags,
  )
  const showingPatchesPreview = useSelector(props.editorRef, (s) =>
    s.matches({'patches preview': 'shown'}),
  )
  const showingSelectionPreivew = useSelector(props.editorRef, (s) =>
    s.matches({'selection preview': 'shown'}),
  )
  const showingValuePreview = useSelector(props.editorRef, (s) =>
    s.matches({'value preview': 'shown'}),
  )
  const patchSubscriptionActive = useSelector(props.editorRef, (s) =>
    s.matches({'patch subscription': 'active'}),
  )
  const valueSubscriptionActive = useSelector(props.editorRef, (s) =>
    s.matches({'value subscription': 'active'}),
  )
  const patchesReceived = useSelector(props.editorRef, (s) =>
    reverse(s.context.patchesReceived),
  )

  return (
    <Container className="flex flex-col gap-2">
      <Toolbar>
        <Switch
          isSelected={patchSubscriptionActive}
          onChange={() => {
            props.editorRef.send({type: 'toggle patch subscription'})
          }}
        >
          Patch subscription
        </Switch>
      </Toolbar>
      <Toolbar>
        <Switch
          isSelected={valueSubscriptionActive}
          onChange={() => {
            props.editorRef.send({type: 'toggle value subscription'})
          }}
        >
          Value subscription
        </Switch>
      </Toolbar>
      <Toolbar>
        <Switch
          isSelected={featureFlags.dragHandles}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'dragHandles',
            })
          }}
        >
          Drag handles (experimental)
        </Switch>
      </Toolbar>
      <Separator orientation="horizontal" />
      <Toolbar>
        <Switch
          isSelected={featureFlags.markdownPlugin}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'markdownPlugin',
            })
          }}
        >
          Markdown plugin
        </Switch>
      </Toolbar>
      <Toolbar>
        <Switch
          isSelected={featureFlags.oneLinePlugin}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'oneLinePlugin',
            })
          }}
        >
          One-line plugin
        </Switch>
      </Toolbar>
      <Toolbar>
        <Switch
          isSelected={featureFlags.emojiPickerPlugin}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'emojiPickerPlugin',
            })
          }}
        >
          Emoji picker plugin
        </Switch>
      </Toolbar>
      <Toolbar>
        <Switch
          isSelected={featureFlags.codeEditorPlugin}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'codeEditorPlugin',
            })
          }}
        >
          Code editor plugin
        </Switch>
      </Toolbar>
      <Toolbar>
        <Switch
          isSelected={featureFlags.linkPlugin}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'linkPlugin',
            })
          }}
        >
          Link plugin
        </Switch>
      </Toolbar>
      <Toolbar>
        <Switch
          isSelected={featureFlags.inputRules}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'inputRules',
            })
          }}
        >
          Input rules (experimental)
        </Switch>
      </Toolbar>
      <Separator orientation="horizontal" />
      <Toolbar>
        <Switch
          isSelected={featureFlags.imageDeserializerPlugin}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'imageDeserializerPlugin',
            })
          }}
        >
          Image deserializer plugin
        </Switch>
      </Toolbar>
      <Toolbar>
        <Switch
          isSelected={featureFlags.htmlDeserializerPlugin}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'htmlDeserializerPlugin',
            })
          }}
        >
          HTML deserializer plugin
        </Switch>
      </Toolbar>
      <Toolbar>
        <Switch
          isSelected={featureFlags.textFileDeserializerPlugin}
          onChange={() => {
            props.editorRef.send({
              type: 'toggle feature flag',
              flag: 'textFileDeserializerPlugin',
            })
          }}
        >
          Text file deserializer plugin
        </Switch>
      </Toolbar>
      <Separator orientation="horizontal" />
      <Toolbar>
        <Switch
          isSelected={showingPatchesPreview}
          onChange={() => {
            props.editorRef.send({type: 'toggle patches preview'})
          }}
        >
          Patches
        </Switch>
        <TooltipTrigger>
          <Button
            size="sm"
            variant="destructive"
            onPress={() => {
              props.editorRef.send({type: 'clear stored patches'})
            }}
          >
            <TrashIcon className="size-3" />
          </Button>
          <Tooltip>Clear patches</Tooltip>
        </TooltipTrigger>
        <TooltipTrigger>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              props.editorRef.send({type: 'copy patches'})
            }}
          >
            <CopyIcon className="size-3" />
          </Button>
          <Tooltip>Copy</Tooltip>
        </TooltipTrigger>
      </Toolbar>
      {showingPatchesPreview ? (
        <EditorPatchesPreview patches={patchesReceived} />
      ) : null}
      <Toolbar>
        <Switch
          isSelected={showingSelectionPreivew}
          onChange={() => {
            props.editorRef.send({type: 'toggle selection preview'})
          }}
        >
          Selection
        </Switch>
      </Toolbar>
      {showingSelectionPreivew ? (
        <SelectionPreview editorId={props.editorRef.id} />
      ) : null}
      <Toolbar>
        <Switch
          isSelected={showingValuePreview}
          onChange={() => {
            props.editorRef.send({type: 'toggle value preview'})
          }}
        >
          Value
        </Switch>
      </Toolbar>
      {showingValuePreview ? (
        <ValuePreview editorId={props.editorRef.id} />
      ) : null}
      <Separator orientation="horizontal" />
      <div className="flex gap-2 items-center justify-between">
        <TooltipTrigger>
          <Button
            variant="destructive"
            size="sm"
            onPress={() => {
              props.editorRef.send({type: 'remove'})
            }}
          >
            <TrashIcon className="size-3" />
            {props.editorRef.id}
          </Button>
          <Tooltip>Remove editor</Tooltip>
        </TooltipTrigger>
        <ToggleReadOnly readOnly={props.readOnly} />
      </div>
    </Container>
  )
}

function ToggleReadOnly(props: {readOnly: boolean}) {
  const editor = useEditor()

  return (
    <Switch
      isSelected={props.readOnly}
      onChange={() => {
        editor.send({type: 'update readOnly', readOnly: !props.readOnly})
      }}
    >
      <code>readOnly</code>
    </Switch>
  )
}

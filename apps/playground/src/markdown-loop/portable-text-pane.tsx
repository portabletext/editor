import type {EditorSchema, PortableTextBlock} from '@portabletext/editor'
import type {ReconciliationReport} from '@portabletext/markdown'
import {useEffect, useMemo, useRef, useState} from 'react'
import type {Key} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Tab, TabList, TabPanel, Tabs} from '../primitives/tabs'
import {
  AlignmentTabContent,
  StoredTabContent,
  TidiedTabContent,
} from './evidence-pane'
import {renderJsonValue} from './json-view'
import type {MarkdownLoopLastSync, MarkdownLoopSnapshot} from './loop-machine'
import {ReconciliationInfoDialog} from './reconciliation-dialog'
import {summarizeReport, type RefusalBadge} from './report-summary'

type TabId = 'live' | 'stored' | 'tidied' | 'alignment'

const REFUSAL_TONE: Record<RefusalBadge, string> = {
  'ambiguous-region-too-large':
    'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300',
  'annotation-key-conflict':
    'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300',
  'round-trip-mismatch':
    'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
  'document-too-large':
    'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
}

export function PortableTextPane(props: {
  className?: string
  value: Array<PortableTextBlock>
  report: ReconciliationReport | null
  snapshot: MarkdownLoopSnapshot | null
  markdownText: string
  lastSync: MarkdownLoopLastSync | null
  schema: EditorSchema | null
}) {
  const summary = useMemo(
    () => (props.report ? summarizeReport(props.report, props.value) : null),
    [props.report, props.value],
  )

  const [selectedTab, setSelectedTab] = useState<TabId>('live')
  const hadSnapshotRef = useRef(props.snapshot !== null)

  useEffect(() => {
    const hasSnapshot = props.snapshot !== null
    const hadSnapshot = hadSnapshotRef.current
    if (hasSnapshot && !hadSnapshot) {
      setSelectedTab('alignment')
    } else if (!hasSnapshot && hadSnapshot) {
      setSelectedTab('live')
    }
    hadSnapshotRef.current = hasSnapshot
  }, [props.snapshot])

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${props.className ?? ''}`}
    >
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key: Key) => setSelectedTab(key as TabId)}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Portable Text
          </h2>
          <TabList>
            <Tab id="live">Live</Tab>
            <Tab id="stored" isDisabled={props.snapshot === null}>
              Stored
            </Tab>
            <Tab id="tidied" isDisabled={props.snapshot === null}>
              Tidied
            </Tab>
            <Tab id="alignment" isDisabled={props.snapshot === null}>
              Alignment
            </Tab>
          </TabList>
        </div>

        <TabPanel id="live" className="flex flex-col overflow-hidden">
          {summary ? (
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              <div className="flex flex-wrap items-center gap-1.5">
                {/*
                 * The report survives every `mutation` in `authoring`
                 * (only `read taken` and `discard` clear it), so it can
                 * describe a sync several edits back rather than the
                 * current value; the prefix reads it as history, not a
                 * live status.
                 */}
                <span className="text-gray-400 dark:text-gray-500">
                  last sync ·
                </span>
                {summary.skippedReason ? (
                  <span className="font-medium text-red-700 dark:text-red-400">
                    keys not matched: reconciliation was skipped (
                    {summary.skippedReason})
                  </span>
                ) : (
                  <span>
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      {summary.freshCount} fresh{' '}
                      {summary.freshCount === 1 ? 'key' : 'keys'}
                    </span>
                    {' · '}
                    {summary.adoptedCount} adopted
                    {summary.basisCounts.length > 0 ? (
                      <span>
                        {' ('}
                        {summary.basisCounts
                          .map((entry) => `${entry.count} ${entry.basis}`)
                          .join(', ')}
                        {')'}
                      </span>
                    ) : null}
                  </span>
                )}
                {summary.renamedKeysCount > 0 ? (
                  <code className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-300">
                    {summary.renamedKeysCount} repaired
                  </code>
                ) : null}
                {summary.refusalReasons.map((reason) => (
                  <code
                    key={reason}
                    className={`rounded px-1.5 py-0.5 text-[10px] ${REFUSAL_TONE[reason]}`}
                  >
                    {reason}
                  </code>
                ))}
              </div>
              <ReconciliationInfoDialog
                trigger={
                  <Button variant="ghost" size="sm">
                    how?
                  </Button>
                }
                lastSync={props.lastSync}
                schema={props.schema}
              />
            </div>
          ) : null}
          <pre className="flex-1 overflow-auto px-3 py-2 font-mono text-xs text-gray-800 dark:text-gray-100">
            {renderJsonValue(
              props.value,
              0,
              summary?.freshKeys ?? null,
              summary?.basisByKey ?? null,
            )}
          </pre>
        </TabPanel>

        <TabPanel id="stored" className="flex flex-col overflow-hidden">
          <StoredTabContent snapshot={props.snapshot} />
        </TabPanel>

        <TabPanel id="tidied" className="flex flex-col overflow-hidden">
          <TidiedTabContent snapshot={props.snapshot} />
        </TabPanel>

        <TabPanel id="alignment" className="flex flex-col overflow-hidden">
          <AlignmentTabContent
            snapshot={props.snapshot}
            markdownText={props.markdownText}
            schema={props.schema}
          />
        </TabPanel>
      </Tabs>
    </section>
  )
}

import {useCallback, useEffect, useState} from 'react'
import * as Y from 'yjs'
import {useLatencySharedRoot} from './yjs-latency-provider'

type TreeNode =
  | {
      type: 'block'
      key: string
      attrs: Record<string, unknown>
      children: TreeNode[]
    }
  | {type: 'text'; text: string; attrs: Record<string, string>}

function buildTree(yText: Y.XmlText): TreeNode[] {
  const delta = yText.toDelta() as Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, string>
  }>

  return delta.map((entry) => {
    if (typeof entry.insert === 'string') {
      return {
        type: 'text' as const,
        text: entry.insert,
        attrs: entry.attributes ?? {},
      }
    }

    const xmlText = entry.insert
    const attributes = xmlText.getAttributes()
    const key = (attributes._key as string) ?? '?'

    return {
      type: 'block' as const,
      key,
      attrs: attributes,
      children: buildTree(xmlText),
    }
  })
}

export function YjsTreeViewer() {
  const sharedRoot = useLatencySharedRoot(0)
  const [tree, setTree] = useState<TreeNode[]>([])

  const updateTree = useCallback(() => {
    if (sharedRoot) {
      setTree(buildTree(sharedRoot))
    }
  }, [sharedRoot])

  useEffect(() => {
    if (!sharedRoot) return

    updateTree()

    const handler = () => updateTree()
    sharedRoot.observeDeep(handler)
    return () => sharedRoot.unobserveDeep(handler)
  }, [sharedRoot, updateTree])

  if (!sharedRoot) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Yjs not active
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Empty document
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto font-mono text-xs p-2 space-y-0.5">
      <div className="text-gray-400 mb-1">Y.XmlText root</div>
      {tree.map((node, index) => (
        <TreeNodeView key={index} node={node} depth={0} />
      ))}
    </div>
  )
}

function TreeNodeView({node, depth}: {node: TreeNode; depth: number}) {
  const [collapsed, setCollapsed] = useState(false)
  const indent = depth * 16

  if (node.type === 'text') {
    return (
      <div style={{paddingLeft: indent}} className="flex items-baseline gap-1">
        <span className="text-green-600 dark:text-green-400">
          &quot;{node.text}&quot;
        </span>
        <TextAttrs attrs={node.attrs} />
      </div>
    )
  }

  const {_type, _key, ...restAttrs} = node.attrs

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        style={{paddingLeft: indent}}
        className="flex items-baseline gap-1 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left rounded px-1 -mx-1"
      >
        <span className="text-gray-400 w-3 shrink-0">
          {collapsed ? '▸' : '▾'}
        </span>
        <span className="text-blue-600 dark:text-blue-400">
          {_type as string}
        </span>
        <span className="text-gray-400">#{_key as string}</span>
        <BlockAttrs attrs={restAttrs} />
      </button>
      {!collapsed && (
        <div>
          {node.children.map((child, index) => (
            <TreeNodeView key={index} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function BlockAttrs({attrs}: {attrs: Record<string, unknown>}) {
  const entries = Object.entries(attrs).filter(([key]) => key !== 'children')
  if (entries.length === 0) return null

  return (
    <span className="text-gray-400">
      {entries.map(([key, value]) => (
        <span key={key} className="ml-1">
          <span className="text-purple-500 dark:text-purple-400">{key}</span>
          <span>=</span>
          <span className="text-amber-600 dark:text-amber-400">
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </span>
        </span>
      ))}
    </span>
  )
}

function TextAttrs({attrs}: {attrs: Record<string, string>}) {
  const entries = Object.entries(attrs)
  if (entries.length === 0) return null

  return (
    <span className="text-gray-400">
      {entries.map(([key, value]) => (
        <span key={key} className="ml-1">
          <span className="text-purple-500 dark:text-purple-400">{key}</span>
          <span>=</span>
          <span className="text-amber-600 dark:text-amber-400">{value}</span>
        </span>
      ))}
    </span>
  )
}

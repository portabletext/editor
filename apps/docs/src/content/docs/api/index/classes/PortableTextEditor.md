---
editUrl: false
next: false
prev: false
title: 'PortableTextEditor'
---

The main Portable Text Editor component.

## Extends

- `Component`\<[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<[`Editor`](/api/index/type-aliases/editor/) \| `undefined`\>\>

## Constructors

### new PortableTextEditor()

> **new PortableTextEditor**(`props`): [`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Parameters

##### props

[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<`undefined`\>

#### Returns

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Overrides

Component\<
PortableTextEditorProps\<Editor \| undefined\>
\>.constructor

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:131](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L131)

## Properties

### change$

> **change$**: [`EditorChanges`](/api/types/editor/type-aliases/editorchanges/)

An observable of all the editor changes.

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:117](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L117)

---

### context

> **context**: `unknown`

If using the new style context, re-declare this in your class to be the
`React.ContextType` of your `static contextType`.
Should be used with type annotation or static contextType.

#### Example

```ts
static contextType = MyContext
// For TS pre-3.7:
context!: React.ContextType<typeof MyContext>
// For TS 3.7 and above:
declare context: React.ContextType<typeof MyContext>
```

#### See

[React Docs](https://react.dev/reference/react/Component#context)

#### Inherited from

`Component.context`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:941

---

### props

> `readonly` **props**: `Readonly`\<[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<`undefined` \| [`Editor`](/api/index/type-aliases/editor/)\>\>

#### Inherited from

`Component.props`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:957

---

### schemaTypes

> **schemaTypes**: `PortableTextMemberSchemaTypes`

A lookup table for all the relevant schema types for this portable text type.

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:121](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L121)

---

### state

> **state**: `Readonly`\<\{\}\>

#### Inherited from

`Component.state`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:958

---

### contextType?

> `static` `optional` **contextType**: `Context`\<`any`\>

If set, `this.context` will be set at runtime to the current value of the given Context.

#### Example

```ts
type MyContext = number
const Ctx = React.createContext<MyContext>(0)

class Foo extends React.Component {
  static contextType = Ctx
  context!: React.ContextType<typeof Ctx>
  render () {
    return <>My context's value: {this.context}</>;
  }
}
```

#### See

[https://react.dev/reference/react/Component#static-contexttype](https://react.dev/reference/react/Component#static-contexttype)

#### Inherited from

`Component.contextType`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:917

---

### displayName

> `static` **displayName**: `string` = `'PortableTextEditor'`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:113](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L113)

---

### ~~propTypes?~~

> `static` `optional` **propTypes**: `any`

Ignored by React.

:::caution[Deprecated]
Only kept in types for backwards compatibility. Will be removed in a future major release.
:::

#### Inherited from

`Component.propTypes`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:923

## Methods

### componentDidCatch()?

> `optional` **componentDidCatch**(`error`, `errorInfo`): `void`

Catches exceptions generated in descendant components. Unhandled exceptions will cause
the entire component tree to unmount.

#### Parameters

##### error

`Error`

##### errorInfo

`ErrorInfo`

#### Returns

`void`

#### Inherited from

`Component.componentDidCatch`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1190

---

### componentDidMount()?

> `optional` **componentDidMount**(): `void`

Called immediately after a component is mounted. Setting state here will trigger re-rendering.

#### Returns

`void`

#### Inherited from

`Component.componentDidMount`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1169

---

### componentDidUpdate()

> **componentDidUpdate**(`prevProps`): `void`

Called immediately after updating occurs. Not called for the initial render.

The snapshot is only present if [getSnapshotBeforeUpdate](../../../../../../../../../api/index/classes/portabletexteditor/#getsnapshotbeforeupdate) is present and returns non-null.

#### Parameters

##### prevProps

[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<`undefined`\>

#### Returns

`void`

#### Overrides

`Component.componentDidUpdate`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:154](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L154)

---

### ~~componentWillMount()?~~

> `optional` **componentWillMount**(): `void`

Called immediately before mounting occurs, and before Component.render.
Avoid introducing any side-effects or subscriptions in this method.

Note: the presence of NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate
or StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps prevents
this from being invoked.

:::caution[Deprecated]
16.3, use ComponentLifecycle.componentDidMount componentDidMount or the constructor instead; will stop working in React 17
:::

#### Returns

`void`

#### See

- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state)
- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path)

#### Inherited from

`Component.componentWillMount`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1248

---

### ~~componentWillReceiveProps()?~~

> `optional` **componentWillReceiveProps**(`nextProps`): `void`

Called when the component may be receiving new props.
React may call this even if props have not changed, so be sure to compare new and existing
props if you only want to handle changes.

Calling Component.setState generally does not trigger this method.

Note: the presence of NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate
or StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps prevents
this from being invoked.

:::caution[Deprecated]
16.3, use static StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps instead; will stop working in React 17
:::

#### Parameters

##### nextProps

`Readonly`\<[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<`undefined` \| [`Editor`](/api/index/type-aliases/editor/)\>\>

#### Returns

`void`

#### See

- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props)
- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path)

#### Inherited from

`Component.componentWillReceiveProps`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1279

---

### componentWillUnmount()?

> `optional` **componentWillUnmount**(): `void`

Called immediately before a component is destroyed. Perform any necessary cleanup in this method, such as
cancelled network requests, or cleaning up any DOM elements created in `componentDidMount`.

#### Returns

`void`

#### Inherited from

`Component.componentWillUnmount`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1185

---

### ~~componentWillUpdate()?~~

> `optional` **componentWillUpdate**(`nextProps`, `nextState`): `void`

Called immediately before rendering when new props or state is received. Not called for the initial render.

Note: You cannot call Component.setState here.

Note: the presence of NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate
or StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps prevents
this from being invoked.

:::caution[Deprecated]
16.3, use getSnapshotBeforeUpdate instead; will stop working in React 17
:::

#### Parameters

##### nextProps

`Readonly`\<[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<`undefined` \| [`Editor`](/api/index/type-aliases/editor/)\>\>

##### nextState

`Readonly`\<\{\}\>

#### Returns

`void`

#### See

- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update)
- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path)

#### Inherited from

`Component.componentWillUpdate`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1311

---

### forceUpdate()

> **forceUpdate**(`callback`?): `void`

#### Parameters

##### callback?

() => `void`

#### Returns

`void`

#### Inherited from

`Component.forceUpdate`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:954

---

### getSnapshotBeforeUpdate()?

> `optional` **getSnapshotBeforeUpdate**(`prevProps`, `prevState`): `any`

Runs before React applies the result of Component.render render to the document, and
returns an object to be given to [componentDidUpdate](../../../../../../../../../api/index/classes/portabletexteditor/#componentdidupdate). Useful for saving
things such as scroll position before Component.render render causes changes to it.

Note: the presence of this method prevents any of the deprecated
lifecycle events from running.

#### Parameters

##### prevProps

`Readonly`\<[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<`undefined` \| [`Editor`](/api/index/type-aliases/editor/)\>\>

##### prevState

`Readonly`\<\{\}\>

#### Returns

`any`

#### Inherited from

`Component.getSnapshotBeforeUpdate`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1226

---

### render()

> **render**(): `Element`

#### Returns

`Element`

#### Overrides

`Component.render`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:213](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L213)

---

### setEditable()

> **setEditable**(`editable`): `void`

#### Parameters

##### editable

[`EditableAPI`](/api/types/editor/interfaces/editableapi/)

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:206](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L206)

---

### setState()

> **setState**\<`K`\>(`state`, `callback`?): `void`

#### Type Parameters

• **K** _extends_ `never`

#### Parameters

##### state

`null` | \{\} | (`prevState`, `props`) => `null` \| \{\} \| `Pick`\<\{\}, `K`\> | `Pick`\<\{\}, `K`\>

##### callback?

() => `void`

#### Returns

`void`

#### Inherited from

`Component.setState`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:949

---

### shouldComponentUpdate()?

> `optional` **shouldComponentUpdate**(`nextProps`, `nextState`): `boolean`

Called to determine whether the change in props and state should trigger a re-render.

`Component` always returns true.
`PureComponent` implements a shallow comparison on props and state and returns true if any
props or states have changed.

If false is returned, Component.render, `componentWillUpdate`
and `componentDidUpdate` will not be called.

#### Parameters

##### nextProps

`Readonly`\<[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<`undefined` \| [`Editor`](/api/index/type-aliases/editor/)\>\>

##### nextState

`Readonly`\<\{\}\>

#### Returns

`boolean`

#### Inherited from

`Component.shouldComponentUpdate`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1180

---

### ~~UNSAFE_componentWillMount()?~~

> `optional` **UNSAFE_componentWillMount**(): `void`

Called immediately before mounting occurs, and before Component.render.
Avoid introducing any side-effects or subscriptions in this method.

This method will not stop working in React 17.

Note: the presence of NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate
or StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps prevents
this from being invoked.

:::caution[Deprecated]
16.3, use ComponentLifecycle.componentDidMount componentDidMount or the constructor instead
:::

#### Returns

`void`

#### See

- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state)
- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path)

#### Inherited from

`Component.UNSAFE_componentWillMount`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1263

---

### ~~UNSAFE_componentWillReceiveProps()?~~

> `optional` **UNSAFE_componentWillReceiveProps**(`nextProps`): `void`

Called when the component may be receiving new props.
React may call this even if props have not changed, so be sure to compare new and existing
props if you only want to handle changes.

Calling Component.setState generally does not trigger this method.

This method will not stop working in React 17.

Note: the presence of NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate
or StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps prevents
this from being invoked.

:::caution[Deprecated]
16.3, use static StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps instead
:::

#### Parameters

##### nextProps

`Readonly`\<[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<`undefined` \| [`Editor`](/api/index/type-aliases/editor/)\>\>

#### Returns

`void`

#### See

- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props)
- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path)

#### Inherited from

`Component.UNSAFE_componentWillReceiveProps`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1297

---

### ~~UNSAFE_componentWillUpdate()?~~

> `optional` **UNSAFE_componentWillUpdate**(`nextProps`, `nextState`): `void`

Called immediately before rendering when new props or state is received. Not called for the initial render.

Note: You cannot call Component.setState here.

This method will not stop working in React 17.

Note: the presence of NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate
or StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps prevents
this from being invoked.

:::caution[Deprecated]
16.3, use getSnapshotBeforeUpdate instead
:::

#### Parameters

##### nextProps

`Readonly`\<[`PortableTextEditorProps`](/api/index/type-aliases/portabletexteditorprops/)\<`undefined` \| [`Editor`](/api/index/type-aliases/editor/)\>\>

##### nextState

`Readonly`\<\{\}\>

#### Returns

`void`

#### See

- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update)
- [https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path](https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path)

#### Inherited from

`Component.UNSAFE_componentWillUpdate`

#### Defined in

node_modules/.pnpm/@types+react@19.0.1/node_modules/@types/react/index.d.ts:1327

---

### activeAnnotations()

> `static` **activeAnnotations**(`editor`): `PortableTextObject`[]

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`PortableTextObject`[]

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:264](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L264)

---

### addAnnotation()

> `static` **addAnnotation**\<`TSchemaType`\>(`editor`, `type`, `value`?): `undefined` \| [`AddedAnnotationPaths`](/api/index/type-aliases/addedannotationpaths/)

#### Type Parameters

• **TSchemaType** _extends_ `object`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### type

`TSchemaType`

##### value?

#### Returns

`undefined` \| [`AddedAnnotationPaths`](/api/index/type-aliases/addedannotationpaths/)

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:277](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L277)

---

### blur()

> `static` **blur**(`editor`): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:283](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L283)

---

### delete()

> `static` **delete**(`editor`, `selection`, `options`?): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### selection

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

##### options?

[`EditableAPIDeleteOptions`](/api/types/editor/interfaces/editableapideleteoptions/)

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:287](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L287)

---

### findByPath()

> `static` **findByPath**(`editor`, `path`): [`undefined` \| `PortableTextSpan` \| `PortableTextObject` \| `PortableTextTextBlock`\<`PortableTextSpan` \| `PortableTextObject`\>, `undefined` \| `Path`]

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### path

`Path`

#### Returns

[`undefined` \| `PortableTextSpan` \| `PortableTextObject` \| `PortableTextTextBlock`\<`PortableTextSpan` \| `PortableTextObject`\>, `undefined` \| `Path`]

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:298](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L298)

---

### findDOMNode()

> `static` **findDOMNode**(`editor`, `element`): `undefined` \| `Node`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### element

`PortableTextSpan` | `PortableTextObject` | `PortableTextTextBlock`\<`PortableTextSpan` \| `PortableTextObject`\>

#### Returns

`undefined` \| `Node`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:292](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L292)

---

### focus()

> `static` **focus**(`editor`): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:301](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L301)

---

### focusBlock()

> `static` **focusBlock**(`editor`): `undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:305](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L305)

---

### focusChild()

> `static` **focusChild**(`editor`): `undefined` \| [`PortableTextChild`](/api/index/type-aliases/portabletextchild/)

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`undefined` \| [`PortableTextChild`](/api/index/type-aliases/portabletextchild/)

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:308](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L308)

---

### getFragment()

> `static` **getFragment**(`editor`): `undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[]

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[]

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:389](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L389)

---

### getSelection()

> `static` **getSelection**(`editor`): [`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:313](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L313)

---

### getValue()

> `static` **getValue**(`editor`): `undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[]

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[]

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:316](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L316)

---

### hasBlockStyle()

> `static` **hasBlockStyle**(`editor`, `blockStyle`): `boolean`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### blockStyle

`string`

#### Returns

`boolean`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:319](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L319)

---

### hasListStyle()

> `static` **hasListStyle**(`editor`, `listStyle`): `boolean`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### listStyle

`string`

#### Returns

`boolean`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:322](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L322)

---

### insertBlock()

> `static` **insertBlock**\<`TSchemaType`\>(`editor`, `type`, `value`?): `undefined` \| `Path`

#### Type Parameters

• **TSchemaType** _extends_ `object`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### type

`TSchemaType`

##### value?

#### Returns

`undefined` \| `Path`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:339](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L339)

---

### insertBreak()

> `static` **insertBreak**(`editor`): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:346](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L346)

---

### insertChild()

> `static` **insertChild**\<`TSchemaType`\>(`editor`, `type`, `value`?): `undefined` \| `Path`

#### Type Parameters

• **TSchemaType** _extends_ `object`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### type

`TSchemaType`

##### value?

#### Returns

`undefined` \| `Path`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:331](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L331)

---

### isAnnotationActive()

> `static` **isAnnotationActive**(`editor`, `annotationType`): `boolean`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### annotationType

`string`

#### Returns

`boolean`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:269](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L269)

---

### isCollapsedSelection()

> `static` **isCollapsedSelection**(`editor`): `boolean`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`boolean`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:325](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L325)

---

### isExpandedSelection()

> `static` **isExpandedSelection**(`editor`): `boolean`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`boolean`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:327](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L327)

---

### isMarkActive()

> `static` **isMarkActive**(`editor`, `mark`): `boolean`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### mark

`string`

#### Returns

`boolean`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:329](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L329)

---

### isObjectPath()

> `static` **isObjectPath**(`_editor`, `path`): `boolean`

#### Parameters

##### \_editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### path

`Path`

#### Returns

`boolean`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:355](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L355)

---

### isSelectionsOverlapping()

> `static` **isSelectionsOverlapping**(`editor`, `selectionA`, `selectionB`): `boolean`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### selectionA

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

##### selectionB

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

#### Returns

`boolean`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:403](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L403)

---

### isVoid()

> `static` **isVoid**(`editor`, `element`): `boolean`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### element

`PortableTextSpan` | `PortableTextObject` | `PortableTextTextBlock`\<`PortableTextSpan` \| `PortableTextObject`\>

#### Returns

`boolean`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:349](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L349)

---

### marks()

> `static` **marks**(`editor`): `string`[]

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`string`[]

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:361](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L361)

---

### redo()

> `static` **redo**(`editor`): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:399](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L399)

---

### removeAnnotation()

> `static` **removeAnnotation**\<`TSchemaType`\>(`editor`, `type`): `void`

#### Type Parameters

• **TSchemaType** _extends_ `object`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### type

`TSchemaType`

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:371](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L371)

---

### select()

> `static` **select**(`editor`, `selection`): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### selection

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:364](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L364)

---

### toggleBlockStyle()

> `static` **toggleBlockStyle**(`editor`, `blockStyle`): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### blockStyle

`string`

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:375](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L375)

---

### toggleList()

> `static` **toggleList**(`editor`, `listStyle`): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### listStyle

`string`

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:382](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L382)

---

### toggleMark()

> `static` **toggleMark**(`editor`, `mark`): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

##### mark

`string`

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:385](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L385)

---

### undo()

> `static` **undo**(`editor`): `void`

#### Parameters

##### editor

[`PortableTextEditor`](/api/index/classes/portabletexteditor/)

#### Returns

`void`

#### Defined in

[packages/editor/src/editor/PortableTextEditor.tsx:395](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/PortableTextEditor.tsx#L395)

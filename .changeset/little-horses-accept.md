---
'@portabletext/editor': patch
---

fix: discard deferred patches that conflict with incoming patches

When the editor is initialised it runs normalization on the content to ensure
spans have `marks` and blocks have `markDefs` etc.

The editor deliberately defers these local patches util it is marked dirty (a
non-normalization and non-remote operation happens in the editor). This is to
make sure the editor doesn't perform side effects just by being initialised.

This, however, can cause problems in a collaborative setting.

Imagine that:

1. Editor A loads with an initial value missing `marks` on a span
2. Editor A normalizes and adds `marks: []`, but defers the patch until the
   editor is dirty
3. Editor B also normalizes, then makes "foo" bold
4. Editor B emits a remote patch to set `marks` to `[]`, then a patch to set
   `marks` to `['strong']`
5. Editor A receives these patches and applies them. "foo" is now bold in both
   editors.
6. Editor A user starts typing
7. Editor A emits the deferred patch to set `marks` to `[]` along with the
   `diffMatchPatch` for the user's typing.

Now the text is bold in Editor A but not in Editor B.

To fix this, we now check if incoming patches conflict with deferred local
patches and if they do, the local patches are discarded.

In the case of a a value sync (someone sends an \`update value\` event to the
editor, deferred local patches are discarded without checking for conflicts.

The incoming value is either:

1. Not normalized -> differs from our current value -> we apply it ->
   normalization runs again -> fresh patches are generated if needed
2. Already normalized -> matches our current value -> our patches are
   redundant -> someone else already did the work

In both cases, the held-back patches are either stale (will be regenerated) or
redundant (already reflected remotely). Discarding them is the safest thing to
do.

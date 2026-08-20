---
'@portabletext/toolbar': patch
---

fix: accept `className` on toolbar schema `icon` components

The `icon` fields on the toolbar schema types were typed as a bare `React.ComponentType`, rejecting icon components that take a `className` prop, which is every common icon library. The type now accepts `React.ComponentType<{className?: string}>`; existing icons without props remain assignable.

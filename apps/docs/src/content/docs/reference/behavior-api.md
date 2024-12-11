---
title: Behavior API
description: Reference documentation for the Behavior API.
---

Reference docs for the behavior API.

## defineBehavior

Options Object
- on (string): Internal editor event
- guard (function or boolean): function accepts `context` and `event`, returns boolean
- actions (array): function accepts `context` and `event`, returns array of actions

## Behavior Event types

### Native event types

- copy
- paste
- key.down
- key.up

### Synthetic event types

- annotation.add
- annotation.remove
- annotation.toggle
- blur
- decorator.add
- decorator.remove
- decorator.toggle
- delete.backward
- delete.forward
- focus
- insert.block object
- insert.inline object
- insert.break
- insert.sort break
- insert.text
- list item.toggle
- style.toggle

## Behavior Actions

Actions as part of synthetic events

- annotation.add
- annotation.remove
- annotation.toggle
- blur
- decorator.add
- decorator.remove
- decorator.toggle
- delete.backward
- delete.forward
- focus
- insert.block object
- insert.inline object
- insert.break
- insert.sort break
- insert.text
- list item.toggle
- style.toggle

Additional actions

- insert.span
- insert.text block
- list item.add
- list item.remove
- move.block
- move.block down
- move.block up
- noop
- delete.block
- delete.text
- effect
- reselect
- select
- select.previous block
- select.next block
- style.add
- style.remove
- text block.set
- text block.unset
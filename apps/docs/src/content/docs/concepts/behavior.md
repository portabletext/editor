---
title: Behaviors
description: Description of behaviors
---

Behaviors are allow you to customize how users interact with the editor by hooking into events during the editing experience.

All behaviors follow this process:

1. Listen for an **event**.
2. Use a **guard** to decide if they should run or not.
3. Trigger a set of **actions** to perform on the editor.

<!-- Note about statecharts -->

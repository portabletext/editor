# Racetrack

A hosted playground and scenario-driven test runner for Portable Text Editor plugins.

This directory is the skeleton of the Racetrack app. The actual functionality (visual scenario authoring, in-browser scenario runner, plugin garage, engine viewer) is being built on the `feat/racetrack` long-running branch and lands on this skeleton over time.

## Develop

```
pnpm --filter racetrack dev
```

## Build

```
pnpm --filter racetrack build
```

The build output goes to `apps/racetrack/dist/` and is suitable for static hosting.

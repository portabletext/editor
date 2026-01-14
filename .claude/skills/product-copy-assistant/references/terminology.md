# Sanity Terminology Reference

## Core Principle

**Capitalize**: The specific Sanity product/feature
**Lowercase**: The concept generically or multiple instances

Quick test: "Am I talking about THE product or A concept?"

- THE Sanity Studio → Capitalized
- A studio, your studios, multiple studios → Lowercase

## Terms with Dual Usage

### Studio

**Capitalized: Sanity Studio**

- "Sanity Studio is a customizable content workspace."
- "Install Sanity Studio in your Next.js app."
- "Open Sanity Studio to edit your content."

**Lowercase: studio/studios**

- "Configure your studio with plugins."
- "Deploy multiple studios for different teams."
- "The studio configuration file."

**Edge cases** (lowercase):

- "Studio configuration" (type of configuration)
- "Studio tools" (unless specific named tools)
- "Embedded studio" (deployment method)

### Dashboard

**Capitalized: Sanity Dashboard**

- "Access the Sanity Dashboard at manage.sanity.io."

**Lowercase: dashboard/dashboards**

- "Create custom dashboards with widgets."
- "Your project dashboard displays key metrics."

### Canvas

**Capitalized: Canvas or Sanity Canvas**

- "Canvas is Sanity's AI-powered writing tool."
- "Sanity Canvas includes the Blip AI assistant."

**Lowercase**: Rarely used generically. Exception: "your canvas" for workspace within Canvas.

### Functions

**Capitalized: Sanity Functions**

- "Deploy Sanity Functions for serverless logic."

**Lowercase: functions/function**

- "Write functions to handle webhooks."
- "GROQ functions like `array::unique()`" (always lowercase)

### Actions

**Capitalized: Agent Actions, Document Actions**

- "Agent Actions API powers AI operations."
- "Configure Document Actions in Sanity Studio."

**Lowercase: actions/action**

- "Trigger actions based on content changes."

### Tasks

**Capitalized: Tasks** (the feature)

- "Tasks for Sanity Studio enables workflow management."

**Lowercase: task/tasks**

- "Create tasks for content updates."

### Comments

**Capitalized: Comments** (the feature)

- "Comments for Sanity Studio enables collaboration."

**Lowercase: comment/comments**

- "Leave comments on documents."

## Always Capitalized

- **Content Lake** (never lowercase)
- **Media Library** / **Media Library+** (never lowercase; use "library" for generic)
- **Portable Text** ("Portable Text is our rich text specification.")
- **GROQ** (always ALL CAPS)
- **Structure Tool** / **Vision Tool** / **Presentation Tool**

## Never Capitalized

- project/projects ("Create a new project.")
- dataset/datasets ("Create production and staging datasets.")
- document/documents ("Edit documents in real time.")
- workspace/workspaces ("Configure multiple workspaces.")

## Special Cases

### API/APIs

- Specific: "Content Lake API," "Agent Actions API"
- Generic: "our APIs," "the API," "API endpoints"

### CLI

- ALL CAPS for acronym: "The Sanity CLI"
- Lowercase spelled out: "The command-line interface"

### Perspectives

- Never capitalized, use backticks in technical docs: "the `published` perspective"

### Roles

- Capitalized for specific system roles: "the Administrator role"
- Lowercase when generic: "User roles control access."

## Writing Guidelines

### First Mention Rule

Use full product name first, then lowercase:

- ✅ "Sanity Studio provides…" then "Configure your studio…"
- ❌ "Studio provides…" then "Configure your Studio…"

### Possessive Forms

Possessives usually trigger lowercase:

- "Your studio's configuration"
- "The project's datasets"

### Plural Forms

Almost always lowercase:

- "Deploy multiple studios"
- "Manage your projects"

### In Code/Config

Match exact code casing:

- `defineConfig()` not DefineConfig()
- But in prose: "Configure the Structure Tool."

### Context

- Marketing: More liberal capitalization for emphasis
- Technical docs: Strict rules
- UI copy: Match the interface

## Common Mistakes

**Over-capitalization:**

- ❌ "Create a new Project in your Organization."
- ✅ "Create a new project in your organization."

**Under-capitalization:**

- ❌ "The content lake stores your data."
- ✅ "The Content Lake stores your data."

**Inconsistent usage:**

- ❌ "Sanity Studio is powerful. The Studio supports plugins."
- ✅ "Sanity Studio is powerful. The studio supports plugins."

## Deprecated Terms

- ~~Sanity Composable Content Cloud~~ → Content Operating System
- ~~Sanity Create~~ → Canvas
- ~~Desk Tool~~ → Structure Tool
- ~~Sanity Manage~~ → Sanity Dashboard
- ~~Datastore~~ → Content Lake

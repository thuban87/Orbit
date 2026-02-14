---
tags:
  - projects
  - orbit
  - brainstorm
created: 2026-02-13
status: brainstorm
---
# Orbit UX Overhaul — Brainstorm Overview

> **Purpose:** Capture the brainstorming direction for Orbit's next major UX improvements. This doc is a starting point for a deeper planning session in the dev environment.

---

## Problem Statement

The current Orbit workflow has friction at two key points:

1. **Adding new contacts** requires manually adding a template to a note and filling in all fields by hand. High friction, error-prone, easy to skip.
2. **Updating contacts** uses the QuickAdd plugin. It works, but feels clunky and inconsistent with Orbit's own UI patterns.

**Goal:** Bring both workflows into Orbit's native UI via modals, making contact management feel seamless and first-party.

---

## Proposed Architecture: Data-Driven Modal System

### Core Concept: "Dumb Modal, Smart Schema"

Build **one reusable form modal** that renders different field configurations based on a schema/data file. Instead of building N modals for N use cases, the modal is a generic renderer and the schema tells it what to display.

**Benefits:**
- Adding a new workflow = adding a new schema file, not a new modal class
- Consistent UX across all interactions
- Easier to maintain and extend
- Matches Switchboard's settings architecture pattern (proven in Brad's other plugins)

### Schema Architecture

**Built-in schemas:** TypeScript files compiled with the plugin (type-safe during development). Ship with the plugin in a `schemas/` directory.

**User-created schemas:** Markdown files with YAML frontmatter (Obsidian-native — users can create/edit them in Obsidian itself). Stored in a configurable vault directory (e.g., `System/Orbit/Schemas/`).

Both formats produce the same runtime data structure — same interface, two loaders. Same pattern as Quest Board's dungeon system (built-in dungeons ship with the plugin, user dungeons are added via data files).

**CSS per schema:** Each schema defines a `cssClass` property. The modal applies that class to its container, allowing different schemas to have distinct layouts/styling. Fields can also have `layout` hints (`half-width`, `full-width`, `inline`). The modal is still "dumb" — it just applies CSS classes from the schema data.

> [!TIP]
> Include an **"Example Schema"** button in settings that generates a template markdown file with all available field types and configuration options pre-filled, so users can see the format and modify from there.

### User Schema Format (Markdown)

```markdown
---
schema_id: conference-contact
schema_title: Add Conference Contact
fields:
  - key: name
    type: text
    label: Name
    required: true
  - key: company
    type: text
    label: Company
  - key: followUpPriority
    type: dropdown
    label: Follow-Up Priority
    options: [Hot Lead, Warm, Cold]
output:
  path: "Life/Social/People/Professional/{{name}}.md"
---
# {{name}}

> [!INFO] Conference Contact
> **Company:** {{company}}
> **Priority:** {{followUpPriority}}

## Follow-Up Tracker
- 

## Notes
- 
```

The YAML defines the modal fields; the body becomes the output file template. Users can add/remove sections and frontmatter properties freely.

### Example User Schemas (To Illustrate Flexibility)

| Schema | Purpose | Custom Fields |
|--------|---------|--------------|
| **Conference Contact** | Networking at events | Company, Role, Conference Met At, LinkedIn URL, Follow-Up Priority, Their Pitch, Your Promise, Follow-Up Deadline |
| **Service Provider** | Doctors, mechanics, etc. | Specialty, Office Address, Insurance Accepted, Office Hours, Visit Log |
| **Dating Prospect** | Dating app matches | Where Met, First Impression, Red/Green Flags, Date Log |

### Modal Contexts (Built-In)

| Context | Trigger | Fields | Output |
|---------|---------|--------|--------|
| **New Person** | Command palette / ribbon | Name, category, frequency, battery type, birthday, photo URL (with live preview), google contact URL, conversational fuel, small talk data | Creates new `.md` file from template in `People/{category}/` |
| **Update Contacts** | Command palette / ribbon | Card-based grid showing all contacts (orbit-aware, decay first) → click person → inline update panel (date picker, interaction note, save) | Updates frontmatter + appends to interaction log |
| **Edit Person** | Command palette / person note | Pulls existing frontmatter into editable fields | Updates file frontmatter in place |
| **Update This Person** | Command palette (requires person file open) | Skips picker, goes straight to update panel for current file. Shows notice if current file isn't a person file. | Updates frontmatter + appends to interaction log |
| **AI Message Suggest** | Command palette / ribbon | Orbit-aware contact picker (card grid, decay first) → generates message | Displays suggested message, copy to clipboard |

### Template Editability

The modal collects structured data and applies it to a **user-editable template file** in the vault. Users retain full control over:
- Frontmatter properties (add/remove as desired)
- Body sections and layout
- The modal handles input, the template handles formatting

Current template reference: `System/Templates/Person Template.md`

**Current template fields:**

**Frontmatter:** `tags`, `category`, `birthday`, `photo`, `google_contact`, `social_battery`, `frequency`, `last_contact`

**Body sections:** Quick Facts (Location, Relationship, Origin Story), Conversational Fuel (Last Talked About, Safe Topics, Shared Interests, Off-Limits), Small Talk Data (Key People, Pets, Current Big Thing), Gift Locker, Interaction Log

### Contact Picker / Update Modal Design

The update modal mirrors the **sidebar card grid** visual language:
- Card-based grid with photo, name, orbit status (color-coded), days since/until contact, battery icon
- Sorted by orbit status: **decay → wobble → stable**
- Optionally filterable to show only decaying orbits
- Clicking a card opens an **inline update panel** within the modal (not navigation to file)
- Enables batch updates: open once, update multiple people, close

### Photo Handling

- **In person files:** Already working via Dataview inline: `` `= "![|200](" + this.photo + ")"` ``
- **In New Person modal:** Live preview of photo after URL is pasted (UX improvement)
- **In card grid:** Photo displays in contact cards (already in orbit-state.json)

---

## Feature: AI-Powered Message Suggestions

### Flow

1. User runs command → **Orbit-aware card grid** opens (decaying orbits prioritized)
2. User selects a contact
3. Plugin reads the contact's `.md` file — pulls:
   - Conversational Fuel
   - Small Talk Data
   - Last interaction date + notes
   - Days since contact
   - Category & battery type
4. Sends structured prompt to LLM with all that context
5. Displays suggested opening message in a result modal
6. User can: **Copy to clipboard**, **Regenerate**, or **Dismiss**

### Prompt Template

Ships with a default prompt template, **editable by users** in settings. Reset-to-default button available.

```
You are helping me reconnect with someone I haven't talked to in a while. Write a casual, low-pressure opening text message.

Contact: {{name}}
Relationship: {{category}}
Days since last contact: {{daysSinceContact}}
Their social battery effect on me: {{socialBattery}}

What I know about them:
{{conversationalFuel}}

Small talk topics:
{{smallTalkData}}

Last interaction: {{lastInteraction}}

Guidelines:
- Keep it short and natural (1-3 sentences)
- Don't be overly enthusiastic or formal
- Reference something specific from our shared context if possible
- Match the tone to the relationship category (family = warm, friends = casual, community = friendly but lighter)
```

### AI Provider Architecture

#### Local Model (Desktop Default): Ollama

**Primary recommendation:** Ollama + **Llama 3.2 3B** (or current equivalent small model at time of development)
- ~3GB RAM usage during generation, unloads after ~5 min idle
- Ollama service itself uses ~50-100MB idle — negligible
- No GPU required (CPU inference, ~5-15 seconds for a short response)
- Perfect for this use case: small context window (one person file), short output (1-3 sentences)
- Works offline, no API keys, no cost, no data leaves machine

> [!IMPORTANT]
> Model recommendations in this doc are placeholders. Must be updated to current best-available models at time of development — the small model landscape changes fast.

**Ollama detection:** Deterministic only — checks `GET http://localhost:11434/` **only when the user triggers an AI command**, not periodic polling. If Ollama isn't running, shows a notice with setup instructions.

#### Cloud Providers (Mobile Default + Desktop Option)

Settings UI with provider-specific configuration:

| Provider | Config | Model Selection |
|----------|--------|-----------------|
| **Ollama (Local)** | Auto-detected | Dropdown populated from Ollama's installed models via API |
| **OpenAI** | API Key | Dropdown of curated models (update with releases) |
| **Anthropic** | API Key | Dropdown of curated models |
| **Google (Gemini)** | API Key | Dropdown of curated models |
| **Custom Endpoint** | URL + API Key | User types model name (for power users / self-hosted) |

#### Mobile Behavior

- **Desktop:** Defaults to Ollama (local). Falls back to cloud if not detected.
- **Mobile:** Ollama option hidden/disabled. Defaults to configured cloud provider. If no API key set, shows notice: "Configure a cloud AI provider in settings to use this feature on mobile."

---

## Implementation Priority (Suggested)

| Priority | Feature | Complexity | Value |
|----------|---------|------------|-------|
| 1 | **New Person Modal** | Medium | High — removes biggest friction point |
| 2 | **Update Contacts Modal** (card grid + inline update) | Medium | High — most frequent operation, replaces QuickAdd |
| 3 | **Edit Person Modal** | Low | Medium — less frequent but useful |
| 4 | **"Update This Person" Command** | Low | Medium — convenience shortcut |
| 5 | **AI Message Suggest** | Medium-High | High — killer feature, differentiator |

---

## Open Questions for Dev Session

- [ ] How does Orbit currently store state? Does `orbit-state.json` get regenerated from file frontmatter, or is it the source of truth?
- [ ] What's the best location for user schema files? `System/Orbit/Schemas/` or configurable in settings?
- [ ] Card grid layout: how many columns? Responsive or fixed?
- [ ] Should the update modal support batch operations (update multiple contacts before closing)?
- [ ] Ollama: what's the current best 3B-class model at time of development?

---

## Decisions Made (Session: 2026-02-13)

| Topic | Decision |
|-------|----------|
| Schema format (built-in) | TypeScript (type-safe, compiled with plugin) |
| Schema format (user-created) | Markdown with YAML frontmatter (Obsidian-native) |
| User schema extensibility | Same pattern as QB dungeons — users add markdown schema files to vault dir |
| Example schema helper | "Example Schema" button generates a template markdown file with all field types |
| CSS per schema | Schema-level `cssClass` property + field-level `layout` hints |
| Contact picker style | Card-based grid (mirrors sidebar visual language) |
| Update flow | Modal with card grid → inline update panel (not file navigation) |
| "Update This Person" | Separate command, requires person file open, shows notice if not |
| Template editability | User-editable template file in vault, modal just injects values |
| Photo in modal | Live preview after URL paste |
| AI default model (desktop) | Local via Ollama — small model (~3B class) |
| AI default (mobile) | Cloud provider (Ollama hidden/disabled) |
| AI prompt template | Default shipped, editable by users in settings |
| Cloud providers | OpenAI, Anthropic, Google + Custom endpoint |
| Model selection | Provider-specific dropdown (Ollama auto-detects installed models) |
| Ollama health check | Deterministic only — checks at command time, no periodic polling |
| Orbit state storage | TBD — investigate in dev session |

---

*Created: 2026-02-13 | Status: Brainstorm | Next step: Deep planning session in dev environment*

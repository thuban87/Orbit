# Getting started

Welcome to Orbit! This guide walks you through initial setup and creating your first contact.

## Install via BRAT

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) if you haven't already
2. Open BRAT settings → **Add Beta plugin**
3. Enter: `thuban87/Orbit`
4. Enable Orbit in **Settings → Community plugins**

## Configure settings

Open **Settings → Orbit** and configure these essentials:

| Setting | What it does | Default |
|---------|-------------|---------|
| **Person tag** | The tag Orbit uses to identify contact files | `people` |
| **Contacts folder** | Where new contacts are created | `People` |
| **Ignored paths** | Folders to skip when scanning for contacts | `Templates, Archive` |

> **Tip:** You don't need to pre-create category folders (Family, Friends, Work, etc.). Orbit creates them automatically when you assign a category to a new contact.

## Create your first contact

### Option 1: Use the "New Person" command

1. Open the command palette (`Ctrl/Cmd + P`)
2. Search for **"Orbit: New Person"**
3. Fill in the form (name, category, frequency, etc.)
4. Click **Create Contact**

### Option 2: Create manually

Create a markdown file with this frontmatter:

```yaml
---
tags:
  - people
frequency: Monthly
category: Friends
last_contact: 2026-02-19
social_battery: Charger
---
# Contact Name

## Conversational Fuel
- Topics to talk about

## Interaction Log
```

## Open the Orbit view

- Click the **people icon** in the left ribbon, or
- Use the command palette: **"Orbit: Open Orbit View"**

You'll see your contacts displayed as cards with color-coded status rings:

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | **Stable** | Recently contacted (under 80% of interval) |
| 🟡 Yellow | **Wobble** | Getting close to due (80–100% of interval) |
| 🔴 Red | **Decay** | Overdue for contact |
| ⏸️ Gray | **Snoozed** | Temporarily paused |

## Optional: Configure AI features

If you'd like AI-powered conversation suggestions:

1. Go to **Settings → Orbit → AI provider**
2. Choose a provider (OpenAI, Anthropic, Google Gemini, Ollama, or Custom)
3. Enter your API key
4. Select a model

See [AI Features](AI%20Features.md) for full details. **AI is completely optional.** All core features work without it.

## Next steps

- [Orbit Hub](Orbit%20Hub.md): learn the central command modal
- [Adding People](Adding%20People.md): details on contact creation
- [Updating and Editing](Updating%20and%20Editing.md): recording interactions

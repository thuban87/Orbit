# Orbit

**A relationship manager for Obsidian.** Keep your people in your orbit.

Orbit helps you stay connected with the people who matter. It tracks your contacts, their status, and conversation topics right inside your Obsidian vault. A visual dashboard shows who needs attention, and automated link detection keeps everything up to date without extra effort.

![Orbit Hub — your command center for managing contacts](docs/assets/screenshots/Orbit%20Hub.png)

---

## ⚠️ Beta notice

This plugin is in active development. Please **back up your vault** before installing. Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/thuban87/Orbit/issues).

---

## Features

- **Visual contact dashboard**: see all your contacts at a glance with color-coded status rings (green/yellow/red)
- **Orbit Hub**: a central modal for adding, updating, editing, and managing contacts
- **Automatic link detection**: type `[[Contact Name]]` anywhere and Orbit offers to mark them as contacted
- **Conversational Fuel tooltips**: hover over a contact to see topics you've saved for your next conversation
- **Custom schemas**: create your own contact templates with custom fields
- **Birthday alerts**: banner notifications when a contact's birthday is within 7 days
- **Weekly digest**: generate a markdown report of your contact activity
- **Right-click quick actions**: mark contacted, snooze, open note directly from the sidebar
- **AI message suggestions** *(optional)*: get personalized conversation starters powered by your choice of AI provider

> **AI is completely optional.** All core features work without configuring any AI provider. See [AI Features](docs/AI%20Features.md) for details.

![Sidebar view with contact cards and status rings](docs/assets/screenshots/Sidebar%20Menu.png)

---

## Installation (via BRAT)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) if you haven't already
2. Open BRAT settings → **Add Beta plugin**
3. Enter: `thuban87/Orbit`
4. BRAT will download and install Orbit automatically
5. Enable Orbit in **Settings → Community plugins**

For first-time setup, see the [Getting Started guide](docs/Getting%20Started.md).

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/Getting%20Started.md) | First-time setup and configuration |
| [Orbit Hub](docs/Orbit%20Hub.md) | The central command modal |
| [Sidebar View](docs/Sidebar%20View.md) | Quick-access contact dashboard |
| [Adding People](docs/Adding%20People.md) | Creating new contacts |
| [Custom Schemas](docs/Custom%20Schemas.md) | Creating custom contact templates |
| [Updating and Editing](docs/Updating%20and%20Editing.md) | Recording interactions and editing contacts |
| [AI Features](docs/AI%20Features.md) | Optional AI-powered suggestions |
| [Weekly Digest](docs/Weekly%20Digest.md) | Generating activity reports |

---

## Network disclosure

Orbit is a **local-first** plugin. No data leaves your device unless you explicitly configure an AI provider.

**When AI features are enabled**, the following data is sent to your chosen provider:

| Provider | Endpoint | Data sent |
|----------|----------|-----------|
| OpenAI | `api.openai.com/v1/chat/completions` | Contact name, category, status, and selected note sections |
| Anthropic | `api.anthropic.com/v1/messages` | Same as above |
| Google Gemini | `generativelanguage.googleapis.com` | Same as above |
| Ollama | `localhost:11434` (local) | Same as above (stays on your machine) |
| Custom | User-provided URL | Same as above |

- **No telemetry, analytics, or crash reporting** is collected
- **No data is sent** unless you click the "AI Suggest" button
- **API keys** are stored in Obsidian's `data.json` (plaintext). Treat them like passwords.

---

## License

[MIT](LICENSE) © Brad Wales

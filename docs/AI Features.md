# AI features

Orbit includes optional AI-powered conversation suggestions. **AI is completely optional** — all core features (tracking, updating, sidebar, hub) work without configuring any AI provider.

## What AI does in Orbit

When you select a contact and click **AI Suggest** in the [Orbit Hub](Orbit%20Hub.md), Orbit sends context about that contact to your chosen AI provider and gets back a personalized conversation starter — a short, warm check-in message tailored to your relationship.

## Supported providers

| Provider | Type | Cost | Notes |
|----------|------|------|-------|
| **Ollama** | Local | Free | Runs on your machine, no data leaves your device |
| **OpenAI** | Cloud | Pay-per-use | GPT models via API key |
| **Anthropic** | Cloud | Pay-per-use | Claude models via API key |
| **Google Gemini** | Cloud | Pay-per-use | Gemini models via API key |
| **Custom** | Cloud/Local | Varies | Any OpenAI-compatible endpoint |

## Setup

1. Go to **Settings → Orbit → AI provider**
2. Select your provider from the dropdown
3. Enter your API key (for cloud providers)
4. Select a model from the available options

For **Ollama**, make sure the Ollama server is running locally (`http://localhost:11434`). Models are auto-detected from your installation.

For **Custom endpoints**, you'll also need to provide the endpoint URL and model name.

## How suggestions work

When you request a suggestion, Orbit:

1. **Extracts context** from the contact's metadata:
   - Name, category, days since last contact
   - Social battery, last interaction type and date
2. **Pulls content from the contact's note** using section header placeholders (see below)
3. **Assembles a prompt** by filling in your prompt template with this context
4. **Sends it to your AI provider** and displays the result

## Section header placeholders

This is one of Orbit's most powerful features. In your prompt template, you can reference **any section heading** from a contact's note using `{{Section Name}}` syntax.

For example, if your contact's note has:

```markdown
## Conversational Fuel
- Likes hiking
- Just got a new dog

## Small Talk Data
- Works at Acme Corp
- Kids: two boys

## Work Notes
- Leading the new project
```

You can include any of these sections in your prompt template:

```
{{Conversational Fuel}}
{{Small Talk Data}}
{{Work Notes}}
```

Orbit extracts the content under that heading and inserts it into the prompt. If the section doesn't exist in a particular contact's note, it substitutes "None available."

### Built-in placeholders

These are always available, regardless of what's in the note:

| Placeholder | Source | Example |
|-------------|--------|---------|
| `{{name}}` | Contact name | "Dad" |
| `{{category}}` | Frontmatter category | "Family" |
| `{{daysSinceContact}}` | Calculated | "12" |
| `{{socialBattery}}` | Frontmatter | "Charger" |
| `{{lastInteraction}}` | Date + type | "2026-02-07 (call)" |

### Dynamic section placeholders

| Placeholder | Source |
|-------------|--------|
| `{{Conversational Fuel}}` | Content under `## Conversational Fuel` |
| `{{Small Talk Data}}` | Content under `## Small Talk Data` |
| `{{Any Heading}}` | Content under `## Any Heading` |

> **Tip:** Add custom sections to your contact notes and reference them in the prompt. For example, add `## Birthday Gift Ideas` to a note and use `{{Birthday Gift Ideas}}` in the prompt.

## Customizing the prompt

Go to **Settings → Orbit → Prompt template** to edit the full prompt text. The default prompt asks for a short, warm check-in message. You can modify it to:

- Change the tone (more formal, more casual, humorous)
- Add specific instructions ("always suggest a specific activity")
- Reference different sections from your notes
- Add or remove context fields

There's a **Reset to default** button if you want to start over.

## Making it sound like you

The AI doesn't know your voice, so you need to teach it. Some tips:

- Add phrases you'd actually use: *"Write like a laid-back friend, not a customer service rep"*
- Specify what to avoid: *"No em dashes. No corporate language."*
- Reference actual conversation patterns: *"I usually text, so keep it text-message length"*
- Use the guidelines section of your prompt to set boundaries

## Cost considerations

Each AI suggestion is **one API call**. For cloud providers:

- **OpenAI (GPT-4.1-nano):** ~$0.001 per suggestion
- **Anthropic (Claude Haiku):** ~$0.001 per suggestion
- **Google (Gemini Flash):** ~$0.001 per suggestion

Using Ollama is free (runs locally), but requires more setup.

## Network disclosure

When you click **AI Suggest**, Orbit sends the following data to your chosen provider:

| Data sent | Why |
|-----------|-----|
| Contact name | To personalize the message |
| Category | To adjust tone (family vs work) |
| Days since contact | To gauge urgency |
| Social battery | To adjust energy level |
| Last interaction | For continuity reference |
| Note section content | For topic-specific suggestions |

**Important notes:**
- Data is **only sent when you click the AI Suggest button** — never automatically
- **No telemetry, analytics, or usage tracking** is collected by Orbit
- **API keys** are stored in Obsidian's `data.json` file in plaintext — treat them like passwords
- Using **Ollama** keeps all data on your local machine

### API endpoints contacted

| Provider | URL |
|----------|-----|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| Anthropic | `https://api.anthropic.com/v1/messages` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| Ollama | `http://localhost:11434/api/generate` |
| Custom | User-provided URL |

# Adding people

There are several ways to add new contacts to Orbit.

## Using the "New Person" command

1. Open the command palette (`Ctrl/Cmd + P`)
2. Search for **"Orbit: New Person"**
3. If you have custom schemas, a picker will appear — choose a template
4. Fill in the form fields
5. Click **Create Contact**

You can also click the **Add** button in the [Orbit Hub](Orbit%20Hub.md).

## Built-in fields

The default "New Person" schema includes these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **Name** | Text | ✅ | Contact's full name (becomes the filename) |
| **Category** | Dropdown | ✅ | Family, Friends, Work, or Community |
| **Frequency** | Dropdown | ✅ | How often to check in (Daily through Yearly) |
| **Social battery** | Dropdown | | Charger, Neutral, or Drain |
| **Birthday** | Date | | MM-DD or YYYY-MM-DD format |
| **Photo** | Photo | | URL, local vault path, or wikilink |
| **Contact link** | Text | | External link (website, social media) |

## What happens when you create a contact

Orbit creates a markdown file with:

1. **Frontmatter** — all your form data as YAML properties, plus the `people` tag
2. **Body** — loaded from your template file (configured in settings), or a default template with `## Conversational Fuel` and `## Interaction Log` sections

### File placement

Contacts are saved to `{Contacts Folder}/{Category}/{Name}.md`. For example, if your contacts folder is `People` and you set the category to `Family`:

```
People/Family/Dad.md
```

> **Category folders are created automatically.** You don't need to pre-create them.

## Photo options

The photo field accepts three formats:

| Format | Example | Notes |
|--------|---------|-------|
| **URL** | `https://example.com/photo.jpg` | Loaded directly from the web |
| **Vault path** | `Assets/Photos/dad.jpg` | Relative path within your vault |
| **Wikilink** | `[[Assets/Photos/dad.jpg]]` | Obsidian-style link |

If you paste a URL during contact creation, Orbit can optionally download the image to your vault. See **Settings → Photos** to configure this behavior:

- **Ask** — prompts you to download or keep the URL
- **Always** — automatically downloads
- **Never** — keeps the URL as-is

## Custom schemas

Want different fields for different types of contacts? See [Custom Schemas](Custom%20Schemas.md) to create your own templates.

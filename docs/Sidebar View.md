# Sidebar view

The sidebar is your quick-hit interface. Come here to see contact statuses at a glance, update files directly without going through the hub modals, or quickly mark contacts as contacted via right-click.

![The Orbit sidebar view](assets/screenshots/Sidebar%20Menu.png)

## Opening the sidebar

- Use the command palette: **"Orbit: Open Orbit View"**
- The view opens in the right sidebar panel

## Contact cards

Each contact is shown as a card with:

- **Avatar**: photo or initials
- **Name**: file basename
- **Status ring**: colored border (green = stable, yellow = wobble, red = decay, gray = snoozed)

### Hover for Conversational Fuel

Hover over any contact card to see a tooltip with their **Conversational Fuel**: topics you've saved under the `## Conversational Fuel` heading in their note. Great for a quick refresher before reaching out.

## Sorting

Use the sort controls in the header bar:

| Sort option | What it does |
|-------------|-------------|
| **Status** | Decaying contacts first, then wobble, then stable |
| **Name** | Alphabetical A–Z |

## Filtering

Filter contacts by:

| Filter | What it does |
|--------|-------------|
| **Category** | Show only Family, Friends, Work, etc. |
| **Battery type** | Show only Charger, Neutral, or Drain contacts |

## Click actions

| Action | What happens |
|--------|-------------|
| **Click** | Opens the contact's note |
| **Ctrl/Cmd + Click** | Opens the note in a new tab |

## Right-click context menu

Right-click any contact card for quick actions:

| Menu item | What it does |
|-----------|-------------|
| **Mark contacted** | Updates `last_contact` to today |
| **Snooze 1 week** | Sets status to snoozed for 7 days |
| **Open note** | Opens the contact's file |

## Birthday banner

When a contact's birthday is within the next 7 days, a banner appears at the top of the sidebar alerting you. Birthdays are pulled from the `birthday` frontmatter field (format: `MM-DD` or `YYYY-MM-DD`).

# Updating and editing contacts

Orbit provides several ways to record interactions and modify contact details.

## Recording interactions

### Via the Orbit Hub

1. Open the [Orbit Hub](Orbit%20Hub.md)
2. Select a contact
3. Click **Update**
4. Choose the interaction type (call, text, in-person, email, other)
5. Optionally add a note about the interaction
6. Click **Update**

This updates `last_contact` to today and appends an entry to the **Interaction Log** section of the contact's note.

![Updating a contact](assets/screenshots/Update%20Contact.png)

### Via the sidebar context menu

1. Open the [sidebar view](Sidebar%20View.md)
2. Right-click a contact card
3. Select **Mark contacted**

This is the fastest way. It immediately sets `last_contact` to today without opening any modal.

### Via automatic link detection (The Tether)

This is Orbit's killer feature. When you type a contact's name as a wikilink anywhere in your vault (like `[[Dad]]` in a daily note), Orbit detects it and prompts you:

> "Update [[Dad]]?"

Clicking the prompt updates their `last_contact` to today. This means **your contacts stay up to date just by taking notes naturally**.

**How it works:**
- Orbit monitors your active editor for wikilinks (debounced by 2 seconds)
- When it detects a link that matches a tracked contact, it checks if they've already been marked today
- If not, it shows a notification with an update button
- The detection only triggers once per contact per day

## Editing contact details

### Via the Orbit Hub

1. Open the [Orbit Hub](Orbit%20Hub.md)
2. Select a contact
3. Click **Edit**
4. Modify any fields (category, frequency, social battery, birthday, etc.)
5. Click **Save**

![Editing a contact](assets/screenshots/Edit%20Contact.png)

### Via the "Update This Person" command

When you have a contact's file open in the editor:

1. Open the command palette (`Ctrl/Cmd + P`)
2. Search for **"Orbit: Update This Person"**
3. The Hub opens directly to the update view for that contact

## Snoozing contacts

Sometimes you need to temporarily pause tracking for a contact (e.g., they're on vacation, or you've agreed to catch up next month).

### To snooze:
- Right-click a contact in the sidebar → **Snooze 1 week**

### What snoozing does:
- Sets the contact's status to **Snoozed** (gray, ⏸️ icon)
- They won't appear as decaying or wobbling
- When the snooze period expires, normal status tracking resumes

The snooze date is stored in the `snooze_until` frontmatter field. You can manually edit this to set a custom snooze duration.

## Interaction types

When updating a contact, you can specify how you interacted:

| Type | Icon | When to use |
|------|------|-------------|
| **Call** | 📞 | Phone or video call |
| **Text** | 💬 | SMS, messaging apps, social media DM |
| **In-person** | 🤝 | Face-to-face meeting |
| **Email** | 📧 | Email exchange |
| **Other** | 📌 | Anything else |

The interaction type is stored in the `last_interaction` frontmatter field and helps the AI generate more relevant suggestions (if configured).

## Interaction log

Every update appends an entry to the `## Interaction Log` section of the contact's note:

```markdown
## Interaction Log
- 2026-02-19: Called to catch up about the new job
- 2026-02-12: Ran into them at the coffee shop
- 2026-02-01: Quick text to check in
```

The heading text is configurable in **Settings → Interaction log heading**.

# Orbit Hub

The Orbit Hub is your command center for managing contacts. It's a modal window that gives you quick access to all contact operations in one place.

![The Orbit Hub modal](assets/screenshots/Orbit%20Hub.png)

## Opening the Hub

- Click the **people icon** (👥) in the left ribbon
- Or use the command palette: **"Orbit: Orbit Hub"**

> **Tip:** Assign a hotkey to the "Orbit Hub" command for instant access. Go to **Settings → Hotkeys**, search for "Orbit Hub", and set your preferred key combo.

## Contact grid

The hub displays all your contacts in a grid layout. Each card shows:

- **Avatar**: photo if available, initials otherwise
- **Name**: contact's file name
- **Status ring**: colored border indicating relationship health (green/yellow/red)
- **Category badge**: Family, Friends, Work, etc.

Contacts are sorted by status (decaying contacts first) so you can see who needs attention immediately.

## Actions

### Add (➕)

Opens the "New Person" form to create a new contact. If you have custom schemas configured, you'll see a picker to choose which template to use.

See [Adding People](Adding%20People.md) for details.

### Update

Select a contact, then click Update to record a new interaction. You can:

- Set the interaction type (call, text, in-person, email, other)
- Add a note about the interaction
- The contact's `last_contact` date is automatically updated to today

![Updating a contact via the Hub](assets/screenshots/Update%20Contact.png)

### Edit

Opens an edit form for the selected contact, allowing you to change any of their frontmatter fields (category, frequency, social battery, birthday, photo, etc.).

![Editing a contact's details](assets/screenshots/Edit%20Contact.png)

### AI Suggest (✨)

Generates a personalized conversation starter for the selected contact using your configured AI provider. The suggestion is based on the contact's:

- Relationship context (category, days since contact, social battery)
- Conversational Fuel section content
- Any other note sections referenced in your prompt template

See [AI Features](AI%20Features.md) for setup and customization.

### Search and filter

Use the search bar to filter contacts by name. The grid updates in real-time as you type.

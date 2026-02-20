# Weekly digest

The weekly digest command generates a markdown report summarizing your contact activity.

## Running the digest

1. Open the command palette (`Ctrl/Cmd + P`)
2. Search for **"Orbit: Weekly Digest"**
3. A new file is created and opened automatically

## What it generates

The digest file is named `Orbit Weekly Digest YYYY-MM-DD.md` and created in your vault root. It contains three sections:

### Contacted this week

Contacts whose `last_contact` date falls within the past 7 days:

```markdown
## 📞 Contacted This Week (3)
- ✅ Dad (2026-02-19)
- ✅ Sarah (2026-02-17)
- ✅ Mike (2026-02-15)
```

### Needs attention

Contacts in **decay** status (overdue for contact):

```markdown
## 🔴 Needs Attention (2)
- 🔴 Uncle Bob (last: 45 days ago)
- 🔴 College Friend (last: never)
```

### Snoozed

Contacts currently snoozed:

```markdown
## ⏸️ Snoozed (1)
- ⏸️ Neighbor Dave
```

### Footer

A total contact count at the bottom:

```
---
*Total contacts: 24*
```

## Tips

- **Run it weekly** as part of a Sunday review or Monday planning session
- Running the command on the same day updates the existing digest file rather than creating a duplicate
- The digest is a regular markdown file. You can edit it, add notes, or link it from your daily note

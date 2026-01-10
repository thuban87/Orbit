---
tags:
  - projects
  - active
  - orbit
---
# CLAUDE.md - Orbit

**Purpose:** Instructions for AI assistants working on the **Orbit** project.
**Last Updated:** January 9, 2026

---

## ⚠️ CRITICAL: Git Protocol
**DO NOT perform git commands.**
*   The user will handle all git operations.
*   **Your Job:** Suggest commit messages/descriptions when a task is done.
*   **Remind:** When starting a new task, remind the user to check branches.

---

## Project Overview
**Orbit** is a Relationship Manager plugin for Obsidian.
**Goal:** Prevent "Social Object Permanence" failure via a visual HUD and automated tracking.

### Core Metaphors
*   **Orbit:** The `frequency` a contact should be contacted (Weekly/Monthly).
*   **Decay:** The status (Green/Yellow/Red) based on `last_contact`.
*   **Fuel:** The "Conversational Fuel" section of a note.

---

## Project Structure

```
orbit/
├── CLAUDE.md                    # This file
├── docs/
│   ├── Handoff Log.md           # Session tracking (START HERE)
│   ├── Project Summary.md       # Project overview
│   ├── ADR-001-Architecture.md  # Core architectural decisions
│   └── Feature Priority List.md # Roadmap
├── src/
│   ├── main.ts                  # Plugin entry point
│   ├── settings.ts              # Settings tab
│   ├── views/
│   │   ├── OrbitView.ts         # Obsidian View Shell
│   │   └── OrbitDashboard.tsx   # React Root
│   ├── components/
│   │   ├── ContactGrid.tsx
│   │   └── ContactCard.tsx
│   └── services/
│       ├── OrbitIndex.ts        # The "Radar" (Data Logic)
│       └── LinkListener.ts      # The "Tether" (Event Logic)
├── manifest.json
└── esbuild.config.mjs
```

---

## Working With Brad (User Profile)

### ADHD Considerations
*   **Momentum is Key:** If a build fails or setup is tedious, motivation drops. Ensure commands work first time.
*   **Visuals Matter:** He responds well to UI/UX improvements.
*   **Micro-Steps:** Don't say "Build the Indexer." Say "Let's define the `OrbitContact` interface first."

### Development Style
*   **React Preference:** He is comfortable with React components.
*   **Functional:** Prefers functional components + Hooks over Class components.
*   **Clean Code:** Likes separation of concerns (Logic in `services/`, UI in `components/`).

---

## Common Patterns & API Reference

### React View Mounting
```typescript
// views/OrbitView.ts
import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { OrbitDashboard } from "./OrbitDashboard";

export const VIEW_TYPE_ORBIT = "orbit-view";

export class OrbitView extends ItemView {
  root: Root | null = null;

  constructor(leaf: WorkspaceLeaf) { super(leaf); }
  getViewType() { return VIEW_TYPE_ORBIT; }
  getDisplayText() { return "Orbit"; }

  async onOpen() {
    this.root = createRoot(this.containerEl.children[1]);
    this.root.render(<OrbitDashboard plugin={this.app.plugins.plugins.orbit} />);
  }

  async onClose() { this.root?.unmount(); }
}
```

### Metadata Cache Listener
```typescript
// services/OrbitIndex.ts
this.registerEvent(
  this.app.metadataCache.on("changed", (file) => {
    // Check if file is a Person
    // Debounce update
    // Update Index
  })
);
```

### Frontmatter Update (Safe)
```typescript
// services/ContactManager.ts
app.fileManager.processFrontMatter(file, (frontmatter) => {
  frontmatter["last_contact"] = moment().format("YYYY-MM-DD");
});
```

---

## Error Handling Guidelines

### UI Errors (React)
*   **Fallback:** Use an `<ErrorBoundary>` component in `OrbitDashboard` to prevent the whole view from crashing white-screen.
*   **Missing Data:** If `frequency` is missing, default to "Monthly" (don't crash).
*   **Missing Avatar:** If `photo` URL fails, render initials (e.g., "BW") in a colored circle.

### Logic Errors
*   **Date Parsing:** Use `moment(dateString, ["YYYY-MM-DD", "ISO_8601"], true)` to be strict but flexible.
*   **Permissions:** Always check if `file` exists before trying to read/write.

---

## Checklist Before Coding
- [ ] Have we confirmed the "Feature Phase" in the Priority List?
- [ ] Is the user on the correct git branch?
- [ ] Do we understand the specific requirement (e.g., "Link Listener logic")?
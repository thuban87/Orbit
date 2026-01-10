---
tags:
  - projects
  - active
  - orbit
  - docs
---
# Orbit - Feature Priority List

**Last Updated:** January 9, 2026
**Version:** 0.0.0 (Pre-Development)

---

## Phase 1: Foundation & The "Radar" (Indexing)

**Goal:** Plugin loads, finds "Person" files, and builds an in-memory index of their status.

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 1 | **Project Scaffold** | Initialize `main.ts`, `manifest.json`, `styles.css`. Setup `esbuild` for React. | 1h |
| 2 | **Settings Interface** | Create tab. Add fields: `Person Tag` (default `#person`), `Ignored Paths`. | 1h |
| 3 | **Type Definitions** | Define `OrbitContact` interface (`file`, `frequency`, `lastContact`, `status`). | 0.5h |
| 4 | **Vault Indexer** | logic to scan `metadataCache` for the target tag. Build `Map<string, OrbitContact>`. | 2h |
| 5 | **Status Logic** | Implement `calculateStatus(lastContact, frequency)` returning `Stable` (Green), `Wobble` (Yellow), `Decay` (Red). | 1h |
| 6 | **Debug Command** | Add "Orbit: Dump Index" command to console.log the current state for verification. | 0.5h |

**Deliverable:** You can open Obsidian console and see a structured list of all your contacts with their calculated "Orbital Health."

---

## Phase 2: The "Window" (React HUD)

**Goal:** Visualizing the index in the sidebar.

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 7 | **View Registration** | Register `OrbitView` in `main.ts` and attach to Right Sidebar. | 1h |
| 8 | **React Mount** | Configure `createRoot` and mount a basic "Hello World" component. | 1h |
| 9 | **Data Context** | Create `OrbitContext` to pass the plugin's `OrbitIndex` to React components. | 2h |
| 10 | **Grid Layout** | CSS Grid implementation for the avatars (`ContactGrid.tsx`). | 2h |
| 11 | **Contact Card** | Component (`ContactCard.tsx`) showing Avatar, Name, and Status Ring (border color). | 2h |
| 12 | **Reactivity** | Ensure the View re-renders when `metadataCache` updates a file. | 2h |

**Deliverable:** A functioning sidebar view showing your contacts. Changing a file's frontmatter instantly updates the view.

---

## Phase 3: The "Tether" (Link Listener)

**Goal:** Automating the maintenance via the "Link Listener."

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 13 | **Event Hook** | Subscribe to `app.workspace.on('editor-change')` (Debounced 2s). | 1h |
| 14 | **Link Parser** | Regex scan current line/file for `[[Wikilinks]]`. | 2h |
| 15 | **Candidate Check** | Cross-reference links against `OrbitIndex`. Ignore if `last_contact` == Today. | 1h |
| 16 | **Update Prompt** | Show `new Notice()` with a button: "Update [[Dad]]?" | 1h |
| 17 | **Writer Logic** | Implement `updateContact(file)` using `app.fileManager.processFrontMatter`. | 2h |

**Deliverable:** Typing `[[Dad]]` in a Daily Note triggers a prompt. Clicking it updates `Dad.md` to today's date.

---

## Phase 4: The "Bridge" (Conversational Fuel)

**Goal:** Reducing social friction via tooltips.

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 18 | **Content Reader** | `vault.read(file)` logic to fetch file content on hover. | 1h |
| 19 | **Section Parser** | Regex to extract text under `## Conversational Fuel`. | 2h |
| 20 | **Hover State** | Add hover event to `ContactCard`. | 1h |
| 21 | **Tooltip UI** | Absolute positioned div showing the extracted text. | 2h |
| 22 | **Caching** | Store parsed "Fuel" in memory to avoid repeated reads. | 1h |

**Deliverable:** Hovering over a contact shows their "Safe Topics" and "Last Talked About."

---

## Phase 5: Polish & UX

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 23 | **Sorting** | Sort HUD by `Status` (Red first) or `Name`. | 1h |
| 24 | **Filtering** | "Battery Charger" toggle (Show only `battery: Charger`). | 1h |
| 25 | **Click Action** | Click avatar -> Opens the note. Ctrl+Click -> Open in new tab. | 0.5h |
| 26 | **Empty States** | "No contacts found" help text. | 0.5h |

---

## Technical Debt / Risks to Watch

*   **Large Vaults:** `metadataCache` events fire *a lot*. Debouncing Phase 3 is critical.
*   **Image Loading:** Avatars are external URLs. Need a fallback image if URL fails or is empty.
*   **Theme Compatibility:** Ensure CSS variables work with Light/Dark mode and different themes.

---

## Development Totals
*   **Phase 1:** ~6 hours
*   **Phase 2:** ~10 hours
*   **Phase 3:** ~7 hours
*   **Phase 4:** ~7 hours
*   **Total MVP:** ~30 hours
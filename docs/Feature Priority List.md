---
tags:
  - projects
  - active
  - orbit
  - docs
---
# Orbit - Feature Priority List

**Last Updated:** February 14, 2026
**Version:** 0.1.0

---

## Phase 1: Foundation & The "Radar" (Indexing) ✅

**Goal:** Plugin loads, finds "Person" files, and builds an in-memory index of their status.

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 1 | **[x] Project Scaffold** | Initialize `main.ts`, `manifest.json`, `styles.css`. Setup `esbuild` for React. | 1h |
| 2 | **[x] Settings Interface** | Create tab. Add fields: `Person Tag` (default `#person`), `Ignored Paths`. | 1h |
| 3 | **[x] Type Definitions** | Define `OrbitContact` interface (`file`, `frequency`, `lastContact`, `status`). | 0.5h |
| 4 | **[x] Vault Indexer** | logic to scan `metadataCache` for the target tag. Build `Map<string, OrbitContact>`. | 2h |
| 5 | **[x] Status Logic** | Implement `calculateStatus(lastContact, frequency)` returning `Stable` (Green), `Wobble` (Yellow), `Decay` (Red). | 1h |
| 6 | **[x] Debug Command** | Add "Orbit: Dump Index" command to console.log the current state for verification. | 0.5h |

**Deliverable:** You can open Obsidian console and see a structured list of all your contacts with their calculated "Orbital Health."

---

## Phase 2: The "Window" (React HUD) ✅

**Goal:** Visualizing the index in the sidebar.

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 7 | **[x] View Registration** | Register `OrbitView` in `main.ts` and attach to Right Sidebar. | 1h |
| 8 | **[x] React Mount** | Configure `createRoot` and mount a basic "Hello World" component. | 1h |
| 9 | **[x] Data Context** | Create `OrbitContext` to pass the plugin's `OrbitIndex` to React components. | 2h |
| 10 | **[x] Grid Layout** | CSS Grid implementation for the avatars (`ContactGrid.tsx`). | 2h |
| 11 | **[x] Contact Card** | Component (`ContactCard.tsx`) showing Avatar, Name, and Status Ring (border color). | 2h |
| 12 | **[x] Reactivity** | Ensure the View re-renders when `metadataCache` updates a file. | 2h |

**Deliverable:** A functioning sidebar view showing your contacts. Changing a file's frontmatter instantly updates the view.

---

## Phase 3: The "Tether" (Link Listener) ✅

**Goal:** Automating the maintenance via the "Link Listener."

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 13 | **[x] Event Hook** | Subscribe to `app.workspace.on('editor-change')` (Debounced 2s). | 1h |
| 14 | **[x] Link Parser** | Regex scan current line/file for `[[Wikilinks]]`. | 2h |
| 15 | **[x] Candidate Check** | Cross-reference links against `OrbitIndex`. Ignore if `last_contact` == Today. | 1h |
| 16 | **[x] Update Prompt** | Show `new Notice()` with a button: "Update [[Dad]]?" | 1h |
| 17 | **[x] Writer Logic** | Implement `updateContact(file)` using `app.fileManager.processFrontMatter`. | 2h |

**Deliverable:** Typing `[[Dad]]` in a Daily Note triggers a prompt. Clicking it updates `Dad.md` to today's date.

---

## Phase 4: The "Bridge" (Conversational Fuel) ✅

**Goal:** Reducing social friction via tooltips.

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 18 | **[x] Content Reader** | `vault.read(file)` logic to fetch file content on hover. | 1h |
| 19 | **[x] Section Parser** | Regex to extract text under `## Conversational Fuel`. | 2h |
| 20 | **[x] Hover State** | Add hover event to `ContactCard`. | 1h |
| 21 | **[x] Tooltip UI** | Absolute positioned div showing the extracted text. | 2h |
| 22 | **[x] Caching** | Store parsed "Fuel" in memory to avoid repeated reads. | 1h |

**Deliverable:** Hovering over a contact shows their "Safe Topics" and "Last Talked About."

---

## Phase 5: Polish & UX ✅

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 23 | **[x] Sorting** | Sort HUD by `Status` (Red first) or `Name`. | 1h |
| 24 | **[x] Filtering** | "Battery Charger" toggle (Show only `battery: Charger`). | 1h |
| 25 | **[x] Click Action** | Click avatar -> Opens the note. Ctrl+Click -> Open in new tab. | 0.5h |
| 26 | **[x] Empty States** | "No contacts found" help text. | 0.5h |

---

## Phase 6: Advanced Features ✅

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 27 | **[ ] Health Score** | Add 0-100% health score for granular status sorting. (Math TBD) | 2h |
| 28 | **[x] Snooze Status** | 4th status (`snoozed`) with `snooze_until: YYYY-MM-DD` field. ⏸️ icon. | 2h |
| 29 | **[x] Last Interaction Type** | Track `last_interaction: call | text | in-person | email` for variety suggestions. | 1h |
| 30 | **[x] Quick Actions Menu** | Right-click context menu: "Mark contacted", "Snooze 1 week", "Open note". | 2h |
| 31 | **[x] Birthday/Anniversary Alerts** | Banner at top of HUD when contact's birthday is within 7 days. | 2h |
| 32 | **[x] Weekly Digest Command** | "Orbit: Weekly Summary" generates markdown report of contacts made + overdue. | 2h |

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
*   **Phase 5:** ~3 hours
*   **Phase 6:** ~11 hours
*   **Total:** ~44 hours

---

## UX Overhaul Project

> **Started:** 2026-02-14
> **Full Details:** [[UX Overhaul - Implementation Plan]]
> **Session Log:** [[UX Overhaul Session Log]]

- [x] Phase 0 — Test Infrastructure & Baseline Tests
- [x] Phase 1 — Schema System & Form Modal Foundation
- [x] Phase 1.5 — Schema & Form Modal Tests
- [ ] Phase 2 — ContactManager Service & New Person Modal
- [ ] Phase 2.5 — ContactManager & New Person Tests
- [ ] Phase 3 — Contact Picker Modal
- [ ] Phase 3.5 — Contact Picker Tests
- [ ] Phase 4 — Update Contacts Flow
- [ ] Phase 4.5 — Update Contacts Tests
- [ ] Phase 5 — Edit Person & Update This Person
- [ ] Phase 5.5 — Edit & Update This Person Tests
- [ ] Phase 6 — User Schema System
- [ ] Phase 6.5 — User Schema System Tests
- [ ] Phase 7 — AI Provider Architecture
- [ ] Phase 7.5 — AI Provider Tests
- [ ] Phase 8 — AI Message Suggest Feature
- [ ] Phase 8.5 — AI Message Suggest Tests
- [ ] Phase 9 — Debug Logging System
- [ ] Phase 9.5 — Debug Logging Tests
- [ ] Phase 10 — Polish, Integration & Final Settings
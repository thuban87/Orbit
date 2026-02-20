---
tags:
  - projects
  - active
  - orbit
  - docs
---
# ADR-001: Orbit Core Architecture

**Status:** Accepted
**Date:** January 9, 2026
**Last Updated:** January 9, 2026

---

## Context

Building an Obsidian plugin ("Orbit") to manage social relationships and "Object Permanence."
**Problem:** ADHD "out of sight, out of mind" leads to relationship decay. Manual tracking in "Social Directory" requires active maintenance, which is frequently neglected.
**Goal:** Create a system that *passively* tracks interactions and *actively* visualizes relationship status without requiring manual data entry.

---

## Decisions

### 1. Data Source: Distributed Frontmatter (Stateless)

**Decision:** The "Truth" lives in the individual Person Notes, not in a central plugin database or `data.json`. The plugin aggregates this data into an in-memory index on load.

**Schema:**
```yaml
tags: #person
frequency: Weekly | Bi-Weekly | Monthly | Quarterly
last_contact: YYYY-MM-DD
social_battery: Charger | Neutral | Drain
```

**Rationale:**
*   **User Ownership:** Data remains portable and readable without the plugin.
*   **Interoperability:** Compatible with Dataview, graph view, and other community plugins.
*   **Resilience:** If the plugin crashes or is uninstalled, the data is preserved in the notes.

**Trade-off:** Performance cost of scanning the vault on startup (mitigated by Obsidian's `metadataCache`).

---

### 2. Indexing Strategy: `metadataCache` + In-Memory Map

**Decision:** Maintain a live `Map<string, OrbitContact>` in memory, kept in sync via `metadataCache` events.

**Implementation:**
*   **On Load:** Iterate `app.vault.getMarkdownFiles()`, check cache for `#person` tag, build Map.
*   **On Change (`changed`, `delete`, `rename`):** Update the specific entry in the Map. Do *not* re-scan the whole vault.

**Rationale:**
*   **Performance:** Instant lookups for the HUD and Link Listener.
*   **Reactivity:** The HUD can subscribe to changes in this Map to update UI instantly.

**Alternatives Considered:**
*   *Dataview API:* Rejected to avoid hard dependency on another plugin for core functionality.
*   *On-demand scan:* Rejected due to latency in rendering the HUD.

---

### 3. Update Mechanism: The "Link Listener" (Passive Tracking)

**Decision:** Hook into `metadataCache.on('changed')` to detect when *any* file is modified.

**Logic:**
1.  **Debounce:** Wait 2 seconds after user stops typing.
2.  **Scan:** Regex scan the modified file for wikilinks `[[Name]]`.
3.  **Filter:** Check if linked `Name` exists in our `OrbitContact` index.
4.  **Logic:** If `Contact.last_contact` < `Today`, trigger a notification.

**UX Interaction:**
*   **Notification:** Non-intrusive Toast or Status Bar icon pulsing.
*   **Action:** User confirms -> Plugin updates `last_contact` in the *target* Person Note (not the current note).

**Rationale:**
*   Captures the "Moment of Interaction" (writing about someone) without forcing a context switch to their file.

---

### 4. UI Architecture: React + Obsidian `ItemView`

**Decision:** Build the Sidebar HUD using React, mounted inside a standard Obsidian `ItemView`.

**Structure:**
*   `OrbitView.ts`: The Obsidian shell. Handles mounting/unmounting.
*   `OrbitDashboard.tsx`: Root React component.
*   `ContactGrid.tsx`: CSS Grid layout.
*   `ContactCard.tsx`: Individual avatar component.

**State Management:**
*   Use a `React Context` that subscribes to the Plugin's main `OrbitIndex`.
*   When `OrbitIndex` updates (file modified), it emits an event -> Context updates -> React re-renders.

**Rationale:**
*   **Complexity:** Complex state (hover interactions, filtering, dynamic sorting) is unmanageable in vanilla DOM manipulation.
*   **Ecosystem:** Access to rich UI libraries (Lucide icons, Framer Motion for animations).

---

### 5. Visual Language: Orbital Rings

**Decision:** Indicate status via color-coded borders (Rings) around avatars.

**Logic:**
*   `DaysSince = Today - LastContact`
*   `Threshold = Frequency (converted to days)`
*   **🟢 Stable:** `DaysSince < Threshold * 0.8`
*   **🟡 Wobble:** `Threshold * 0.8 <= DaysSince < Threshold`
*   **🔴 Decay:** `DaysSince >= Threshold`

**Rationale:**
*   **At-a-glance status:** No reading required.
*   **Gamification:** "Keep the rings green" is a simple, dopamine-friendly loop.

---

### 6. Interaction: "Conversational Fuel" Tooltip

**Decision:** On hover, asynchronously read the target file and parse specific headers.

**Parsing Logic:**
*   Find headers: `## 🗣️ Conversational Fuel` OR `## Conversational Fuel`.
*   Extract bullet points immediately following the header.
*   Limit to top 3 bullets to prevent tooltip overflow.

**Caching:**
*   Cache the "Fuel" content in the `OrbitIndex` to prevent disk reads on every hover. Invalidate cache on file change.

**Rationale:**
*   **Friction Reduction:** Removes the barrier of "opening the file to check what to say."

---

### 7. File Writing: Atomic Updates via `processFrontMatter`

**Decision:** Use `app.fileManager.processFrontMatter()` for all write operations.

**Rationale:**
*   **Safety:** Safely parses and updates YAML without touching the body content.
*   **Concurrency:** Handles race conditions better than raw `vault.modify()`.

---

### 8. Settings & Configuration

**Decision:** Minimal configuration to start, but robust enough for flexibility.

**Settings:**
*   `Tracking Tag`: Default `#person` (Allow user to change schema).
*   `Date Format`: Default `YYYY-MM-DD` (Standardize implementation).
*   `Ignored Folders`: Paths to exclude from scanning (e.g., `Templates/`, `Archive/`).

---

## Consequences

### Positive
*   **Object Permanence:** Users "see" their network daily.
*   **Data Integrity:** Distributed data means the system is robust and portable.
*   **Low Friction:** Automated inputs mean the system is more likely to be maintained.

### Negative
*   **Memory Usage:** Caching file content ("Fuel") for all contacts could be heavy if user has 1000+ contacts. (Mitigation: Only cache Fuel for visible/hovered contacts?)
*   **Complexity:** React + Obsidian API integration adds build complexity.

### Risks
*   **Performance:** The "Link Listener" scanning every file change could cause lag if not properly debounced.
*   **Schema Drift:** User manually edits frontmatter and breaks the format (e.g., `LastContact: Yesterday`).

### Mitigations
*   **Strict Debouncing:** 2000ms delay on listener.
*   **Validation:** Robust date parsing that handles common formats or fails gracefully.
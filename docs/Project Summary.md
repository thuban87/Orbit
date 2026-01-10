---
tags:
  - projects
  - active
  - orbit
  - docs
---
# Orbit - Project Summary

**Tagline:** Keep your people in your orbit.
**Core Concept:** A Relationship Manager (CRM) for Obsidian that solves "Social Object Permanence" for ADHD brains via passive tracking and active visualization.
**Version:** 0.0.0 (Pre-Development)

---

## The Problem: Social Object Permanence Failure

For neurodivergent brains (ADHD/Autism), people often cease to exist when they aren't physically present. This leads to:
1.  **Unintentional Ghosting:** You value the person, but literally forgot they exist for 3 months.
2.  **Shame Spiral:** Realizing it's been too long makes reaching out feel awkward/guilt-ridden.
3.  **Friction:** Using a manual "CRM" requires *remembering* to check it.
4.  **Initiation Paralysis:** "I should call Mom... but what do we talk about?"

## The Solution: Orbit

Orbit automates the *memory* and *initiation* of social contact, leaving you to focus on the *connection*.

### Core Features (MVP)

#### 1. The HUD (Visual Object Permanence)
*   **What:** A sidebar view (React) containing avatars of your "Tribe."
*   **Tech:** Uses `metadataCache` to build a live index of all files tagged `#person`.
*   **Value:** You see their faces every time you open Obsidian. They never "disappear."

#### 2. Orbital Decay (Status Mechanics)
*   **What:** Visual indicators of relationship health based on your defined frequency.
*   **Logic:**
    *   `Stable (Green)`: Recent contact.
    *   `Wobble (Yellow)`: approaching due date (80% of interval).
    *   `Decay (Red)`: Overdue.
*   **Value:** Gamifies maintenance. "Keep the board green."

#### 3. The Link Listener (Passive Tracking)
*   **What:** Automated data entry.
*   **Tech:** Watches `app.workspace` for changes. If you type `[[Dad]]` in a Daily Note, it checks if Dad is "stale."
*   **Action:** Prompts via Toast: "Mark Dad as contacted today?" -> Updates `Dad.md` frontmatter.
*   **Value:** Removes the administrative chore of updating a CRM.

#### 4. Conversational Fuel (Friction Reduction)
*   **What:** Hover-to-reveal context.
*   **Tech:** Asynchronously reads the `## Conversational Fuel` header from the target note.
*   **Value:** Instantly answers "What do I say?" without needing to navigate away from your current work.

---

## Technical Architecture

### Tech Stack
*   **Language:** TypeScript
*   **UI Framework:** React (mounted in Obsidian `ItemView`)
*   **Build Tool:** `esbuild`
*   **Styling:** CSS Modules / Standard CSS
*   **State:** React Context + Obsidian `metadataCache` events

### Dependencies
*   `obsidian`: Core API
*   `react`, `react-dom`: UI rendering
*   `lucide-react`: Icons (optional, or use Obsidian icons)

### Environment
*   **Development:** `C:\Users\bwales\projects\obsidian-plugins\orbit`
*   **Deployment:** `G:\My Drive\IT\Obsidian Vault\My Notebooks\.obsidian\plugins\orbit`
*   **Target:** Desktop (Primary), Mobile (Secondary/Responsive check required)

---

## Development Approach

1.  **Phase 1 (The Radar):** Build the backend indexer. Ensure we can accurately read/calculate status from frontmatter.
2.  **Phase 2 (The Window):** Build the React HUD. Get the visuals working.
3.  **Phase 3 (The Tether):** Implement the Link Listener. This is the "Magic" moment.
4.  **Phase 4 (The Bridge):** Add the tooltip content fetching.

---

## Reference Material
*   **Sibling Project:** `TagForge` (for React + Obsidian boilerplate)
*   **Obsidian API:** `metadataCache`, `fileManager.processFrontMatter`
*   **Inspiration:** "Monica" (Personal CRM), Spaced Repetition Algorithms.
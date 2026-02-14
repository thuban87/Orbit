---
tags:
  - projects
  - active
  - orbit
---

# Orbit — Workspace Rules

**Version:** 0.1.0 | **Updated:** 2026-02-13
**Full reference:** See `docs/ADR-001-Architecture.md` for core architectural decisions.

## Project Context

**Developer:** Brad Wales (ADHD, visual learner, prefers vibe coding)
**Purpose:** Relationship Manager plugin for Obsidian — prevents "Social Object Permanence" failure via a visual HUD and automated tracking.
**Tech Stack:** TypeScript, React 18, Obsidian API, esbuild
**Release:** Personal use (potential public release later)

**Environments:**
- **Dev:** `C:\Users\bwales\projects\obsidian-plugins\orbit`
- **Test:** `C:\Quest-Board-Test-Vault\.obsidian\plugins\orbit`
- **Staging:** `C:\Quest-Board-Staging-Vault\Staging Vault\.obsidian\plugins\orbit`
- **Production:** `G:\My Drive\IT\Obsidian Vault\My Notebooks\.obsidian\plugins\orbit`

---

## Git Workflow (CRITICAL)

**Brad handles ALL git commands.** AI assistants should:
- ✅ Read: `git status`, `git log`, `git diff`
- ❌ **NEVER run:** `git add`, `git commit`, `git push`, `git pull`, `git merge`, `git rebase`
- ✅ Provide commit messages at session wrap-up for Brad to copy/paste
- ✅ Remind Brad to check branches when starting a new task

---

## Core Metaphors

| Term | Meaning |
|------|---------|
| **Orbit** | The `frequency` a contact should be contacted (Weekly/Monthly/etc.) |
| **Decay** | Relationship health status — Green (Stable), Yellow (Wobble), Red (Decay) |
| **Fuel** | The "Conversational Fuel" section of a contact's note |
| **Radar** | `OrbitIndex` — the in-memory contact index service |
| **Tether** | `LinkListener` — the passive wikilink detection service |

---

## Development Session Workflow

1. **Review & Discuss** — Clarify requirements, check Feature Priority List
2. **Do the Work** — Write code in dev environment only
3. **Test** — `npm run dev` (watches + builds), fix errors, rebuild until passing
4. **Deploy** — `npm run deploy:test` to staging vault
5. **Wait for Confirmation** — Brad tests in Obsidian
6. **Wrap Up** — Update session docs indicated by user, provide commit message

### The "Brad Protocol"
- **Micro-Steps:** Break complex tasks into atomic steps
- **Explain Why:** Briefly justify architectural choices
- **Celebrate:** Acknowledge when a feature works

### Session Handoff Protocol
At the end of each session:
1. Perform and confirm testing **before** updating any documentation
2. Update the documents indicated by the user
3. Suggest a `git commit` message
4. Leave a "Next Session Prompt" in the Handoff Log
5. Note any bugs or issues discovered

---

## Architecture

Full details: `docs/ADR-001-Architecture.md`

### File Structure

```
src/
  main.ts              # Plugin class (~229 lines — orchestrator)
  types.ts             # Interfaces, constants, 5 utility functions
  settings.ts          # Settings tab (3 settings)
  services/
    OrbitIndex.ts      - The "Radar" — in-memory contact index, vault scanning, file events
    LinkListener.ts    - The "Tether" — wikilink detection, update prompting
  components/
    ContactCard.tsx    - Avatar, status ring, context menu, click handlers
    ContactGrid.tsx    - Category-grouped grid layout with sort/filter
    OrbitHeader.tsx    - Control bar (sort, filter, refresh, count)
    FuelTooltip.tsx    - Hover tooltip with parsed Conversational Fuel
    BirthdayBanner.tsx - Upcoming birthday alerts (within 7 days)
  context/
    OrbitContext.tsx    - React Context + Provider for plugin/contact data
  views/
    OrbitView.tsx      - Obsidian ItemView shell (React root mounting)
    OrbitDashboard.tsx - Root React component (header + grid + banner)
docs/
  ADR-001-Architecture.md    - Architectural decisions
  Feature Priority List.md   - Roadmap & phase tracking
  Handoff Log.md             - Session-by-session development log
  Project Summary.md         - Project overview
  Orbit UX Overhaul - Brainstorm.md    - UX improvement ideas
  UX Overhaul - Implementation Plan.md - Multi-phase implementation plan
```

### Layer Responsibilities

| Layer | Should | Should NOT |
|-------|--------|------------|
| **main.ts** | Register commands, initialize services, handle lifecycle | Contain business logic, grow beyond orchestration |
| **Services** | Business logic, file I/O, state coordination | Render UI, manipulate DOM, depend on each other |
| **Components** | Present UI, handle user interactions | Contain complex business logic, do file I/O directly |
| **Context** | Provide plugin/contact state to React tree | Modify state directly, contain business logic |
| **Views** | Mount/unmount React, bridge Obsidian ↔ React | Contain rendering logic beyond the shell |
| **Types** | Define interfaces, constants, pure utility functions | Import from other project files |

### Architecture Strengths (Preserve These!)
- **Stateless data source** — Frontmatter is the source of truth, not `data.json`
- **Zero service-to-service coupling** — Services import only from `types.ts`
- **Event-driven reactivity** — `OrbitIndex` extends `Events`, React subscribes via Context
- **Clean separation** — Logic in `services/`, UI in `components/`, bridge in `views/`

---

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Watch mode — builds on change |
| `npm run build` | Production build |
| `npm run deploy:test` | Build + deploy to test vault |
| `npm run deploy:staging` | Build + deploy to staging vault |
| `npm run deploy:production` | Build + deploy to production vault (**requires confirmation**) |
| `npm run test` | Run test suite (vitest) |
| `npm run test:coverage` | Run with coverage report |

---

## Contact Schema (simplified — see `types.ts` for full interface)

```typescript
interface OrbitContact {
  file: TFile;                     // Reference to vault file
  name: string;                    // From file basename
  category?: string;               // Family, Friends, Work, etc.
  frequency: Frequency;            // Daily through Yearly
  lastContact: Date | null;        // Parsed from frontmatter
  status: OrbitStatus;             // stable | wobble | decay | snoozed
  daysSinceContact: number;
  daysUntilDue: number;
  photo?: string;                  // URL for avatar
  socialBattery?: SocialBattery;   // Charger | Neutral | Drain
  snoozeUntil?: Date | null;
  lastInteraction?: LastInteractionType;  // call | text | in-person | email | other
  birthday?: string;               // MM-DD or YYYY-MM-DD
  fuel?: string[];                 // Cached Conversational Fuel content
}
```

### Status Calculation

```
Stable:  daysSince < threshold * 0.8   (Green)
Wobble:  daysSince < threshold         (Yellow — 80-100% of interval)
Decay:   daysSince >= threshold        (Red)
Snoozed: snooze_until date is in the future
```

---

## Data Storage

| Data Type | Storage | Why |
|-----------|---------|-----|
| Contact data | File frontmatter (distributed) | User-owned, Dataview-compatible, survives plugin removal |
| Plugin settings | `loadData()`/`saveData()` → `data.json` | Standard Obsidian pattern |
| AI state export | `orbit-state.json` in plugin dir | For external tool consumption (derived, not canonical) |

---

## Commands Registered (3)

| Command ID | Purpose |
|------------|---------|
| `orbit:dump-index` | Debug — logs contact index to console |
| `orbit:open-orbit` | Opens the Orbit sidebar view |
| `orbit:weekly-digest` | Generates a weekly markdown report |

---

## Utility Functions in `types.ts` — Do Not Reimplement

`calculateStatus`, `calculateDaysSince`, `calculateDaysUntilDue`, `parseDate`, `isValidFrequency`

---

## Common Pitfalls

### Don't:
- ❌ Put business logic in `main.ts` — keep it as orchestration only
- ❌ Create dependencies between services — they must stay independent
- ❌ Use synchronous file I/O — always `await` vault operations
- ❌ Run git commands (see Git Workflow section)
- ❌ Skip testing before session wrap-up
- ❌ Hardcode paths or contact names
- ❌ Use `vault.modify()` for frontmatter — use `app.fileManager.processFrontMatter()`
- ❌ Use `moment()` for date parsing — use native `Date` + the `parseDate()` utility

### Do:
- ✅ Keep files under 300 lines where possible
- ✅ Use TypeScript strict mode (`strictNullChecks`, `noImplicitAny`)
- ✅ JSDoc all public methods
- ✅ Test in dev before confirming done
- ✅ Follow session handoff protocol
- ✅ Prefix all CSS classes with `orbit-`
- ✅ Use React functional components + hooks (no class components)
- ✅ Handle missing frontmatter fields gracefully (defaults, not crashes)
- ✅ Use `TFile`/`TFolder` guards before vault operations

---

## Checklist Before Coding
- [ ] Have we checked `docs/Feature Priority List.md` for current priorities?
- [ ] Is the user on the correct git branch?
- [ ] Do we understand the specific requirement?
- [ ] Have we reviewed relevant source files before making changes?

---

## Key Documentation

- `docs/Feature Priority List.md` — Current priorities & roadmap
- `docs/Handoff Log.md` — Session-by-session development log
- `docs/ADR-001-Architecture.md` — Architectural decisions
- `docs/Project Summary.md` — Project overview
- `docs/UX Overhaul - Implementation Plan.md` — Multi-phase overhaul with test infrastructure (Phase 0)
- `docs/Orbit UX Overhaul - Brainstorm.md` — UX improvement ideas
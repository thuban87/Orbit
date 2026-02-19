---
tags:
  - projects
  - orbit
  - session-log
created: 2026-02-14
---
# UX Overhaul Session Log

Development log for the Orbit UX Overhaul project.

> **Project:** UX Overhaul (Modals, Schemas, AI Integration)
> **Started:** 2026-02-14
> **Related Docs:** [[UX Overhaul - Implementation Plan]] for phase details, [[Feature Priority List]] for roadmap

---

## Session Format

Each session entry should include:
- **Date & Focus:** What was worked on
- **Completed:** Checklist of completed items
- **Files Changed:** Key files modified/created
- **Testing Notes:** What was tested and results
- **Blockers/Issues:** Any problems encountered
- **Next Steps:** What to continue with

---

## 2026-02-14 - Phase 0: Test Infrastructure & Baseline Tests

**Focus:** Set up vitest test framework, create Obsidian API mocks, write baseline tests for core modules

### Completed:

#### Test Infrastructure
- ✅ Installed `vitest`, `@testing-library/react`, `jsdom`, `@vitest/coverage-v8`
- ✅ Created `vitest.config.ts` — jsdom environment, obsidian mock alias, v8 coverage, CI/local output path logic
- ✅ Created `test/setup.ts` — Global test setup (jsdom provides DOM globals)
- ✅ Added `test`, `test:watch`, `test:coverage` scripts to `package.json`
- ✅ Added `coverage/` to `.gitignore`

#### Mocks & Factories
- ✅ Created `test/mocks/obsidian.ts` — Full Obsidian API mock (`TFile`, `Events`, `App`, `Plugin`, `Modal`, `Notice`, `Menu`, `Setting`, etc.)
- ✅ Created `test/mocks/react-dom.ts` — `createRoot` mock for future modal tests
- ✅ Created `test/helpers/factories.ts` — `createTFile`, `createOrbitContact`, `createCachedMetadata`, `createSettings`

#### Baseline Tests (99 total)
- ✅ `test/unit/types.test.ts` — 34 tests covering all 5 utility functions (`calculateStatus`, `calculateDaysSince`, `calculateDaysUntilDue`, `parseDate`, `isValidFrequency`)
- ✅ `test/unit/orbit-index.test.ts` — 42 tests covering `scanVault`, `parseContact`, file events (change/delete/rename), `dumpIndex`, `saveStateToDisk`, `updateSettings`
- ✅ `test/unit/link-listener.test.ts` — 23 tests covering `extractWikilinks`, `checkAndPrompt`, `isContactedToday`, `showUpdatePrompt`, `updateContactDate`, `clearCache`

#### CI / GitHub Actions
- ✅ Created `.github/workflows/test.yml` — Runs tests + coverage + build on PRs, posts coverage summary as PR comment

#### Bug Flags
- ✅ Added `// BUG:` comments to 4 `toISOString()` locations for UTC off-by-one issue (fix planned in Phase 1 with `formatLocalDate()`)

### Files Changed:

**New Files (9):**
- `vitest.config.ts` — Test config with CI/local output path detection
- `.github/workflows/test.yml` — GitHub Actions for test + coverage on PRs
- `test/setup.ts` — Global test setup
- `test/mocks/obsidian.ts` — Obsidian API mocks
- `test/mocks/react-dom.ts` — React DOM mocks
- `test/helpers/factories.ts` — Test data factories
- `test/unit/types.test.ts` — Types utility tests
- `test/unit/orbit-index.test.ts` — OrbitIndex service tests
- `test/unit/link-listener.test.ts` — LinkListener service tests

**Modified Files (5):**
- `package.json` — Added vitest deps + test scripts
- `.gitignore` — Added `coverage/`
- `src/services/LinkListener.ts` — UTC bug flag comment (×1)
- `src/services/OrbitIndex.ts` — UTC bug flag comments (×3)

### Testing Notes:

| Metric | Result |
|--------|--------|
| Test suites | 3/3 passed |
| Tests | 99/99 passed |
| Build | ✅ Clean |

**Coverage (Phase 0 targets):**

| File | Stmts | Branch | Lines | Target |
|------|-------|--------|-------|--------|
| `types.ts` | 97.29% | 90% | 96.96% | ✅ ≥80% |
| `OrbitIndex.ts` | 100% | 88.23% | 100% | ✅ ≥80% |
| `LinkListener.ts` | 86.66% | 80% | 87.27% | ✅ ≥80% |

### Bugs Found:
1. **Factory `null ?? new Date()` bug** — Nullish coalescing treats `null` as missing, so `createOrbitContact({ lastContact: null })` would silently assign `new Date()`. Fixed with `'lastContact' in overrides` check.
2. **UTC date bug** (pre-existing, flagged) — `toISOString().split('T')[0]` returns UTC date, can differ from local date near midnight. Present in 4 locations across 2 files. Fix planned for Phase 1.

### Blockers/Issues:
- None

---

## 2026-02-14 - Phase 1 & 1.5: Schema System, Form Modal Foundation & Tests

**Focus:** Build schema-driven form modal infrastructure and comprehensive test coverage

### Completed:

#### Source Files (7 new)
- ✅ `src/utils/logger.ts` — Gated `Logger` utility (off/error/warn/debug)
- ✅ `src/utils/dates.ts` — `formatLocalDate()` to fix UTC off-by-one bug
- ✅ `src/utils/paths.ts` — `sanitizeFileName()`, `buildContactPath()`
- ✅ `src/schemas/types.ts` — `FieldDef`, `SchemaDef` interfaces + `isFieldDef`/`isSchemaDef` type guards
- ✅ `src/modals/ReactModal.ts` — Abstract base modal with React lifecycle + `ModalErrorBoundary`
- ✅ `src/modals/OrbitFormModal.ts` — Schema-driven form modal extending `ReactModal`
- ✅ `src/components/FormRenderer.tsx` — React form component supporting all 7 field types

#### Modified Files (4)
- ✅ `styles.css` — +131 lines for form modal styling (fields, inputs, toggles, error boundary)
- ✅ `src/main.ts` — Added temporary `debug-form` command (remove in Phase 2)
- ✅ `test/mocks/obsidian.ts` — Added `polyfillEl()` for `empty`/`setText`/`addClass`/`removeClass`, `titleEl`, `modalEl`
- ✅ `vitest.config.ts` — Added `.tsx` to test include pattern

#### Test Files (9 new, 120 tests)
- ✅ `test/unit/utils/dates.test.ts` — 7 tests
- ✅ `test/unit/utils/paths.test.ts` — 18 tests
- ✅ `test/unit/utils/logger.test.ts` — 17 tests
- ✅ `test/unit/schemas/types.test.ts` — 26 tests
- ✅ `test/unit/modals/react-modal.test.ts` — 7 tests
- ✅ `test/unit/modals/error-boundary.test.tsx` — 4 tests
- ✅ `test/unit/modals/orbit-form-modal.test.ts` — 8 tests
- ✅ `test/unit/components/form-renderer.test.tsx` — 27 tests
- ✅ `test/integration/form-modal-flow.test.tsx` — 6 tests

### Files Changed:

**New Files (16):**
- `src/utils/logger.ts`, `src/utils/dates.ts`, `src/utils/paths.ts`
- `src/schemas/types.ts`
- `src/modals/ReactModal.ts`, `src/modals/OrbitFormModal.ts`
- `src/components/FormRenderer.tsx`
- `test/unit/utils/dates.test.ts`, `test/unit/utils/paths.test.ts`, `test/unit/utils/logger.test.ts`
- `test/unit/schemas/types.test.ts`
- `test/unit/modals/react-modal.test.ts`, `test/unit/modals/error-boundary.test.tsx`, `test/unit/modals/orbit-form-modal.test.ts`
- `test/unit/components/form-renderer.test.tsx`
- `test/integration/form-modal-flow.test.tsx`

**Modified Files (4):**
- `styles.css` — Form modal CSS (+131 lines)
- `src/main.ts` — Debug command import + registration
- `test/mocks/obsidian.ts` — Modal mock enhancements
- `vitest.config.ts` — `.tsx` include pattern

### Testing Notes:

| Metric | Result |
|--------|--------|
| Test suites | 12/12 passed |
| Tests | 219/219 passed (99 existing + 120 new) |
| Build | ✅ Clean |
| Deploy | ✅ Test vault |

**Coverage (Phase 1 files):**

| File | Stmts | Branch | Lines | Target |
|------|-------|--------|-------|--------|
| `ReactModal.ts` | 100% | 100% | 100% | ✅ ≥80% |
| `FormRenderer.tsx` | 97% | 88% | 97% | ✅ ≥80% |
| `schemas/types.ts` | 100% | 100% | 100% | ✅ ≥80% |
| `dates.ts` | 100% | 100% | 100% | ✅ ≥80% |
| `logger.ts` | 100% | 100% | 100% | ✅ ≥80% |
| `paths.ts` | 100% | 100% | 100% | ✅ ≥80% |

### Bugs Found:
- None

### Blockers/Issues:
- None

---

## 2026-02-14 - Phase 2 & 2.5: ContactManager Service, New Person Modal & Tests

**Focus:** Build ContactManager service, new-person schema, FolderSuggest, wire "New Person" command, then comprehensive tests

### Completed:

#### Source Files (4 new, 5 modified)
- ✅ `src/services/ContactManager.ts` — **NEW** — `createContact`, `updateFrontmatter`, `appendToInteractionLog`
- ✅ `src/schemas/new-person.schema.ts` — **NEW** — 7-field schema definition
- ✅ `src/utils/FolderSuggest.ts` — **NEW** — Folder autocomplete for settings
- ✅ `src/components/FormRenderer.tsx` — **MODIFIED** — Photo field with live image preview
- ✅ `src/settings.ts` — **MODIFIED** — Added `templatePath`, `contactsFolder` + FolderSuggest
- ✅ `src/services/OrbitIndex.ts` — **MODIFIED** — `contactsFolder` targeted scanning
- ✅ `src/main.ts` — **MODIFIED** — `new-person` command replaces `debug-form`
- ✅ `styles.css` — **MODIFIED** — Photo preview CSS

#### Bug Fixes
- 🐛 FolderSuggest crash on selection (inputEl stored in private field)
- 🐛 Tag always from `settings.personTag` via `processFrontMatter()`
- 🐛 Templater syntax stripped from frontmatter (body-only template)
- 🐛 All form data values reach frontmatter programmatically
- 🐛 ENOENT fixed with `ensureFolderExists` before `vault.create()`

#### Test Files (3 new, 1 modified — 54 new tests)
- ✅ `test/unit/services/contact-manager.test.ts` — **NEW** — 28 tests
- ✅ `test/unit/schemas/new-person-schema.test.ts` — **NEW** — 15 tests
- ✅ `test/unit/utils/folder-suggest.test.ts` — **NEW** — 8 tests
- ✅ `test/unit/orbit-index.test.ts` — **MODIFIED** — +3 contactsFolder tests

### Testing Notes:

| Metric | Result |
|--------|--------|
| Test suites | 15/15 passed |
| Tests | 273/273 passed (219 existing + 54 new) |
| Build | ✅ Clean |
| Deploy | ✅ Test vault |
| Manual | ✅ Brad verified all frontmatter, folder paths, photo display |

**Coverage (Phase 2 files):**

| File | Stmts | Branch | Lines |
|------|-------|--------|-------|
| `ContactManager.ts` | 98.52% | 88.88% | 100% |
| `new-person.schema.ts` | 100% | 100% | 100% |
| `FolderSuggest.ts` | 100% | 83.33% | 100% |
| `OrbitIndex.ts` | 98.16% | 85.89% | 98.01% |

### Bugs Found:
- All 5 bugs listed above — found and fixed in same session

### Blockers/Issues:
- None

---

## 2026-02-14 — Phase 4 + 4.5: Orbit Hub, Update Contacts Flow & Tests\r
\r
**Focus:** Build the centralized Orbit Hub modal, UpdatePanel component, configurable interaction log heading, and comprehensive tests.\r
\r
### Completed:\r
\r
#### Orbit Hub Modal\r
- ✅ Created `OrbitHubModal.ts` — Centralized contact management modal replacing `ContactPickerModal`\r
- ✅ Two-panel state machine: hub grid ↔ UpdatePanel, tracks `selectedContact`\r
- ✅ Action bar: Update, Add, Digest, Done (Edit + Suggest Message disabled for future phases)\r
- ✅ Added `selected` state to `ContactCard` + `ContactPickerGrid`\r
- ✅ Registered `update-contacts` command, removed `debug-picker` command\r
\r
#### UpdatePanel Component\r
- ✅ Created `UpdatePanel.tsx` — Inline form with contact header (name, photo/initials, status badge)\r
- ✅ Fields: date picker (defaults today), interaction type dropdown, optional note textarea\r
- ✅ Save triggers `updateFrontmatter()` + `appendToInteractionLog()`, then returns to grid\r
\r
#### Interaction Log Heading Fix\r
- ✅ Added `interactionLogHeading` setting (Settings → Contacts → "Interaction log heading")\r
- ✅ Updated `appendToInteractionLog` to use `includes()` — supports emoji headings like `## 📝 Interaction Log`\r
\r
#### Cleanup\r
- ✅ Deleted `ContactPickerModal.ts` (replaced by OrbitHubModal)\r
- ✅ Deleted `contact-picker-modal.test.ts`\r
- ✅ Changed `ReactModal.root` from `private` → `protected`\r
\r
#### Tests (20 new, 333 total)\r
\r
| File | Tests | Covers |\r
|------|-------|--------|\r
| `orbit-hub-modal.test.ts` | 9 | Lifecycle, React root, CSS class, render content |\r
| `update-panel.test.tsx` | 17 | Rendering, interactions, status variants |\r
| `contact-manager.test.ts` | +3 | Emoji heading, custom heading, heading creation |\r
| `contact-picker-modal.test.ts` | -8 | Removed (old modal deleted) |\r
\r
### Files Changed:\r
\r
**New (4):** `OrbitHubModal.ts`, `UpdatePanel.tsx`, `orbit-hub-modal.test.ts`, `update-panel.test.tsx`\r
**Modified (8):** `ContactCard.tsx`, `ContactPickerGrid.tsx`, `ReactModal.ts`, `settings.ts`, `ContactManager.ts`, `main.ts`, `styles.css`, `contact-manager.test.ts`\r
**Deleted (2):** `ContactPickerModal.ts`, `contact-picker-modal.test.ts`\r
\r
### Testing Notes:\r
- 333/333 tests pass, build clean, deployed to test vault\r
- Brad verified all 9 test points manually\r
\r
### Bugs Found:\r
1. **Heading mismatch** — `appendToInteractionLog` hardcoded `## Interaction Log` but template uses emoji prefix. Fixed with configurable setting.\r
\r
### Blockers/Issues:\r
- None\r
\r
---\r
\r
## Next Session Prompt

```
Phase 4 + 4.5 complete. Ready to begin Phase 5: Edit Person & Update This Person.

What was done last session:
- ✅ Orbit Hub modal (OrbitHubModal) — centralized contact management hub
- ✅ UpdatePanel component — inline contact update form
- ✅ interactionLogHeading setting — configurable heading for log injection
- ✅ Deleted old ContactPickerModal (dead code)
- ✅ 20 new tests (333 total), all passing
- ✅ Deployed and manually verified in test vault

Continue with Phase 5: Edit Person & Update This Person
Key files to reference:
- docs/UX Overhaul - Implementation Plan.md
- src/modals/OrbitHubModal.ts
- src/components/UpdatePanel.tsx
- src/services/ContactManager.ts
```

---

## Git Commit Messages

### Phase 0
```
feat(test): Phase 0 — test infrastructure & baseline tests (99 tests)
```

### Phase 1 + 1.5
```
feat(modal): Phase 1 + 1.5 — schema system, form modal foundation & tests (120 tests)
```

### Phase 2 + 2.5
```
feat(contacts): Phase 2 + 2.5 — ContactManager service, New Person modal & tests

ContactManager Service:
- createContact with template loading, processFrontMatter, folder creation
- updateFrontmatter (merge-only), appendToInteractionLog (atomic)
- stripFrontmatter, ensureFolderExists helpers

New Person Flow:
- 7-field schema, FolderSuggest autocomplete, photo preview
- "New Person" command replaces debug-form command
- contactsFolder targeted scanning in OrbitIndex

Bug Fixes:
- FolderSuggest crash, tag override, Templater syntax, missing frontmatter, ENOENT

Tests (54 new, 273 total):
- contact-manager.test.ts (28), new-person-schema.test.ts (15)
- folder-suggest.test.ts (8), orbit-index.test.ts (+3)

```

---

## 2026-02-14 — Phase 3 + 3.5: Contact Picker Modal & Tests

**Focus:** Build the reusable Contact Picker modal with search, filters, sorting, and local photo support. Write 40 new tests.

### Completed:

#### Contact Picker Modal
- ✅ Created `ContactPickerGrid.tsx` — Card grid with search, status sorting, "decaying only" toggle
- ✅ Created `ContactPickerModal.ts` — Modal shell extending `ReactModal`, wraps grid in `OrbitProvider`
- ✅ Added category filter dropdown (dynamically populated from contacts)
- ✅ Added social battery filter dropdown (Charger / Neutral / Drain)
- ✅ Added sort-by-last-contacted (ascending/descending) alongside existing status sort
- ✅ Registered temporary `debug-picker` command in `main.ts`

#### ContactCard Enhancements
- ✅ Added `mode` prop (`"sidebar" | "picker"`) — picker mode: click fires `onSelect`, context menu suppressed
- ✅ Added local vault photo support via `vault.adapter.getResourcePath()`
- ✅ Added wikilink photo support via `metadataCache.getFirstLinkpathDest()` + `getResourcePath()`

#### Context & Tooltip Updates
- ✅ Added `useOrbitOptional` hook to `OrbitContext.tsx` — returns `null` outside provider (no throw)
- ✅ Updated `FuelTooltip.tsx` to use `useOrbitOptional`, falls back to cached `contact.fuel`

#### Styling
- ✅ Added picker modal CSS: search bar, filter row, filter selects, toggle, grid layout, empty state

### Tests (40 new, 313 total):

| File | Tests | Covers |
|------|-------|--------|
| `contact-card-modes.test.tsx` | 11 | Picker/sidebar modes, photo resolution (URL, vault path, wikilink) |
| `contact-picker-grid.test.tsx` | 16 | Search, category filter, battery filter, sort modes, empty states |
| `contact-picker-modal.test.ts` | 8 | Lifecycle, React root, OrbitProvider wrapping, onSelect callback |
| `picker-flow.test.tsx` | 5 | Full integration: render → filter → select → callback |

### Test Infrastructure Updates:
- ✅ Added `addSeparator()` and `showAtMouseEvent()` to `Menu` mock in `test/mocks/obsidian.ts`
- ✅ Created `.agent/workflows/test.md` — Test runner workflow (pipe output to file)
- ✅ Added `test-output.txt` to `.gitignore`

### Files Changed:

**Source (modified):**
- `src/components/ContactCard.tsx` — mode prop, local/wikilink photo resolution
- `src/components/FuelTooltip.tsx` — useOrbitOptional fallback
- `src/context/OrbitContext.tsx` — useOrbitOptional hook
- `src/main.ts` — debug-picker command, plugin param to modal
- `styles.css` — Picker modal styles
- `docs/UX Overhaul - Implementation Plan.md` — Ideas Along the Way section

**Source (new):**
- `src/components/ContactPickerGrid.tsx`
- `src/modals/ContactPickerModal.ts`

**Test (new):**
- `test/unit/components/contact-card-modes.test.tsx`
- `test/unit/components/contact-picker-grid.test.tsx`
- `test/unit/modals/contact-picker-modal.test.ts`
- `test/integration/picker-flow.test.tsx`

**Infrastructure:**
- `test/mocks/obsidian.ts` — Menu mock updates
- `.agent/workflows/test.md` — Test runner workflow
- `.gitignore` — test-output.txt

### Testing Notes:
- All 313 tests pass, 19 test files
- Build succeeds via `npm run build`
- Deployed to test vault, Brad verified manually — local photos, wikilinks, filters, sorting all working
- Fixed: Menu mock missing `addSeparator`/`showAtMouseEvent`, modal tests using Obsidian-specific DOM APIs not in mock, integration test import path depth

### Blockers/Issues:
- None discovered this session

### Next Steps:
Continue with Phase 4: Update Contacts Flow

---

### Next Session Prompt:
```
Phase 3 + 3.5 complete. Ready to begin Phase 4: Update Contacts Flow.

What was done last session:
- ✅ ContactPickerGrid with search, category/battery filters, sort-by-last-contacted
- ✅ ContactPickerModal wrapping grid in OrbitProvider
- ✅ ContactCard mode prop (sidebar vs picker), local photo + wikilink support
- ✅ useOrbitOptional hook, FuelTooltip fallback
- ✅ 40 new tests (313 total), all passing
- ✅ Deployed and manually verified in test vault

Continue with Phase 4: Update Contacts Flow
Key files to reference:
- docs/UX Overhaul - Implementation Plan.md
- src/modals/ContactPickerModal.ts
- src/components/ContactPickerGrid.tsx
- src/services/ContactManager.ts
```

---

## 2026-02-15 — Phase 5 + 5.5: Edit Person & Update This Person

**Focus:** Ship Edit Person (pre-filled form modal from hub) and Update This Person (active file → direct update). Write 37 new tests.

### Completed:

#### Edit Person Schema & Flow
- ✅ Created `edit-person.schema.ts` — 7 fields matching new-person, `contact_link` instead of `google_contact`
- ✅ Added `handleEdit()` to `OrbitHubModal` — reads contact data + frontmatter, opens `OrbitFormModal` pre-filled
- ✅ Edit button enabled when contact is selected (was disabled placeholder)
- ✅ Merge-only submit via `updateFrontmatter()` — only schema-defined fields written, custom frontmatter preserved
- ✅ File rename via `fileManager.renameFile()` when name field changes

#### Update This Person Command
- ✅ Registered `update-this-person` command in `main.ts`
- ✅ Active file detection via `getActiveViewOfType(MarkdownView)?.file`
- ✅ Contact lookup in `OrbitIndex`, shows Notice for non-contacts
- ✅ Added `openDirectUpdate()` method to `OrbitHubModal` — pre-sets view to `updating`, skips picker

#### FormRenderer Improvement
- ✅ Dropdown now shows raw frontmatter values not in options list (prevents silent data loss)

#### Field Rename
- ✅ Renamed `google_contact` → `contact_link` in both `new-person.schema.ts` and `edit-person.schema.ts`

### Tests (37 new, 370 total):

| File | Tests | Covers |
|------|-------|--------|
| `edit-person-schema.test.ts` | 13 | SchemaDef contract, field parity with new-person, edit-specific properties |
| `orbit-form-modal-prefill.test.ts` | 9 | initialValues propagation, raw dropdown preservation, submit/close flow |
| `update-this-person.test.ts` | 6 | Active file detection, contact lookup, direct update, error notices |
| `edit-flow.test.ts` | 9 | Full round-trip: initialValues build, merge submit, file rename, index rescan |

### Files Changed:

**Source (new):**
- `src/schemas/edit-person.schema.ts`

**Source (modified):**
- `src/modals/OrbitHubModal.ts` — `handleEdit()`, `openDirectUpdate()`, Edit button wiring
- `src/main.ts` — `update-this-person` command
- `src/components/FormRenderer.tsx` — Raw dropdown value injection
- `src/schemas/new-person.schema.ts` — `google_contact` → `contact_link`

**Test (new):**
- `test/unit/schemas/edit-person-schema.test.ts`
- `test/unit/modals/orbit-form-modal-prefill.test.ts`
- `test/unit/commands/update-this-person.test.ts`
- `test/integration/edit-flow.test.ts`

**Test Infrastructure:**
- `test/mocks/obsidian.ts` — Added `renameFile` mock to fileManager
- `test/helpers/factories.ts` — Added `interactionLogHeading` to settings factory

### Testing Notes:
- All 370 tests pass, 28 test files
- Build succeeds via `npm run build`
- Deployed to test vault, Brad verified manually — edit pre-fill, update this person, and file rename all working

### Blockers/Issues:
- None discovered this session

### Next Steps:
Continue with Phase 6: User Schema System

### Next Session Prompt:
```
Phase 5 + 5.5 complete. Ready to begin Phase 6: User Schema System.

What was done last session:
- ✅ edit-person.schema.ts with contact_link field
- ✅ handleEdit() in OrbitHubModal with pre-fill from frontmatter
- ✅ openDirectUpdate() for update-this-person command
- ✅ FormRenderer raw dropdown value support
- ✅ google_contact → contact_link rename
- ✅ 37 new tests (370 total), all passing
- ✅ Deployed and manually verified in test vault

Continue with Phase 6: User Schema System
Key files to reference:
- docs/UX Overhaul - Implementation Plan.md
- src/schemas/types.ts
- src/schemas/edit-person.schema.ts
- src/modals/OrbitFormModal.ts
```

---

## Git Commit Messages

### Phase 0
```
feat(test): Phase 0 — test infrastructure & baseline tests (99 tests)
```

### Phase 1 + 1.5
```
feat(modal): Phase 1 + 1.5 — schema system, form modal foundation & tests (120 tests)
```

### Phase 2 + 2.5
```
feat(contacts): Phase 2 + 2.5 — ContactManager service, New Person modal & tests

ContactManager Service:
- createContact with template loading, processFrontMatter, folder creation
- updateFrontmatter (merge-only), appendToInteractionLog (atomic)
- stripFrontmatter, ensureFolderExists helpers

New Person Flow:
- 7-field schema, FolderSuggest autocomplete, photo preview
- "New Person" command replaces debug-form command
- contactsFolder targeted scanning in OrbitIndex

Bug Fixes:
- FolderSuggest crash, tag override, Templater syntax, missing frontmatter, ENOENT

Tests (54 new, 273 total):
- contact-manager.test.ts (28), new-person-schema.test.ts (15)
- folder-suggest.test.ts (8), orbit-index.test.ts (+3)

Coverage: ContactManager 98.5%, schema 100%, FolderSuggest 100%, OrbitIndex 98%
```

### Phase 3 + 3.5
```
feat(picker): Phase 3 + 3.5 — Contact Picker modal, filters, local photos and tests

Contact Picker Modal:
- ContactPickerGrid with search, category/battery filters, sort-by-last-contacted
- ContactPickerModal extending ReactModal, wraps grid in OrbitProvider
- Temporary debug-picker command for testing

ContactCard Enhancements:
- mode prop (sidebar vs picker) with onSelect callback
- Local vault photo support via getResourcePath
- Wikilink photo resolution via metadataCache.getFirstLinkpathDest

Context and Tooltip:
- useOrbitOptional hook for safe context access outside provider
- FuelTooltip graceful fallback to cached contact.fuel

Tests (40 new, 313 total):
- contact-card-modes.test.tsx (11), contact-picker-grid.test.tsx (16)
- contact-picker-modal.test.ts (8), picker-flow.test.tsx (5)
- Menu mock updated with addSeparator/showAtMouseEvent

Infrastructure:
- .agent/workflows/test.md — test runner workflow
- test-output.txt added to .gitignore
```

### Phase 4 + 4.5
```
feat(hub): Phase 4 + 4.5 — Orbit Hub modal, UpdatePanel, and tests

Orbit Hub:
- OrbitHubModal replaces ContactPickerModal as centralized command modal
- Two-panel state machine: contact grid and inline update panel
- Action bar with Update, Add, Digest, Done buttons
- Edit and Suggest Message disabled as future placeholders
- ContactCard and ContactPickerGrid support selected state

UpdatePanel:
- Contact header with photo/initials, name, status badge
- Date picker, interaction type dropdown, optional note textarea
- Save triggers frontmatter update + interaction log append

Bug Fix:
- appendToInteractionLog uses configurable heading with includes() matching
- New interactionLogHeading setting for emoji/custom heading support

Cleanup:
- Deleted ContactPickerModal.ts (replaced by OrbitHubModal)
- Deleted contact-picker-modal.test.ts
- ReactModal.root changed to protected for subclass access

Tests (20 new, 333 total):
- orbit-hub-modal.test.ts (9), update-panel.test.tsx (17)
- contact-manager.test.ts (+3 heading tests)
- Removed 8 old picker modal tests
```

### Phase 5 + 5.5
```
feat(edit): Phase 5 + 5.5 — Edit Person modal, Update This Person command, and tests

Edit Person:
- edit-person.schema.ts with 7 fields matching new-person schema
- handleEdit() in OrbitHubModal reads contact data + frontmatter, opens pre-filled form
- Merge-only submit via updateFrontmatter, preserves non-schema frontmatter keys
- File rename via fileManager.renameFile() when name changes
- Edit button enabled when contact selected in hub

Update This Person:
- update-this-person command detects active file via getActiveViewOfType(MarkdownView)
- Contact lookup in OrbitIndex, Notice for non-contacts
- openDirectUpdate() skips picker, opens update panel directly

FormRenderer:
- Dropdown shows raw frontmatter values not in options list

Rename:
- google_contact field renamed to contact_link across schemas and tests

Tests (37 new, 370 total):
- edit-person-schema.test.ts (13), orbit-form-modal-prefill.test.ts (9)
- update-this-person.test.ts (6), edit-flow.test.ts (9)
- Mock updates: renameFile, interactionLogHeading in factories
```

### Phase 6 + 6.5
```
feat(schemas): Phase 6 + 6.5 — User Schema System with hybrid format

SchemaLoader:
- New loader.ts parses user-authored Markdown schemas from configurable folder
- Hybrid format: flat frontmatter keys = simple text fields, optional ```fields code block for advanced field types (dropdowns, etc.)
- Silent skip for non-schema files (no schema_id = not a schema)
- Merges user schemas with built-in, validates, generates example schema
- bodyTemplate extracted from markdown body for file creation

Settings:
- schemaFolder setting with FolderSuggest autocomplete
- Generate Example Schema button creates clean flat-frontmatter example

Commands:
- new-contact-from-schema with FuzzySuggestModal picker
- Single-schema optimization: skips picker when only one schema available

ContactManager:
- schema.output.path used for file placement (placeholder substitution)
- bodyTemplate from user schemas used instead of vault template
- parentFolder derived from resolved filePath for folder creation

Types:
- SchemaDef extended with optional bodyTemplate field

Tests (32 new, 402 total):
- loader.test.ts (25): parsing, validation, merging, silent skip, hybrid mode
- schema-settings.test.ts (5): settings rendering, generate button
- user-schema-flow.test.ts (3): end-to-end schema-to-contact flow (reworked to 3 focused tests)

Mock improvements:
- polyfillEl exported with createEl/createDiv for settings tests
- FuzzySuggestModal mock added
```

### Phase 7 + 7.5
```
feat(ai): Phase 7 + 7.5 — AI Provider Architecture & Tests

AiService (src/services/AiService.ts) [NEW]:
- AiProvider interface: id, name, isAvailable(), listModels(), generate()
- OllamaProvider: local auto-detect via GET ping, dynamic model list from /api/tags
- OpenAiProvider: API key auth, curated model list, chat completions API
- AnthropicProvider: x-api-key header auth, Messages API
- GoogleProvider: API key in query param, Gemini generateContent API
- CustomProvider: user-provided URL, OpenAI-compatible format with fallback
- AiService orchestrator: provider registry, refreshProviders(), getActiveProvider(), generate()
- DEFAULT_PROMPT_TEMPLATE with {{placeholders}} for contact data
- All HTTP via Obsidian requestUrl() for CORS + mobile compatibility

Settings (src/settings.ts):
- AiProviderType union: none | ollama | openai | anthropic | google | custom
- 6 new settings fields (aiProvider, aiApiKey, aiModel, aiPromptTemplate, aiCustomEndpoint, aiCustomModel)
- AI provider section with conditional field visibility
- Ollama hidden on mobile via Platform.isMobile check
- Prompt template as textarea (10 rows) for multi-paragraph editing
- Privacy notice on first provider enable
- Reset prompt template button

Main (src/main.ts):
- AiService instantiated in onload, refreshed on settings save

Workflow Rules:
- Added workflow gates to general-rules.md, GEMINI.md, CLAUDE.md
- Hard stops: deploy after build, stop for user confirmation, separate test phases

Tests (100 new, 502 total):
- ai-service.test.ts (61): all 5 providers + orchestrator, requestUrl mocking
- ai-settings.test.ts (20): defaults, types, conditional UI, mobile Ollama hiding
- ai-provider-flow.test.ts (19): end-to-end generation flow for all providers

Mock improvements:
- requestUrl (vi.fn) and Platform mocks added to obsidian.ts
- addTextArea mock added to Setting class
- AI settings defaults added to createSettings factory
```

### Phase 8 + 8.5
```
Date: 2026-02-16
Focus: AI Message Suggest Feature — Implementation + Polish + Tests

Completed:
- [x] AiResultModal (extends ReactModal) — displays AI-generated message suggestions
- [x] AiResult.tsx — React component: contact header, avatar with photo/initials fallback, message display, loading spinner, Copy/Regenerate/Dismiss buttons
- [x] Context extraction: extractContext() pulls name, category, daysSinceContact, socialBattery, lastInteraction from OrbitContact
- [x] Prompt assembly: assemblePrompt() fills known fields + dynamically resolves any {{Section Name}} placeholders from contact's markdown file
- [x] extractSection() regex handles emoji prefixes and extra words in headings (e.g., ## 🗣️ Conversational Fuel)
- [x] "Suggest message" action added to OrbitHubModal contact context menu
- [x] Per-provider API keys (aiApiKeys map) with legacy aiApiKey fallback
- [x] AI model names displayed in settings (not just IDs)
- [x] Loading spinner, avatar error fallback, copy notice, em dash guideline
- [x] Dynamic placeholder system — any {{Section Name}} in prompt template extracts matching section from contact file
- [x] Phase 7.5 test updated for new placeholder names
- [x] Phase 8.5 tests: 71 new tests (566 total, 34 files)

Files Changed:
- src/services/AiService.ts (MODIFIED — extractContext, assemblePrompt, extractSection, DEFAULT_PROMPT_TEMPLATE, per-provider keys)
- src/modals/OrbitHubModal.ts (MODIFIED — suggest message action, assemblePrompt call with fileContent)
- src/modals/AiResultModal.ts (NEW — ReactModal shell for AI result display)
- src/components/AiResult.tsx (NEW — React component for message display)
- src/settings.ts (MODIFIED — per-provider API key map, model name display)
- styles.css (MODIFIED — AI result modal styles, loading spinner)
- test/helpers/factories.ts (MODIFIED — aiApiKeys default)
- test/unit/services/ai-service.test.ts (MODIFIED — placeholder name update)
- test/integration/ai-provider-flow.test.ts (MODIFIED — minor adjustment)
- test/unit/services/ai-context.test.ts (NEW — 21 tests for extractSection)
- test/unit/services/ai-prompt.test.ts (NEW — 22 tests for extractContext + assemblePrompt)
- test/unit/components/ai-result.test.tsx (NEW — 16 tests for AiResult component)
- test/integration/ai-suggest-flow.test.ts (NEW — 12 integration tests)

Testing: 566 tests pass (34 files), npm run build succeeds
Deployed: test vault via npm run deploy:test

Bugs Fixed:
- extractSection regex too strict — didn't match headings with emoji prefixes (## 🗣️ Conversational Fuel)
- Placeholder mismatch — camelCase {{conversationalFuel}} didn't match actual heading names; switched to {{Conversational Fuel}}
- Factory ?? operator silently ignored undefined category overrides in tests

Next Steps:
- Phase 9: Debug Logging System
- Phase 9.5: Debug Logging Tests
```

### Phase 9 + 9.5
```
Date: 2026-02-18
Focus: Debug Logging System — Settings-controlled Logger + Tests

Completed:
- [x] Added logLevel field to OrbitSettings interface and DEFAULT_SETTINGS (default: 'off')
- [x] Added "Diagnostics" section with log level dropdown at bottom of settings tab
- [x] Logger.setLevel() called from onload() and saveSettings() in main.ts
- [x] Replaced 6 raw console.log calls in OrbitIndex.dumpIndex() with Logger.debug()
- [x] Replaced console.log in OrbitIndex.updateSettings() with Logger.debug()
- [x] Replaced console.error in OrbitIndex.saveStateToDisk() with Logger.error()
- [x] Replaced console.error in FuelTooltip.tsx with Logger.error()
- [x] Replaced console.error in LinkListener.ts with Logger.error()
- [x] Phase 9.5 tests: diagnostics-settings (10 tests), logging-flow (9 tests)
- [x] Updated orbit-index.test.ts (4 tests updated for Logger format)

Files Changed:
- src/settings.ts (MODIFIED — logLevel field, Diagnostics dropdown section)
- src/main.ts (MODIFIED — Logger init on load, update on save)
- src/services/OrbitIndex.ts (MODIFIED — 8 console calls → Logger)
- src/components/FuelTooltip.tsx (MODIFIED — console.error → Logger.error)
- src/services/LinkListener.ts (MODIFIED — console.error → Logger.error)
- test/helpers/factories.ts (MODIFIED — logLevel default in createSettings)
- test/unit/orbit-index.test.ts (MODIFIED — 4 tests updated for Logger.debug/error format)
- test/unit/settings/diagnostics-settings.test.ts (NEW — 10 unit tests)
- test/integration/logging-flow.test.ts (NEW — 9 integration tests)

Testing: 585 tests pass (36 files), npm run build succeeds
Deployed: test vault via npm run deploy:test
Manual verification: Verbose mode shows [Orbit:OrbitIndex] debug output, Off mode suppresses all

Issues Discovered:
- Expired Facebook CDN photo URLs cause browser 403 errors in console (not Logger-related)
- These are browser-level network errors from <img> tags, not suppressible via Logger
- Future fix: add onError handler to avatar <img> in ContactCard.tsx for fallback

Next Steps:
- Phase 10: Polish, Integration & Final Settings
- Image scraping/local storage feature (planned separately)
- Asset folder path should be a settings option (hardcoded currently)
```

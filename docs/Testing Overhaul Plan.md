# Testing Overhaul Plan

**Created:** 2026-02-19 | **Revised:** 2026-02-19 (post code-review)
**Target:** ≥80% lines + branches **per file** (floor)
**Current:** 60% lines / 63% branches / 57% functions — 39 test files, 640 tests ✅

> [!IMPORTANT]
> Coverage targets are **per-file**, not per-directory. Directory-level aggregation can mask individual files below 80%.

---

## Coverage Dashboard

### Per-File View (files below 80% line OR branch coverage)

| File | % Stmts | % Branch | % Lines | Status |
|------|---------|----------|---------|--------|
| `main.ts` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `views/OrbitView.tsx` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `views/OrbitDashboard.tsx` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `context/OrbitContext.tsx` | 5.3 | 0.0 | 5.3 | 🔴 Zero |
| `components/BirthdayBanner.tsx` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `components/ContactGrid.tsx` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `components/FuelTooltip.tsx` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `components/OrbitHeader.tsx` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `modals/AiResultModal.ts` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `modals/SchemaPickerModal.ts` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `modals/ScrapeConfirmModal.ts` | 0.0 | 0.0 | 0.0 | 🔴 Zero |
| `modals/OrbitHubModal.ts` | 36.4 | 43.0 | 36.4 | 🔴 Critical |
| `components/ContactCard.tsx` | 52.6 | ~50 | 52.6 | 🔴 Below target |
| `settings.ts` | 66.7 | 56.4 | 66.4 | 🟡 Below target |
| `components/FormRenderer.tsx` | 69.5 | ~65 | 69.5 | 🟡 Below target |
| `schemas/loader.ts` | 87.4 | **76.1** | 92.2 | 🟡 Branch below target |
| `utils/paths.ts` | 94.1 | **77.8** | 94.1 | 🟡 Branch below target |
| `types.ts` | 97.3 | **90.0** | 97.0 | 🟢 Near-perfect (1 branch) |

### Files at or above 80% (no action needed)

Services (`OrbitIndex`, `LinkListener`, `AiService`, `ContactManager`, `ImageScraper`), all schema files except `loader.ts`, all utils except `paths.ts`.

---

## Wave Summary

| Wave | Focus | Effort | Est. Tests | Coverage Lift | Sessions |
|------|-------|--------|-----------|---------------|----------|
| **0** | Quick wins: `types.ts`, `paths.ts`, `loader.ts` branch gaps | 🟢 Low | ~8 | +1-2% | ¼ |
| **1** | `main.ts` — Plugin lifecycle | 🔴 High | ~32 | +8-10% | 1 full |
| **2** | Components (FuelTooltip, ContactGrid, BirthdayBanner, OrbitHeader, ContactCard, FormRenderer) | 🔴 High | ~65 | +12-14% | 1.5 |
| **3** | Views + Context + OrbitDashboard | 🟡 Medium | ~18 | +2-3% | ½ |
| **4** | Modals (AiResultModal, SchemaPickerModal, ScrapeConfirmModal, OrbitHubModal) | 🟡-🔴 Medium-High | ~45 | +6-8% | 1.5 |
| **5** | Settings tab (`display()`, photo settings, migration) | 🟡 Medium | ~18 | +3-4% | ½ |

**Projected total after all waves:** ~87-92% lines, ~83-88% branches

> [!NOTE]
> Waves 0-3 alone should push past the 80% floor. Waves 4-5 provide safety margin and per-file compliance.

---

## Wave 0: Quick Wins (Branch Gap Closers) — 🟢 LOW EFFORT

**Session estimate:** ¼ session (combine with Wave 1)

### `types.ts` — 1 test to close branch gap

| Test | What it verifies | Target |
|------|-----------------|--------|
| `parseDate()` with non-ISO but valid date string (e.g., `"Jan 15, 2024"`) returns a valid Date | Fallback `new Date(dateStr)` branch at line 178-179 | 90% → 100% branch |

### `paths.ts` — 3 tests to close branch gap

| Test | What it verifies | Target |
|------|-----------------|--------|
| `ensureFolderExists("")` — empty path returns early (line 41) | Empty normalized path guard | Branch miss |
| `ensureFolderExists("a/b/c")` where intermediate folders exist — skips `createFolder` | `if (folder)` truthy branch at line 52 | Branch miss |
| `ensureFolderExists("a/b")` where `createFolder` throws — swallows error silently | `catch` block at line 55 | Branch miss |

### `schemas/loader.ts` — 4 tests to close branch gap

| Test | What it verifies | Target |
|------|-----------------|--------|
| `parseSchemaFile()` with valid frontmatter but all keys reserved → zero fields → returns null (line 296-297) | Zero-fields skip branch |
| `generateExampleSchema()` when `createFolder` throws (race condition) → proceeds normally (line 354-356) | createFolder catch branch |
| `generateExampleSchema()` when example file already exists → returns existing TFile (line 362-365) | Already-exists branch |
| `generateExampleSchema()` when `schemaFolder` is empty → shows Notice, returns null (line 343-345) | Empty folder guard |

---

## Wave 1: Plugin Lifecycle (`main.ts`) — 🔴 HIGH EFFORT

**File:** `src/main.ts` (408 lines, 0% coverage)
**Mocking depth:** Thorough — full `Plugin`, `App`, `Vault`, `Workspace`, `MetadataCache` mocks
**Estimated tests:** ~32
**Session estimate:** 1 full session

### Test File: `test/unit/main.test.ts`

**Mocking strategy:**
- Mock `Plugin` base class (`loadData`, `saveData`, `registerView`, `addCommand`, `registerEvent`, `addRibbonIcon`, `addSettingTab`)
- Mock `App` with full `vault`, `workspace`, `metadataCache`, `fileManager` sub-mocks
- Mock service constructors: `OrbitIndex`, `LinkListener`, `AiService`, `SchemaLoader`
- Mock modal constructors: `OrbitHubModal`, `OrbitFormModal`, `SchemaPickerModal`, `ScrapeConfirmModal`
- Mock `Notice` for verification of user notifications

#### `onload()` — Service Initialization (~8 tests)

| Test | What it verifies |
|------|-----------------|
| Loads settings via `loadData()` | Settings round-trip |
| Sets `Logger.setLevel()` from settings | Logger initialized |
| Creates `SchemaLoader` with `settings.schemaFolder` | Schema loader config |
| Creates `OrbitIndex` with `app` and `settings` | Index config |
| Registers `OrbitView` with `VIEW_TYPE_ORBIT` | View registration |
| Creates `LinkListener` with `app`, `index`, `settings` | Tether initialized |
| Creates `AiService` and calls `refreshProviders(settings)` | AI service configured |
| Adds ribbon icon with "users" icon and "Orbit Hub" label | Ribbon icon registered |

#### `onload()` — MetadataCache Initialization (~4 tests)

| Test | What it verifies |
|------|-----------------|
| `metadataCache.initialized` true → immediate `index.initialize()` + `schemaLoader.loadSchemas()` | Immediate init |
| `metadataCache.initialized` false → registers "resolved" handler | Deferred init |
| "resolved" handler calls `initialize()`, `loadSchemas()`, `trigger("change")` | Deferred fires correctly |
| `workspace.onLayoutReady` re-scans when contacts list empty | Fallback scan |

#### `onload()` — Event Registration (~4 tests)

| Test | What it verifies |
|------|-----------------|
| `metadataCache.on("changed")` → `index.handleFileChange(file)` | File change wiring |
| `vault.on("delete")` → `index.handleFileDelete(file)` only for `TFile` | Delete with TFile guard |
| `vault.on("rename")` → `index.handleFileRename(file, oldPath)` only for `TFile` | Rename with TFile guard |
| `workspace.on("editor-change")` → `linkListener.handleEditorChange(file)` when `info.file` exists | Editor change wiring |

#### `onload()` — Command Registration (~6 tests)

| Test | What it verifies |
|------|-----------------|
| `dump-index` → `index.dumpIndex()` | Debug command |
| `open-orbit` → `activateView()` | View open command |
| `weekly-digest` → `generateWeeklyDigest()` | Digest command |
| `orbit-hub` → creates/opens `OrbitHubModal` | Hub command |
| `new-person` → `openNewPersonFlow()` | New person command |
| `update-this-person` → opens `OrbitHubModal.openDirectUpdate()` for active contact, or Notice if not a contact | Update command with guard |

#### `onload()` — Photo Scrape Prompt Handler (~3 tests)

| Test | What it verifies |
|------|-----------------|
| Registers `index.on("photo-scrape-prompt")` → opens `ScrapeConfirmModal` | Handler registered |
| Confirm: `ImageScraper.scrapeAndSave`, `processFrontMatter`, Notice, marks/unmarks scraping | Happy path |
| Confirm + scrape error: logs error, failure Notice, unmarks scraping | Error path |

#### `openNewPersonFlow()` (~4 tests)

| Test | What it verifies |
|------|-----------------|
| No schemas → "No schemas available" Notice | Empty schemas guard |
| Single schema → opens `OrbitFormModal` directly (skips picker) | Single-schema optimization |
| Multiple schemas → opens `SchemaPickerModal` first | Multi-schema picker |
| Form submit: handles `_scrapePhoto`, calls `createContact`, re-scans index | Contact creation flow |

#### `generateWeeklyDigest()` (~4 tests)

| Test | What it verifies |
|------|-----------------|
| Groups contacts into contacted/overdue/snoozed sections | Report structure |
| Creates new file when digest doesn't exist | File creation path |
| Modifies existing file when digest exists | File update path |
| Opens digest file after generation | File opened |

#### `onunload()` — 1 test

| Test | What it verifies |
|------|-----------------|
| `onunload()` does not throw | Lifecycle completeness — V8 counts lines 358-360 |

#### `saveSettings()` / `loadSettings()` (~2 tests)

| Test | What it verifies |
|------|-----------------|
| `saveSettings` propagates to Logger, index, linkListener, schemaLoader, aiService | All downstream updates |
| `loadSettings` merges `DEFAULT_SETTINGS` with stored data | Settings migration |

#### `activateView()` (~3 tests)

| Test | What it verifies |
|------|-----------------|
| Existing leaf → reveals it (no new leaf created) | Existing view path |
| No existing leaf → creates right leaf, sets view state | New view path |
| `getRightLeaf` returns null → doesn't crash | Null safety |

---

## Wave 2: Components — 🔴 HIGH EFFORT

**Estimated tests:** ~65
**Session estimate:** 1.5 sessions

> [!IMPORTANT]
> **Private function testing strategy:** Several components contain module-private functions (`parseFuelSection`, `parseFuelLines`, `getDaysUntilBirthday`, `getSectionIndex`, `renderInline`). These are **not exported** and cannot be imported in tests. **All private logic is tested indirectly through rendered component output via React Testing Library (RTL).** Assertions target DOM elements, not function return values.

---

### Test File: `test/unit/components/fuel-tooltip.test.tsx` (NEW — highest priority)

**File:** `src/components/FuelTooltip.tsx` (322 lines, 0% coverage)

**Mocking strategy:**
- Mock `useOrbitOptional` to return plugin with `app.vault.read()` or `null`
- Mock `contact.file` for vault read calls
- All parsing logic tested through rendered output — no direct function imports

> [!NOTE]
> `parseFuelSection()`, `parseFuelLines()`, `renderInline()`, and `FuelContent` are all module-private. Tests exercise them indirectly by rendering `FuelTooltip` with controlled vault content and asserting on the DOM.

#### Rendering Tests (~10 tests)

| Test | What it verifies | Private logic exercised |
|------|-----------------|------------------------|
| Shows "Loading..." spinner initially | Loading state | — |
| Shows instruction text when no fuel found | Empty state | `parseFuelSection` returns null |
| Shows contact name and status badge in header | Header rendering | — |
| Vault content with `## Conversational Fuel` + `- item` → renders `<li>` elements | List items | `parseFuelSection` + `parseFuelLines` listItem type |
| Vault content with `## 🗣️ Conversational Fuel` (emoji variant) → still renders items | Emoji header | `parseFuelSection` emoji regex |
| Vault content with `**Header**` line → renders bold `<div>` subheader | Subheaders | `parseFuelLines` subheader type |
| Vault content with inline `**bold**` text → renders `<strong>` tags | Bold segments | `renderInline` bold extraction |
| Vault content with fuel section followed by `## Other Section` → only shows fuel items | Section boundary | `parseFuelSection` stops at next heading |
| Positions tooltip to the left of anchor by default | Positioning | — |
| Falls back to right side when no space on left | Position fallback | — |

#### Context Mode Tests (~3 tests)

| Test | What it verifies |
|------|-----------------|
| With plugin available → reads fuel from `vault.read()` | Sidebar mode |
| Without plugin (null context) → uses cached `contact.fuel` array | Picker mode |
| Vault read error → shows empty state gracefully | Error resilience |

---

### Test File: `test/unit/components/contact-grid.test.tsx` (NEW)

**File:** `src/components/ContactGrid.tsx` (147 lines, 0% coverage)

**Mocking strategy:**
- Mock `useOrbit` to return controlled contacts list
- Category grouping logic (`getSectionIndex`) tested through rendered section headings

#### Tests (~10 tests)

| Test | What it verifies | Private logic exercised |
|------|-----------------|------------------------|
| Empty contacts → "No contacts found" message | Empty vault state | — |
| Contacts filtered to 0 → "No contacts match filter" | Filter empty state | — |
| Family contact → appears under "Family & Friends" section | Category grouping | `getSectionIndex` |
| Work contact → appears under "Community & Professional" | Category grouping | `getSectionIndex` |
| Service contact → appears under "Service" section | Category grouping | `getSectionIndex` |
| Uncategorized contact → appears in "Other" section | Other bucket | `getSectionIndex` |
| `filterMode="charger"` → only Charger contacts shown | Charger filter | — |
| `filterMode="decay"` → only decay/wobble contacts shown | Decay filter | — |
| `sortMode="name"` → alphabetical order | Name sort | — |
| `sortMode="status"` → decay first, stable/snoozed last | Status sort | — |

---

### Test File: `test/unit/components/birthday-banner.test.tsx` (NEW)

**File:** `src/components/BirthdayBanner.tsx` (96 lines, 0% coverage)

**Mocking strategy:**
- Mock `useOrbit` to return contacts with various birthday values
- **Must use `vi.useFakeTimers()` + `vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0))`** — pin to midnight Jan 1 2026 to avoid flaky day-boundary tests caused by `Math.ceil()` in `getDaysUntilBirthday()`

> [!WARNING]
> Without `vi.setSystemTime()` pinned to midnight, the "today" and "0 days" boundary test will give different results depending on when the test runs (time-of-day affects the `Math.ceil` calculation).

#### Tests (~10 tests — all via rendered output)

| Test | What it verifies | Private logic exercised |
|------|-----------------|------------------------|
| No upcoming birthdays → renders nothing (returns null) | Empty state | `getDaysUntilBirthday` all > 7 |
| Birthday today (Jan 1) → shows "🎉 Today!" | Today display | `getDaysUntilBirthday` returns 0 |
| Birthday tomorrow (Jan 2) → shows "Tomorrow" | Tomorrow display | `getDaysUntilBirthday` returns 1 |
| Birthday Jan 4 → shows "in 3 days" | N-days display | `getDaysUntilBirthday` returns 3 |
| Birthday Jan 9 (8 days away) → not shown | Window boundary | `getDaysUntilBirthday` returns 8 |
| `MM-DD` format (e.g., `01-03`) correctly parsed | Short date format | — |
| `YYYY-MM-DD` format (e.g., `1990-01-03`) correctly parsed | Long date format | — |
| Invalid birthday format → ignored silently | Invalid format | `getDaysUntilBirthday` returns null |
| Multiple birthdays sorted by soonest first | Sort order | — |
| Clicking birthday item opens the contact's note | Click handler | — |

#### Year Rollover Test (~1 test)

| Test | What it verifies |
|------|-----------------|
| Birthday `12-25` tested from `Jan 1 2026` → not shown (> 7 days); tested from `Dec 20 2026` (via `vi.setSystemTime`) → shown "in 5 days" | Year rollover logic |

---

### Test File: `test/unit/components/orbit-header.test.tsx` (NEW)

**File:** `src/components/OrbitHeader.tsx` (69 lines, 0% coverage)

**Mocking strategy:**
- **No context mocking needed.** `OrbitHeader` is a pure props-driven component. The `useOrbit` import is a dead import (imported but never called in the component body).
- Render with props, fire change events, assert on callbacks.

> [!NOTE]
> The dead `useOrbit` import in `OrbitHeader.tsx` should be flagged as a code quality issue and removed in a separate cleanup PR.

#### Tests (~7 tests)

| Test | What it verifies |
|------|-----------------|
| Renders contact count | Count display |
| Sort dropdown shows current `sortMode` | Sort selection |
| Changing sort dropdown calls `onSortChange` with new value | Sort callback |
| Filter dropdown shows current `filterMode` | Filter selection |
| Changing filter dropdown calls `onFilterChange` with new value | Filter callback |
| Refresh button calls `onRefresh` on click | Refresh callback |
| All dropdown options render (status/name for sort; all/charger/decay for filter) | Options present |

---

### Existing: `test/unit/components/contact-card-modes.test.tsx` — EXTEND

**File:** `src/components/ContactCard.tsx` (321 lines, 52.6% → target 80%+)

**Mocking strategy additions:**
- **Must use `vi.useFakeTimers()`** for hover tooltip tests — `handleMouseEnter` uses `setTimeout(300ms)`, `handleMouseLeave` uses `setTimeout(400ms)`, `handleTooltipMouseLeave` uses `setTimeout(200ms)`. Without fake timers, tooltip visibility assertions are non-deterministic.
- Mock `navigator.clipboard` for potential copy actions
- Mock `Obsidian.Menu` class for context menu verification

#### Additional Tests (~17 tests)

| Test | What it verifies |
|------|-----------------|
| Right-click sidebar mode → opens Obsidian `Menu` | Context menu opens |
| Right-click picker mode → no menu | Picker mode guard |
| Context menu "Mark as contacted today" → updates frontmatter via `processFrontMatter` | Mark contacted action |
| Context menu "Snooze for 1 week" → sets `snooze_until` 7 days ahead | Snooze 1-week |
| Context menu "Snooze for 1 month" → sets `snooze_until` 30 days ahead | Snooze 1-month |
| Context menu "Unsnooze" removes `snooze_until` (only shown when snoozed) | Unsnooze action |
| **Context menu "Open in new tab" → calls `workspace.getLeaf(true).openFile(contact.file)`** (line 134) | Open-in-new-tab handler |
| Frontmatter update error → shows failure Notice | Error handling |
| Photo URL (`https://...`) → used as-is for `img.src` | URL photo |
| Wikilink photo (`[[file]]`) → resolved via `getFirstLinkpathDest` | Wikilink success |
| **Wikilink photo where `getFirstLinkpathDest` returns null → photo resolves to null, shows fallback** (line 259) | Wikilink failure |
| Vault-local path → resolved via `adapter.getResourcePath` | Local path |
| No photo → shows initials fallback | Initials fallback |
| Image load error → hides img, shows fallback | Image error |
| `stringToColor()` returns consistent HSL for same name | Color consistency |
| **Mouse enter starts 300ms timer → `vi.advanceTimersByTime(300)` → tooltip appears; mouse leave within 300ms cancels** | Hover timing |
| `selected` prop adds `orbit-card--selected` class | Selection highlight |

---

### Existing: `test/unit/components/form-renderer.test.tsx` — EXTEND SIGNIFICANTLY

**File:** `src/components/FormRenderer.tsx` (317 lines, 69.5% → target 80%+)

**Currently uncovered:** lines 54 (`isUrl`), 69-84 (`resolvePhotoSrc` entire body), 187-217 (`case 'photo'` block)

> [!IMPORTANT]
> The original plan had 1 test for photo behavior. This must be **8 tests** covering all `resolvePhotoSrc` branches and the `photo` field type rendering. Without these, FormRenderer cannot reach 80%.

#### Additional Tests (~10 tests)

| Test | What it verifies | Lines covered |
|------|-----------------|---------------|
| `photo` field with URL value → renders `<img>` preview with URL src | Photo field rendering | 174-210 |
| `photo` field with URL → shows scrape toggle when `onScrapeChange` provided | Scrape toggle visibility | 211-223 |
| `photo` field with non-URL value → no scrape toggle shown | Toggle hidden for non-URL | 176, 211 |
| `photo` field with empty string → no preview image | Empty value | 175-176 |
| `photo` field with wikilink `[[photo.jpg]]` + App mock → resolves via `getFirstLinkpathDest` → preview shows | Wikilink resolution success | 74-79 |
| `photo` field with wikilink + `getFirstLinkpathDest` returns null → no preview | Wikilink failure | 80 |
| `photo` field with vault-local path + App mock → resolves via `adapter.getResourcePath` | Local path resolution | 83-84 |
| `photo` field without App → only URL values show preview (wikilink/local return null) | No-app guard | 71 |
| Photo `onError` fires → hides image, shows "Could not load image" span | Error handler | 195-198 |
| Dropdown with no options → renders empty `<select>` | Dropdown coverage | 114-131 |

---

## Wave 3: Views + Context — 🟡 MEDIUM EFFORT

**Estimated tests:** ~18
**Session estimate:** ½ session

> [!NOTE]
> Wave 3 was upgraded from Low to **Medium effort** due to: (a) `OrbitView` requires precise mock of `containerEl.children[1]`, (b) `DashboardContent` is unexported and must be tested through `OrbitDashboard`, (c) `OrbitContext` has async effects and cleanup verification.

---

### Test File: `test/unit/views/orbit-view.test.ts` (NEW)

**File:** `src/views/OrbitView.tsx` (53 lines, 0% coverage)

**Mocking strategy:**
- Mock `ItemView` base class
- **Critical:** `containerEl` must have a `children` array where `children[1]` is a mock DOM element with `.empty()` and `.addClass()` methods. `OrbitView.onOpen()` does:
  ```ts
  const container = this.containerEl.children[1];
  container.empty();
  container.addClass("orbit-container");
  ```
  The mock must provide this exact hierarchy. Example setup:
  ```ts
  const mockContainer = { empty: vi.fn(), addClass: vi.fn() };
  const mockContainerEl = { children: [null, mockContainer] };
  ```
- Mock `createRoot` from `react-dom/client`

#### Tests (~6 tests)

| Test | What it verifies |
|------|-----------------|
| `getViewType()` returns `"orbit-view"` | View type constant |
| `getDisplayText()` returns `"Orbit"` | Display text |
| `getIcon()` returns `"users"` | Icon name |
| `onOpen()` clears `containerEl.children[1]`, adds `orbit-container` class | Container setup |
| `onOpen()` creates React root and renders `OrbitDashboard` inside `StrictMode` | Root creation |
| `onClose()` unmounts React root and nulls reference | Cleanup |

---

### Test File: `test/unit/views/orbit-dashboard.test.tsx` (NEW)

**File:** `src/views/OrbitDashboard.tsx` (46 lines, 0% coverage)

**Mocking strategy:**
- Mock `OrbitProvider`, `ContactGrid`, `OrbitHeader`, `BirthdayBanner` as passthrough components
- **`DashboardContent` is unexported** — cannot be imported or tested directly. All tests go through `OrbitDashboard` with `OrbitProvider` mocked at the module level. Inner state wiring is tested by asserting that child components receive the correct props after state changes.

#### Tests (~4 tests)

| Test | What it verifies |
|------|-----------------|
| Wraps content in `OrbitProvider` with plugin prop | Provider wrapping |
| Renders `BirthdayBanner`, `OrbitHeader`, and `ContactGrid` | Child components present |
| Changing sort dropdown (via `OrbitHeader` `onSortChange`) updates `ContactGrid` sortMode | State wiring: sort |
| Changing filter dropdown (via `OrbitHeader` `onFilterChange`) updates `ContactGrid` filterMode | State wiring: filter |

---

### Test File: `test/unit/context/orbit-context.test.tsx` (NEW)

**File:** `src/context/OrbitContext.tsx` (85 lines, 5% coverage)

**Mocking strategy:**
- Mock `OrbitPlugin` with `index.getContactsByStatus()`, `index.on()`, `index.off()`

#### Tests (~8 tests)

| Test | What it verifies |
|------|-----------------|
| `useOrbit()` throws when used outside `OrbitProvider` | Error guard |
| `useOrbit()` returns context value inside `OrbitProvider` | Happy path |
| `useOrbitOptional()` returns null outside `OrbitProvider` | Null return |
| `useOrbitOptional()` returns context value inside `OrbitProvider` | Happy path |
| `OrbitProvider` calls `index.getContactsByStatus()` on mount | Initial load |
| `OrbitProvider` subscribes to `index.on("change")` | Event subscription |
| Triggering "change" event updates contacts state | Reactive update |
| **Calling `refreshContacts()` from context value triggers `getContactsByStatus()` and updates contacts** | Consumer-callable refresh |
| Unmounting provider calls `index.off("change")` to cleanup | Cleanup |

---

## Wave 4: Modals — 🟡-🔴 MEDIUM-HIGH EFFORT

**Estimated tests:** ~45
**Session estimate:** 1.5 sessions (bumped from 1 — async handlers + multi-mock interactions are complex)

---

### Test File: `test/unit/modals/ai-result-modal.test.ts` (NEW)

**File:** `src/modals/AiResultModal.ts` (144 lines, 0% coverage)

**Mocking strategy:**
- Mock `ReactModal` base class (`root`, `open`, `close`, `titleEl`, `modalEl`)
- Mock `navigator.clipboard.writeText`
- Mock `Notice`

#### Tests (~13 tests)

| Test | What it verifies |
|------|-----------------|
| Constructor stores plugin, contact, sets `loading = true` | Initialization |
| Constructor resolves photo URL (http passthrough) | URL photo |
| Constructor resolves photo wikilink via `getFirstLinkpathDest` | Wikilink photo |
| **Constructor resolves wikilink where `getFirstLinkpathDest` returns null → `resolvedPhoto` is null** | Wikilink failure path |
| Constructor resolves vault-local photo via `adapter.getResourcePath` | Local photo |
| `onOpen()` sets title and adds CSS class | Modal setup |
| `onClose()` removes CSS class | Modal teardown |
| `setMessage()` sets message, clears loading, re-renders | Message display |
| `setError()` prefixes "Error:", clears loading, re-renders | Error display |
| `handleRegenerate()` happy path: sets loading, calls callback, updates message | Regenerate success |
| **`handleRegenerate()` when callback throws `Error` → message shows `error.message`** | Error instance branch |
| **`handleRegenerate()` when callback throws non-Error → message shows "Generation failed"** | Non-Error branch |
| `handleCopy()` writes to clipboard and shows Notice | Copy action |

---

### Test File: `test/unit/modals/schema-picker-modal.test.ts` (NEW)

**File:** `src/modals/SchemaPickerModal.ts` (32 lines, 0% coverage)

#### Tests (~4 tests)

| Test | What it verifies |
|------|-----------------|
| Constructor stores schemas and callback | Initialization |
| `getItems()` returns the schemas array | Items list |
| `getItemText()` returns `schema.title` | Display text |
| `onChooseItem()` calls callback with the selected schema | Selection callback |

---

### Test File: `test/unit/modals/scrape-confirm-modal.test.ts` (NEW)

**File:** `src/modals/ScrapeConfirmModal.ts` (54 lines, 0% coverage)

#### Tests (~6 tests)

| Test | What it verifies |
|------|-----------------|
| Constructor stores contact name, confirm, and skip callbacks | Initialization |
| `onOpen()` creates heading "Download photo?" | Content rendering |
| `onOpen()` shows contact name in description text | Personalized message |
| Download button calls `close()` then `onConfirm()` | Confirm flow |
| Skip button calls `close()` then `onSkip()` | Skip flow |
| `onClose()` empties content element | Cleanup |

---

### Existing: `test/unit/modals/orbit-hub-modal.test.ts` — EXTEND SIGNIFICANTLY

**File:** `src/modals/OrbitHubModal.ts` (367 lines, 36.4% → target 80%+)

**Mocking strategy (deep):**
- Mock `ReactModal` base class (`root.render`, `titleEl`, `modalEl`)
- Mock `OrbitFormModal`, `AiResultModal` constructors
- Mock `updateFrontmatter`, `appendToInteractionLog` from `ContactManager`
- Mock `extractContext`, `assemblePrompt` from `AiService`
- Mock `ImageScraper.scrapeAndSave` and `ImageScraper.isUrl`
- Mock `Notice` and `Logger`

#### Additional Tests (~22 tests)

| Test | What it verifies |
|------|-----------------|
| `handleSelect()` sets `selectedContact` and re-renders | Contact selection |
| `handleSelect()` same contact → toggles off (deselects) | Toggle deselect |
| `handleUpdate()` with no selection → no-op | Guard check |
| `handleUpdate()` transitions to `'updating'` view, updates title | View transition |
| `handleEdit()` reads frontmatter cache, opens `OrbitFormModal` with initial values | Edit pre-fill |
| **`handleEdit()` form submit + name changed → `renameFile()` called with correct new path** | Rename on name change |
| **`handleEdit()` form submit + name unchanged → `renameFile()` NOT called** | Skip rename |
| `handleEdit()` photo scrape flag triggers `ImageScraper.scrapeAndSave` | Photo scrape in edit |
| `handleEdit()` photo scrape failure → Notice, keeps original URL | Photo scrape error |
| `handleAdd()` calls `plugin.openNewPersonFlow()` | Add delegation |
| `handleDigest()` calls `plugin.generateWeeklyDigest()` and shows Notice | Digest generation |
| `handleDigest()` error → failure Notice | Digest error |
| **`handleSuggest()` with no `selectedContact` → returns immediately (no-op)** | Null guard |
| `handleSuggest()` with AI provider = 'none' → "not configured" Notice | AI guard |
| `handleSuggest()` opens `AiResultModal` in loading state, then sets message | AI suggest happy path |
| `handleSuggest()` AI error → `modal.setError()` | AI suggest error |
| `handleSave()` updates frontmatter with lastContact and interactionType | Save frontmatter |
| `handleSave()` appends to interaction log when note provided | Log append |
| `handleSave()` no note → skips log append | No-note skip |
| `handleSave()` error → failure Notice | Save error |
| `handleCancel()` returns to hub view and resets title | Cancel flow |
| **Update/Edit buttons `disabled` when no contact selected; Suggest disabled when no contact OR aiProvider='none'** | Button disabled states |
| `openDirectUpdate()` sets contact and view, then opens | Direct update entry |

---

## Wave 5: Settings Tab — 🟡 MEDIUM EFFORT

**Estimated tests:** ~18
**Session estimate:** ½ session

### Existing: `test/unit/settings/` — EXTEND

**File:** `src/settings.ts` (505 lines, 66.4% → target 80%+)

#### `display()` Main Section (~9 tests)

| Test | What it verifies |
|------|-----------------|
| Creates "Orbit Settings" heading | Section heading |
| Person Tag setting renders, saves on change | Person tag |
| Ignored Folders splits comma-separated input | Path parsing |
| Date Format defaults to "YYYY-MM-DD" on empty | Date format default |
| Contacts folder renders `FolderSuggest` | Folder suggest |
| Template path saves trimmed value | Template path |
| Interaction log heading defaults to "Interaction Log" on empty | Heading default |
| Schema folder renders `FolderSuggest` | Schema folder |
| **"Generate example schema" button → calls `schemaLoader.generateExampleSchema()`; also tests branch when `schemaLoader` is falsy** | Generate button (lines 224-237) |

#### `displayPhotoSettings()` (~5 tests)

| Test | What it verifies |
|------|-----------------|
| Photo asset folder renders with `FolderSuggest` | Folder suggest |
| Default scrape toggle reflects `defaultScrapeEnabled` | Toggle state |
| Toggle change saves updated value | Toggle save |
| Photo scrape on edit dropdown shows all 3 options | Dropdown options |
| Dropdown change saves correct enum value | Dropdown save |

#### AI Settings Branch Coverage (~3 tests)

| Test | What it verifies |
|------|-----------------|
| Custom provider shows endpoint URL and model name fields | Custom fields |
| **Provider change from 'none' to cloud → calls `this.display()` to re-render** | Re-render branch |
| Reset prompt button restores `DEFAULT_PROMPT_TEMPLATE` and re-renders | Template reset |

#### Settings Migration (~1 test)

| Test | What it verifies |
|------|-----------------|
| **Deprecated `aiApiKey` field migrates to `aiApiKeys[provider]` in `displayAiSettings`** | Backward compatibility |

---

## Integration Test Assessment

> [!NOTE]
> The plan focuses on unit tests. 8 existing integration test files (`picker-flow.test.tsx`, `edit-flow.test.ts`, `ai-suggest-flow.test.ts`, etc.) contribute to coverage of `ContactCard`, `OrbitHubModal`, and `AiService` code paths. When running coverage after each wave, we should check whether integration tests already cover some targeted branches — this may reduce the number of new unit tests needed for the 80% floor.

---

## Session Planning

| Session | Waves | Focus | Est. Duration |
|---------|-------|-------|--------------|
| **Session A** | Wave 0 + Wave 1 | Quick wins + `main.ts` lifecycle | Full session |
| **Session B** | Wave 2 (part 1) | FuelTooltip + ContactGrid + BirthdayBanner + OrbitHeader | Full session |
| **Session C** | Wave 2 (part 2) + Wave 3 | ContactCard extend + FormRenderer + Views + Context | Full session |
| **Session D** | Wave 4 | All modals (complex async handlers) | Full session |
| **Session E** | Wave 5 | Settings tab + final coverage audit | ½ session |

**After each session:** Run `npx vitest run --coverage` and confirm per-file progress toward 80% floor.

---

## Success Criteria

- **Every file ≥ 80% line coverage AND ≥ 80% branch coverage** (except where architecturally impractical)
- **Overall line coverage ≥ 80%**
- **Overall branch coverage ≥ 80%**
- **All existing 640 tests still pass** after each wave
- **No flaky tests** — deterministic mocking, `vi.useFakeTimers()` for all time-dependent assertions, `vi.setSystemTime()` for date boundaries

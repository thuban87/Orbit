/**
 * Baseline tests for src/services/OrbitIndex.ts
 *
 * Tests the "Radar" — the in-memory contact index that scans the vault,
 * parses contacts from frontmatter, and responds to file events.
 * These tests lock down existing behavior before the UX Overhaul begins.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrbitIndex } from '../../src/services/OrbitIndex';
import { TFile, CachedMetadata, createMockApp } from '../mocks/obsidian';
import { createTFile, createCachedMetadata, createSettings } from '../helpers/factories';
import { Logger } from '../../src/utils/logger';

// ─── Test Setup ─────────────────────────────────────────────────

function setupIndex(overrides: {
    files?: TFile[];
    cacheMap?: Map<TFile, CachedMetadata>;
    settings?: ReturnType<typeof createSettings>;
} = {}) {
    const files = overrides.files ?? [];
    const cacheMap = overrides.cacheMap ?? new Map();
    const settings = overrides.settings ?? createSettings();
    const app = createMockApp({ files, cacheMap });
    const index = new OrbitIndex(app, settings);
    return { index, app, settings };
}

/** Create a file + cache pair for a valid person contact */
function createPersonFile(name: string, frontmatterOverrides: Record<string, any> = {}) {
    const file = createTFile({ path: `People/${name}.md`, basename: name });
    const cache = createCachedMetadata({
        frontmatter: {
            tags: ['people'],
            frequency: 'Monthly',
            last_contact: '2025-01-15',
            category: 'Friends',
            ...frontmatterOverrides,
        },
    });
    return { file, cache };
}

// ═══════════════════════════════════════════════════════════════
// Constructor
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - constructor', () => {
    it('creates an instance with empty contacts', () => {
        const { index } = setupIndex();
        expect(index.getContacts()).toEqual([]);
    });
});

// ═══════════════════════════════════════════════════════════════
// initialize
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - initialize', () => {
    it('scans vault and saves state on first call', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index, app } = setupIndex({ files: [file], cacheMap });

        await index.initialize();

        expect(index.getContacts()).toHaveLength(1);
        expect(app.vault.adapter.write).toHaveBeenCalled();
    });

    it('is a no-op on subsequent calls', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index, app } = setupIndex({ files: [file], cacheMap });

        await index.initialize();
        app.vault.adapter.write.mockClear();

        await index.initialize();
        // saveStateToDisk should NOT be called again
        expect(app.vault.adapter.write).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════
// scanVault
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - scanVault', () => {
    it('clears existing contacts before scanning', async () => {
        const { file: file1, cache: cache1 } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file1, cache1]]);
        const { index, app } = setupIndex({ files: [file1], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(1);

        // Remove the file from the mock (simulate file deletion)
        app.vault.getMarkdownFiles.mockReturnValue([]);
        await index.scanVault();
        expect(index.getContacts()).toHaveLength(0);
    });

    it('scans multiple files', async () => {
        const { file: f1, cache: c1 } = createPersonFile('Alice');
        const { file: f2, cache: c2 } = createPersonFile('Bob');
        const cacheMap = new Map<TFile, CachedMetadata>([[f1, c1], [f2, c2]]);
        const { index } = setupIndex({ files: [f1, f2], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(2);
    });

    it('skips files in ignored paths', async () => {
        const file = createTFile({ path: 'Templates/Person Template.md' });
        const cache = createCachedMetadata();
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(0);
    });

    it('skips files without the person tag', async () => {
        const file = createTFile({ path: 'Notes/Meeting Notes.md' });
        const cache = createCachedMetadata({
            frontmatter: { tags: ['meeting'], title: 'Standup' },
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(0);
    });

    it('skips files with no metadata cache', async () => {
        const file = createTFile({ path: 'People/Ghost.md' });
        // Don't add to cacheMap → getFileCache returns null
        const { index } = setupIndex({ files: [file] });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(0);
    });

    // ── contactsFolder targeted scanning ────────────────────────

    it('uses targeted scan when contactsFolder is set and folder exists', async () => {
        const settings = createSettings({ contactsFolder: 'People' });
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);

        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        // Mock folder lookup — return a folder with the file inside
        const { TFolder: TFolderClass } = await import('../mocks/obsidian');
        const folder = new TFolderClass('People');
        folder.children = [file];
        app.vault.getFolderByPath.mockReturnValue(folder);

        await index.scanVault();

        // Should NOT call getMarkdownFiles (full vault scan)
        expect(app.vault.getMarkdownFiles).not.toHaveBeenCalled();
        expect(index.getContacts()).toHaveLength(1);
    });

    it('falls back to full vault scan when contactsFolder does not exist', async () => {
        const settings = createSettings({ contactsFolder: 'NonExistent' });
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);

        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        // Folder not found
        app.vault.getFolderByPath.mockReturnValue(null);

        await index.scanVault();

        // Should fall back to getMarkdownFiles
        expect(app.vault.getMarkdownFiles).toHaveBeenCalled();
    });

    it('uses full vault scan when contactsFolder is empty', async () => {
        const settings = createSettings({ contactsFolder: '' });
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);

        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        // Should use getMarkdownFiles (default behavior)
        expect(app.vault.getMarkdownFiles).toHaveBeenCalled();
        expect(index.getContacts()).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════
// isIgnoredPath (tested indirectly through scanVault + handleFileChange)
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - isIgnoredPath', () => {
    it('matches folder prefix with forward slash', async () => {
        const file = createTFile({ path: 'Archive/old-contact.md' });
        const cache = createCachedMetadata();
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(0);
    });

    it('does not match partial folder names', async () => {
        // "Arch" folder should NOT trigger ignore for "Archive" ignored path
        const file = createTFile({ path: 'Arch/contact.md' });
        const cache = createCachedMetadata();
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════
// parseContact (tested indirectly through scanVault)
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - parseContact', () => {
    it('builds a full contact with all fields', async () => {
        const { file, cache } = createPersonFile('Alice', {
            category: 'Family',
            frequency: 'Weekly',
            last_contact: '2025-01-10',
            photo: 'https://example.com/alice.jpg',
            social_battery: 'Charger',
            last_interaction: 'call',
            birthday: '03-15',
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const contacts = index.getContacts();
        expect(contacts).toHaveLength(1);

        const contact = contacts[0];
        expect(contact.name).toBe('Alice');
        expect(contact.category).toBe('Family');
        expect(contact.frequency).toBe('Weekly');
        expect(contact.photo).toBe('https://example.com/alice.jpg');
        expect(contact.socialBattery).toBe('Charger');
        expect(contact.lastInteraction).toBe('call');
        expect(contact.birthday).toBe('03-15');
        expect(contact.lastContact).toBeInstanceOf(Date);
    });

    it('defaults frequency to Monthly for invalid values', async () => {
        const { file, cache } = createPersonFile('Bob', {
            frequency: 'Every Other Day', // invalid
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const contact = index.getContacts()[0];
        expect(contact.frequency).toBe('Monthly');
    });

    it('defaults frequency to Monthly when missing', async () => {
        const file = createTFile({ path: 'People/Carol.md', basename: 'Carol' });
        const cache = createCachedMetadata({
            frontmatter: { tags: ['people'], last_contact: '2025-01-15' },
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const contact = index.getContacts()[0];
        expect(contact.frequency).toBe('Monthly');
    });

    it('handles missing optional fields gracefully', async () => {
        const file = createTFile({ path: 'People/Dave.md', basename: 'Dave' });
        const cache = createCachedMetadata({
            frontmatter: { tags: ['people'], frequency: 'Monthly' },
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const contact = index.getContacts()[0];
        expect(contact.lastContact).toBeNull();
        expect(contact.photo).toBeUndefined();
        expect(contact.socialBattery).toBeUndefined();
        expect(contact.snoozeUntil).toBeNull();
    });

    it('returns null when frontmatter is missing', async () => {
        const file = createTFile({ path: 'People/Eve.md' });
        const cache: CachedMetadata = {
            // No frontmatter at all, but has an inline tag
            tags: [{ tag: '#people', position: {} }],
        };
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        // hasPersonTag would pass on inline tags, but parseContact returns null
        // because frontmatter itself is required (line 81 of OrbitIndex.ts)
        expect(index.getContacts()).toHaveLength(0);
    });

    it('sets status to "snoozed" when snooze_until is in the future', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const snoozeStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

        const { file, cache } = createPersonFile('Frank', {
            snooze_until: snoozeStr,
            last_contact: '2024-01-01', // Very old → would normally be "decay"
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const contact = index.getContacts()[0];
        expect(contact.status).toBe('snoozed');
        expect(contact.snoozeUntil).toBeInstanceOf(Date);
    });

    it('does not snooze when snooze_until is in the past', async () => {
        const { file, cache } = createPersonFile('Grace', {
            snooze_until: '2020-01-01', // Past
            last_contact: '2024-01-01', // Old → decay
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const contact = index.getContacts()[0];
        expect(contact.status).not.toBe('snoozed');
        expect(contact.snoozeUntil).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════
// hasPersonTag (tested indirectly)
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - hasPersonTag', () => {
    it('matches tags in frontmatter tags array', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(1);
    });

    it('matches inline tags from metadata cache (with # prefix)', async () => {
        const file = createTFile({ path: 'People/Bob.md', basename: 'Bob' });
        const cache: CachedMetadata = {
            frontmatter: { frequency: 'Monthly', last_contact: '2025-01-15' },
            tags: [{ tag: '#people', position: {} }],
        };
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(1);
    });

    it('is case-insensitive', async () => {
        const file = createTFile({ path: 'People/Carol.md', basename: 'Carol' });
        const cache = createCachedMetadata({
            frontmatter: { tags: ['People'], frequency: 'Monthly', last_contact: '2025-01-15' },
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(1);
    });

    it('returns false when no tags match', async () => {
        const file = createTFile({ path: 'Notes/Random.md' });
        const cache = createCachedMetadata({
            frontmatter: { tags: ['project', 'meeting'], title: 'Notes' },
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// handleFileChange
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - handleFileChange', () => {
    it('adds a new contact when file matches criteria', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ cacheMap });

        index.handleFileChange(file);
        expect(index.getContacts()).toHaveLength(1);
    });

    it('updates an existing contact', async () => {
        const file = createTFile({ path: 'People/Alice.md', basename: 'Alice' });
        const cache1 = createCachedMetadata({
            frontmatter: { tags: ['people'], frequency: 'Monthly', last_contact: '2025-01-15', category: 'Friends' },
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache1]]);
        const { index, app } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()[0].category).toBe('Friends');

        // Update the cache to change category
        const cache2 = createCachedMetadata({
            frontmatter: { tags: ['people'], frequency: 'Monthly', last_contact: '2025-01-15', category: 'Family' },
        });
        app.metadataCache.getFileCache.mockReturnValue(cache2);

        index.handleFileChange(file);
        expect(index.getContacts()[0].category).toBe('Family');
    });

    it('removes contact when file no longer matches criteria', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index, app } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(1);

        // Now the file no longer has the person tag
        app.metadataCache.getFileCache.mockReturnValue(
            createCachedMetadata({ frontmatter: { tags: ['project'] } })
        );
        index.handleFileChange(file);
        expect(index.getContacts()).toHaveLength(0);
    });

    it('removes contact when file path becomes ignored', async () => {
        const file = createTFile({ path: 'Archive/Alice.md', basename: 'Alice' });
        const cache = createCachedMetadata();
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ cacheMap });

        index.handleFileChange(file);
        expect(index.getContacts()).toHaveLength(0);
    });

    it('triggers "change" event', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ cacheMap });

        const handler = vi.fn();
        index.on('change', handler);

        index.handleFileChange(file);
        expect(handler).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════
// handleFileDelete
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - handleFileDelete', () => {
    it('removes a tracked contact', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(1);

        index.handleFileDelete(file);
        expect(index.getContacts()).toHaveLength(0);
    });

    it('triggers "change" event when deleting tracked file', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const handler = vi.fn();
        index.on('change', handler);

        index.handleFileDelete(file);
        expect(handler).toHaveBeenCalled();
    });

    it('is a no-op for non-tracked files', async () => {
        const { index } = setupIndex();
        const handler = vi.fn();
        index.on('change', handler);

        const unknownFile = createTFile({ path: 'Notes/Random.md' });
        index.handleFileDelete(unknownFile);
        expect(handler).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════
// handleFileRename
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - handleFileRename', () => {
    it('removes old path and adds new path', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index, app } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const oldPath = file.path;

        // Simulate rename
        file.path = 'People/Alice Renamed.md';
        file.basename = 'Alice Renamed';
        app.metadataCache.getFileCache.mockReturnValue(cache);

        index.handleFileRename(file, oldPath);

        expect(index.getContact(oldPath)).toBeUndefined();
        expect(index.getContact('People/Alice Renamed.md')).toBeDefined();
    });

    it('triggers "change" event', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const handler = vi.fn();
        index.on('change', handler);

        index.handleFileRename(file, file.path);
        expect(handler).toHaveBeenCalled();
    });

    it('handles rename to ignored path', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        const oldPath = file.path;

        // Rename into ignored path
        file.path = 'Archive/Alice.md';

        index.handleFileRename(file, oldPath);
        expect(index.getContacts()).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// Getters
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - getContacts', () => {
    it('returns all contacts as an array', async () => {
        const { file: f1, cache: c1 } = createPersonFile('Alice');
        const { file: f2, cache: c2 } = createPersonFile('Bob');
        const cacheMap = new Map<TFile, CachedMetadata>([[f1, c1], [f2, c2]]);
        const { index } = setupIndex({ files: [f1, f2], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(2);
    });
});

describe('OrbitIndex - getContactsByStatus', () => {
    it('sorts contacts: decay → wobble → stable → snoozed', async () => {
        // Create contacts with different statuses via date manipulation
        const stableFile = createTFile({ path: 'People/Stable.md', basename: 'Stable' });
        const stableCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: new Date().toISOString().split('T')[0], // today → stable
            },
        });

        const decayFile = createTFile({ path: 'People/Decay.md', basename: 'Decay' });
        const decayCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2020-01-01', // ancient → decay
            },
        });

        const cacheMap = new Map<TFile, CachedMetadata>([
            [stableFile, stableCache],
            [decayFile, decayCache],
        ]);
        const { index } = setupIndex({ files: [stableFile, decayFile], cacheMap });

        await index.scanVault();
        const sorted = index.getContactsByStatus();
        expect(sorted[0].name).toBe('Decay');
        expect(sorted[1].name).toBe('Stable');
    });
});

describe('OrbitIndex - getContact', () => {
    it('returns contact by file path', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContact(file.path)?.name).toBe('Alice');
    });

    it('returns undefined for unknown path', async () => {
        const { index } = setupIndex();
        expect(index.getContact('nonexistent/path.md')).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// dumpIndex
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - dumpIndex', () => {
    it('logs contacts via Logger.debug', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        Logger.setLevel('debug');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        index.dumpIndex();

        expect(consoleSpy).toHaveBeenCalledWith('[Orbit:OrbitIndex]', '=== Orbit Index Dump ===');
        expect(consoleSpy).toHaveBeenCalledWith('[Orbit:OrbitIndex]', 'Total Contacts: 1');
        consoleSpy.mockRestore();
        Logger.setLevel('off');
    });

    it('logs "Never" when lastContact is null', async () => {
        const file = createTFile({ path: 'People/NoContact.md', basename: 'NoContact' });
        const cache = createCachedMetadata({
            frontmatter: { tags: ['people'], frequency: 'Monthly' },
        });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        Logger.setLevel('debug');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        index.dumpIndex();

        // Logger.debug passes the source as first arg and the message as second
        const loggedMessages = consoleSpy.mock.calls.map(c => String(c[1] ?? ''));
        expect(loggedMessages.some(s => s.includes('Never'))).toBe(true);
        consoleSpy.mockRestore();
        Logger.setLevel('off');
    });

    it('handles empty index', () => {
        const { index } = setupIndex();
        Logger.setLevel('debug');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        index.dumpIndex();

        expect(consoleSpy).toHaveBeenCalledWith('[Orbit:OrbitIndex]', 'Total Contacts: 0');
        consoleSpy.mockRestore();
        Logger.setLevel('off');
    });
});

// ═══════════════════════════════════════════════════════════════
// saveStateToDisk
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - saveStateToDisk', () => {
    it('handles write errors gracefully', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index, app } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        app.vault.adapter.write.mockRejectedValue(new Error('Disk full'));

        Logger.setLevel('error');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Should not throw
        await expect((index as any).saveStateToDisk()).resolves.not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(
            '[Orbit:OrbitIndex]',
            'Failed to save state to disk',
            expect.any(Error)
        );
        consoleSpy.mockRestore();
        Logger.setLevel('off');
    });
});

// ═══════════════════════════════════════════════════════════════
// updateSettings
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - updateSettings', () => {
    it('re-scans vault with new settings', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const { index, app } = setupIndex({ files: [file], cacheMap });

        await index.scanVault();
        expect(index.getContacts()).toHaveLength(1);

        // Update settings to use a different tag that won't match
        const newSettings = createSettings({ personTag: 'contact' });
        await index.updateSettings(newSettings);

        // Alice has 'people' tag, not 'contact', so should no longer match
        expect(index.getContacts()).toHaveLength(0);
    });

    it('triggers "change" event after re-scan', async () => {
        const { index } = setupIndex();
        const handler = vi.fn();
        index.on('change', handler);

        await index.updateSettings(createSettings());
        expect(handler).toHaveBeenCalled();
    });
});

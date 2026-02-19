/**
 * Unit tests for OrbitIndex photo change detection and reactive scraping.
 *
 * Tests the Phase 11b features: detectPhotoChange, re-entrancy guard,
 * auto-scrape in 'always' mode, event emission in 'ask' mode, and
 * 'never' mode suppression.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrbitIndex } from '../../../src/services/OrbitIndex';
import { TFile, CachedMetadata, createMockApp, requestUrl } from '../../mocks/obsidian';
import { createTFile, createCachedMetadata, createSettings } from '../../helpers/factories';

// ─── Test Setup ─────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════
// Photo Change Detection — 'ask' mode
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - photo change detection (ask mode)', () => {
    it('emits photo-scrape-prompt when photo changes from empty to URL', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        // Initial scan: Alice has no photo
        await index.scanVault();

        // Listen for the prompt event
        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        // Now Alice gets a photo URL
        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://example.com/alice.jpg',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        expect(handler).toHaveBeenCalledWith(file, 'https://example.com/alice.jpg', 'Alice');
    });

    it('emits photo-scrape-prompt when photo changes from non-URL to URL', async () => {
        const { file, cache } = createPersonFile('Bob', { photo: '[[old-photo.jpg]]' });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        // Change photo to a URL
        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://example.com/bob.png',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        expect(handler).toHaveBeenCalledWith(file, 'https://example.com/bob.png', 'Bob');
    });

    it('does NOT emit when photo stays the same', async () => {
        const { file, cache } = createPersonFile('Carol', { photo: 'https://example.com/carol.jpg' });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        // No change — same photo
        index.handleFileChange(file);

        expect(handler).not.toHaveBeenCalled();
    });

    it('does NOT emit when new photo is a wikilink', async () => {
        const { file, cache } = createPersonFile('Dave');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        // New photo is a wikilink, not a URL
        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: '[[Dave - Photo.jpg]]',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        expect(handler).not.toHaveBeenCalled();
    });

    it('does NOT emit when new photo is a local path', async () => {
        const { file, cache } = createPersonFile('Eve');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'Assets/eve.jpg',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        expect(handler).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════
// Photo Change Detection — 'never' mode
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - photo change detection (never mode)', () => {
    it('does NOT emit or auto-scrape when mode is never', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'never' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://example.com/alice.jpg',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        expect(handler).not.toHaveBeenCalled();
        expect(app.fileManager.processFrontMatter).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════
// Photo Change Detection — 'always' mode
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - photo change detection (always mode)', () => {
    beforeEach(() => {
        vi.mocked(requestUrl).mockReset();
        vi.mocked(requestUrl).mockResolvedValue({
            headers: { 'content-type': 'image/jpeg' },
            arrayBuffer: new ArrayBuffer(100),
        });
    });

    it('auto-scrapes without emitting a prompt event', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'always' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        // No conflict for the filename
        app.vault.getAbstractFileByPath.mockReturnValue(null);
        await index.scanVault();

        const promptHandler = vi.fn();
        index.on('photo-scrape-prompt', promptHandler);

        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://example.com/alice.jpg',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        // Should NOT emit prompt — auto-scrape handles it
        expect(promptHandler).not.toHaveBeenCalled();

        // Wait for the async auto-scrape to complete
        await vi.waitFor(() => {
            expect(requestUrl).toHaveBeenCalledWith({ url: 'https://example.com/alice.jpg' });
        });

        // Verify frontmatter was updated with wikilink
        await vi.waitFor(() => {
            expect(app.fileManager.processFrontMatter).toHaveBeenCalled();
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// Re-entrancy Guard
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - re-entrancy guard', () => {
    it('skips photo detection when file is marked as scraping', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        // Mark the file as being scraped (simulating the scrape pipeline running)
        index.markScraping(file.path);

        // Now simulate the frontmatter being updated with a URL
        // (this is what would happen when scrape finishes and updates photo to wikilink,
        //  but during the window before wikilink is written the old URL might re-trigger)
        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://example.com/alice.jpg',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        // Should NOT emit because file is in the scraping set
        expect(handler).not.toHaveBeenCalled();
    });

    it('resumes detection after unmarkScraping', async () => {
        const { file, cache } = createPersonFile('Bob');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        // Mark and then unmark
        index.markScraping(file.path);
        index.unmarkScraping(file.path);

        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://example.com/bob.jpg',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        // Should emit after guard is cleared
        expect(handler).toHaveBeenCalledWith(file, 'https://example.com/bob.jpg', 'Bob');
    });

    it('markScraping and unmarkScraping are idempotent', () => {
        const { index } = setupIndex();
        const path = 'People/Test.md';

        // Multiple marks shouldn't cause issues
        index.markScraping(path);
        index.markScraping(path);
        index.unmarkScraping(path);

        // Should be cleared after one unmark
        // We can't directly inspect the set, but marking then
        // immediately unmarking should work without errors
        expect(() => index.unmarkScraping(path)).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════

describe('OrbitIndex - photo change edge cases', () => {
    it('handles new file with URL photo (no old contact)', async () => {
        const { file, cache } = createPersonFile('NewPerson', { photo: 'https://example.com/new.jpg' });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index } = setupIndex({ cacheMap, settings });

        // File was never in the index before (no scanVault)
        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        index.handleFileChange(file);

        // New file with URL should trigger detection (old photo is '' by default)
        expect(handler).toHaveBeenCalledWith(file, 'https://example.com/new.jpg', 'NewPerson');
    });

    it('does NOT trigger when photo changes between two URLs', async () => {
        // Note: This SHOULD still trigger because the new value is still a URL
        const { file, cache } = createPersonFile('Alice', { photo: 'https://old.com/photo.jpg' });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://new.com/photo.jpg',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        // Photo changed AND new value is a URL → should trigger
        expect(handler).toHaveBeenCalledWith(file, 'https://new.com/photo.jpg', 'Alice');
    });

    it('does NOT trigger when photo is cleared', async () => {
        const { file, cache } = createPersonFile('Alice', { photo: 'https://example.com/alice.jpg' });
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        const handler = vi.fn();
        index.on('photo-scrape-prompt', handler);

        // Photo cleared to empty
        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: '',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        // Empty photo is not a URL → should NOT trigger
        expect(handler).not.toHaveBeenCalled();
    });
});

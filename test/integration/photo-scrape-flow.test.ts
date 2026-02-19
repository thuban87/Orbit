/**
 * Integration tests for the photo scrape pipeline.
 *
 * Tests the full flow: OrbitIndex detects photo URL change → emits event
 * (or auto-scrapes) → ImageScraper downloads and saves → frontmatter updated
 * with wikilink. Verifies the pipeline end-to-end with mocked HTTP/vault.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrbitIndex } from '../../src/services/OrbitIndex';
import { ImageScraper } from '../../src/utils/ImageScraper';
import { TFile, CachedMetadata, createMockApp, requestUrl } from '../mocks/obsidian';
import { createTFile, createCachedMetadata, createSettings } from '../helpers/factories';

// ─── Test Setup ─────────────────────────────────────────────────

function createPersonFile(name: string, overrides: Record<string, any> = {}) {
    const file = createTFile({ path: `People/${name}.md`, basename: name });
    const cache = createCachedMetadata({
        frontmatter: {
            tags: ['people'],
            frequency: 'Monthly',
            last_contact: '2025-01-15',
            ...overrides,
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
// Full Flow — Ask Mode
// ═══════════════════════════════════════════════════════════════

describe('Photo scrape flow — ask mode', () => {
    it('emits prompt with correct details when URL is added', async () => {
        const { file, cache } = createPersonFile('Alice');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        await index.scanVault();

        // Collect prompt event data
        let promptData: { file: TFile; url: string; name: string } | null = null;
        index.on('photo-scrape-prompt', (f: TFile, url: string, name: string) => {
            promptData = { file: f, url, name };
        });

        // Simulate adding a photo URL via frontmatter edit
        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://example.com/alice-headshot.jpg',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        expect(promptData).not.toBeNull();
        expect(promptData!.file).toBe(file);
        expect(promptData!.url).toBe('https://example.com/alice-headshot.jpg');
        expect(promptData!.name).toBe('Alice');
    });

    it('allows manual scrape after prompt using markScraping guard', async () => {
        const { file, cache } = createPersonFile('Bob');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'ask' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        app.vault.getAbstractFileByPath.mockReturnValue(null);
        vi.mocked(requestUrl).mockResolvedValue({
            headers: { 'content-type': 'image/jpeg' },
            arrayBuffer: new ArrayBuffer(50),
        });

        await index.scanVault();

        // Simulate what main.ts does when user clicks "Download"
        index.markScraping(file.path);
        const wikilink = await ImageScraper.scrapeAndSave(
            app as any,
            'https://example.com/bob.jpg',
            'Bob',
            settings.photoAssetFolder
        );
        index.unmarkScraping(file.path);

        expect(wikilink).toBe('[[Bob - Photo.jpg]]');
        expect(app.vault.createBinary).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════
// Full Flow — Always Mode (auto-scrape)
// ═══════════════════════════════════════════════════════════════

describe('Photo scrape flow — always mode', () => {
    beforeEach(() => {
        vi.mocked(requestUrl).mockReset();
        vi.mocked(requestUrl).mockResolvedValue({
            headers: { 'content-type': 'image/png' },
            arrayBuffer: new ArrayBuffer(200),
        });
    });

    it('auto-downloads and updates frontmatter without prompting', async () => {
        const { file, cache } = createPersonFile('Carol');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'always' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        app.vault.getAbstractFileByPath.mockReturnValue(null);
        await index.scanVault();

        // Add a photo URL
        const updatedCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://example.com/carol.png',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        // Wait for async auto-scrape
        await vi.waitFor(() => {
            expect(requestUrl).toHaveBeenCalledWith({ url: 'https://example.com/carol.png' });
        });

        await vi.waitFor(() => {
            expect(app.vault.createBinary).toHaveBeenCalled();
        });

        await vi.waitFor(() => {
            expect(app.fileManager.processFrontMatter).toHaveBeenCalledWith(
                file,
                expect.any(Function)
            );
        });
    });

    it('does not trigger a second scrape when frontmatter is updated after auto-scrape', async () => {
        const { file, cache } = createPersonFile('Dave');
        const cacheMap = new Map<TFile, CachedMetadata>([[file, cache]]);
        const settings = createSettings({ photoScrapeOnEdit: 'always' } as any);
        const { index, app } = setupIndex({ files: [file], cacheMap, settings });

        app.vault.getAbstractFileByPath.mockReturnValue(null);
        await index.scanVault();

        // First change: add a URL
        const urlCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: 'https://example.com/dave.png',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(urlCache);
        index.handleFileChange(file);

        // Wait for auto-scrape to complete
        await vi.waitFor(() => {
            expect(requestUrl).toHaveBeenCalledTimes(1);
        });

        vi.mocked(requestUrl).mockClear();

        // Simulate the frontmatter update from auto-scrape (URL → wikilink)
        // The re-entrancy guard should prevent this from triggering another scrape
        // Note: In the real flow, the guard is managed inside autoScrape's try/finally
        // Here we verify the wikilink does NOT trigger a re-scrape
        const wikilinkCache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                frequency: 'Monthly',
                last_contact: '2025-01-15',
                photo: '[[Dave - Photo.png]]',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(wikilinkCache);
        index.handleFileChange(file);

        // Wikilink is not a URL, so isUrl returns false → no scrape triggered
        expect(requestUrl).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════
// Full Flow — Never Mode
// ═══════════════════════════════════════════════════════════════

describe('Photo scrape flow — never mode', () => {
    it('takes no action on photo URL change', async () => {
        const { file, cache } = createPersonFile('Eve');
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
                photo: 'https://example.com/eve.jpg',
            },
        });
        app.metadataCache.getFileCache.mockReturnValue(updatedCache);
        index.handleFileChange(file);

        // No prompt, no scrape
        expect(handler).not.toHaveBeenCalled();
        expect(requestUrl).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════
// ImageScraper Static Methods — Boundary Cases
// ═══════════════════════════════════════════════════════════════

describe('ImageScraper.isUrl — boundary cases', () => {
    it('rejects ftp:// protocol', () => {
        expect(ImageScraper.isUrl('ftp://example.com/photo.jpg')).toBe(false);
    });

    it('rejects data: URIs', () => {
        expect(ImageScraper.isUrl('data:image/png;base64,abc123')).toBe(false);
    });

    it('rejects relative paths', () => {
        expect(ImageScraper.isUrl('./photos/alice.jpg')).toBe(false);
    });
});

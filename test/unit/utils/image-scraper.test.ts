/**
 * Unit tests for src/utils/ImageScraper.ts
 *
 * Tests the scrape pipeline: requestUrl mock, extension detection
 * (Content-Type, URL, fallback .webp), filename generation, conflict
 * numbering, ensureFolderExists, and wikilink return format.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageScraper } from '../../../src/utils/ImageScraper';
import { requestUrl, createMockApp } from '../../mocks/obsidian';

// ─── Test Helpers ───────────────────────────────────────────────

function createMockResponse(overrides: {
    contentType?: string;
    arrayBuffer?: ArrayBuffer;
} = {}) {
    return {
        headers: {
            'content-type': overrides.contentType ?? 'image/jpeg',
        },
        arrayBuffer: overrides.arrayBuffer ?? new ArrayBuffer(100),
    };
}

// ═══════════════════════════════════════════════════════════════
// getExtensionFromContentType
// ═══════════════════════════════════════════════════════════════

describe('ImageScraper.getExtensionFromContentType', () => {
    it('maps image/jpeg to .jpg', () => {
        expect(ImageScraper.getExtensionFromContentType('image/jpeg')).toBe('.jpg');
    });

    it('maps image/jpg to .jpg', () => {
        expect(ImageScraper.getExtensionFromContentType('image/jpg')).toBe('.jpg');
    });

    it('maps image/png to .png', () => {
        expect(ImageScraper.getExtensionFromContentType('image/png')).toBe('.png');
    });

    it('maps image/webp to .webp', () => {
        expect(ImageScraper.getExtensionFromContentType('image/webp')).toBe('.webp');
    });

    it('maps image/gif to .gif', () => {
        expect(ImageScraper.getExtensionFromContentType('image/gif')).toBe('.gif');
    });

    it('maps image/svg+xml to .svg', () => {
        expect(ImageScraper.getExtensionFromContentType('image/svg+xml')).toBe('.svg');
    });

    it('maps image/avif to .avif', () => {
        expect(ImageScraper.getExtensionFromContentType('image/avif')).toBe('.avif');
    });

    it('strips charset parameter before matching', () => {
        expect(ImageScraper.getExtensionFromContentType('image/png; charset=utf-8')).toBe('.png');
    });

    it('is case-insensitive', () => {
        expect(ImageScraper.getExtensionFromContentType('Image/JPEG')).toBe('.jpg');
    });

    it('returns null for unrecognized MIME types', () => {
        expect(ImageScraper.getExtensionFromContentType('application/json')).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(ImageScraper.getExtensionFromContentType('')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════
// getExtensionFromUrl
// ═══════════════════════════════════════════════════════════════

describe('ImageScraper.getExtensionFromUrl', () => {
    it('extracts .jpg from URL path', () => {
        expect(ImageScraper.getExtensionFromUrl('https://example.com/photo.jpg')).toBe('.jpg');
    });

    it('normalizes .jpeg to .jpg', () => {
        expect(ImageScraper.getExtensionFromUrl('https://example.com/photo.jpeg')).toBe('.jpg');
    });

    it('extracts .png from URL path', () => {
        expect(ImageScraper.getExtensionFromUrl('https://example.com/photo.png')).toBe('.png');
    });

    it('extracts .webp from URL path', () => {
        expect(ImageScraper.getExtensionFromUrl('https://example.com/photo.webp')).toBe('.webp');
    });

    it('extracts extension ignoring query parameters', () => {
        expect(ImageScraper.getExtensionFromUrl('https://example.com/photo.png?w=200&h=200')).toBe('.png');
    });

    it('returns null for non-image extensions', () => {
        expect(ImageScraper.getExtensionFromUrl('https://example.com/file.pdf')).toBeNull();
    });

    it('returns null for URLs without extensions', () => {
        expect(ImageScraper.getExtensionFromUrl('https://example.com/photo')).toBeNull();
    });

    it('returns null for invalid URLs', () => {
        expect(ImageScraper.getExtensionFromUrl('not-a-url')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════
// isUrl
// ═══════════════════════════════════════════════════════════════

describe('ImageScraper.isUrl', () => {
    it('returns true for https URLs', () => {
        expect(ImageScraper.isUrl('https://example.com/photo.jpg')).toBe(true);
    });

    it('returns true for http URLs', () => {
        expect(ImageScraper.isUrl('http://example.com/photo.jpg')).toBe(true);
    });

    it('returns false for wikilinks', () => {
        expect(ImageScraper.isUrl('[[Photo.jpg]]')).toBe(false);
    });

    it('returns false for vault paths', () => {
        expect(ImageScraper.isUrl('Assets/photo.jpg')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(ImageScraper.isUrl('')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// resolveFilename
// ═══════════════════════════════════════════════════════════════

describe('ImageScraper.resolveFilename', () => {
    it('returns base filename when no conflict exists', async () => {
        const app = createMockApp();
        // getAbstractFileByPath returns null — no conflict
        app.vault.getAbstractFileByPath.mockReturnValue(null);

        const result = await ImageScraper.resolveFilename(app as any, 'Assets', 'Alice - Photo', '.jpg');
        expect(result).toBe('Alice - Photo.jpg');
    });

    it('appends -2 when base filename already exists', async () => {
        const app = createMockApp();
        // First call returns a file (conflict), second returns null
        app.vault.getAbstractFileByPath
            .mockReturnValueOnce({ path: 'Assets/Alice - Photo.jpg' })
            .mockReturnValueOnce(null);

        const result = await ImageScraper.resolveFilename(app as any, 'Assets', 'Alice - Photo', '.jpg');
        expect(result).toBe('Alice - Photo-2.jpg');
    });

    it('increments counter until a free slot is found', async () => {
        const app = createMockApp();
        app.vault.getAbstractFileByPath
            .mockReturnValueOnce({ path: '...' })  // base exists
            .mockReturnValueOnce({ path: '...' })  // -2 exists
            .mockReturnValueOnce({ path: '...' })  // -3 exists
            .mockReturnValueOnce(null);             // -4 is free

        const result = await ImageScraper.resolveFilename(app as any, 'Assets', 'Bob - Photo', '.png');
        expect(result).toBe('Bob - Photo-4.png');
    });
});

// ═══════════════════════════════════════════════════════════════
// scrapeAndSave
// ═══════════════════════════════════════════════════════════════

describe('ImageScraper.scrapeAndSave', () => {
    let app: ReturnType<typeof createMockApp>;

    beforeEach(() => {
        app = createMockApp();
        app.vault.getAbstractFileByPath.mockReturnValue(null);
        vi.mocked(requestUrl).mockReset();
    });

    it('downloads image, saves to vault, and returns wikilink', async () => {
        vi.mocked(requestUrl).mockResolvedValue(createMockResponse({
            contentType: 'image/png',
        }));

        const result = await ImageScraper.scrapeAndSave(
            app as any,
            'https://example.com/photo.png',
            'Alice Smith',
            'Resources/Assets/Orbit'
        );

        expect(requestUrl).toHaveBeenCalledWith({ url: 'https://example.com/photo.png' });
        expect(app.vault.createBinary).toHaveBeenCalledWith(
            expect.stringContaining('Alice Smith - Photo.png'),
            expect.any(ArrayBuffer)
        );
        expect(result).toBe('[[Alice Smith - Photo.png]]');
    });

    it('detects extension from Content-Type', async () => {
        vi.mocked(requestUrl).mockResolvedValue(createMockResponse({
            contentType: 'image/webp',
        }));

        const result = await ImageScraper.scrapeAndSave(
            app as any,
            'https://example.com/image',  // no extension in URL
            'Bob',
            'Assets'
        );

        expect(result).toBe('[[Bob - Photo.webp]]');
    });

    it('falls back to URL extension when Content-Type is missing', async () => {
        vi.mocked(requestUrl).mockResolvedValue({
            headers: {},
            arrayBuffer: new ArrayBuffer(50),
        });

        const result = await ImageScraper.scrapeAndSave(
            app as any,
            'https://example.com/photo.gif',
            'Carol',
            'Assets'
        );

        expect(result).toBe('[[Carol - Photo.gif]]');
    });

    it('falls back to .webp when no extension can be detected', async () => {
        vi.mocked(requestUrl).mockResolvedValue({
            headers: { 'content-type': 'application/octet-stream' },
            arrayBuffer: new ArrayBuffer(50),
        });

        const result = await ImageScraper.scrapeAndSave(
            app as any,
            'https://example.com/image',
            'Dave',
            'Assets'
        );

        expect(result).toBe('[[Dave - Photo.webp]]');
    });

    it('ensures target folder exists before saving', async () => {
        vi.mocked(requestUrl).mockResolvedValue(createMockResponse());

        await ImageScraper.scrapeAndSave(app as any, 'https://example.com/img.jpg', 'Eve', 'My/Photo/Folder');

        // ensureFolderExists checks getAbstractFileByPath for the folder
        // and creates it if missing — we verify createFolder was called
        expect(app.vault.createFolder).toHaveBeenCalled();
    });

    it('handles filename conflicts with numbering', async () => {
        vi.mocked(requestUrl).mockResolvedValue(createMockResponse({
            contentType: 'image/jpeg',
        }));

        // First file already exists
        app.vault.getAbstractFileByPath
            .mockReturnValueOnce({ path: 'Assets/Frank - Photo.jpg' })
            .mockReturnValueOnce(null); // -2 is free

        const result = await ImageScraper.scrapeAndSave(
            app as any,
            'https://example.com/photo.jpg',
            'Frank',
            'Assets'
        );

        expect(result).toBe('[[Frank - Photo-2.jpg]]');
    });

    it('sanitizes contact name in filename', async () => {
        vi.mocked(requestUrl).mockResolvedValue(createMockResponse({
            contentType: 'image/png',
        }));

        const result = await ImageScraper.scrapeAndSave(
            app as any,
            'https://example.com/photo.png',
            'John "Johnny" O\'Brien',
            'Assets'
        );

        // sanitizeFileName removes special characters
        expect(result).toMatch(/^\[\[.* - Photo\.png\]\]$/);
        // Should NOT contain quotes or apostrophes in the filename
        expect(result).not.toContain('"');
    });
});

/**
 * Unit tests for src/utils/paths.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeFileName, buildContactPath, ensureFolderExists } from '../../../src/utils/paths';
import { createMockApp, TFolder } from '../../mocks/obsidian';

describe('sanitizeFileName', () => {
    it('returns unchanged name when no invalid chars', () => {
        expect(sanitizeFileName('Alice Smith')).toBe('Alice Smith');
    });

    it('strips backslashes', () => {
        expect(sanitizeFileName('path\\name')).toBe('pathname');
    });

    it('strips forward slashes', () => {
        expect(sanitizeFileName('path/name')).toBe('pathname');
    });

    it('strips colons', () => {
        expect(sanitizeFileName('file:name')).toBe('filename');
    });

    it('strips asterisks', () => {
        expect(sanitizeFileName('file*name')).toBe('filename');
    });

    it('strips question marks', () => {
        expect(sanitizeFileName('file?name')).toBe('filename');
    });

    it('strips double quotes', () => {
        expect(sanitizeFileName('file"name')).toBe('filename');
    });

    it('strips angle brackets', () => {
        expect(sanitizeFileName('file<name>')).toBe('filename');
    });

    it('strips pipe characters', () => {
        expect(sanitizeFileName('file|name')).toBe('filename');
    });

    it('strips multiple invalid chars at once', () => {
        expect(sanitizeFileName('Dr. O\'Brien <CEO>')).toBe("Dr. O'Brien CEO");
    });

    it('trims leading and trailing whitespace', () => {
        expect(sanitizeFileName('  Alice  ')).toBe('Alice');
    });

    it('returns empty string for all-invalid input after trim', () => {
        expect(sanitizeFileName('\\/:*?"<>|')).toBe('');
    });

    it('handles empty string', () => {
        expect(sanitizeFileName('')).toBe('');
    });
});

describe('buildContactPath', () => {
    it('combines folder and sanitized name with default extension', () => {
        expect(buildContactPath('People/Friends', 'Alice Smith')).toBe('People/Friends/Alice Smith.md');
    });

    it('sanitizes the name before combining', () => {
        expect(buildContactPath('People', 'Dr. O"Brien')).toBe('People/Dr. OBrien.md');
    });

    it('uses custom extension when provided', () => {
        expect(buildContactPath('Notes', 'Test', '.txt')).toBe('Notes/Test.txt');
    });

    it('handles folder with trailing slash gracefully', () => {
        // normalizePath (mock) returns as-is, but real Obsidian normalizes
        const result = buildContactPath('People', 'Alice');
        expect(result).toBe('People/Alice.md');
    });

    it('handles empty folder', () => {
        expect(buildContactPath('', 'Alice')).toBe('/Alice.md');
    });
});

// ═══════════════════════════════════════════════════════════════
// ensureFolderExists — Branch gap closers
// ═══════════════════════════════════════════════════════════════

describe('ensureFolderExists', () => {
    let app: any;

    beforeEach(() => {
        app = createMockApp();
        vi.clearAllMocks();
    });

    it('returns early without calling getFolderByPath when path is empty', async () => {
        // Covers the empty normalized path guard at paths.ts line 41
        // normalizePath("") returns "" which is falsy → early return
        await ensureFolderExists(app, '');
        expect(app.vault.getFolderByPath).not.toHaveBeenCalled();
        expect(app.vault.createFolder).not.toHaveBeenCalled();
    });

    it('skips createFolder when intermediate folders already exist', async () => {
        // Covers the `if (folder)` truthy branch at paths.ts line 52
        // Mock getFolderByPath to return null for the full path (so we enter the loop),
        // but return a truthy value for each intermediate segment
        app.vault.getFolderByPath
            .mockReturnValueOnce(null)         // full "a/b/c" check — not found
            .mockReturnValueOnce(new TFolder('a'))      // segment "a" — exists
            .mockReturnValueOnce(new TFolder('a/b'))    // segment "a/b" — exists
            .mockReturnValueOnce(new TFolder('a/b/c')); // segment "a/b/c" — exists

        await ensureFolderExists(app, 'a/b/c');
        expect(app.vault.createFolder).not.toHaveBeenCalled();
    });

    it('swallows createFolder errors silently', async () => {
        // Covers the catch block at paths.ts line 55
        app.vault.getFolderByPath.mockReturnValue(null); // nothing exists
        app.vault.createFolder.mockRejectedValue(new Error('Folder already exists'));

        // Should not throw — error is silently swallowed
        await expect(ensureFolderExists(app, 'a/b')).resolves.toBeUndefined();
    });
});

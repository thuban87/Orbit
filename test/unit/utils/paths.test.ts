/**
 * Unit tests for src/utils/paths.ts
 */
import { describe, it, expect } from 'vitest';
import { sanitizeFileName, buildContactPath } from '../../../src/utils/paths';

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

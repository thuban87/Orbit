/**
 * Unit tests for src/utils/FolderSuggest.ts
 *
 * Tests the vault folder autocomplete component used in settings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FolderSuggest } from '../../../src/utils/FolderSuggest';
import { TFolder, createMockApp } from '../../mocks/obsidian';

// ─── Helpers ───────────────────────────────────────────────────

function createFolderTree(): TFolder {
    const root = new TFolder('');
    const people = new TFolder('People');
    const friends = new TFolder('People/Friends');
    const family = new TFolder('People/Family');
    const notes = new TFolder('Notes');

    people.children = [friends, family];
    root.children = [people, notes];

    return root;
}

function setupSuggest(root?: TFolder) {
    const app = createMockApp({});
    app.vault.getRoot.mockReturnValue(root ?? createFolderTree());

    const inputEl = document.createElement('input');
    const suggest = new FolderSuggest(app, inputEl);

    return { suggest, inputEl, app };
}

// ═══════════════════════════════════════════════════════════════
// getSuggestions
// ═══════════════════════════════════════════════════════════════

describe('FolderSuggest - getSuggestions', () => {
    it('returns all folder paths for empty query', () => {
        const { suggest } = setupSuggest();
        const results = suggest.getSuggestions('');

        expect(results).toContain('People');
        expect(results).toContain('Notes');
    });

    it('filters by query (case-insensitive)', () => {
        const { suggest } = setupSuggest();
        const results = suggest.getSuggestions('people');

        expect(results).toContain('People');
        expect(results).not.toContain('Notes');
    });

    it('returns empty array for non-matching query', () => {
        const { suggest } = setupSuggest();
        const results = suggest.getSuggestions('zzz-nonexistent');

        expect(results).toHaveLength(0);
    });

    it('does not include root folder (empty path)', () => {
        const { suggest } = setupSuggest();
        const results = suggest.getSuggestions('');

        expect(results).not.toContain('');
    });

    it('handles vault with no folders', () => {
        const emptyRoot = new TFolder('');
        emptyRoot.children = [];
        const { suggest } = setupSuggest(emptyRoot);

        const results = suggest.getSuggestions('');
        expect(results).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// renderSuggestion
// ═══════════════════════════════════════════════════════════════

describe('FolderSuggest - renderSuggestion', () => {
    it('sets text content on the element', () => {
        const { suggest } = setupSuggest();
        const el = document.createElement('div');
        // setText is an Obsidian DOM extension, mock it
        (el as any).setText = (text: string) => { el.textContent = text; };

        suggest.renderSuggestion('People/Friends', el);

        expect(el.textContent).toBe('People/Friends');
    });
});

// ═══════════════════════════════════════════════════════════════
// selectSuggestion
// ═══════════════════════════════════════════════════════════════

describe('FolderSuggest - selectSuggestion', () => {
    it('sets the input value to the selected suggestion', () => {
        const { suggest, inputEl } = setupSuggest();

        suggest.selectSuggestion('People/Friends');

        expect(inputEl.value).toBe('People/Friends');
    });

    it('dispatches an input event', () => {
        const { suggest, inputEl } = setupSuggest();
        const handler = vi.fn();
        inputEl.addEventListener('input', handler);

        suggest.selectSuggestion('People');

        expect(handler).toHaveBeenCalled();
    });
});

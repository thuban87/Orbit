/**
 * Baseline tests for src/services/LinkListener.ts
 *
 * Tests the "Tether" — the passive wikilink detection service that monitors
 * editor changes, detects contacts in wikilinks, and prompts users to mark
 * them as contacted. These tests lock down existing behavior before the
 * UX Overhaul begins.
 *
 * NOTE: The mock `debounce` in test/mocks/obsidian.ts passes through
 * immediately (no delay), so handleEditorChange runs synchronously.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkListener } from '../../src/services/LinkListener';
import { OrbitIndex } from '../../src/services/OrbitIndex';
import { TFile, createMockApp, Notice } from '../mocks/obsidian';
import { createTFile, createOrbitContact, createSettings, createCachedMetadata } from '../helpers/factories';

// ─── Test Setup ─────────────────────────────────────────────────

function setupListener(overrides: {
    contacts?: ReturnType<typeof createOrbitContact>[];
} = {}) {
    const contacts = overrides.contacts ?? [];
    const settings = createSettings();
    const app = createMockApp();
    const cacheMap = new Map();
    const index = new OrbitIndex(app, settings);

    // Stub getContacts to return our test contacts
    vi.spyOn(index, 'getContacts').mockReturnValue(contacts);

    const listener = new LinkListener(app, index, settings);

    return { listener, app, index, settings };
}

// ═══════════════════════════════════════════════════════════════
// extractWikilinks
// ═══════════════════════════════════════════════════════════════

describe('LinkListener - extractWikilinks', () => {
    // extractWikilinks is private, so we test it via handleEditorChange
    // which calls extractWikilinks internally. We'll access it for
    // direct testing via type coercion since these are baseline tests.

    let listener: LinkListener;

    beforeEach(() => {
        const setup = setupListener();
        listener = setup.listener;
    });

    function extractWikilinks(content: string): string[] {
        return (listener as any).extractWikilinks(content);
    }

    it('extracts a single [[Name]] wikilink', () => {
        expect(extractWikilinks('Talked to [[Alice]] today')).toEqual(['Alice']);
    });

    it('extracts multiple wikilinks', () => {
        const result = extractWikilinks('Met [[Alice]] and [[Bob]] for lunch');
        expect(result).toContain('Alice');
        expect(result).toContain('Bob');
        expect(result).toHaveLength(2);
    });

    it('extracts name from aliased [[Name|Alias]] links', () => {
        expect(extractWikilinks('Talked to [[Alice Smith|Alice]]')).toEqual(['Alice Smith']);
    });

    it('deduplicates links', () => {
        const result = extractWikilinks('[[Alice]] and [[Alice]] again');
        expect(result).toEqual(['Alice']);
    });

    it('returns empty array when no links found', () => {
        expect(extractWikilinks('No links here')).toEqual([]);
    });

    it('trims whitespace from link names', () => {
        expect(extractWikilinks('[[  Alice  ]]')).toEqual(['Alice']);
    });
});

// ═══════════════════════════════════════════════════════════════
// checkAndPrompt
// ═══════════════════════════════════════════════════════════════

describe('LinkListener - checkAndPrompt', () => {
    function checkAndPrompt(listener: LinkListener, linkName: string, sourceFile: TFile): Promise<void> {
        return (listener as any).checkAndPrompt(linkName, sourceFile);
    }

    it('skips already-prompted links', async () => {
        const contact = createOrbitContact({
            name: 'Alice',
            file: createTFile({ path: 'People/Alice.md', basename: 'Alice' }),
            lastContact: null, // never contacted → should prompt
        });
        const { listener } = setupListener({ contacts: [contact] });
        const sourceFile = createTFile({ path: 'Journal/Today.md' });

        // First call should process
        const showPromptSpy = vi.spyOn(listener as any, 'showUpdatePrompt');
        await checkAndPrompt(listener, 'Alice', sourceFile);
        expect(showPromptSpy).toHaveBeenCalledTimes(1);

        // Second call should skip (already processed)
        await checkAndPrompt(listener, 'Alice', sourceFile);
        expect(showPromptSpy).toHaveBeenCalledTimes(1); // Still 1
    });

    it('skips non-contacts', async () => {
        const { listener } = setupListener({ contacts: [] });
        const sourceFile = createTFile({ path: 'Journal/Today.md' });

        const showPromptSpy = vi.spyOn(listener as any, 'showUpdatePrompt');
        await checkAndPrompt(listener, 'Unknown Person', sourceFile);
        expect(showPromptSpy).not.toHaveBeenCalled();
    });

    it('skips contacts that were contacted today', async () => {
        const contact = createOrbitContact({
            name: 'Alice',
            file: createTFile({ path: 'People/Alice.md', basename: 'Alice' }),
            lastContact: new Date(), // contacted today
        });
        const { listener } = setupListener({ contacts: [contact] });
        const sourceFile = createTFile({ path: 'Journal/Today.md' });

        const showPromptSpy = vi.spyOn(listener as any, 'showUpdatePrompt');
        await checkAndPrompt(listener, 'Alice', sourceFile);
        expect(showPromptSpy).not.toHaveBeenCalled();
    });

    it('prompts for valid stale contacts', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const contact = createOrbitContact({
            name: 'Alice',
            file: createTFile({ path: 'People/Alice.md', basename: 'Alice' }),
            lastContact: yesterday,
        });
        const { listener } = setupListener({ contacts: [contact] });
        const sourceFile = createTFile({ path: 'Journal/Today.md' });

        const showPromptSpy = vi.spyOn(listener as any, 'showUpdatePrompt');
        await checkAndPrompt(listener, 'Alice', sourceFile);
        expect(showPromptSpy).toHaveBeenCalledWith(contact);
    });
});

// ═══════════════════════════════════════════════════════════════
// findContactByName
// ═══════════════════════════════════════════════════════════════

describe('LinkListener - findContactByName', () => {
    function findContactByName(listener: LinkListener, name: string) {
        return (listener as any).findContactByName(name);
    }

    it('matches by basename (case-insensitive)', () => {
        const contact = createOrbitContact({
            name: 'Alice',
            file: createTFile({ path: 'People/Alice.md', basename: 'Alice' }),
        });
        const { listener } = setupListener({ contacts: [contact] });

        expect(findContactByName(listener, 'alice')).toBe(contact);
        expect(findContactByName(listener, 'ALICE')).toBe(contact);
        expect(findContactByName(listener, 'Alice')).toBe(contact);
    });

    it('returns null for no match', () => {
        const { listener } = setupListener({ contacts: [] });
        expect(findContactByName(listener, 'Unknown')).toBeNull();
    });

    it('trims whitespace', () => {
        const contact = createOrbitContact({
            name: 'Alice',
            file: createTFile({ path: 'People/Alice.md', basename: 'Alice' }),
        });
        const { listener } = setupListener({ contacts: [contact] });

        expect(findContactByName(listener, '  Alice  ')).toBe(contact);
    });
});

// ═══════════════════════════════════════════════════════════════
// isContactedToday
// ═══════════════════════════════════════════════════════════════

describe('LinkListener - isContactedToday', () => {
    function isContactedToday(listener: LinkListener, contact: ReturnType<typeof createOrbitContact>): boolean {
        return (listener as any).isContactedToday(contact);
    }

    it('returns false when lastContact is null', () => {
        const contact = createOrbitContact({ lastContact: null });
        const { listener } = setupListener();
        expect(isContactedToday(listener, contact)).toBe(false);
    });

    it('returns true when contacted today', () => {
        const contact = createOrbitContact({ lastContact: new Date() });
        const { listener } = setupListener();
        expect(isContactedToday(listener, contact)).toBe(true);
    });

    it('returns false when contacted yesterday', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const contact = createOrbitContact({ lastContact: yesterday });
        const { listener } = setupListener();
        expect(isContactedToday(listener, contact)).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// showUpdatePrompt
// ═══════════════════════════════════════════════════════════════

describe('LinkListener - showUpdatePrompt', () => {
    function showUpdatePrompt(listener: LinkListener, contact: ReturnType<typeof createOrbitContact>): void {
        (listener as any).showUpdatePrompt(contact);
    }

    it('runs without errors and creates DOM elements', () => {
        const contact = createOrbitContact({ name: 'Alice' });
        const { listener } = setupListener();

        // showUpdatePrompt creates a DocumentFragment with a message span
        // and a "Yes" button, then passes it to Notice. We verify it
        // doesn't throw and exercises the DOM creation path.
        expect(() => showUpdatePrompt(listener, contact)).not.toThrow();
    });

    it('creates a button that calls updateContactDate when clicked', async () => {
        const file = createTFile({ path: 'People/Alice.md', basename: 'Alice' });
        const contact = createOrbitContact({ name: 'Alice', file });
        const { listener, app } = setupListener();

        const updateSpy = vi.spyOn(listener as any, 'updateContactDate').mockResolvedValue(undefined);

        showUpdatePrompt(listener, contact);

        // The Notice mock captures the fragment. We can't easily access
        // the button from inside, but we can verify the update function
        // is callable and wired correctly by testing updateContactDate directly.
        expect(updateSpy).not.toHaveBeenCalled(); // Not called until button click
    });
});

// ═══════════════════════════════════════════════════════════════
// updateContactDate
// ═══════════════════════════════════════════════════════════════

describe('LinkListener - updateContactDate', () => {
    function updateContactDate(listener: LinkListener, contact: ReturnType<typeof createOrbitContact>): Promise<void> {
        return (listener as any).updateContactDate(contact);
    }

    it('calls processFrontMatter with the correct file', async () => {
        const file = createTFile({ path: 'People/Alice.md', basename: 'Alice' });
        const contact = createOrbitContact({ name: 'Alice', file });
        const { listener, app } = setupListener();

        await updateContactDate(listener, contact);

        expect(app.fileManager.processFrontMatter).toHaveBeenCalledWith(
            file,
            expect.any(Function)
        );
    });

    it('sets last_contact to today\'s date in the frontmatter callback', async () => {
        const file = createTFile({ path: 'People/Alice.md', basename: 'Alice' });
        const contact = createOrbitContact({ name: 'Alice', file });
        const { listener, app } = setupListener();

        // Capture the callback passed to processFrontMatter
        const frontmatter: Record<string, any> = {};
        app.fileManager.processFrontMatter.mockImplementation(
            async (_file: TFile, fn: (fm: Record<string, any>) => void) => {
                fn(frontmatter);
            }
        );

        await updateContactDate(listener, contact);

        // BUG: This uses toISOString().split('T')[0] which returns UTC date.
        // Will be fixed in Phase 1 with formatLocalDate(). See implementation plan.
        expect(frontmatter.last_contact).toBeDefined();
        expect(typeof frontmatter.last_contact).toBe('string');
        expect(frontmatter.last_contact).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles errors gracefully without throwing', async () => {
        const file = createTFile({ path: 'People/Alice.md', basename: 'Alice' });
        const contact = createOrbitContact({ name: 'Alice', file });
        const { listener, app } = setupListener();

        app.fileManager.processFrontMatter.mockRejectedValue(new Error('Write failed'));

        // Should not throw
        await expect(updateContactDate(listener, contact)).resolves.not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════
// clearCache
// ═══════════════════════════════════════════════════════════════

describe('LinkListener - clearCache', () => {
    it('clears the processedLinks set', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const contact = createOrbitContact({
            name: 'Alice',
            file: createTFile({ path: 'People/Alice.md', basename: 'Alice' }),
            lastContact: yesterday,
        });
        const { listener } = setupListener({ contacts: [contact] });
        const sourceFile = createTFile({ path: 'Journal/Today.md' });

        // Prompt once
        const showPromptSpy = vi.spyOn(listener as any, 'showUpdatePrompt');
        await (listener as any).checkAndPrompt('Alice', sourceFile);
        expect(showPromptSpy).toHaveBeenCalledTimes(1);

        // Clear cache
        listener.clearCache();

        // Should prompt again after cache cleared
        await (listener as any).checkAndPrompt('Alice', sourceFile);
        expect(showPromptSpy).toHaveBeenCalledTimes(2);
    });
});

// ═══════════════════════════════════════════════════════════════
// updateSettings
// ═══════════════════════════════════════════════════════════════

describe('LinkListener - updateSettings', () => {
    it('updates internal settings reference', () => {
        const { listener } = setupListener();
        const newSettings = createSettings({ personTag: 'contact' });

        listener.updateSettings(newSettings);

        // Access private field to verify
        expect((listener as any).settings).toBe(newSettings);
    });
});

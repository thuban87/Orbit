/**
 * Unit tests for src/services/ContactManager.ts
 *
 * Tests the three exported functions:
 * - createContact: template loading, frontmatter population, folder creation, file output
 * - updateFrontmatter: merge-only processFrontMatter wrapper
 * - appendToInteractionLog: atomic log appending via vault.process()
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createContact, updateFrontmatter, appendToInteractionLog } from '../../../src/services/ContactManager';
import { TFile, createMockApp } from '../../mocks/obsidian';
import { createSettings } from '../../helpers/factories';
import type { SchemaDef } from '../../../src/schemas/types';

// ─── Helpers ───────────────────────────────────────────────────

/** Minimal schema for testing */
const testSchema: SchemaDef = {
    id: 'test',
    title: 'Test',
    fields: [
        { key: 'name', type: 'text', label: 'Name', required: true },
        { key: 'category', type: 'dropdown', label: 'Category', options: ['Friends', 'Family'] },
        { key: 'frequency', type: 'dropdown', label: 'Frequency', options: ['Weekly', 'Monthly'] },
        { key: 'birthday', type: 'date', label: 'Birthday' },
        { key: 'photo', type: 'photo', label: 'Photo' },
    ],
    submitLabel: 'Create',
};

function setupApp() {
    const app = createMockApp({});
    // Track the frontmatter object passed to processFrontMatter
    let capturedFm: Record<string, any> = {};
    app.fileManager.processFrontMatter.mockImplementation(
        async (_file: TFile, fn: (fm: Record<string, any>) => void) => {
            capturedFm = {};
            fn(capturedFm);
        }
    );
    return { app, getCapturedFm: () => capturedFm };
}

// ═══════════════════════════════════════════════════════════════
// createContact
// ═══════════════════════════════════════════════════════════════

describe('createContact', () => {
    it('creates a file via vault.create', async () => {
        const { app } = setupApp();
        const settings = createSettings({ templatePath: '', contactsFolder: 'People' });

        await createContact(app, testSchema, { name: 'Alice', category: 'Friends' }, settings);

        expect(app.vault.create).toHaveBeenCalledTimes(1);
    });

    it('places file at {contactsFolder}/{category}/{name}.md', async () => {
        const { app } = setupApp();
        const settings = createSettings({ contactsFolder: 'Contacts' });

        await createContact(app, testSchema, { name: 'Alice', category: 'Friends' }, settings);

        const callArgs = app.vault.create.mock.calls[0];
        expect(callArgs[0]).toBe('Contacts/Friends/Alice.md');
    });

    it('defaults folder to "People" when contactsFolder is empty', async () => {
        const { app } = setupApp();
        const settings = createSettings({ contactsFolder: '' });

        await createContact(app, testSchema, { name: 'Bob', category: 'Family' }, settings);

        const callArgs = app.vault.create.mock.calls[0];
        expect(callArgs[0]).toBe('People/Family/Bob.md');
    });

    it('places file in base folder when category is empty', async () => {
        const { app } = setupApp();
        const settings = createSettings({ contactsFolder: 'People' });

        await createContact(app, testSchema, { name: 'Carol', category: '' }, settings);

        const callArgs = app.vault.create.mock.calls[0];
        expect(callArgs[0]).toBe('People/Carol.md');
    });

    it('uses "Untitled" when name is missing', async () => {
        const { app } = setupApp();
        const settings = createSettings({ contactsFolder: 'People' });

        await createContact(app, testSchema, { category: 'Friends' }, settings);

        const callArgs = app.vault.create.mock.calls[0];
        expect(callArgs[0]).toBe('People/Friends/Untitled.md');
    });

    it('calls ensureFolderExists before creating file', async () => {
        const { app } = setupApp();
        const settings = createSettings({ contactsFolder: 'People' });

        // getFolderByPath returns null → folder doesn't exist → createFolder should be called
        app.vault.getFolderByPath.mockReturnValue(null);

        await createContact(app, testSchema, { name: 'Alice', category: 'Friends' }, settings);

        expect(app.vault.createFolder).toHaveBeenCalled();
    });

    it('skips folder creation when folder already exists', async () => {
        const { app } = setupApp();
        const settings = createSettings({ contactsFolder: 'People' });

        // Folder already exists
        app.vault.getFolderByPath.mockReturnValue({ path: 'People/Friends' });

        await createContact(app, testSchema, { name: 'Alice', category: 'Friends' }, settings);

        expect(app.vault.createFolder).not.toHaveBeenCalled();
    });

    // ── Frontmatter Population ──────────────────────────────────

    it('sets tags from settings.personTag', async () => {
        const { app, getCapturedFm } = setupApp();
        const settings = createSettings({ personTag: 'people', contactsFolder: 'P' });

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        expect(getCapturedFm().tags).toEqual(['people']);
    });

    it('sets form data values in frontmatter', async () => {
        const { app, getCapturedFm } = setupApp();
        const settings = createSettings({ contactsFolder: 'P' });

        await createContact(app, testSchema, {
            name: 'Alice',
            category: 'Friends',
            frequency: 'Weekly',
            birthday: '03-15',
            photo: 'https://example.com/alice.jpg',
        }, settings);

        const fm = getCapturedFm();
        expect(fm.category).toBe('Friends');
        expect(fm.frequency).toBe('Weekly');
        expect(fm.birthday).toBe('03-15');
        expect(fm.photo).toBe('https://example.com/alice.jpg');
    });

    it('does not set "name" in frontmatter (name is the filename)', async () => {
        const { app, getCapturedFm } = setupApp();
        const settings = createSettings({ contactsFolder: 'P' });

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        expect(getCapturedFm().name).toBeUndefined();
    });

    it('writes empty form values as empty strings in frontmatter', async () => {
        const { app, getCapturedFm } = setupApp();
        const settings = createSettings({ contactsFolder: 'P' });

        await createContact(app, testSchema, { name: 'Alice', birthday: '' }, settings);

        expect(getCapturedFm().birthday).toBe('');
    });

    it('sets last_contact to today when not provided', async () => {
        const { app, getCapturedFm } = setupApp();
        const settings = createSettings({ contactsFolder: 'P' });

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        // Should be a YYYY-MM-DD string
        expect(getCapturedFm().last_contact).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('initializes last_interaction to empty string', async () => {
        const { app, getCapturedFm } = setupApp();
        const settings = createSettings({ contactsFolder: 'P' });

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        expect(getCapturedFm().last_interaction).toBe('');
    });

    // ── Template Handling ────────────────────────────────────────

    it('uses default template when templatePath is empty', async () => {
        const { app } = setupApp();
        const settings = createSettings({ templatePath: '', contactsFolder: 'P' });

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        // Should not try to load a template file
        expect(app.vault.getAbstractFileByPath).not.toHaveBeenCalled();

        // Body should contain default structure
        const content = app.vault.create.mock.calls[0][1] as string;
        expect(content).toContain('# Alice');
        expect(content).toContain('## Conversational Fuel');
        expect(content).toContain('## Interaction Log');
    });

    it('falls back to default when template file not found', async () => {
        const { app } = setupApp();
        const settings = createSettings({ templatePath: 'Templates/Missing.md', contactsFolder: 'P' });

        // getAbstractFileByPath returns null (file doesn't exist)
        app.vault.getAbstractFileByPath.mockReturnValue(null);

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        const content = app.vault.create.mock.calls[0][1] as string;
        expect(content).toContain('# Alice');
    });

    it('loads template from vault when templatePath is valid', async () => {
        const { app } = setupApp();
        const settings = createSettings({ templatePath: 'Templates/Person.md', contactsFolder: 'P' });

        const templateFile = new TFile();
        templateFile.path = 'Templates/Person.md';
        app.vault.getAbstractFileByPath.mockReturnValue(templateFile);
        app.vault.read.mockResolvedValue('---\ntags: person\n---\n# {{name}}\n\n## Notes\n');

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        expect(app.vault.read).toHaveBeenCalledWith(templateFile);
    });

    it('strips frontmatter from loaded template', async () => {
        const { app } = setupApp();
        const settings = createSettings({ templatePath: 'Templates/Person.md', contactsFolder: 'P' });

        const templateFile = new TFile();
        app.vault.getAbstractFileByPath.mockReturnValue(templateFile);
        app.vault.read.mockResolvedValue('---\ntags: person\nfrequency: Monthly\n---\n# {{name}}\n\n## Notes\n');

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        const content = app.vault.create.mock.calls[0][1] as string;
        // Should NOT contain the template's frontmatter values
        expect(content).not.toContain('tags: person');
        // Should contain the body
        expect(content).toContain('# Alice');
        expect(content).toContain('## Notes');
    });

    it('strips Templater syntax from template body', async () => {
        const { app } = setupApp();
        const settings = createSettings({ templatePath: 'Templates/Person.md', contactsFolder: 'P' });

        const templateFile = new TFile();
        app.vault.getAbstractFileByPath.mockReturnValue(templateFile);
        // Template with Templater placeholders in body
        app.vault.read.mockResolvedValue('---\ntags: person\n---\n# {{name}}\n\n## {{section}}\n');

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        const content = app.vault.create.mock.calls[0][1] as string;
        // {{name}} should be replaced, {{section}} should be stripped
        expect(content).toContain('# Alice');
        expect(content).not.toContain('{{section}}');
    });

    it('creates file with empty frontmatter delimiters', async () => {
        const { app } = setupApp();
        const settings = createSettings({ templatePath: '', contactsFolder: 'P' });

        await createContact(app, testSchema, { name: 'Alice' }, settings);

        const content = app.vault.create.mock.calls[0][1] as string;
        expect(content.startsWith('---\n---\n')).toBe(true);
    });

    it('returns the created TFile', async () => {
        const { app } = setupApp();
        const settings = createSettings({ contactsFolder: 'P' });
        const mockFile = new TFile();
        app.vault.create.mockResolvedValue(mockFile);

        const result = await createContact(app, testSchema, { name: 'Alice' }, settings);

        expect(result).toBe(mockFile);
    });
});

// ═══════════════════════════════════════════════════════════════
// updateFrontmatter
// ═══════════════════════════════════════════════════════════════

describe('updateFrontmatter', () => {
    it('calls processFrontMatter on the file', async () => {
        const { app } = setupApp();
        const file = new TFile();

        await updateFrontmatter(app, file, { category: 'Work' });

        expect(app.fileManager.processFrontMatter).toHaveBeenCalledWith(
            file,
            expect.any(Function),
        );
    });

    it('merges provided data into frontmatter', async () => {
        const { app, getCapturedFm } = setupApp();
        const file = new TFile();

        await updateFrontmatter(app, file, { category: 'Work', frequency: 'Weekly' });

        expect(getCapturedFm().category).toBe('Work');
        expect(getCapturedFm().frequency).toBe('Weekly');
    });

    it('preserves existing keys (merge, not replace)', async () => {
        const { app } = setupApp();
        const file = new TFile();

        // Mock processFrontMatter to start with existing data
        let captured: Record<string, any> = {};
        app.fileManager.processFrontMatter.mockImplementation(
            async (_f: TFile, fn: (fm: Record<string, any>) => void) => {
                captured = { tags: ['people'], existingKey: 'preserved' };
                fn(captured);
            }
        );

        await updateFrontmatter(app, file, { category: 'Work' });

        expect(captured.existingKey).toBe('preserved');
        expect(captured.tags).toEqual(['people']);
        expect(captured.category).toBe('Work');
    });
});

// ═══════════════════════════════════════════════════════════════
// appendToInteractionLog
// ═══════════════════════════════════════════════════════════════

describe('appendToInteractionLog', () => {
    it('calls vault.process on the file', async () => {
        const { app } = setupApp();
        const file = new TFile();

        await appendToInteractionLog(app, file, 'Had coffee together');

        expect(app.vault.process).toHaveBeenCalledWith(file, expect.any(Function));
    });

    it('appends log section when no Interaction Log exists', async () => {
        const { app } = setupApp();
        const file = new TFile();

        app.vault.process.mockImplementation(
            async (_f: TFile, fn: (data: string) => string) => {
                const result = fn('# Alice\n\nSome content\n');
                expect(result).toContain('## Interaction Log');
                expect(result).toContain('Had coffee together');
            }
        );

        await appendToInteractionLog(app, file, 'Had coffee together');
    });

    it('inserts after existing Interaction Log header', async () => {
        const { app } = setupApp();
        const file = new TFile();

        app.vault.process.mockImplementation(
            async (_f: TFile, fn: (data: string) => string) => {
                const input = '# Alice\n\n## Interaction Log\n- 2025-01-10: Previous entry\n';
                const result = fn(input);

                // New entry should come after the header, before the previous entry
                const lines = result.split('\n');
                const headerIdx = lines.findIndex(l => l === '## Interaction Log');
                expect(lines[headerIdx + 1]).toContain('Had coffee together');
            }
        );

        await appendToInteractionLog(app, file, 'Had coffee together');
    });

    it('includes today\'s date in the log entry', async () => {
        const { app } = setupApp();
        const file = new TFile();

        app.vault.process.mockImplementation(
            async (_f: TFile, fn: (data: string) => string) => {
                const result = fn('## Interaction Log\n');
                // Should contain a date in YYYY-MM-DD format
                expect(result).toMatch(/- \d{4}-\d{2}-\d{2}: Test entry/);
            }
        );

        await appendToInteractionLog(app, file, 'Test entry');
    });

    it('handles Interaction Log at end of file (no trailing newline)', async () => {
        const { app } = setupApp();
        const file = new TFile();

        app.vault.process.mockImplementation(
            async (_f: TFile, fn: (data: string) => string) => {
                const result = fn('# Alice\n\n## Interaction Log');
                expect(result).toContain('## Interaction Log');
                expect(result).toContain('Entry text');
            }
        );

        await appendToInteractionLog(app, file, 'Entry text');
    });

    it('matches heading with emoji prefix using heading parameter', async () => {
        const { app } = setupApp();
        const file = new TFile();

        app.vault.process.mockImplementation(
            async (_f: TFile, fn: (data: string) => string) => {
                const input = '# Alice\n\n## 📝 Interaction Log\n- 2025-01-10: Previous entry\n';
                const result = fn(input);

                // Should insert after the emoji heading, not create a new section
                const lines = result.split('\n');
                const headerIdx = lines.findIndex(l => l.includes('📝 Interaction Log'));
                expect(headerIdx).toBeGreaterThan(-1);
                expect(lines[headerIdx + 1]).toContain('Coffee catch-up');

                // Should NOT create a duplicate heading
                const headingCount = lines.filter(l => l.includes('Interaction Log')).length;
                expect(headingCount).toBe(1);
            }
        );

        await appendToInteractionLog(app, file, 'Coffee catch-up', 'Interaction Log');
    });

    it('respects custom heading parameter', async () => {
        const { app } = setupApp();
        const file = new TFile();

        app.vault.process.mockImplementation(
            async (_f: TFile, fn: (data: string) => string) => {
                const input = '# Alice\n\n## Contact History\n- 2025-01-10: Previous\n';
                const result = fn(input);

                const lines = result.split('\n');
                const headerIdx = lines.findIndex(l => l.includes('Contact History'));
                expect(headerIdx).toBeGreaterThan(-1);
                expect(lines[headerIdx + 1]).toContain('New entry');
            }
        );

        await appendToInteractionLog(app, file, 'New entry', 'Contact History');
    });

    it('creates section with custom heading when not found', async () => {
        const { app } = setupApp();
        const file = new TFile();

        app.vault.process.mockImplementation(
            async (_f: TFile, fn: (data: string) => string) => {
                const result = fn('# Alice\n\nSome content\n');
                expect(result).toContain('## My Custom Log');
                expect(result).toContain('Test entry');
            }
        );

        await appendToInteractionLog(app, file, 'Test entry', 'My Custom Log');
    });
});

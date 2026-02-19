/**
 * Unit tests for src/schemas/loader.ts
 *
 * Tests the SchemaLoader with hybrid format: flat frontmatter fields
 * for simple use, optional ```fields code block for advanced overrides,
 * and silent skipping of non-schema files.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaLoader } from '../../../src/schemas/loader';
import { createMockApp } from '../../mocks/obsidian';
import { TFile, TFolder } from '../../mocks/obsidian';

describe('SchemaLoader', () => {
    let app: any;

    // ── Test Schema Content ─────────────────────────────────────

    /** Simple flat frontmatter schema — the typical user case */
    const simpleSchemaContent = `---
schema_id: conference-contact
schema_title: Conference Contact
output_path: "People/{{name}}.md"
name:
company:
frequency: Monthly
notes:
---
# {{name}}

> Company: {{company}}
`;

    /** Hybrid schema with flat fields + advanced code block */
    const hybridSchemaContent = `---
schema_id: hybrid-schema
schema_title: Hybrid Schema
output_path: "People/{{name}}.md"
name:
company:
frequency: Monthly
---

\`\`\`fields
- key: frequency
  type: dropdown
  label: Check-in frequency
  options: [Weekly, Monthly, Quarterly, Yearly]
  default: Monthly
\`\`\`

# {{name}}
> Company: {{company}}
`;

    /** File without schema_id — person template etc. */
    const nonSchemaContent = `---
tags: person
frequency: Monthly
category: Friends
---
# Person Template
`;

    beforeEach(() => {
        app = createMockApp();
        vi.clearAllMocks();
    });

    // ── Flat Frontmatter Parsing ────────────────────────────────

    it('parses flat frontmatter fields into text fields', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(simpleSchemaContent, 'test');

        expect(result).not.toBeNull();
        expect(result!.id).toBe('conference-contact');
        expect(result!.title).toBe('Conference Contact');
        expect(result!.fields).toHaveLength(4); // name, company, frequency, notes
    });

    it('auto-generates labels from field keys', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(simpleSchemaContent, 'test');

        const nameField = result!.fields.find(f => f.key === 'name');
        expect(nameField!.label).toBe('Name');

        const freqField = result!.fields.find(f => f.key === 'frequency');
        expect(freqField!.label).toBe('Frequency');
    });

    it('sets default values from frontmatter values', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(simpleSchemaContent, 'test');

        const freqField = result!.fields.find(f => f.key === 'frequency');
        expect(freqField!.default).toBe('Monthly');

        const nameField = result!.fields.find(f => f.key === 'name');
        expect(nameField!.default).toBeUndefined(); // empty value = no default
    });

    it('all flat fields default to text type', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(simpleSchemaContent, 'test');

        for (const field of result!.fields) {
            expect(field.type).toBe('text');
        }
    });

    it('skips reserved frontmatter keys', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(simpleSchemaContent, 'test');

        const keys = result!.fields.map(f => f.key);
        expect(keys).not.toContain('schema_id');
        expect(keys).not.toContain('schema_title');
        expect(keys).not.toContain('output_path');
    });

    it('extracts output path from frontmatter', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(simpleSchemaContent, 'test');

        expect(result!.output?.path).toBe('People/{{name}}.md');
    });

    // ── Silent Skip ─────────────────────────────────────────────

    it('silently skips files without schema_id', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(nonSchemaContent, 'Person Template');

        expect(result).toBeNull();
        // No Notice should have been triggered
    });

    it('silently skips files with invalid frontmatter', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile('no frontmatter here', 'readme');

        expect(result).toBeNull();
    });

    it('shows Notice only for schema_title missing on files with schema_id', () => {
        const content = `---
schema_id: incomplete
name:
---
`;
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(content, 'incomplete');

        expect(result).toBeNull();
        // Notice would be shown for missing schema_title
    });

    // ── Hybrid Mode (code block) ────────────────────────────────

    it('parses advanced fields from code block', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(hybridSchemaContent, 'hybrid');

        expect(result).not.toBeNull();
        const freqField = result!.fields.find(f => f.key === 'frequency');
        expect(freqField!.type).toBe('dropdown');
        expect(freqField!.options).toEqual(['Weekly', 'Monthly', 'Quarterly', 'Yearly']);
    });

    it('advanced fields override flat fields by key', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(hybridSchemaContent, 'hybrid');

        // frequency was flat (text, default Monthly) but overridden by code block (dropdown)
        const freqField = result!.fields.find(f => f.key === 'frequency');
        expect(freqField!.type).toBe('dropdown');
        expect(freqField!.label).toBe('Check-in frequency'); // from code block, not auto-generated
    });

    it('flat fields not in code block are preserved', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(hybridSchemaContent, 'hybrid');

        // name and company should still be text fields from flat frontmatter
        const nameField = result!.fields.find(f => f.key === 'name');
        expect(nameField!.type).toBe('text');

        const companyField = result!.fields.find(f => f.key === 'company');
        expect(companyField!.type).toBe('text');
    });

    it('body template excludes the fields code block', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(hybridSchemaContent, 'hybrid');

        expect(result!.bodyTemplate).toBeDefined();
        expect(result!.bodyTemplate).toContain('# {{name}}');
        expect(result!.bodyTemplate).not.toContain('```fields');
        expect(result!.bodyTemplate).not.toContain('type: dropdown');
    });

    // ── Body Template ───────────────────────────────────────────

    it('extracts body template from simple schema', () => {
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(simpleSchemaContent, 'test');

        expect(result!.bodyTemplate).toContain('# {{name}}');
        expect(result!.bodyTemplate).toContain('> Company: {{company}}');
    });

    it('no bodyTemplate when body is empty', () => {
        const content = `---
schema_id: empty-body
schema_title: Empty Body
name:
---
`;
        const loader = new SchemaLoader(app, '');
        const result = loader.parseSchemaFile(content, 'empty');

        expect(result).not.toBeNull();
        expect(result!.bodyTemplate).toBeUndefined();
    });

    // ── Schema Merging ──────────────────────────────────────────

    it('merges built-in and user schemas', async () => {
        const folder = new TFolder('Schemas');
        const file = new TFile('Schemas/custom.md');
        file.extension = 'md';
        folder.children = [file];

        app.vault.getFolderByPath.mockReturnValue(folder);
        app.vault.read.mockResolvedValue(simpleSchemaContent);

        const loader = new SchemaLoader(app, 'Schemas');
        const result = await loader.loadSchemas();

        expect(result.some(s => s.id === 'new-person')).toBe(true);
        expect(result.some(s => s.id === 'conference-contact')).toBe(true);
    });

    it('skips user schema with duplicate built-in ID', async () => {
        const content = `---
schema_id: new-person
schema_title: Duplicate
name:
---
`;
        const folder = new TFolder('Schemas');
        const file = new TFile('Schemas/dup.md');
        file.extension = 'md';
        folder.children = [file];

        app.vault.getFolderByPath.mockReturnValue(folder);
        app.vault.read.mockResolvedValue(content);

        const loader = new SchemaLoader(app, 'Schemas');
        const result = await loader.loadSchemas();

        expect(result.filter(s => s.id === 'new-person')).toHaveLength(1);
    });

    it('silently skips non-schema files in folder', async () => {
        const folder = new TFolder('Schemas');
        const templateFile = new TFile('Schemas/Person Template.md');
        templateFile.extension = 'md';
        folder.children = [templateFile];

        app.vault.getFolderByPath.mockReturnValue(folder);
        app.vault.read.mockResolvedValue(nonSchemaContent);

        const loader = new SchemaLoader(app, 'Schemas');
        const result = await loader.loadSchemas();

        expect(result).toHaveLength(1); // only built-in
    });

    // ── Folder Edge Cases ───────────────────────────────────────

    it('returns only built-in when folder does not exist', async () => {
        app.vault.getFolderByPath.mockReturnValue(null);

        const loader = new SchemaLoader(app, 'NonExistent');
        const result = await loader.loadSchemas();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('new-person');
    });

    it('returns only built-in when no folder configured', async () => {
        const loader = new SchemaLoader(app, '');
        const result = await loader.loadSchemas();

        expect(result).toHaveLength(1);
    });

    it('ignores non-markdown files', async () => {
        const folder = new TFolder('Schemas');
        const txtFile = new TFile('Schemas/notes.txt');
        txtFile.extension = 'txt';
        folder.children = [txtFile];

        app.vault.getFolderByPath.mockReturnValue(folder);

        const loader = new SchemaLoader(app, 'Schemas');
        const result = await loader.loadSchemas();

        expect(result).toHaveLength(1);
        expect(app.vault.read).not.toHaveBeenCalled();
    });

    it('rescan picks up new schemas', async () => {
        const folder = new TFolder('Schemas');
        folder.children = [];
        app.vault.getFolderByPath.mockReturnValue(folder);

        const loader = new SchemaLoader(app, 'Schemas');
        await loader.loadSchemas();
        expect(loader.getSchemas()).toHaveLength(1);

        const file = new TFile('Schemas/new.md');
        file.extension = 'md';
        folder.children = [file];
        app.vault.read.mockResolvedValue(simpleSchemaContent);

        await loader.rescan();
        expect(loader.getSchemas()).toHaveLength(2);
    });

    // ── Generate Example Schema ─────────────────────────────────

    it('generates example with flat frontmatter', async () => {
        const createdFile = new TFile('Schemas/Example Schema.md');
        app.vault.getFolderByPath.mockReturnValue(null);
        app.vault.getAbstractFileByPath.mockReturnValue(null);
        app.vault.create.mockResolvedValue(createdFile);

        const loader = new SchemaLoader(app, 'Schemas');
        const result = await loader.generateExampleSchema();

        expect(result).toBe(createdFile);
        const content = app.vault.create.mock.calls[0][1] as string;
        expect(content).toContain('schema_id: example-contact');
        expect(content).toContain('name:');
        expect(content).toContain('company:');
        expect(content).not.toContain('type: text'); // no complex field defs
        expect(content).not.toContain('key: name'); // no complex field defs
    });

    it('returns null when no folder configured', async () => {
        const loader = new SchemaLoader(app, '');
        const result = await loader.generateExampleSchema();
        expect(result).toBeNull();
    });
});

/**
 * Integration test for the user schema flow with hybrid format.
 *
 * Tests: create flat schema → loader picks it up → form → contact created.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaLoader } from '../../src/schemas/loader';
import { createContact } from '../../src/services/ContactManager';
import { createMockApp, TFile, TFolder } from '../mocks/obsidian';
import { createSettings } from '../helpers/factories';

describe('User Schema Flow', () => {
    let app: any;
    let settings: ReturnType<typeof createSettings>;

    const userSchemaContent = `---
schema_id: conference-contact
schema_title: Conference Contact
submit_label: Create Contact
output_path: "People/Professional/{{name}}.md"
name:
company:
frequency: Monthly
---
# {{name}}

> Company: {{company}}

## Conversational Fuel
-

## Interaction Log
`;

    beforeEach(() => {
        app = createMockApp();
        settings = createSettings({ schemaFolder: 'Schemas' });
        vi.clearAllMocks();
    });

    it('full flow: flat schema → form → contact with body template', async () => {
        const folder = new TFolder('Schemas');
        const schemaFile = new TFile('Schemas/conference.md');
        schemaFile.extension = 'md';
        folder.children = [schemaFile];

        app.vault.getFolderByPath.mockReturnValue(folder);
        app.vault.read.mockResolvedValue(userSchemaContent);

        // Load schemas
        const loader = new SchemaLoader(app, 'Schemas');
        const schemas = await loader.loadSchemas();

        const schema = schemas.find((s: any) => s.id === 'conference-contact');
        expect(schema).toBeDefined();
        expect(schema!.bodyTemplate).toContain('# {{name}}');
        expect(schema!.fields).toHaveLength(3); // name, company, frequency

        // Create contact
        const createdFile = new TFile('People/Professional/Jane Smith.md');
        app.vault.create.mockResolvedValue(createdFile);
        app.vault.getAbstractFileByPath.mockReturnValue(null);

        await createContact(app, schema!, { name: 'Jane Smith', company: 'Acme' }, settings);

        expect(app.vault.create).toHaveBeenCalled();
        const content = app.vault.create.mock.calls[0][1] as string;
        expect(content).toContain('Jane Smith');
    });

    it('user schema bodyTemplate used instead of vault template', async () => {
        const folder = new TFolder('Schemas');
        const schemaFile = new TFile('Schemas/custom.md');
        schemaFile.extension = 'md';
        folder.children = [schemaFile];

        app.vault.getFolderByPath.mockReturnValue(folder);
        app.vault.read.mockResolvedValue(userSchemaContent);

        const loader = new SchemaLoader(app, 'Schemas');
        const schemas = await loader.loadSchemas();
        const schema = schemas.find((s: any) => s.id === 'conference-contact')!;

        const createdFile = new TFile('People/Professional/Test.md');
        app.vault.create.mockResolvedValue(createdFile);
        app.vault.getAbstractFileByPath.mockReturnValue(null);

        await createContact(app, schema, { name: 'Test', company: 'Co' }, settings);

        // vault.read was only called for the schema file, not for vault template
        expect(app.vault.read.mock.calls).toHaveLength(1);
    });

    it('non-schema files in folder are silently skipped', async () => {
        const folder = new TFolder('Schemas');
        const templateFile = new TFile('Schemas/Person Template.md');
        templateFile.extension = 'md';
        folder.children = [templateFile];

        app.vault.getFolderByPath.mockReturnValue(folder);
        app.vault.read.mockResolvedValue(`---
tags: person
frequency: Monthly
---
# Person Template
`);

        const loader = new SchemaLoader(app, 'Schemas');
        const schemas = await loader.loadSchemas();

        // Only built-in schema — person template was skipped silently
        expect(schemas).toHaveLength(1);
        expect(schemas[0].id).toBe('new-person');
    });
});

/**
 * SchemaLoader — Hybrid schema loader + validator.
 *
 * Loads built-in TypeScript schemas and user-authored Markdown schemas
 * from a configurable vault folder. Merges them into a unified registry.
 *
 * User schema format (hybrid):
 * - Flat frontmatter: reserved keys (schema_id, schema_title, output_path,
 *   submit_label) define metadata. All other keys become simple text fields.
 * - Optional ```fields code block in body: advanced field definitions
 *   (type, options, required, etc.) that override flat frontmatter fields.
 * - Body after the code block = output template (stored in bodyTemplate).
 *
 * Files without schema_id in frontmatter are silently skipped.
 */
import { App, TFile, TFolder, Notice, normalizePath } from 'obsidian';
import type { SchemaDef, FieldDef } from './types';
import { isFieldDef, isSchemaDef } from './types';
import { newPersonSchema } from './new-person.schema';
import { Logger } from '../utils/logger';

/** Frontmatter keys reserved for schema metadata (not form fields). */
const RESERVED_KEYS = new Set([
    'schema_id',
    'schema_title',
    'output_path',
    'submit_label',
    'cssClass',
]);

/**
 * Auto-generates a display label from a frontmatter key.
 * Replaces underscores with spaces and capitalizes the first word.
 * Examples: "name" → "Name", "social_battery" → "Social battery"
 */
function keyToLabel(key: string): string {
    const words = key.replace(/_/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Extracts the ```fields code block from markdown body.
 * Returns the YAML content of the block and the remaining body.
 */
function extractFieldsBlock(body: string): { fieldsYaml: string | null; remainingBody: string } {
    const regex = /```fields\s*\n([\s\S]*?)```/;
    const match = body.match(regex);

    if (!match) {
        return { fieldsYaml: null, remainingBody: body };
    }

    const fieldsYaml = match[1];
    const remainingBody = body.replace(regex, '').trim();
    return { fieldsYaml, remainingBody };
}

/**
 * Parses simple YAML list items from a fields code block.
 * Supports the same field properties as FieldDef.
 */
function parseFieldsYaml(yaml: string): FieldDef[] {
    const fields: FieldDef[] = [];
    const items = yaml.split(/\n(?=\s*-\s+key:)/);

    for (const item of items) {
        const lines = item.trim().split('\n');
        if (lines.length === 0) continue;

        const obj: Record<string, any> = {};
        for (const rawLine of lines) {
            const line = rawLine.replace(/^\s*-\s*/, '').trim();
            if (!line || line.startsWith('#')) continue;

            const kvMatch = line.match(/^(\w[\w_-]*)\s*:\s*(.*)$/);
            if (!kvMatch) continue;

            const key = kvMatch[1];
            const rawValue = kvMatch[2].trim();

            if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
                obj[key] = rawValue.slice(1, -1).split(',').map(s => s.trim()).filter(s => s.length > 0);
            } else if (rawValue === 'true') {
                obj[key] = true;
            } else if (rawValue === 'false') {
                obj[key] = false;
            } else if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
                obj[key] = rawValue.slice(1, -1);
            } else {
                obj[key] = rawValue;
            }
        }

        if (obj.key && obj.type && obj.label) {
            const field: FieldDef = {
                key: String(obj.key),
                type: String(obj.type) as any,
                label: String(obj.label),
            };
            if (obj.placeholder) field.placeholder = String(obj.placeholder);
            if (obj.required !== undefined) field.required = Boolean(obj.required);
            if (obj.default !== undefined) field.default = obj.default;
            if (obj.options && Array.isArray(obj.options)) field.options = obj.options.map(String);
            if (obj.layout) field.layout = obj.layout as any;
            if (obj.description) field.description = String(obj.description);

            if (isFieldDef(field)) {
                fields.push(field);
            }
        }
    }

    return fields;
}

/**
 * Parses YAML frontmatter from a markdown string.
 * Returns the parsed frontmatter and the body after frontmatter.
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } | null {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return null;

    const yamlBlock = match[1];
    const body = match[2];

    try {
        const result: Record<string, any> = {};
        for (const rawLine of yamlBlock.split('\n')) {
            const line = rawLine.trimEnd();
            if (line.trim() === '' || line.trim().startsWith('#')) continue;

            const kvMatch = line.match(/^(\w[\w_-]*)\s*:\s*(.*)$/);
            if (!kvMatch) continue;

            const key = kvMatch[1];
            const rawValue = kvMatch[2].trim();

            if (rawValue === '') {
                result[key] = '';
            } else if (rawValue === 'true') {
                result[key] = true;
            } else if (rawValue === 'false') {
                result[key] = false;
            } else if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
                result[key] = rawValue.slice(1, -1);
            } else {
                const num = Number(rawValue);
                result[key] = (!isNaN(num) && rawValue !== '') ? num : rawValue;
            }
        }

        return { frontmatter: result, body };
    } catch {
        return null;
    }
}

/**
 * Schema loader that reads both built-in TypeScript schemas
 * and user-authored Markdown schemas from the vault.
 */
export class SchemaLoader {
    private app: App;
    private schemaFolder: string;
    private registry: SchemaDef[] = [];

    /**
     * @param app - Obsidian App instance
     * @param schemaFolder - Vault path to scan for user schemas
     */
    constructor(app: App, schemaFolder: string) {
        this.app = app;
        this.schemaFolder = schemaFolder;
    }

    /** Returns the built-in schemas shipped with the plugin. */
    getBuiltInSchemas(): SchemaDef[] {
        return [newPersonSchema];
    }

    /**
     * Loads all schemas (built-in + user) and caches the result.
     * Call this once on plugin load, then use getSchemas().
     */
    async loadSchemas(): Promise<SchemaDef[]> {
        const builtIn = this.getBuiltInSchemas();
        const user = await this.loadUserSchemas();
        this.registry = this.mergeSchemas(builtIn, user);
        return this.registry;
    }

    /** Returns the cached schema registry (built-in + user). */
    getSchemas(): SchemaDef[] {
        return this.registry;
    }

    /** Re-reads the schema folder and rebuilds the registry. */
    async rescan(): Promise<void> {
        await this.loadSchemas();
    }

    /** Updates the schema folder path (called when settings change). */
    updateSchemaFolder(folder: string): void {
        this.schemaFolder = folder;
    }

    /** Loads user-authored schemas from the configured folder. */
    private async loadUserSchemas(): Promise<SchemaDef[]> {
        if (!this.schemaFolder) {
            Logger.debug('SchemaLoader', 'No schema folder configured, skipping user schemas');
            return [];
        }

        const normalized = normalizePath(this.schemaFolder);
        const folder = this.app.vault.getFolderByPath(normalized);

        if (!folder) {
            Logger.debug('SchemaLoader', `Schema folder not found: ${normalized}`);
            return [];
        }

        const schemas: SchemaDef[] = [];

        for (const child of folder.children) {
            if (!(child instanceof TFile) || child.extension !== 'md') continue;

            try {
                const content = await this.app.vault.read(child);
                const schema = this.parseSchemaFile(content, child.basename);
                if (schema) {
                    schemas.push(schema);
                    Logger.debug('SchemaLoader', `Loaded user schema: ${schema.id}`);
                }
            } catch {
                Logger.warn('SchemaLoader', `Failed to read schema file "${child.basename}"`);
            }
        }

        return schemas;
    }

    /**
     * Parses a single markdown schema file into a SchemaDef.
     *
     * Hybrid format:
     * 1. Files without schema_id in frontmatter are silently skipped (returns null, no Notice).
     * 2. Flat frontmatter keys (non-reserved) become simple text fields.
     * 3. Optional ```fields code block in body provides advanced field overrides.
     * 4. Body after code block becomes the output template.
     */
    parseSchemaFile(content: string, filename: string): SchemaDef | null {
        const parsed = parseFrontmatter(content);
        if (!parsed) return null; // Not valid frontmatter — skip silently

        const { frontmatter: fm, body } = parsed;

        // No schema_id = not a schema file — skip silently
        if (!fm.schema_id || typeof fm.schema_id !== 'string') return null;

        // schema_title is required for actual schemas
        if (!fm.schema_title || typeof fm.schema_title !== 'string') {
            new Notice(`Orbit: Schema "${filename}" is missing required "schema_title"`);
            return null;
        }

        // 1. Build flat frontmatter fields (non-reserved keys)
        const flatFields: FieldDef[] = [];
        for (const [key, value] of Object.entries(fm)) {
            if (RESERVED_KEYS.has(key)) continue;

            flatFields.push({
                key,
                type: 'text',
                label: keyToLabel(key),
                default: value !== '' ? value : undefined,
            });
        }

        // 2. Extract optional ```fields code block from body
        const { fieldsYaml, remainingBody } = extractFieldsBlock(body);
        const advancedFields = fieldsYaml ? parseFieldsYaml(fieldsYaml) : [];

        // 3. Merge: advanced fields override flat fields by key
        const mergedMap = new Map<string, FieldDef>();
        for (const field of flatFields) {
            mergedMap.set(field.key, field);
        }
        for (const field of advancedFields) {
            mergedMap.set(field.key, field);
        }

        const fields = Array.from(mergedMap.values());

        if (fields.length === 0) {
            Logger.debug('SchemaLoader', `Schema "${filename}" has no fields, skipping`);
            return null;
        }

        // 4. Build SchemaDef
        const schema: SchemaDef = {
            id: String(fm.schema_id),
            title: String(fm.schema_title),
            fields,
        };

        if (fm.cssClass) schema.cssClass = String(fm.cssClass);
        if (fm.submit_label) schema.submitLabel = String(fm.submit_label);
        if (fm.output_path) {
            schema.output = { path: String(fm.output_path) };
        }
        if (remainingBody.trim()) {
            schema.bodyTemplate = remainingBody;
        }

        return schema;
    }

    /**
     * Merges built-in and user schemas. Built-in schemas take precedence
     * on ID conflicts — user schema is skipped with a Notice.
     */
    private mergeSchemas(builtIn: SchemaDef[], user: SchemaDef[]): SchemaDef[] {
        const builtInIds = new Set(builtIn.map(s => s.id));
        const merged = [...builtIn];

        for (const schema of user) {
            if (builtInIds.has(schema.id)) {
                new Notice(`Orbit: User schema "${schema.id}" conflicts with built-in schema — skipping`);
                continue;
            }
            merged.push(schema);
        }

        return merged;
    }

    /**
     * Creates an example schema file in the schema folder.
     * Creates the folder if it doesn't exist.
     */
    async generateExampleSchema(): Promise<TFile | null> {
        if (!this.schemaFolder) {
            new Notice('Orbit: Set a schema folder in settings first');
            return null;
        }

        const normalized = normalizePath(this.schemaFolder);

        // Ensure folder exists
        if (!this.app.vault.getFolderByPath(normalized)) {
            try {
                await this.app.vault.createFolder(normalized);
            } catch {
                // May already exist via race condition
            }
        }

        const filePath = normalizePath(`${normalized}/Example Schema.md`);

        // Check if file already exists
        const existing = this.app.vault.getAbstractFileByPath(filePath);
        if (existing instanceof TFile) {
            new Notice('Orbit: Example schema already exists');
            return existing;
        }

        const exampleContent = `---
schema_id: example-contact
schema_title: Example Contact
submit_label: Create Contact
output_path: "People/{{name}}.md"
name:
company:
frequency: Monthly
birthday:
notes:
---
# {{name}}

> Company: {{company}}

## Notes
{{notes}}

## Conversational Fuel
-

## Interaction Log
`;

        const file = await this.app.vault.create(filePath, exampleContent);
        new Notice('Orbit: Example schema created');
        Logger.debug('SchemaLoader', `Generated example schema at ${filePath}`);
        return file;
    }
}

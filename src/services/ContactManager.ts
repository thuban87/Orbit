/**
 * ContactManager — File creation, template loading, and frontmatter management.
 *
 * Stateless utility class — all methods are static and receive `app`/`settings`
 * as parameters. This keeps it testable and avoids service-to-service coupling.
 *
 * Responsibilities:
 * - createContact: Load template, populate frontmatter + body, create file
 * - updateFrontmatter: Merge-only wrapper around processFrontMatter
 * - appendToInteractionLog: Atomic append via vault.process()
 */
import { App, TFile, TFolder, normalizePath } from 'obsidian';
import type { SchemaDef } from '../schemas/types';
import type { OrbitSettings } from '../settings';
import { buildContactPath } from '../utils/paths';
import { Logger } from '../utils/logger';
import { formatLocalDate } from '../utils/dates';

/** Default template used when no template file is found in the vault. */
const DEFAULT_TEMPLATE = `# {{name}}

## Conversational Fuel
- 

## Interaction Log
`;

/**
 * Ensure a folder path exists in the vault, creating intermediate
 * directories as needed. Silently succeeds if the folder already exists.
 */
async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    if (!normalized) return;

    const existing = app.vault.getFolderByPath(normalized);
    if (existing) return;

    // Split path and create each segment
    const parts = normalized.split('/');
    let current = '';
    for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        const folder = app.vault.getFolderByPath(current);
        if (!folder) {
            try {
                await app.vault.createFolder(current);
            } catch {
                // Folder may have been created by another process
            }
        }
    }
}

/**
 * Strip YAML frontmatter from a template string, returning only the body.
 * If no frontmatter is found, returns the template as-is.
 */
function stripFrontmatter(template: string): string {
    const match = template.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    if (match) {
        return template.slice(match[0].length);
    }
    return template;
}

/**
 * Creates a new contact file in the vault from a schema + form data.
 *
 * Strategy:
 * 1. Load template for BODY STRUCTURE only (headings, sections)
 * 2. Create file with minimal/empty frontmatter + body
 * 3. Use processFrontMatter() to set ALL form data values
 *
 * This approach works regardless of whether the template uses Templater
 * syntax, our {{key}} placeholders, or has no placeholders at all.
 *
 * @param app - Obsidian App instance
 * @param schema - The schema used to create this contact
 * @param formData - Collected form data from the modal
 * @param settings - Current plugin settings
 * @returns The created TFile
 */
export async function createContact(
    app: App,
    schema: SchemaDef,
    formData: Record<string, any>,
    settings: OrbitSettings
): Promise<TFile> {
    // 1. Determine body template
    let body: string;

    if (schema.bodyTemplate) {
        // User schema provides its own body template
        body = schema.bodyTemplate;
        Logger.debug('ContactManager', 'Using body template from schema');
    } else {
        // Built-in schema — load template from vault (fall back to default)
        let template = DEFAULT_TEMPLATE;
        if (settings.templatePath) {
            const templateFile = app.vault.getAbstractFileByPath(settings.templatePath);
            if (templateFile instanceof TFile) {
                template = await app.vault.read(templateFile);
                Logger.debug('ContactManager', `Loaded template from ${settings.templatePath}`);
            } else {
                Logger.warn('ContactManager', `Template not found at "${settings.templatePath}", using default`);
            }
        }

        // Extract body only (strip any frontmatter from template)
        body = stripFrontmatter(template);
    }

    // Replace {{name}} in body (for headings like "# {{name}}")
    const contactName = String(formData.name || 'Untitled');
    body = body.split('{{name}}').join(contactName);

    // Replace any remaining {{key}} placeholders in body with empty string
    body = body.replace(/\{\{[^}]+\}\}/g, '');

    // 3. Build file path from schema output path or default logic
    let filePath: string;
    if (schema.output?.path) {
        // User/built-in schema with explicit output path — replace placeholders
        let resolvedPath = schema.output.path;
        for (const [key, value] of Object.entries(formData)) {
            resolvedPath = resolvedPath.split(`{{${key}}}`).join(String(value || ''));
        }
        // Clean up any remaining unreplaced placeholders
        resolvedPath = resolvedPath.replace(/\{\{[^}]+\}\}/g, '');
        filePath = normalizePath(resolvedPath);
    } else {
        // Fallback: {contactsFolder}/{category}/{name}.md
        const category = String(formData.category || '');
        const baseFolder = settings.contactsFolder || 'People';
        const folder = category ? `${baseFolder}/${category}` : baseFolder;
        filePath = buildContactPath(folder, contactName);
    }

    // 4. Ensure parent folder exists (auto-creates category subfolders)
    const parentFolder = filePath.substring(0, filePath.lastIndexOf('/'));
    if (parentFolder) await ensureFolderExists(app, parentFolder);

    // 5. Create the file with empty frontmatter + body
    const initialContent = `---\n---\n${body}`;
    const createdFile = await app.vault.create(filePath, initialContent);

    // 6. Use processFrontMatter to set ALL values programmatically
    //    This overwrites any template frontmatter with our actual data
    await app.fileManager.processFrontMatter(createdFile, (fm: Record<string, any>) => {
        // Always set the tag from settings
        fm.tags = [settings.personTag];

        // Set all form data values
        for (const field of schema.fields) {
            const value = formData[field.key];
            if (field.key === 'name') continue; // name is the filename, not frontmatter
            if (value !== undefined && value !== '') {
                fm[field.key] = value;
            }
        }

        // Always set last_contact to today if not provided
        if (!fm.last_contact) {
            fm.last_contact = formatLocalDate();
        }

        // Initialize empty fields that OrbitIndex expects
        if (!fm.last_interaction) fm.last_interaction = '';
    });

    Logger.debug('ContactManager', `Created contact at ${filePath}`);
    return createdFile;
}

/**
 * Updates frontmatter on an existing contact file.
 *
 * Merge-only: only updates fields specified in `data`.
 * All other existing frontmatter keys are preserved untouched.
 *
 * @param app - Obsidian App instance
 * @param file - The file to update
 * @param data - Key-value pairs to merge into frontmatter
 */
export async function updateFrontmatter(
    app: App,
    file: TFile,
    data: Record<string, any>
): Promise<void> {
    await app.fileManager.processFrontMatter(file, (fm: Record<string, any>) => {
        for (const [key, value] of Object.entries(data)) {
            fm[key] = value;
        }
    });
    Logger.debug('ContactManager', `Updated frontmatter on ${file.path}`);
}

/**
 * Appends an entry to the Interaction Log section of a contact file.
 *
 * Uses vault.process() for atomic modification — avoids conflicts
 * when the file is open in the active editor.
 *
 * @param app - Obsidian App instance
 * @param file - The contact file
 * @param entry - The interaction log entry text
 * @param heading - The heading text to match (without ## prefix, default: "Interaction Log")
 */
export async function appendToInteractionLog(
    app: App,
    file: TFile,
    entry: string,
    heading: string = 'Interaction Log'
): Promise<void> {
    const timestamp = formatLocalDate();
    const logEntry = `- ${timestamp}: ${entry}`;

    await app.vault.process(file, (content: string) => {
        // Search for any ## heading containing the heading text
        // This matches "## Interaction Log", "## 📝 Interaction Log", etc.
        const lines = content.split('\n');
        let headerLineIndex = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trimEnd();
            if (line.startsWith('## ') && line.includes(heading)) {
                headerLineIndex = i;
                break;
            }
        }

        if (headerLineIndex === -1) {
            // No matching heading — append new section at end
            const newHeader = `## ${heading}`;
            return content + `\n${newHeader}\n${logEntry}\n`;
        }

        // Insert the entry after the header line
        lines.splice(headerLineIndex + 1, 0, logEntry);
        return lines.join('\n');
    });

    Logger.debug('ContactManager', `Appended interaction log to ${file.path}`);
}

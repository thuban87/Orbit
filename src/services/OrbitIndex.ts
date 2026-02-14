import { App, TFile, TFolder, CachedMetadata, Events } from "obsidian";
import { OrbitSettings } from "../settings";
import {
    OrbitContact,
    Frequency,
    calculateStatus,
    calculateDaysSince,
    calculateDaysUntilDue,
    parseDate,
    isValidFrequency,
} from "../types";
import { Logger } from "../utils/logger";

/**
 * OrbitIndex - The "Radar"
 *
 * Maintains an in-memory index of all contacts in the vault.
 * Subscribes to metadataCache events to stay in sync.
 */
export class OrbitIndex extends Events {
    private app: App;
    private settings: OrbitSettings;
    private contacts: Map<string, OrbitContact> = new Map();
    private initialized = false;

    constructor(app: App, settings: OrbitSettings) {
        super();
        this.app = app;
        this.settings = settings;
    }

    /**
     * Initialize the index by scanning the vault.
     * Only runs once - subsequent calls are ignored.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        await this.scanVault();
        await this.saveStateToDisk(); // Save initial state for AI agents
    }

    /**
     * Scan the vault for person files.
     *
     * When `contactsFolder` is set, uses targeted scanning via getFolderByPath().
     * When empty, falls back to full vault scan via getMarkdownFiles().
     */
    async scanVault(): Promise<void> {
        this.contacts.clear();

        let files: TFile[];

        if (this.settings.contactsFolder) {
            // Targeted scan — only look in the specified folder
            const folder = this.app.vault.getFolderByPath(this.settings.contactsFolder);
            if (folder) {
                files = this.getFilesFromFolder(folder);
                Logger.debug('OrbitIndex', `Targeted scan: ${files.length} files in "${this.settings.contactsFolder}"`);
            } else {
                Logger.warn('OrbitIndex', `Contacts folder "${this.settings.contactsFolder}" not found, falling back to full vault scan`);
                files = this.app.vault.getMarkdownFiles();
            }
        } else {
            // Full vault scan (original behavior)
            files = this.app.vault.getMarkdownFiles();
        }

        for (const file of files) {
            if (this.isIgnoredPath(file.path)) continue;

            const contact = this.parseContact(file);
            if (contact) {
                this.contacts.set(file.path, contact);
            }
        }
    }

    /**
     * Recursively collect all markdown files from a folder.
     */
    private getFilesFromFolder(folder: TFolder): TFile[] {
        const files: TFile[] = [];
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                files.push(child);
            } else if (child instanceof TFolder) {
                files.push(...this.getFilesFromFolder(child));
            }
        }
        return files;
    }

    /**
     * Check if a file path should be ignored.
     */
    private isIgnoredPath(path: string): boolean {
        return this.settings.ignoredPaths.some(
            (ignored) =>
                path.startsWith(ignored + "/") || path.startsWith(ignored + "\\")
        );
    }

    /**
     * Parse a file into an OrbitContact if it matches criteria.
     */
    private parseContact(file: TFile): OrbitContact | null {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) return null;

        // Check if file has the person tag
        if (!this.hasPersonTag(cache)) return null;

        const frontmatter = cache.frontmatter;
        if (!frontmatter) return null;

        // Extract frequency (default to Monthly if missing/invalid)
        const rawFrequency = frontmatter.frequency;
        const frequency: Frequency = isValidFrequency(rawFrequency)
            ? rawFrequency
            : "Monthly";

        // Parse last_contact date
        const lastContact = parseDate(frontmatter.last_contact);

        // Parse snooze_until date
        const snoozeUntil = parseDate(frontmatter.snooze_until);

        // Check if contact is snoozed (snooze_until is in the future)
        const isSnoozed = snoozeUntil && snoozeUntil > new Date();

        // Calculate base status
        let status = calculateStatus(lastContact, frequency);

        // Override to snoozed if applicable
        if (isSnoozed) {
            status = "snoozed";
        }

        const daysSinceContact = calculateDaysSince(lastContact);
        const daysUntilDue = calculateDaysUntilDue(lastContact, frequency);

        return {
            file,
            name: file.basename,
            category: frontmatter.category,
            frequency,
            lastContact,
            status,
            daysSinceContact,
            daysUntilDue,
            photo: frontmatter.photo,
            socialBattery: frontmatter.social_battery,
            snoozeUntil: isSnoozed ? snoozeUntil : null,
            lastInteraction: frontmatter.last_interaction,
            birthday: frontmatter.birthday,
        };
    }

    /**
     * Check if a file has the configured person tag.
     */
    private hasPersonTag(cache: CachedMetadata): boolean {
        const targetTag = this.settings.personTag.toLowerCase();

        // Check frontmatter tags array
        const frontmatterTags = cache.frontmatter?.tags;
        if (Array.isArray(frontmatterTags)) {
            const found = frontmatterTags.some(
                (tag: string) => tag.toLowerCase() === targetTag
            );
            if (found) return true;
        }

        // Check inline tags from the metadata cache
        if (cache.tags) {
            const found = cache.tags.some(
                (tagCache) => tagCache.tag.slice(1).toLowerCase() === targetTag
            );
            if (found) return true;
        }

        return false;
    }

    /**
     * Handle file change event - update the contact if applicable.
     */
    handleFileChange(file: TFile): void {
        if (this.isIgnoredPath(file.path)) {
            this.contacts.delete(file.path);
            return;
        }

        const contact = this.parseContact(file);
        if (contact) {
            this.contacts.set(file.path, contact);
        } else {
            // File no longer matches criteria, remove from index
            this.contacts.delete(file.path);
        }

        this.trigger("change");
        this.saveStateToDisk(); // Non-blocking save
    }

    /**
     * Handle file delete event.
     */
    handleFileDelete(file: TFile): void {
        if (this.contacts.has(file.path)) {
            this.contacts.delete(file.path);
            this.trigger("change");
            this.saveStateToDisk(); // Non-blocking save
        }
    }

    /**
     * Handle file rename event.
     */
    handleFileRename(file: TFile, oldPath: string): void {
        // Remove old entry
        this.contacts.delete(oldPath);

        // Re-parse with new path
        if (!this.isIgnoredPath(file.path)) {
            const contact = this.parseContact(file);
            if (contact) {
                this.contacts.set(file.path, contact);
            }
        }

        this.trigger("change");
        this.saveStateToDisk(); // Non-blocking save
    }

    /**
     * Get all contacts.
     */
    getContacts(): OrbitContact[] {
        return Array.from(this.contacts.values());
    }

    /**
     * Get contacts sorted by status (decay first, then wobble, then stable).
     */
    getContactsByStatus(): OrbitContact[] {
        const statusOrder = { decay: 0, wobble: 1, stable: 2, snoozed: 3 };
        return this.getContacts().sort(
            (a, b) => statusOrder[a.status] - statusOrder[b.status]
        );
    }

    /**
     * Get a specific contact by file path.
     */
    getContact(path: string): OrbitContact | undefined {
        return this.contacts.get(path);
    }

    /**
     * Dump the current index to console for debugging.
     */
    dumpIndex(): void {
        console.log("=== Orbit Index Dump ===");
        console.log(`Total Contacts: ${this.contacts.size}`);
        console.log("------------------------");

        for (const contact of this.getContactsByStatus()) {
            // BUG: toISOString() returns UTC — off-by-one near midnight. Fix in Phase 1.
            const lastContactStr = contact.lastContact
                ? contact.lastContact.toISOString().split("T")[0]
                : "Never";

            console.log(`
Name: ${contact.name}
Status: ${contact.status.toUpperCase()}
Frequency: ${contact.frequency}
Last Contact: ${lastContactStr}
Days Since: ${contact.daysSinceContact === Infinity ? "∞" : contact.daysSinceContact}
Days Until Due: ${contact.daysUntilDue === -Infinity ? "-∞" : contact.daysUntilDue}
Category: ${contact.category || "None"}
Photo: ${contact.photo ? "✓" : "✗"}
---`);
        }
    }

    /**
     * Dumps the current in-memory contact list to a JSON file
     * so AI agents (like Gemini CLI) can read the current state.
     */
    async saveStateToDisk(): Promise<void> {
        try {
            // Convert contacts to serializable format (TFile can't be serialized)
            const data = this.getContactsByStatus().map((contact) => ({
                name: contact.name,
                filePath: contact.file.path,
                category: contact.category || null,
                frequency: contact.frequency,
                // BUG: toISOString() returns UTC — off-by-one near midnight. Fix in Phase 1.
                lastContact: contact.lastContact
                    ? contact.lastContact.toISOString().split("T")[0]
                    : null,
                status: contact.status,
                daysSinceContact:
                    contact.daysSinceContact === Infinity
                        ? null
                        : contact.daysSinceContact,
                daysUntilDue:
                    contact.daysUntilDue === -Infinity
                        ? null
                        : contact.daysUntilDue,
                socialBattery: contact.socialBattery || null,
                photo: contact.photo || null,
                // BUG: toISOString() returns UTC — off-by-one near midnight. Fix in Phase 1.
                snoozeUntil: contact.snoozeUntil
                    ? contact.snoozeUntil.toISOString().split("T")[0]
                    : null,
                lastInteraction: contact.lastInteraction || null,
                birthday: contact.birthday || null,
            }));

            const output = {
                generatedAt: new Date().toISOString(),
                totalContacts: data.length,
                contacts: data,
            };

            const jsonString = JSON.stringify(output, null, 2);

            // Write to a dedicated state file in the plugin directory
            await this.app.vault.adapter.write(
                ".obsidian/plugins/orbit/orbit-state.json",
                jsonString
            );
            // console.log("Orbit: State saved to disk for AI agents.");
        } catch (error) {
            console.error("Orbit: Failed to save state to disk", error);
        }
    }

    /**
     * Update settings reference and re-scan the vault.
     */
    async updateSettings(settings: OrbitSettings): Promise<void> {
        this.settings = settings;
        await this.scanVault();
        console.log(`Orbit: Re-scanned vault. Found ${this.contacts.size} contacts.`);
        this.trigger("change");
        await this.saveStateToDisk(); // Auto-save after settings change
    }
}


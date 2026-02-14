import { App, TFile, Notice, debounce, MarkdownView } from "obsidian";
import { OrbitIndex } from "./OrbitIndex";
import { OrbitSettings } from "../settings";
import { OrbitContact } from "../types";

/**
 * LinkListener - The "Tether"
 *
 * Monitors editor changes for wikilinks to contacts.
 * Prompts user to mark contacts as "contacted today".
 */
export class LinkListener {
    private app: App;
    private index: OrbitIndex;
    private settings: OrbitSettings;
    private processedLinks: Set<string> = new Set(); // Track already-prompted links this session

    constructor(app: App, index: OrbitIndex, settings: OrbitSettings) {
        this.app = app;
        this.index = index;
        this.settings = settings;
    }

    /**
     * Debounced handler for editor changes.
     * Waits 2 seconds after user stops typing before processing.
     */
    handleEditorChange = debounce(
        async (file: TFile) => {
            // Only process markdown files
            if (file.extension !== "md") return;

            // Get the current file content
            const content = await this.app.vault.read(file);

            // Find all wikilinks in the file
            const links = this.extractWikilinks(content);

            // Check each link against our contact index
            for (const linkName of links) {
                await this.checkAndPrompt(linkName, file);
            }
        },
        2000, // 2 second debounce
        true   // Run on leading edge as well
    );

    /**
     * Extract all wikilink targets from content.
     * Matches [[Name]] and [[Name|Alias]] patterns.
     */
    private extractWikilinks(content: string): string[] {
        const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
        const links: string[] = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            links.push(match[1].trim());
        }

        return [...new Set(links)]; // Deduplicate
    }

    /**
     * Check if a link refers to a contact and prompt if stale.
     */
    private async checkAndPrompt(linkName: string, sourceFile: TFile): Promise<void> {
        // Skip if we've already prompted for this link in this session
        const promptKey = `${sourceFile.path}::${linkName}`;
        if (this.processedLinks.has(promptKey)) return;

        // Find the contact by matching the link name to file basenames
        const contact = this.findContactByName(linkName);
        if (!contact) return; // Not a contact we're tracking

        // Check if already contacted today
        if (this.isContactedToday(contact)) return;

        // Mark as processed so we don't prompt again
        this.processedLinks.add(promptKey);

        // Show the prompt
        this.showUpdatePrompt(contact);
    }

    /**
     * Find a contact by matching link name to file basename.
     */
    private findContactByName(name: string): OrbitContact | null {
        const normalizedName = name.toLowerCase().trim();
        const contacts = this.index.getContacts();

        for (const contact of contacts) {
            if (contact.file.basename.toLowerCase() === normalizedName) {
                return contact;
            }
        }

        return null;
    }

    /**
     * Check if the contact was already contacted today.
     */
    private isContactedToday(contact: OrbitContact): boolean {
        if (!contact.lastContact) return false;

        const today = new Date();
        const lastContact = contact.lastContact;

        return (
            today.getFullYear() === lastContact.getFullYear() &&
            today.getMonth() === lastContact.getMonth() &&
            today.getDate() === lastContact.getDate()
        );
    }

    /**
     * Show a notice prompting the user to update the contact.
     */
    private showUpdatePrompt(contact: OrbitContact): void {
        // Create a notice with a clickable action
        const fragment = document.createDocumentFragment();

        const message = document.createElement("span");
        message.textContent = `Mark "${contact.name}" as contacted today? `;
        fragment.appendChild(message);

        const button = document.createElement("button");
        button.textContent = "Yes";
        button.style.marginLeft = "8px";
        button.style.cursor = "pointer";
        button.onclick = async () => {
            await this.updateContactDate(contact);
            notice.hide();
        };
        fragment.appendChild(button);

        const notice = new Notice(fragment, 10000); // 10 second timeout
    }

    /**
     * Update the contact's last_contact date to today.
     */
    private async updateContactDate(contact: OrbitContact): Promise<void> {
        const today = new Date();
        // BUG: toISOString() returns UTC date, which can differ from local date
        // near midnight boundaries, causing off-by-one errors. Fix in Phase 1.
        const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

        try {
            await this.app.fileManager.processFrontMatter(
                contact.file,
                (frontmatter) => {
                    frontmatter.last_contact = dateStr;
                }
            );

            new Notice(`✓ Updated "${contact.name}" - last contact: ${dateStr}`);
        } catch (error) {
            console.error("Orbit: Failed to update contact", error);
            new Notice(`Failed to update "${contact.name}"`);
        }
    }

    /**
     * Clear the processed links cache (e.g., on new day or settings change).
     */
    clearCache(): void {
        this.processedLinks.clear();
    }

    /**
     * Update settings reference.
     */
    updateSettings(settings: OrbitSettings): void {
        this.settings = settings;
    }
}

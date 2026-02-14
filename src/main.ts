import { Plugin, TFile, WorkspaceLeaf, MarkdownView } from "obsidian";
import { OrbitSettingTab, OrbitSettings, DEFAULT_SETTINGS } from "./settings";
import { OrbitIndex } from "./services/OrbitIndex";
import { OrbitView, VIEW_TYPE_ORBIT } from "./views/OrbitView";
import { LinkListener } from "./services/LinkListener";
import { OrbitFormModal } from "./modals/OrbitFormModal";
import { newPersonSchema } from "./schemas/new-person.schema";
import { createContact } from "./services/ContactManager";

export default class OrbitPlugin extends Plugin {
    settings: OrbitSettings;
    index: OrbitIndex;
    linkListener: LinkListener;

    async onload() {
        // Load settings
        await this.loadSettings();

        // Initialize the contact index (will scan when cache is ready)
        this.index = new OrbitIndex(this.app, this.settings);

        // Register the Orbit view early so it's available
        this.registerView(VIEW_TYPE_ORBIT, (leaf) => new OrbitView(leaf, this));

        // Add ribbon icon to open Orbit view
        this.addRibbonIcon("users", "Open Orbit", () => {
            this.activateView();
        });

        // Wait for metadataCache to be ready before scanning
        // Note: 'initialized' exists at runtime but isn't in type definitions
        if ((this.app.metadataCache as any).initialized) {
            // Already initialized, scan immediately
            await this.index.initialize();
        } else {
            // Wait for the "resolved" event (fires once when cache is ready)
            const resolvedHandler = async () => {
                await this.index.initialize();
                this.index.trigger("change"); // Update UI
            };
            this.registerEvent(
                this.app.metadataCache.on("resolved", resolvedHandler)
            );
        }

        // Also re-scan when workspace layout is ready (ensures cache is populated)
        this.app.workspace.onLayoutReady(async () => {
            if (this.index.getContacts().length === 0) {
                await this.index.scanVault();
                this.index.trigger("change");
            }
        });

        // Register for metadataCache events to keep index in sync
        this.registerEvent(
            this.app.metadataCache.on("changed", (file) => {
                this.index.handleFileChange(file);
            })
        );

        this.registerEvent(
            this.app.vault.on("delete", (file) => {
                if (file instanceof TFile) {
                    this.index.handleFileDelete(file);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on("rename", (file, oldPath) => {
                if (file instanceof TFile) {
                    this.index.handleFileRename(file, oldPath);
                }
            })
        );

        // Initialize the Link Listener (The "Tether")
        this.linkListener = new LinkListener(this.app, this.index, this.settings);

        // Subscribe to editor changes for link detection
        this.registerEvent(
            this.app.workspace.on("editor-change", (editor, info) => {
                if (info.file) {
                    this.linkListener.handleEditorChange(info.file);
                }
            })
        );

        // Register settings tab
        this.addSettingTab(new OrbitSettingTab(this.app, this));

        // Register debug command
        this.addCommand({
            id: "dump-index",
            name: "Dump Index (Debug)",
            callback: () => {
                this.index.dumpIndex();
            },
        });

        // Register command to open Orbit view
        this.addCommand({
            id: "open-orbit",
            name: "Open Orbit View",
            callback: () => {
                this.activateView();
            },
        });

        // Register weekly digest command
        this.addCommand({
            id: "weekly-digest",
            name: "Weekly Digest",
            callback: async () => {
                await this.generateWeeklyDigest();
            },
        });

        // Register New Person command
        this.addCommand({
            id: "new-person",
            name: "New Person",
            callback: () => {
                const modal = new OrbitFormModal(
                    this.app,
                    newPersonSchema,
                    async (data) => {
                        await createContact(
                            this.app,
                            newPersonSchema,
                            data,
                            this.settings
                        );
                        // Refresh the index to pick up the new contact
                        await this.index.scanVault();
                        this.index.trigger("change");
                    }
                );
                modal.open();
            },
        });

        // Orbit loaded successfully
    }

    /**
     * Generate a weekly digest markdown report.
     */
    async generateWeeklyDigest(): Promise<void> {
        const contacts = this.index.getContactsByStatus();
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Group contacts
        const contacted: string[] = [];
        const overdue: string[] = [];
        const snoozed: string[] = [];

        for (const contact of contacts) {
            if (contact.status === "snoozed") {
                snoozed.push(`- ⏸️ ${contact.name}`);
            } else if (contact.status === "decay") {
                const days = contact.daysSinceContact === Infinity
                    ? "never"
                    : `${contact.daysSinceContact} days ago`;
                overdue.push(`- 🔴 ${contact.name} (last: ${days})`);
            } else if (contact.lastContact && contact.lastContact >= weekAgo) {
                const dateStr = contact.lastContact.toISOString().split("T")[0];
                contacted.push(`- ✅ ${contact.name} (${dateStr})`);
            }
        }

        // Build report
        const dateStr = today.toISOString().split("T")[0];
        let report = `# Orbit Weekly Digest\n`;
        report += `**Generated:** ${dateStr}\n\n`;

        if (contacted.length > 0) {
            report += `## 📞 Contacted This Week (${contacted.length})\n`;
            report += contacted.join("\n") + "\n\n";
        }

        if (overdue.length > 0) {
            report += `## 🔴 Needs Attention (${overdue.length})\n`;
            report += overdue.join("\n") + "\n\n";
        }

        if (snoozed.length > 0) {
            report += `## ⏸️ Snoozed (${snoozed.length})\n`;
            report += snoozed.join("\n") + "\n\n";
        }

        report += `---\n`;
        report += `*Total contacts: ${contacts.length}*\n`;

        // Create or update the digest file
        const filePath = `Orbit Weekly Digest ${dateStr}.md`;
        const existingFile = this.app.vault.getAbstractFileByPath(filePath);

        if (existingFile instanceof TFile) {
            await this.app.vault.modify(existingFile, report);
        } else {
            await this.app.vault.create(filePath, report);
        }

        // Open the file
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            this.app.workspace.getLeaf().openFile(file);
        }
    }

    onunload() {
        // Cleanup handled by Obsidian's registerEvent
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Update the index with new settings and re-scan
        await this.index.updateSettings(this.settings);
        // Update link listener settings
        this.linkListener.updateSettings(this.settings);
        this.linkListener.clearCache();
    }

    /**
     * Activate the Orbit view in the right sidebar.
     */
    async activateView(): Promise<void> {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_ORBIT);

        if (leaves.length > 0) {
            // View already exists, reveal it
            leaf = leaves[0];
        } else {
            // Create new view in right sidebar
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: VIEW_TYPE_ORBIT, active: true });
            }
        }

        // Reveal the leaf
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }
}

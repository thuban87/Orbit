import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { OrbitSettingTab, OrbitSettings, DEFAULT_SETTINGS } from "./settings";
import { OrbitIndex } from "./services/OrbitIndex";
import { OrbitView, VIEW_TYPE_ORBIT } from "./views/OrbitView";

export default class OrbitPlugin extends Plugin {
    settings: OrbitSettings;
    index: OrbitIndex;

    async onload() {
        console.log("Orbit: Loading plugin...");

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
            // Wait for the "resolved" event
            this.registerEvent(
                this.app.metadataCache.on("resolved", async () => {
                    console.log("Orbit: MetadataCache resolved, scanning vault...");
                    await this.index.initialize();
                    this.index.trigger("change"); // Update UI
                })
            );
        }

        // Also re-scan when workspace layout is ready (ensures cache is populated)
        this.app.workspace.onLayoutReady(async () => {
            if (this.index.getContacts().length === 0) {
                console.log("Orbit: Layout ready, re-scanning vault...");
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

        console.log("Orbit: Plugin loaded successfully!");
    }

    onunload() {
        console.log("Orbit: Unloading plugin...");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Update the index with new settings and re-scan
        await this.index.updateSettings(this.settings);
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

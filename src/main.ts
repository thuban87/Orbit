import { Plugin, TFile } from "obsidian";
import { OrbitSettingTab, OrbitSettings, DEFAULT_SETTINGS } from "./settings";
import { OrbitIndex } from "./services/OrbitIndex";

export default class OrbitPlugin extends Plugin {
    settings: OrbitSettings;
    index: OrbitIndex;

    async onload() {
        console.log("Orbit: Loading plugin...");

        // Load settings
        await this.loadSettings();

        // Initialize the contact index
        this.index = new OrbitIndex(this.app, this.settings);
        await this.index.initialize();

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
        // Update the index with new settings
        this.index.updateSettings(this.settings);
    }
}

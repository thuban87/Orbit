import { App, PluginSettingTab, Setting } from "obsidian";
import OrbitPlugin from "./main";
import { FolderSuggest } from "./utils/FolderSuggest";

export interface OrbitSettings {
    /** The tag used to identify Person notes (e.g., "person" for #person) */
    personTag: string;
    /** Folder paths to ignore when scanning for contacts */
    ignoredPaths: string[];
    /** Date format for parsing last_contact (default: YYYY-MM-DD) */
    dateFormat: string;
    /** Path to the person template file in the vault */
    templatePath: string;
    /** Folder to scan for contacts (empty = full vault) */
    contactsFolder: string;
}

export const DEFAULT_SETTINGS: OrbitSettings = {
    personTag: "people",
    ignoredPaths: ["Templates", "Archive"],
    dateFormat: "YYYY-MM-DD",
    templatePath: "System/Templates/Person Template.md",
    contactsFolder: "",
};

export class OrbitSettingTab extends PluginSettingTab {
    plugin: OrbitPlugin;

    constructor(app: App, plugin: OrbitPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Orbit Settings" });

        // Person Tag setting
        new Setting(containerEl)
            .setName("Person Tag")
            .setDesc(
                "The tag used to identify contact notes. Do not include the # symbol."
            )
            .addText((text) =>
                text
                    .setPlaceholder("person")
                    .setValue(this.plugin.settings.personTag)
                    .onChange(async (value) => {
                        this.plugin.settings.personTag = value.trim() || "person";
                        await this.plugin.saveSettings();
                    })
            );

        // Ignored Paths setting
        new Setting(containerEl)
            .setName("Ignored Folders")
            .setDesc(
                "Comma-separated list of folder paths to exclude from scanning."
            )
            .addText((text) =>
                text
                    .setPlaceholder("Templates, Archive")
                    .setValue(this.plugin.settings.ignoredPaths.join(", "))
                    .onChange(async (value) => {
                        this.plugin.settings.ignoredPaths = value
                            .split(",")
                            .map((p) => p.trim())
                            .filter((p) => p.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        // Date Format setting
        new Setting(containerEl)
            .setName("Date Format")
            .setDesc(
                "The format used for last_contact dates in frontmatter (e.g., YYYY-MM-DD)."
            )
            .addText((text) =>
                text
                    .setPlaceholder("YYYY-MM-DD")
                    .setValue(this.plugin.settings.dateFormat)
                    .onChange(async (value) => {
                        this.plugin.settings.dateFormat = value.trim() || "YYYY-MM-DD";
                        await this.plugin.saveSettings();
                    })
            );

        // ── Contacts Section ────────────────────────────────
        new Setting(containerEl).setName("Contacts").setHeading();

        // Contacts Folder setting
        new Setting(containerEl)
            .setName("Contacts folder")
            .setDesc(
                "Leave empty to scan entire vault. Setting a folder improves performance on large vaults."
            )
            .addText((text) => {
                new FolderSuggest(this.app, text.inputEl);
                text
                    .setPlaceholder("People")
                    .setValue(this.plugin.settings.contactsFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.contactsFolder = value.trim();
                        await this.plugin.saveSettings();
                    });
            });

        // Template Path setting
        new Setting(containerEl)
            .setName("Person template")
            .setDesc(
                "Path to the template file used when creating new contacts."
            )
            .addText((text) =>
                text
                    .setPlaceholder("System/Templates/Person Template.md")
                    .setValue(this.plugin.settings.templatePath)
                    .onChange(async (value) => {
                        this.plugin.settings.templatePath = value.trim();
                        await this.plugin.saveSettings();
                    })
            );
    }
}

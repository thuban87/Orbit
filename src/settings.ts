import { App, Notice, Platform, PluginSettingTab, Setting } from "obsidian";
import OrbitPlugin from "./main";
import { FolderSuggest } from "./utils/FolderSuggest";
import { DEFAULT_PROMPT_TEMPLATE } from "./services/AiService";
import { Logger, type LogLevel } from "./utils/logger";

/**
 * AI provider type — determines which provider implementation is active.
 * 'none' means AI features are disabled (default).
 */
export type AiProviderType = 'none' | 'ollama' | 'openai' | 'anthropic' | 'google' | 'custom';

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
    /** Heading text for the interaction log section (without ## prefix) */
    interactionLogHeading: string;
    /** Folder containing user-authored schema files */
    schemaFolder: string;
    /** Active AI provider ('none' = disabled) */
    aiProvider: AiProviderType;
    /** @deprecated Use aiApiKeys instead. Kept for backward compatibility migration. */
    aiApiKey: string;
    /** Per-provider API keys stored as { providerType: key } */
    aiApiKeys: Record<string, string>;
    /** Selected model name */
    aiModel: string;
    /** Prompt template with {{placeholder}} variables */
    aiPromptTemplate: string;
    /** Custom endpoint URL (only used when aiProvider = 'custom') */
    aiCustomEndpoint: string;
    /** Custom model name (only used when aiProvider = 'custom') */
    aiCustomModel: string;
    /** Debug log level — controls console output verbosity */
    logLevel: LogLevel;
    /** Folder where scraped contact photos are stored */
    photoAssetFolder: string;
    /** Whether the "Download and save" toggle is checked by default */
    defaultScrapeEnabled: boolean;
    /** Behavior when a URL is added to an existing contact's photo field */
    photoScrapeOnEdit: 'ask' | 'always' | 'never';
}

export const DEFAULT_SETTINGS: OrbitSettings = {
    personTag: "people",
    ignoredPaths: ["Templates", "Archive"],
    dateFormat: "YYYY-MM-DD",
    templatePath: "System/Templates/Person Template.md",
    contactsFolder: "",
    interactionLogHeading: "Interaction Log",
    schemaFolder: "",
    aiProvider: "none",
    aiApiKey: "",
    aiApiKeys: {},
    aiModel: "",
    aiPromptTemplate: DEFAULT_PROMPT_TEMPLATE,
    aiCustomEndpoint: "",
    aiCustomModel: "",
    logLevel: "off",
    photoAssetFolder: "Resources/Assets/Orbit",
    defaultScrapeEnabled: false,
    photoScrapeOnEdit: 'ask',
};

/** Labels shown in the AI provider dropdown */
const AI_PROVIDER_LABELS: Record<AiProviderType, string> = {
    none: "None (disabled)",
    ollama: "Ollama (local)",
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google (Gemini)",
    custom: "Custom endpoint",
};

/** Providers that require an API key */
const CLOUD_PROVIDERS: AiProviderType[] = ['openai', 'anthropic', 'google', 'custom'];

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

        // Interaction Log Heading setting
        new Setting(containerEl)
            .setName("Interaction log heading")
            .setDesc(
                "The heading text used for the interaction log section in contact notes. Do not include the ## prefix."
            )
            .addText((text) =>
                text
                    .setPlaceholder("Interaction Log")
                    .setValue(this.plugin.settings.interactionLogHeading)
                    .onChange(async (value) => {
                        this.plugin.settings.interactionLogHeading = value.trim() || "Interaction Log";
                        await this.plugin.saveSettings();
                    })
            );

        // ── Schemas Section ─────────────────────────────────────
        new Setting(containerEl).setName("Schemas").setHeading();

        // Schema Folder setting
        new Setting(containerEl)
            .setName("Schema folder")
            .setDesc(
                "Folder containing custom contact schemas. Leave empty to use only the built-in schema."
            )
            .addText((text) => {
                new FolderSuggest(this.app, text.inputEl);
                text
                    .setPlaceholder("System/Orbit/Schemas")
                    .setValue(this.plugin.settings.schemaFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.schemaFolder = value.trim();
                        await this.plugin.saveSettings();
                    });
            });

        // Generate Example Schema button
        new Setting(containerEl)
            .setName("Generate example schema")
            .setDesc(
                "Creates a sample schema file in your schema folder to use as a starting point."
            )
            .addButton((button) => {
                button
                    .setButtonText("Generate")
                    .onClick(async () => {
                        if (this.plugin.schemaLoader) {
                            await this.plugin.schemaLoader.generateExampleSchema();
                        }
                    });
            });

        // ── Photos Section ───────────────────────────────────────
        this.displayPhotoSettings(containerEl);

        // ── AI Provider Section ──────────────────────────────────
        this.displayAiSettings(containerEl);

        // ── Diagnostics Section ─────────────────────────────────
        this.displayDiagnosticsSettings(containerEl);
    }

    /**
     * Render the Photos settings section.
     * Controls photo scraping behavior and asset folder.
     */
    private displayPhotoSettings(containerEl: HTMLElement): void {
        new Setting(containerEl).setName("Photos").setHeading();

        // Photo asset folder
        new Setting(containerEl)
            .setName("Photo asset folder")
            .setDesc(
                "Folder where downloaded contact photos are saved."
            )
            .addText((text) => {
                new FolderSuggest(this.app, text.inputEl);
                text
                    .setPlaceholder("Resources/Assets/Orbit")
                    .setValue(this.plugin.settings.photoAssetFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.photoAssetFolder = value.trim();
                        await this.plugin.saveSettings();
                    });
            });

        // Default scrape toggle
        new Setting(containerEl)
            .setName("Download photos by default")
            .setDesc(
                "When enabled, the 'Download and save to vault' option is checked by default when adding or editing a contact."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.defaultScrapeEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultScrapeEnabled = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Photo scrape on edit behavior
        new Setting(containerEl)
            .setName("When photo URL is added to existing contact")
            .setDesc(
                "Controls what happens when you manually add a photo URL to an existing contact's frontmatter."
            )
            .addDropdown((dropdown) =>
                dropdown
                    .addOptions({
                        ask: 'Ask every time',
                        always: 'Always download',
                        never: 'Never download',
                    })
                    .setValue(this.plugin.settings.photoScrapeOnEdit)
                    .onChange(async (value) => {
                        this.plugin.settings.photoScrapeOnEdit = value as 'ask' | 'always' | 'never';
                        await this.plugin.saveSettings();
                    })
            );
    }

    /**
     * Render the AI provider settings section.
     * Separated for clarity — conditionally shows fields based on selected provider.
     */
    private displayAiSettings(containerEl: HTMLElement): void {
        new Setting(containerEl).setName("AI provider").setHeading();

        const currentProvider = this.plugin.settings.aiProvider;

        // Provider dropdown
        new Setting(containerEl)
            .setName("Provider")
            .setDesc("Select an AI provider for message suggestions. Default is disabled.")
            .addDropdown((dropdown) => {
                // Add options — hide Ollama on mobile
                for (const [key, label] of Object.entries(AI_PROVIDER_LABELS)) {
                    if (key === 'ollama' && Platform.isMobile) continue;
                    dropdown.addOption(key, label);
                }
                dropdown.setValue(currentProvider);
                dropdown.onChange(async (value) => {
                    const newProvider = value as AiProviderType;
                    const wasNone = this.plugin.settings.aiProvider === 'none';

                    this.plugin.settings.aiProvider = newProvider;
                    // Clear model when switching providers
                    this.plugin.settings.aiModel = '';
                    await this.plugin.saveSettings();

                    // First-time privacy notice
                    if (wasNone && newProvider !== 'none') {
                        new Notice(
                            "This feature sends contact data to external AI services. Review your provider's privacy policy.",
                            10000
                        );
                    }

                    // Re-render to show/hide conditional fields
                    this.display();
                });
            });

        // ── Conditional fields based on provider ────────────────

        // API key — shown for cloud providers only
        if (CLOUD_PROVIDERS.includes(currentProvider)) {
            // Get the per-provider key (fall back to legacy aiApiKey for migration)
            const currentKey = this.plugin.settings.aiApiKeys[currentProvider]
                ?? this.plugin.settings.aiApiKey ?? '';

            new Setting(containerEl)
                .setName("API key")
                .setDesc(
                    "API keys are stored in your vault's plugin data. Ensure your vault is not publicly shared."
                )
                .addText((text) => {
                    text.inputEl.type = 'password';
                    text.inputEl.autocomplete = 'off';
                    text
                        .setPlaceholder("sk-...")
                        .setValue(currentKey)
                        .onChange(async (value) => {
                            const trimmed = value.trim();
                            // Save to per-provider keys
                            this.plugin.settings.aiApiKeys[currentProvider] = trimmed;
                            // Also keep legacy field in sync for backward compat
                            this.plugin.settings.aiApiKey = trimmed;
                            await this.plugin.saveSettings();
                        });
                });
        }

        // Custom endpoint URL — shown only for 'custom'
        if (currentProvider === 'custom') {
            new Setting(containerEl)
                .setName("Endpoint URL")
                .setDesc("Full URL for your OpenAI-compatible API endpoint.")
                .addText((text) =>
                    text
                        .setPlaceholder("https://your-api.example.com/v1/chat/completions")
                        .setValue(this.plugin.settings.aiCustomEndpoint)
                        .onChange(async (value) => {
                            this.plugin.settings.aiCustomEndpoint = value.trim();
                            await this.plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName("Model name")
                .setDesc("Model identifier to use with your custom endpoint.")
                .addText((text) =>
                    text
                        .setPlaceholder("my-model")
                        .setValue(this.plugin.settings.aiCustomModel)
                        .onChange(async (value) => {
                            this.plugin.settings.aiCustomModel = value.trim();
                            await this.plugin.saveSettings();
                        })
                );
        }

        // Model dropdown — shown for non-custom, non-none providers
        if (currentProvider !== 'none' && currentProvider !== 'custom') {
            new Setting(containerEl)
                .setName("Model")
                .setDesc("Select a model from the provider's available models.")
                .addDropdown((dropdown) => {
                    // Populate models from the AI service
                    const aiService = this.plugin.aiService;
                    if (aiService) {
                        const provider = aiService.getProvider(currentProvider);
                        if (provider) {
                            // listModels is async — populate asynchronously
                            void provider.listModels().then(async (models) => {
                                for (const model of models) {
                                    dropdown.addOption(model, model);
                                }
                                if (this.plugin.settings.aiModel && models.includes(this.plugin.settings.aiModel)) {
                                    dropdown.setValue(this.plugin.settings.aiModel);
                                } else if (models.length > 0) {
                                    // Auto-select first model if none is saved
                                    dropdown.setValue(models[0]);
                                    this.plugin.settings.aiModel = models[0];
                                    await this.plugin.saveSettings();
                                }
                            });
                        }
                    }
                    dropdown.onChange(async (value) => {
                        this.plugin.settings.aiModel = value;
                        await this.plugin.saveSettings();
                    });
                });
        }

        // Prompt template — shown for all non-none providers
        if (currentProvider !== 'none') {
            new Setting(containerEl)
                .setName("Prompt template")
                .setDesc("Template for AI message generation. Use {{placeholders}} for contact data.")
                .addTextArea((textarea) => {
                    textarea.inputEl.rows = 10;
                    textarea.inputEl.cols = 50;
                    textarea
                        .setValue(this.plugin.settings.aiPromptTemplate)
                        .onChange(async (value) => {
                            this.plugin.settings.aiPromptTemplate = value;
                            await this.plugin.saveSettings();
                        });
                });

            // Reset-to-default button
            new Setting(containerEl)
                .setName("Reset prompt template")
                .setDesc("Restore the default prompt template.")
                .addButton((button) => {
                    button
                        .setButtonText("Reset to default")
                        .onClick(async () => {
                            this.plugin.settings.aiPromptTemplate = DEFAULT_PROMPT_TEMPLATE;
                            await this.plugin.saveSettings();
                            this.display(); // Re-render to update textarea
                        });
                });
        }
    }

    /**
     * Render the Diagnostics settings section.
     * Controls Logger output level for debugging.
     */
    private displayDiagnosticsSettings(containerEl: HTMLElement): void {
        new Setting(containerEl).setName("Diagnostics").setHeading();

        const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
            off: "Off",
            error: "Errors",
            warn: "Errors + warnings",
            debug: "Verbose (all)",
        };

        new Setting(containerEl)
            .setName("Debug log level")
            .setDesc("Controls how much diagnostic output Orbit writes to the developer console.")
            .addDropdown((dropdown) => {
                for (const [key, label] of Object.entries(LOG_LEVEL_LABELS)) {
                    dropdown.addOption(key, label);
                }
                dropdown.setValue(this.plugin.settings.logLevel);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.logLevel = value as LogLevel;
                    await this.plugin.saveSettings();
                });
            });
    }
}

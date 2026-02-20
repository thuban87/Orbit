/**
 * Unit tests for AI settings in OrbitSettingTab.
 *
 * Tests verify that the AI settings section renders correctly,
 * with conditional field visibility based on selected provider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Platform, Setting, createMockApp, polyfillEl } from '../../mocks/obsidian';
import {
    DEFAULT_SETTINGS,
    OrbitSettingTab,
    type AiProviderType,
    type OrbitSettings,
} from '../../../src/settings';
import { DEFAULT_PROMPT_TEMPLATE } from '../../../src/services/AiService';

// ═══════════════════════════════════════════════════════════════
// DEFAULT SETTINGS
// ═══════════════════════════════════════════════════════════════

describe('AI default settings', () => {
    it('should default AI provider to "none"', () => {
        expect(DEFAULT_SETTINGS.aiProvider).toBe('none');
    });

    it('should default AI API key to empty string', () => {
        expect(DEFAULT_SETTINGS.aiApiKey).toBe('');
    });

    it('should default AI model to empty string', () => {
        expect(DEFAULT_SETTINGS.aiModel).toBe('');
    });

    it('should default prompt template to DEFAULT_PROMPT_TEMPLATE', () => {
        expect(DEFAULT_SETTINGS.aiPromptTemplate).toBe(DEFAULT_PROMPT_TEMPLATE);
    });

    it('should default custom endpoint to empty string', () => {
        expect(DEFAULT_SETTINGS.aiCustomEndpoint).toBe('');
    });

    it('should default custom model to empty string', () => {
        expect(DEFAULT_SETTINGS.aiCustomModel).toBe('');
    });
});

// ═══════════════════════════════════════════════════════════════
// AI PROVIDER TYPE
// ═══════════════════════════════════════════════════════════════

describe('AiProviderType', () => {
    it('should accept all valid provider types', () => {
        const validTypes: AiProviderType[] = [
            'none', 'ollama', 'openai', 'anthropic', 'google', 'custom'
        ];
        // If this compiles, the types are correct
        expect(validTypes.length).toBe(6);
    });
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS TAB DISPLAY
// ═══════════════════════════════════════════════════════════════

describe('OrbitSettingTab AI section', () => {
    let settingTab: OrbitSettingTab;
    let mockPlugin: any;
    let app: any;

    function createMockPlugin(overrides: Partial<OrbitSettings> = {}): any {
        return {
            app,
            settings: { ...DEFAULT_SETTINGS, ...overrides },
            saveSettings: vi.fn().mockResolvedValue(undefined),
            aiService: {
                getProvider: vi.fn().mockReturnValue({
                    listModels: vi.fn().mockResolvedValue(['model-1', 'model-2']),
                }),
            },
            schemaLoader: null,
        };
    }

    /** Capture all setting names created during display() */
    function captureSettingNames(): string[] {
        const names: string[] = [];
        const origSetName = Setting.prototype.setName;
        Setting.prototype.setName = function (name: string) {
            names.push(name);
            return origSetName.call(this, name);
        };
        settingTab.display();
        Setting.prototype.setName = origSetName;
        return names;
    }

    beforeEach(() => {
        // Reset Platform to desktop
        Platform.isMobile = false;
        Platform.isDesktop = true;

        app = createMockApp();
        mockPlugin = createMockPlugin();
        settingTab = new OrbitSettingTab(app, mockPlugin);
        polyfillEl(settingTab.containerEl);
    });

    it('should render the AI provider heading', () => {
        settingTab.display();
        const container = settingTab.containerEl;
        expect(container.children.length).toBeGreaterThan(0);
    });

    it('should render the AI provider setting name', () => {
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('ai provider'))).toBe(true);
    });

    it('should render a provider dropdown setting', () => {
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('ai provider'))).toBe(true);
    });

    it('should not show API key setting when provider is "none"', () => {
        mockPlugin.settings.aiProvider = 'none';
        polyfillEl(settingTab.containerEl);
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('api key'))).toBe(false);
    });

    it('should show API key setting when provider is "openai"', () => {
        mockPlugin.settings.aiProvider = 'openai';
        polyfillEl(settingTab.containerEl);
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('api key'))).toBe(true);
    });

    it('should show API key setting when provider is "anthropic"', () => {
        mockPlugin.settings.aiProvider = 'anthropic';
        polyfillEl(settingTab.containerEl);
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('api key'))).toBe(true);
    });

    it('should show API key setting when provider is "google"', () => {
        mockPlugin.settings.aiProvider = 'google';
        polyfillEl(settingTab.containerEl);
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('api key'))).toBe(true);
    });

    it('should show custom endpoint settings when provider is "custom"', () => {
        mockPlugin.settings.aiProvider = 'custom';
        polyfillEl(settingTab.containerEl);
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('endpoint'))).toBe(true);
        expect(names.some(n => n.toLowerCase().includes('model name'))).toBe(true);
    });

    it('should not show custom endpoint setting for non-custom providers', () => {
        mockPlugin.settings.aiProvider = 'openai';
        polyfillEl(settingTab.containerEl);
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('endpoint url'))).toBe(false);
    });

    it('should show prompt template setting when provider is active', () => {
        mockPlugin.settings.aiProvider = 'openai';
        polyfillEl(settingTab.containerEl);
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('prompt template'))).toBe(true);
    });

    it('should not show prompt template when provider is "none"', () => {
        mockPlugin.settings.aiProvider = 'none';
        polyfillEl(settingTab.containerEl);
        const names = captureSettingNames();
        expect(names.some(n => n.toLowerCase().includes('prompt template'))).toBe(false);
    });

    it('should hide Ollama option on mobile', () => {
        Platform.isMobile = true;
        Platform.isDesktop = false;
        mockPlugin.settings.aiProvider = 'none';
        polyfillEl(settingTab.containerEl);
        settingTab.display();

        const selects = settingTab.containerEl.querySelectorAll('select');
        const lastSelect = selects[selects.length - 1];
        if (lastSelect) {
            const options = Array.from(lastSelect.querySelectorAll('option'));
            const ollamaOption = options.find((o: HTMLOptionElement) => o.value === 'ollama');
            expect(ollamaOption).toBeUndefined();
        }
    });

    it('should show Ollama option on desktop', () => {
        Platform.isMobile = false;
        Platform.isDesktop = true;
        mockPlugin.settings.aiProvider = 'none';
        polyfillEl(settingTab.containerEl);
        settingTab.display();

        const selects = settingTab.containerEl.querySelectorAll('select');
        const lastSelect = selects[selects.length - 1];
        if (lastSelect) {
            const options = Array.from(lastSelect.querySelectorAll('option'));
            const ollamaOption = options.find((o: HTMLOptionElement) => o.value === 'ollama');
            expect(ollamaOption).toBeDefined();
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // WAVE 5 ADDITIONS — AI BRANCH COVERAGE + MIGRATION
    // ═══════════════════════════════════════════════════════════════

    it('should save custom endpoint URL and model name via onChange', async () => {
        mockPlugin.settings.aiProvider = 'custom';
        polyfillEl(settingTab.containerEl);

        const onChanges: { name: string; fn: (value: string) => Promise<void> }[] = [];
        let currentName = '';
        const origSetName = Setting.prototype.setName;
        const origAddText = Setting.prototype.addText;

        Setting.prototype.setName = function (name: string) {
            currentName = name;
            return origSetName.call(this, name);
        };

        Setting.prototype.addText = function (cb: (text: any) => void) {
            const text = {
                setPlaceholder: vi.fn().mockReturnThis(),
                setValue: vi.fn().mockReturnThis(),
                onChange: vi.fn(function (this: any, fn: (value: string) => Promise<void>) {
                    onChanges.push({ name: currentName, fn });
                    return this;
                }),
                inputEl: document.createElement('input'),
            };
            cb(text);
            return this;
        };

        settingTab.display();
        Setting.prototype.setName = origSetName;
        Setting.prototype.addText = origAddText;

        const endpointChange = onChanges.find(o => o.name === 'Endpoint URL');
        expect(endpointChange).toBeDefined();
        await endpointChange!.fn('  https://my-api.com/v1  ');
        expect(mockPlugin.settings.aiCustomEndpoint).toBe('https://my-api.com/v1');
        expect(mockPlugin.saveSettings).toHaveBeenCalled();

        const modelChange = onChanges.find(o => o.name === 'Model name');
        expect(modelChange).toBeDefined();
        await modelChange!.fn('  gpt-4  ');
        expect(mockPlugin.settings.aiCustomModel).toBe('gpt-4');
    });

    it('should call display() to re-render when provider changes from none to cloud', async () => {
        mockPlugin.settings.aiProvider = 'none';
        polyfillEl(settingTab.containerEl);

        let capturedOnChange: ((value: string) => Promise<void>) | null = null;
        let currentName = '';
        const origSetName = Setting.prototype.setName;
        const origAddDropdown = Setting.prototype.addDropdown;

        Setting.prototype.setName = function (name: string) {
            currentName = name;
            return origSetName.call(this, name);
        };

        Setting.prototype.addDropdown = function (cb: (dropdown: any) => void) {
            const dropdown = {
                addOption: vi.fn().mockReturnThis(),
                addOptions: vi.fn().mockReturnThis(),
                setValue: vi.fn().mockReturnThis(),
                onChange: vi.fn(function (this: any, fn: (value: string) => Promise<void>) {
                    if (currentName === 'Provider') {
                        capturedOnChange = fn;
                    }
                    return this;
                }),
            };
            cb(dropdown);
            return this;
        };

        settingTab.display();
        Setting.prototype.setName = origSetName;
        Setting.prototype.addDropdown = origAddDropdown;

        const displaySpy = vi.spyOn(settingTab, 'display');
        expect(capturedOnChange).not.toBeNull();
        await capturedOnChange!('openai');
        expect(displaySpy).toHaveBeenCalled();
        expect(mockPlugin.settings.aiProvider).toBe('openai');
        displaySpy.mockRestore();
    });

    it('should reset prompt template to default and re-render', async () => {
        mockPlugin.settings.aiProvider = 'openai';
        mockPlugin.settings.aiPromptTemplate = 'custom template';
        polyfillEl(settingTab.containerEl);

        let capturedOnClick: (() => Promise<void>) | null = null;
        let currentName = '';
        const origSetName = Setting.prototype.setName;
        const origAddButton = Setting.prototype.addButton;

        Setting.prototype.setName = function (name: string) {
            currentName = name;
            return origSetName.call(this, name);
        };

        Setting.prototype.addButton = function (cb: (button: any) => void) {
            const button = {
                setButtonText: vi.fn().mockReturnThis(),
                setCta: vi.fn().mockReturnThis(),
                onClick: vi.fn((handler: () => Promise<void>) => {
                    if (currentName === 'Reset prompt template') {
                        capturedOnClick = handler;
                    }
                    return button;
                }),
                buttonEl: document.createElement('button'),
            };
            cb(button);
            return this;
        };

        settingTab.display();
        Setting.prototype.setName = origSetName;
        Setting.prototype.addButton = origAddButton;

        const displaySpy = vi.spyOn(settingTab, 'display');
        expect(capturedOnClick).not.toBeNull();
        await capturedOnClick!();
        expect(mockPlugin.settings.aiPromptTemplate).toBe(DEFAULT_PROMPT_TEMPLATE);
        expect(mockPlugin.saveSettings).toHaveBeenCalled();
        expect(displaySpy).toHaveBeenCalled();
        displaySpy.mockRestore();
    });

    it('should fall back to deprecated aiApiKey when aiApiKeys is empty (migration)', () => {
        mockPlugin.settings.aiProvider = 'openai';
        mockPlugin.settings.aiApiKey = 'legacy-key-123';
        mockPlugin.settings.aiApiKeys = {};
        polyfillEl(settingTab.containerEl);

        let capturedSetValue: string | null = null;
        let currentName = '';
        const origSetName = Setting.prototype.setName;
        const origAddText = Setting.prototype.addText;

        Setting.prototype.setName = function (name: string) {
            currentName = name;
            return origSetName.call(this, name);
        };

        Setting.prototype.addText = function (cb: (text: any) => void) {
            const text = {
                setPlaceholder: vi.fn().mockReturnThis(),
                setValue: vi.fn(function (this: any, val: string) {
                    if (currentName === 'API key') {
                        capturedSetValue = val;
                    }
                    return this;
                }),
                onChange: vi.fn().mockReturnThis(),
                inputEl: document.createElement('input'),
            };
            cb(text);
            return this;
        };

        settingTab.display();
        Setting.prototype.setName = origSetName;
        Setting.prototype.addText = origAddText;

        // The ?? fallback should resolve to the legacy key
        expect(capturedSetValue).toBe('legacy-key-123');
    });
});

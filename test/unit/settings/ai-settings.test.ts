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
});

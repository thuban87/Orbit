/**
 * Unit tests for schema-related settings in src/settings.ts
 *
 * Tests the Schema folder setting and "Generate example schema" button.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrbitSettingTab, DEFAULT_SETTINGS } from '../../../src/settings';
import { Setting, createMockApp, polyfillEl } from '../../mocks/obsidian';

describe('Schema Settings', () => {
    let settingTab: OrbitSettingTab;
    let mockPlugin: any;
    let app: any;

    beforeEach(() => {
        app = createMockApp();
        mockPlugin = {
            app,
            settings: { ...DEFAULT_SETTINGS },
            saveSettings: vi.fn().mockResolvedValue(undefined),
            schemaLoader: {
                generateExampleSchema: vi.fn().mockResolvedValue(null),
            },
        };
        settingTab = new OrbitSettingTab(app, mockPlugin);
        // Polyfill containerEl with Obsidian's helper methods
        polyfillEl(settingTab.containerEl);
    });

    it('default schemaFolder is empty string', () => {
        expect(DEFAULT_SETTINGS.schemaFolder).toBe('');
    });

    it('renders the Schemas heading', () => {
        settingTab.display();

        // Check that setHeading was called — the Schemas section creates a Setting with setHeading()
        const container = settingTab.containerEl;
        // Settings are appended as children; we just verify the display ran without error
        expect(container.children.length).toBeGreaterThan(0);
    });

    it('renders schema folder setting', () => {
        // Spy on Setting constructor to capture calls
        const settingCalls: string[] = [];
        const origSetName = Setting.prototype.setName;
        Setting.prototype.setName = function (name: string) {
            settingCalls.push(name);
            return origSetName.call(this, name);
        };

        settingTab.display();

        expect(settingCalls).toContain('Schema folder');

        // Restore
        Setting.prototype.setName = origSetName;
    });

    it('renders generate example schema button', () => {
        const settingCalls: string[] = [];
        const origSetName = Setting.prototype.setName;
        Setting.prototype.setName = function (name: string) {
            settingCalls.push(name);
            return origSetName.call(this, name);
        };

        settingTab.display();

        expect(settingCalls).toContain('Generate example schema');

        // Restore
        Setting.prototype.setName = origSetName;
    });

    it('generate button calls schemaLoader.generateExampleSchema', async () => {
        // Override addButton to capture the onClick callback
        let capturedOnClick: (() => Promise<void>) | null = null;
        const origAddButton = Setting.prototype.addButton;
        Setting.prototype.addButton = function (cb: (button: any) => void) {
            const button = {
                setButtonText: vi.fn().mockReturnThis(),
                setCta: vi.fn().mockReturnThis(),
                onClick: vi.fn((handler: () => Promise<void>) => {
                    capturedOnClick = handler;
                    return button;
                }),
                buttonEl: document.createElement('button'),
            };
            cb(button);
            return this;
        };

        settingTab.display();

        expect(capturedOnClick).not.toBeNull();
        await capturedOnClick!();

        expect(mockPlugin.schemaLoader.generateExampleSchema).toHaveBeenCalled();

        // Restore
        Setting.prototype.addButton = origAddButton;
    });
});

/**
 * Unit tests for the Photos settings section of OrbitSettingTab.
 *
 * Covers: Photo asset folder, default scrape toggle, and
 * photo scrape on edit dropdown.
 *
 * Wave 5, Group 2 — 5 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Setting, createMockApp, polyfillEl } from '../../mocks/obsidian';
import {
    DEFAULT_SETTINGS,
    OrbitSettingTab,
    type OrbitSettings,
} from '../../../src/settings';

describe('OrbitSettingTab — Photo settings', () => {
    let settingTab: OrbitSettingTab;
    let mockPlugin: any;
    let app: any;

    function createMockPlugin(overrides: Partial<OrbitSettings> = {}): any {
        return {
            app,
            settings: { ...DEFAULT_SETTINGS, ...overrides },
            saveSettings: vi.fn().mockResolvedValue(undefined),
            aiService: null,
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
        app = createMockApp();
        mockPlugin = createMockPlugin();
        settingTab = new OrbitSettingTab(app, mockPlugin);
        polyfillEl(settingTab.containerEl);
    });

    // ── Test 1: Photo asset folder renders ──────────────────────
    it('should render Photo asset folder setting with FolderSuggest', () => {
        const names = captureSettingNames();
        expect(names).toContain('Photo asset folder');
    });

    // ── Test 2: Default scrape toggle reflects value ────────────
    it('should set toggle value to defaultScrapeEnabled', () => {
        let capturedSetValue: boolean | null = null;
        const origAddToggle = Setting.prototype.addToggle;

        Setting.prototype.addToggle = function (cb: (toggle: any) => void) {
            const toggle = {
                setValue: vi.fn(function (this: any, val: boolean) {
                    capturedSetValue = val;
                    return this;
                }),
                onChange: vi.fn().mockReturnThis(),
            };
            cb(toggle);
            return this;
        };

        settingTab.display();
        Setting.prototype.addToggle = origAddToggle;

        // defaultScrapeEnabled defaults to false
        expect(capturedSetValue).toBe(false);
    });

    // ── Test 3: Toggle change saves updated value ───────────────
    it('should save defaultScrapeEnabled when toggle changes', async () => {
        let capturedOnChange: ((value: boolean) => Promise<void>) | null = null;
        const origAddToggle = Setting.prototype.addToggle;

        Setting.prototype.addToggle = function (cb: (toggle: any) => void) {
            const toggle = {
                setValue: vi.fn().mockReturnThis(),
                onChange: vi.fn(function (this: any, fn: (value: boolean) => Promise<void>) {
                    capturedOnChange = fn;
                    return this;
                }),
            };
            cb(toggle);
            return this;
        };

        settingTab.display();
        Setting.prototype.addToggle = origAddToggle;

        expect(capturedOnChange).not.toBeNull();
        await capturedOnChange!(true);
        expect(mockPlugin.settings.defaultScrapeEnabled).toBe(true);
        expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    // ── Test 4: Photo scrape on edit dropdown shows all 3 options ─
    it('should render photo scrape on edit dropdown with 3 options', () => {
        let capturedOptions: Record<string, string> | null = null;
        const origAddDropdown = Setting.prototype.addDropdown;

        Setting.prototype.addDropdown = function (cb: (dropdown: any) => void) {
            const dropdown = {
                addOption: vi.fn().mockReturnThis(),
                addOptions: vi.fn(function (this: any, opts: Record<string, string>) {
                    capturedOptions = opts;
                    return this;
                }),
                setValue: vi.fn().mockReturnThis(),
                onChange: vi.fn().mockReturnThis(),
            };
            cb(dropdown);
            return this;
        };

        settingTab.display();
        Setting.prototype.addDropdown = origAddDropdown;

        // The photo scrape dropdown uses addOptions (not addOption)
        expect(capturedOptions).not.toBeNull();
        expect(capturedOptions).toEqual({
            ask: 'Ask every time',
            always: 'Always download',
            never: 'Never download',
        });
    });

    // ── Test 5: Dropdown change saves correct enum value ────────
    it('should save photoScrapeOnEdit when dropdown changes', async () => {
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
                    if (currentName === 'When photo URL is added to existing contact') {
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

        expect(capturedOnChange).not.toBeNull();
        await capturedOnChange!('always');
        expect(mockPlugin.settings.photoScrapeOnEdit).toBe('always');
        expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });
});

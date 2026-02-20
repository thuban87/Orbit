/**
 * Unit tests for the main display() section of OrbitSettingTab.
 *
 * Covers: Orbit Settings heading, Person Tag, Ignored Folders,
 * Date Format, Contacts folder, Template path, Interaction log heading,
 * Schema folder, and Generate Example Schema button.
 *
 * Wave 5, Group 1 — 9 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Setting, createMockApp, polyfillEl } from '../../mocks/obsidian';
import {
    DEFAULT_SETTINGS,
    OrbitSettingTab,
    type OrbitSettings,
} from '../../../src/settings';

describe('OrbitSettingTab display() — main section', () => {
    let settingTab: OrbitSettingTab;
    let mockPlugin: any;
    let app: any;

    function createMockPlugin(overrides: Partial<OrbitSettings> = {}): any {
        return {
            app,
            settings: { ...DEFAULT_SETTINGS, ...overrides },
            saveSettings: vi.fn().mockResolvedValue(undefined),
            aiService: null,
            schemaLoader: {
                generateExampleSchema: vi.fn().mockResolvedValue(null),
            },
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

    /**
     * Capture the onChange callback from a text setting identified by name.
     * Calls display() internally, so the tab must be ready.
     */
    function captureTextOnChange(targetName: string): ((value: string) => Promise<void>) | null {
        let captured: ((value: string) => Promise<void>) | null = null;
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
                    if (currentName === targetName) {
                        captured = fn;
                    }
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

        return captured;
    }

    beforeEach(() => {
        app = createMockApp();
        mockPlugin = createMockPlugin();
        settingTab = new OrbitSettingTab(app, mockPlugin);
        polyfillEl(settingTab.containerEl);
    });

    // ── Test 1: Orbit Settings heading ──────────────────────────
    it('should create "Orbit Settings" heading', () => {
        settingTab.display();
        const h2 = settingTab.containerEl.querySelector('h2');
        expect(h2).not.toBeNull();
        expect(h2!.textContent).toBe('Orbit Settings');
    });

    // ── Test 2: Person Tag renders and saves ────────────────────
    it('should render Person Tag and save on change', async () => {
        const names = captureSettingNames();
        expect(names).toContain('Person Tag');

        const onChange = captureTextOnChange('Person Tag');
        expect(onChange).not.toBeNull();
        await onChange!('contacts');
        expect(mockPlugin.settings.personTag).toBe('contacts');
        expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    // ── Test 3: Ignored Folders splits comma-separated input ────
    it('should split comma-separated input into ignoredPaths array', async () => {
        const onChange = captureTextOnChange('Ignored Folders');
        expect(onChange).not.toBeNull();
        await onChange!('Inbox, Work, Personal');
        expect(mockPlugin.settings.ignoredPaths).toEqual(['Inbox', 'Work', 'Personal']);
    });

    // ── Test 4: Date Format defaults on empty ───────────────────
    it('should default dateFormat to "YYYY-MM-DD" when input is empty', async () => {
        const onChange = captureTextOnChange('Date Format');
        expect(onChange).not.toBeNull();
        await onChange!('');
        expect(mockPlugin.settings.dateFormat).toBe('YYYY-MM-DD');
    });

    // ── Test 5: Contacts folder renders FolderSuggest ───────────
    it('should render Contacts folder setting', () => {
        const names = captureSettingNames();
        expect(names).toContain('Contacts folder');
    });

    // ── Test 6: Template path saves trimmed value ───────────────
    it('should save trimmed value for template path', async () => {
        const onChange = captureTextOnChange('Person template');
        expect(onChange).not.toBeNull();
        await onChange!('  path/template.md  ');
        expect(mockPlugin.settings.templatePath).toBe('path/template.md');
        expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    // ── Test 7: Interaction log heading defaults on empty ────────
    it('should default interactionLogHeading to "Interaction Log" on empty', async () => {
        const onChange = captureTextOnChange('Interaction log heading');
        expect(onChange).not.toBeNull();
        await onChange!('');
        expect(mockPlugin.settings.interactionLogHeading).toBe('Interaction Log');
    });

    // ── Test 8: Schema folder renders FolderSuggest ─────────────
    it('should render Schema folder setting', () => {
        const names = captureSettingNames();
        expect(names).toContain('Schema folder');
    });

    // ── Test 9: Generate schema button + falsy schemaLoader ─────
    it('should call schemaLoader.generateExampleSchema and handle null schemaLoader', async () => {
        // Part A: with schemaLoader present
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
        Setting.prototype.addButton = origAddButton;

        expect(capturedOnClick).not.toBeNull();
        await capturedOnClick!();
        expect(mockPlugin.schemaLoader.generateExampleSchema).toHaveBeenCalled();

        // Part B: with null schemaLoader — should not throw
        mockPlugin.schemaLoader = null;
        capturedOnClick = null;

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
        Setting.prototype.addButton = origAddButton;

        expect(capturedOnClick).not.toBeNull();
        await expect(capturedOnClick!()).resolves.toBeUndefined();
    });
});

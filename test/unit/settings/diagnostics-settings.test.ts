/**
 * Unit tests for Diagnostics settings section in OrbitSettingTab.
 *
 * Tests the log level dropdown renders correctly, defaults to "Off",
 * and changing the dropdown invokes the correct callbacks.
 *
 * Note: The mock Setting.addDropdown() creates a vi.fn() stub, not a real
 * <select> element. Tests use the captureSettingNames pattern and spy on
 * the dropdown callback to verify behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Setting, createMockApp, polyfillEl } from '../../mocks/obsidian';
import { DEFAULT_SETTINGS, OrbitSettingTab } from '../../../src/settings';
import type { OrbitSettings } from '../../../src/settings';
import { Logger } from '../../../src/utils/logger';

describe('Diagnostics settings', () => {
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

    /** Capture the dropdown callback from the Diagnostics section */
    function captureDropdownCallback(): {
        addOptionCalls: [string, string][];
        setValueCalls: string[];
        onChangeFn: ((value: string) => void) | null;
    } {
        const addOptionCalls: [string, string][] = [];
        const setValueCalls: string[] = [];
        let onChangeFn: ((value: string) => void) | null = null;

        // Track how many times addDropdown is called so we can identify the last one
        const origAddDropdown = Setting.prototype.addDropdown;
        const dropdownCallbacks: ((dropdown: any) => void)[] = [];

        Setting.prototype.addDropdown = function (cb: (dropdown: any) => void) {
            dropdownCallbacks.push(cb);
            return origAddDropdown.call(this, cb);
        };

        settingTab.display();
        Setting.prototype.addDropdown = origAddDropdown;

        // Re-invoke the LAST dropdown callback to capture its internals
        // (the Diagnostics dropdown is the last one on the page)
        if (dropdownCallbacks.length > 0) {
            const lastCb = dropdownCallbacks[dropdownCallbacks.length - 1];
            const spyDropdown = {
                addOption: vi.fn(function (this: any, key: string, label: string) {
                    addOptionCalls.push([key, label]);
                    return this;
                }),
                setValue: vi.fn(function (this: any, val: string) {
                    setValueCalls.push(val);
                    return this;
                }),
                onChange: vi.fn(function (this: any, fn: (value: string) => void) {
                    onChangeFn = fn;
                    return this;
                }),
            };
            lastCb(spyDropdown);
        }

        return { addOptionCalls, setValueCalls, onChangeFn };
    }

    beforeEach(() => {
        app = createMockApp();
        mockPlugin = createMockPlugin();
        settingTab = new OrbitSettingTab(app, mockPlugin);
        polyfillEl(settingTab.containerEl);
        Logger.setLevel('off');
    });

    // ── Default Value ────────────────────────────────
    it('should default logLevel to "off"', () => {
        expect(DEFAULT_SETTINGS.logLevel).toBe('off');
    });

    // ── Section Rendering ────────────────────────────
    it('should render the "Diagnostics" heading', () => {
        const names = captureSettingNames();
        expect(names.some(n => n === 'Diagnostics')).toBe(true);
    });

    it('should render the "Debug log level" setting', () => {
        const names = captureSettingNames();
        expect(names.some(n => n === 'Debug log level')).toBe(true);
    });

    // ── Dropdown Options ─────────────────────────────
    it('should provide 4 dropdown options', () => {
        const { addOptionCalls } = captureDropdownCallback();
        expect(addOptionCalls.length).toBe(4);
    });

    it('should have correct option keys', () => {
        const { addOptionCalls } = captureDropdownCallback();
        const keys = addOptionCalls.map(([key]) => key);
        expect(keys).toEqual(['off', 'error', 'warn', 'debug']);
    });

    it('should have correct option labels', () => {
        const { addOptionCalls } = captureDropdownCallback();
        const labels = addOptionCalls.map(([, label]) => label);
        expect(labels).toEqual(['Off', 'Errors', 'Errors + warnings', 'Verbose (all)']);
    });

    it('should set default value to current setting', () => {
        const { setValueCalls } = captureDropdownCallback();
        expect(setValueCalls).toContain('off');
    });

    // ── Change Behavior ──────────────────────────────
    it('should update settings.logLevel when dropdown changes', async () => {
        const { onChangeFn } = captureDropdownCallback();
        expect(onChangeFn).not.toBeNull();

        await onChangeFn!('debug');
        expect(mockPlugin.settings.logLevel).toBe('debug');
    });

    it('should call saveSettings when dropdown changes', async () => {
        const { onChangeFn } = captureDropdownCallback();
        expect(onChangeFn).not.toBeNull();

        await onChangeFn!('warn');
        expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    // ── Diagnostics section appears at the bottom ────
    it('should place Diagnostics after AI provider section', () => {
        const names = captureSettingNames();
        const aiIndex = names.findIndex(n => n.toLowerCase().includes('ai provider'));
        const diagIndex = names.findIndex(n => n === 'Diagnostics');
        expect(aiIndex).toBeLessThan(diagIndex);
    });
});

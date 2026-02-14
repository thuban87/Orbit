/**
 * Mock module for the Obsidian API.
 *
 * Vitest resolves all `import { ... } from 'obsidian'` to this file
 * via the alias in vitest.config.ts. Each export mirrors the real
 * Obsidian API surface used by Orbit plugin source files.
 */
import { vi } from 'vitest';

// ─── Core File Types ────────────────────────────────────────────

export class TFile {
    path: string;
    basename: string;
    extension: string = 'md';
    name: string;
    parent: any = null;
    vault: any = {};
    stat: any = { ctime: 0, mtime: 0, size: 0 };

    constructor(path: string = 'Untitled.md') {
        this.path = path;
        this.basename = path.split('/').pop()?.replace(/\.md$/, '') ?? '';
        this.name = path.split('/').pop() ?? '';
    }
}

export class TFolder {
    path: string;
    children: (TFile | TFolder)[] = [];

    constructor(path: string = '') {
        this.path = path;
    }
}

// ─── Events ─────────────────────────────────────────────────────

export class Events {
    private _handlers: Map<string, Function[]> = new Map();

    on(event: string, handler: Function): void {
        const handlers = this._handlers.get(event) || [];
        handlers.push(handler);
        this._handlers.set(event, handlers);
    }

    off(event: string, handler: Function): void {
        const handlers = this._handlers.get(event) || [];
        this._handlers.set(event, handlers.filter(h => h !== handler));
    }

    trigger(event: string, ...args: any[]): void {
        const handlers = this._handlers.get(event) || [];
        for (const handler of handlers) {
            handler(...args);
        }
    }
}

// ─── Metadata ───────────────────────────────────────────────────

export interface CachedMetadata {
    frontmatter?: Record<string, any>;
    tags?: { tag: string; position: any }[];
}

// ─── App & Vault ────────────────────────────────────────────────

/** Creates a fresh mock App instance for testing. */
export function createMockApp(overrides: {
    files?: TFile[];
    cacheMap?: Map<TFile, CachedMetadata>;
} = {}): any {
    const files = overrides.files ?? [];
    const cacheMap = overrides.cacheMap ?? new Map();

    return {
        vault: {
            getMarkdownFiles: vi.fn(() => files),
            read: vi.fn(async () => ''),
            create: vi.fn(async () => new TFile()),
            modify: vi.fn(async () => { }),
            process: vi.fn(async (file: TFile, fn: (data: string) => string) => fn('')),
            delete: vi.fn(async () => { }),
            adapter: {
                write: vi.fn(async () => { }),
                read: vi.fn(async () => ''),
                exists: vi.fn(async () => false),
            },
            getFolderByPath: vi.fn(() => null),
            getAbstractFileByPath: vi.fn(() => null),
            createFolder: vi.fn(async () => { }),
            getRoot: vi.fn(() => new TFolder('')),
            on: vi.fn(),
        },
        metadataCache: {
            getFileCache: vi.fn((file: TFile) => cacheMap.get(file) ?? null),
            on: vi.fn(),
        },
        fileManager: {
            processFrontMatter: vi.fn(async (file: TFile, fn: (fm: Record<string, any>) => void) => {
                const fm: Record<string, any> = {};
                fn(fm);
            }),
        },
        workspace: {
            getActiveViewOfType: vi.fn(() => null),
            on: vi.fn(),
            getLeavesOfType: vi.fn(() => []),
            revealLeaf: vi.fn(),
            getRightLeaf: vi.fn(() => ({
                setViewState: vi.fn(async () => { }),
            })),
        },
    };
}

// ─── Plugin ─────────────────────────────────────────────────────

export class Plugin {
    app: any;
    manifest: any = { id: 'orbit', version: '0.0.1' };

    constructor(app?: any) {
        this.app = app ?? createMockApp();
    }

    registerEvent(): void { }
    addCommand(): void { }
    addSettingTab(): void { }
    addRibbonIcon(): void { }
    registerView(): void { }
    loadData(): Promise<any> { return Promise.resolve({}); }
    saveData(): Promise<void> { return Promise.resolve(); }
}

// ─── UI Components ──────────────────────────────────────────────

/**
 * Polyfill Obsidian-specific HTMLElement methods for jsdom.
 * Obsidian extends HTMLElement with helpers like empty(), setText(), addClass(), removeClass().
 */
function polyfillEl(el: HTMLElement): HTMLElement {
    if (!(el as any)._obsidianPolyfilled) {
        (el as any).empty = function () { this.innerHTML = ''; };
        (el as any).setText = function (text: string) { this.textContent = text; };
        (el as any).addClass = function (cls: string) { this.classList.add(cls); };
        (el as any).removeClass = function (cls: string) { this.classList.remove(cls); };
        (el as any)._obsidianPolyfilled = true;
    }
    return el;
}

export class Modal {
    app: any;
    contentEl: HTMLElement;
    titleEl: HTMLElement;
    modalEl: HTMLElement;

    constructor(app?: any) {
        this.app = app ?? createMockApp();
        this.contentEl = polyfillEl(document.createElement('div'));
        this.titleEl = polyfillEl(document.createElement('div'));
        this.modalEl = polyfillEl(document.createElement('div'));
    }

    open(): void { }
    close(): void { }
}

export class Notice {
    message: string | DocumentFragment;
    duration: number;

    constructor(message: string | DocumentFragment, duration: number = 5000) {
        this.message = message;
        this.duration = duration;
    }

    hide(): void { }
}

export class Menu {
    private items: any[] = [];

    addItem(cb: (item: any) => void): this {
        const item = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            onClick: vi.fn().mockReturnThis(),
        };
        cb(item);
        this.items.push(item);
        return this;
    }

    showAtPosition(): void { }
}

// ─── Settings ───────────────────────────────────────────────────

export class PluginSettingTab {
    app: any;
    containerEl: HTMLElement;

    constructor(app: any, _plugin: any) {
        this.app = app;
        this.containerEl = document.createElement('div');
    }

    display(): void { }
    hide(): void { }
}

export class Setting {
    settingEl: HTMLElement;
    nameEl: HTMLElement;
    descEl: HTMLElement;

    constructor(containerEl: HTMLElement) {
        this.settingEl = document.createElement('div');
        this.nameEl = document.createElement('div');
        this.descEl = document.createElement('div');
        containerEl.appendChild(this.settingEl);
    }

    setName(_name: string): this { return this; }
    setDesc(_desc: string | DocumentFragment): this { return this; }
    setHeading(): this { return this; }
    addText(cb: (text: any) => void): this {
        const text = {
            setPlaceholder: vi.fn().mockReturnThis(),
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis(),
            inputEl: document.createElement('input'),
        };
        cb(text);
        return this;
    }
    addToggle(cb: (toggle: any) => void): this {
        const toggle = {
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis(),
        };
        cb(toggle);
        return this;
    }
    addDropdown(cb: (dropdown: any) => void): this {
        const dropdown = {
            addOption: vi.fn().mockReturnThis(),
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis(),
        };
        cb(dropdown);
        return this;
    }
    addButton(cb: (button: any) => void): this {
        const button = {
            setButtonText: vi.fn().mockReturnThis(),
            setCta: vi.fn().mockReturnThis(),
            onClick: vi.fn().mockReturnThis(),
            buttonEl: document.createElement('button'),
        };
        cb(button);
        return this;
    }
}

// ─── Views ──────────────────────────────────────────────────────

export class ItemView {
    app: any;
    contentEl: HTMLElement;
    containerEl: HTMLElement;

    constructor() {
        this.contentEl = document.createElement('div');
        this.containerEl = document.createElement('div');
    }

    getViewType(): string { return ''; }
    getDisplayText(): string { return ''; }
    getIcon(): string { return ''; }
}

export class MarkdownView {
    file: TFile | null = null;
}

// ─── Utility Functions ──────────────────────────────────────────

/**
 * Mock debounce — executes the function immediately with no delay.
 * This lets tests exercise debounced handlers synchronously.
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    _delay?: number,
    _immediate?: boolean
): T {
    return fn;
}

/** Identity function — in real Obsidian, normalizes path separators. */
export function normalizePath(path: string): string {
    return path;
}

/** Mock AbstractInputSuggest for FolderSuggest. */
export class AbstractInputSuggest<T> {
    app: any;
    protected inputEl: HTMLInputElement;

    constructor(app: any, inputEl: HTMLInputElement) {
        this.app = app;
        this.inputEl = inputEl;
    }

    close(): void { }
    getSuggestions(_query: string): T[] { return []; }
    renderSuggestion(_value: T, _el: HTMLElement): void { }
    selectSuggestion(_value: T): void { }
}

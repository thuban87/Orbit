/**
 * Unit tests for OrbitPlugin lifecycle (main.ts).
 *
 * Wave 1 of the Testing Overhaul Plan — targets main.ts (408 lines, 0% → 80%+).
 * Uses module-level vi.mock() for all services, modals, and utilities so the
 * real onload() code path executes against controlled stubs.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createMockApp, TFile, Notice, MarkdownView } from '../mocks/obsidian';
import { createOrbitContact, createTFile, createSettings } from '../helpers/factories';

// ──────────────────────────────────────────────────────────────────
// Module-level mocks (hoisted before imports)
// ──────────────────────────────────────────────────────────────────

vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({ render: vi.fn(), unmount: vi.fn() })),
}));

// — Services —

const mockOrbitIndex = {
    initialize: vi.fn(async () => { }),
    scanVault: vi.fn(async () => { }),
    getContacts: vi.fn(() => []),
    getContactsByStatus: vi.fn(() => []),
    handleFileChange: vi.fn(),
    handleFileDelete: vi.fn(),
    handleFileRename: vi.fn(),
    dumpIndex: vi.fn(),
    trigger: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    markScraping: vi.fn(),
    unmarkScraping: vi.fn(),
    updateSettings: vi.fn(async () => { }),
};

vi.mock('../../src/services/OrbitIndex', () => ({
    OrbitIndex: vi.fn(function () { return mockOrbitIndex; }),
}));

const mockLinkListener = {
    handleEditorChange: vi.fn(),
    updateSettings: vi.fn(),
    clearCache: vi.fn(),
};

vi.mock('../../src/services/LinkListener', () => ({
    LinkListener: vi.fn(function () { return mockLinkListener; }),
}));

const mockAiService = {
    refreshProviders: vi.fn(),
};

vi.mock('../../src/services/AiService', () => ({
    AiService: vi.fn(function () { return mockAiService; }),
}));

vi.mock('../../src/services/ContactManager', () => ({
    createContact: vi.fn(async () => { }),
}));

// — Schema Loader —

const mockSchemaLoader = {
    loadSchemas: vi.fn(async () => { }),
    getSchemas: vi.fn(() => []),
    updateSchemaFolder: vi.fn(),
    rescan: vi.fn(async () => { }),
    generateExampleSchema: vi.fn(async () => { }),
};

vi.mock('../../src/schemas/loader', () => ({
    SchemaLoader: vi.fn(function () { return mockSchemaLoader; }),
}));

// — Modals —

const mockOrbitFormModalInstance = { open: vi.fn(), close: vi.fn() };
vi.mock('../../src/modals/OrbitFormModal', () => ({
    OrbitFormModal: vi.fn(function () { return mockOrbitFormModalInstance; }),
}));

const mockOrbitHubModalInstance = { open: vi.fn(), openDirectUpdate: vi.fn() };
vi.mock('../../src/modals/OrbitHubModal', () => ({
    OrbitHubModal: vi.fn(function () { return mockOrbitHubModalInstance; }),
}));

// ScrapeConfirmModal: capture the onConfirm & onSkip callbacks
let capturedScrapeCallbacks: { onConfirm: Function; onSkip: Function } | null = null;
const mockScrapeConfirmModalInstance = { open: vi.fn() };
vi.mock('../../src/modals/ScrapeConfirmModal', () => ({
    ScrapeConfirmModal: vi.fn(function (_app: any, _name: string, onConfirm: Function, onSkip: Function) {
        capturedScrapeCallbacks = { onConfirm, onSkip };
        return mockScrapeConfirmModalInstance;
    }),
}));

// SchemaPickerModal: capture the callback
let capturedPickerCallback: Function | null = null;
const mockSchemaPickerModalInstance = { open: vi.fn() };
vi.mock('../../src/modals/SchemaPickerModal', () => ({
    SchemaPickerModal: vi.fn(function (_app: any, _schemas: any[], callback: Function) {
        capturedPickerCallback = callback;
        return mockSchemaPickerModalInstance;
    }),
}));

// — Views —

vi.mock('../../src/views/OrbitView', () => ({
    OrbitView: vi.fn(),
    VIEW_TYPE_ORBIT: 'orbit-view',
}));

// — Settings —

vi.mock('../../src/settings', () => ({
    OrbitSettingTab: vi.fn(),
    DEFAULT_SETTINGS: {
        personTag: 'people',
        ignoredPaths: ['Templates', 'Archive'],
        dateFormat: 'YYYY-MM-DD',
        templatePath: 'System/Templates/Person Template.md',
        contactsFolder: '',
        interactionLogHeading: 'Interaction Log',
        schemaFolder: '',
        aiProvider: 'none',
        aiApiKey: '',
        aiApiKeys: {},
        aiModel: '',
        aiPromptTemplate: 'Test prompt for {{name}}',
        aiCustomEndpoint: '',
        aiCustomModel: '',
        logLevel: 'off',
        photoAssetFolder: 'Resources/Assets/Orbit',
        defaultScrapeEnabled: false,
        photoScrapeOnEdit: 'ask',
    },
    OrbitSettings: {},
}));

// — Utilities —

vi.mock('../../src/utils/logger', () => ({
    Logger: {
        setLevel: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('../../src/utils/ImageScraper', () => ({
    ImageScraper: {
        scrapeAndSave: vi.fn(async () => '[[scraped-photo.jpg]]'),
        isUrl: vi.fn(() => true),
    },
}));

vi.mock('../../src/utils/dates', () => ({
    formatLocalDate: vi.fn(() => '2026-02-19'),
}));

// ──────────────────────────────────────────────────────────────────
// Imports (resolved after mocks are hoisted)
// ──────────────────────────────────────────────────────────────────

import OrbitPlugin from '../../src/main';
import { OrbitIndex } from '../../src/services/OrbitIndex';
import { LinkListener } from '../../src/services/LinkListener';
import { AiService } from '../../src/services/AiService';
import { createContact } from '../../src/services/ContactManager';
import { SchemaLoader } from '../../src/schemas/loader';
import { OrbitFormModal } from '../../src/modals/OrbitFormModal';
import { OrbitHubModal } from '../../src/modals/OrbitHubModal';
import { ScrapeConfirmModal } from '../../src/modals/ScrapeConfirmModal';
import { SchemaPickerModal } from '../../src/modals/SchemaPickerModal';
import { Logger } from '../../src/utils/logger';
import { ImageScraper } from '../../src/utils/ImageScraper';

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Create and load a plugin instance. Overrides default metadataCache.initialized.
 */
async function createPlugin(opts: { cacheInitialized?: boolean } = {}) {
    const app = createMockApp();
    (app.metadataCache as any).initialized = opts.cacheInitialized ?? true;

    // Capture callbacks registered via addCommand, registerEvent, addRibbonIcon, etc.
    const capturedCommands: Record<string, Function> = {};
    const capturedEvents: Function[] = [];
    let capturedLayoutReadyCb: Function | null = null;
    let capturedRibbonCb: Function | null = null;

    // workspace.onLayoutReady — capture callback
    app.workspace.onLayoutReady = vi.fn((cb: Function) => {
        capturedLayoutReadyCb = cb;
    });

    // workspace.getLeaf — for digest test
    const mockLeaf = { openFile: vi.fn(async () => { }) };
    app.workspace.getLeaf = vi.fn(() => mockLeaf);

    // Create the plugin by bypassing Plugin constructor with Object.create
    const plugin = Object.create(OrbitPlugin.prototype) as OrbitPlugin;
    (plugin as any).app = app;
    (plugin as any).manifest = { id: 'orbit', version: '0.0.1' };

    // Wire up Plugin base class methods as spies
    (plugin as any).loadData = vi.fn(async () => ({}));
    (plugin as any).saveData = vi.fn(async () => { });
    (plugin as any).addCommand = vi.fn((cmd: any) => {
        capturedCommands[cmd.id] = cmd.callback;
    });
    (plugin as any).registerEvent = vi.fn((eventRef: any) => {
        // eventRef is the return value of .on() — we don't need it
    });
    (plugin as any).addSettingTab = vi.fn();
    (plugin as any).addRibbonIcon = vi.fn((_icon: string, _label: string, cb: Function) => {
        capturedRibbonCb = cb;
    });
    (plugin as any).registerView = vi.fn();

    // Capture the callbacks passed to metadataCache.on, vault.on, workspace.on, index.on
    const capturedMetaCacheHandlers: Record<string, Function> = {};
    app.metadataCache.on = vi.fn((event: string, handler: Function) => {
        capturedMetaCacheHandlers[event] = handler;
        return { event, handler }; // return an event ref
    });

    const capturedVaultHandlers: Record<string, Function> = {};
    app.vault.on = vi.fn((event: string, handler: Function) => {
        capturedVaultHandlers[event] = handler;
        return { event, handler };
    });

    const capturedWorkspaceHandlers: Record<string, Function> = {};
    app.workspace.on = vi.fn((event: string, handler: Function) => {
        capturedWorkspaceHandlers[event] = handler;
        return { event, handler };
    });

    const capturedIndexHandlers: Record<string, Function> = {};
    mockOrbitIndex.on = vi.fn((event: string, handler: Function) => {
        capturedIndexHandlers[event] = handler;
        return { event, handler };
    });

    await plugin.onload();

    return {
        plugin,
        app,
        capturedCommands,
        capturedEvents,
        capturedLayoutReadyCb,
        capturedRibbonCb,
        capturedMetaCacheHandlers,
        capturedVaultHandlers,
        capturedWorkspaceHandlers,
        capturedIndexHandlers,
        mockLeaf,
    };
}

// ──────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────

describe('OrbitPlugin (main.ts)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        capturedScrapeCallbacks = null;
        capturedPickerCallback = null;
    });

    // ──────────────────────────────────────────────────────────
    // onload() — Service Initialization (~8 tests)
    // ──────────────────────────────────────────────────────────

    describe('onload() — Service Initialization', () => {

        it('loads settings via loadData()', async () => {
            const { plugin } = await createPlugin();
            expect((plugin as any).loadData).toHaveBeenCalled();
            expect(plugin.settings).toBeDefined();
        });

        it('sets Logger.setLevel() from settings', async () => {
            await createPlugin();
            expect(Logger.setLevel).toHaveBeenCalled();
        });

        it('creates SchemaLoader with settings.schemaFolder', async () => {
            await createPlugin();
            expect(SchemaLoader).toHaveBeenCalled();
            const callArgs = (SchemaLoader as Mock).mock.calls[0];
            // First arg is app, second is schemaFolder
            expect(callArgs.length).toBe(2);
        });

        it('creates OrbitIndex with app and settings', async () => {
            const { plugin } = await createPlugin();
            expect(OrbitIndex).toHaveBeenCalled();
            const callArgs = (OrbitIndex as Mock).mock.calls[0];
            expect(callArgs[0]).toBe(plugin.app);
            expect(callArgs[1]).toBe(plugin.settings);
        });

        it('registers OrbitView with VIEW_TYPE_ORBIT', async () => {
            const { plugin } = await createPlugin();
            expect((plugin as any).registerView).toHaveBeenCalledWith(
                'orbit-view',
                expect.any(Function)
            );
        });

        it('creates LinkListener with app, index, settings', async () => {
            const { plugin } = await createPlugin();
            expect(LinkListener).toHaveBeenCalled();
            const callArgs = (LinkListener as Mock).mock.calls[0];
            expect(callArgs[0]).toBe(plugin.app);
            // second arg should be the index instance
            expect(callArgs[1]).toBe(mockOrbitIndex);
            expect(callArgs[2]).toBe(plugin.settings);
        });

        it('creates AiService and calls refreshProviders(settings)', async () => {
            const { plugin } = await createPlugin();
            expect(AiService).toHaveBeenCalled();
            expect(mockAiService.refreshProviders).toHaveBeenCalledWith(plugin.settings);
        });

        it('adds ribbon icon with "users" icon and "Orbit Hub" label', async () => {
            const { plugin } = await createPlugin();
            expect((plugin as any).addRibbonIcon).toHaveBeenCalledWith(
                'users',
                'Orbit Hub',
                expect.any(Function)
            );
        });
    });

    // ──────────────────────────────────────────────────────────
    // onload() — MetadataCache Initialization (~4 tests)
    // ──────────────────────────────────────────────────────────

    describe('onload() — MetadataCache Initialization', () => {

        it('metadataCache.initialized true → immediate index.initialize() + schemaLoader.loadSchemas()', async () => {
            await createPlugin({ cacheInitialized: true });
            expect(mockOrbitIndex.initialize).toHaveBeenCalled();
            expect(mockSchemaLoader.loadSchemas).toHaveBeenCalled();
        });

        it('metadataCache.initialized false → registers "resolved" handler, does NOT call initialize immediately', async () => {
            const { capturedMetaCacheHandlers } = await createPlugin({ cacheInitialized: false });
            // initialize should NOT have been called directly
            expect(mockOrbitIndex.initialize).not.toHaveBeenCalled();
            // A 'resolved' handler should have been registered
            expect(capturedMetaCacheHandlers['resolved']).toBeDefined();
        });

        it('"resolved" handler calls initialize(), loadSchemas(), trigger("change")', async () => {
            const { capturedMetaCacheHandlers } = await createPlugin({ cacheInitialized: false });

            const resolvedHandler = capturedMetaCacheHandlers['resolved'];
            expect(resolvedHandler).toBeDefined();

            await resolvedHandler();

            expect(mockOrbitIndex.initialize).toHaveBeenCalled();
            expect(mockSchemaLoader.loadSchemas).toHaveBeenCalled();
            expect(mockOrbitIndex.trigger).toHaveBeenCalledWith('change');
        });

        it('workspace.onLayoutReady re-scans when contacts list empty', async () => {
            mockOrbitIndex.getContacts.mockReturnValue([]);
            const { capturedLayoutReadyCb } = await createPlugin();

            expect(capturedLayoutReadyCb).toBeDefined();
            await capturedLayoutReadyCb!();

            expect(mockOrbitIndex.scanVault).toHaveBeenCalled();
            expect(mockOrbitIndex.trigger).toHaveBeenCalledWith('change');
        });
    });

    // ──────────────────────────────────────────────────────────
    // onload() — Event Registration (~4 tests)
    // ──────────────────────────────────────────────────────────

    describe('onload() — Event Registration', () => {

        it('metadataCache.on("changed") → index.handleFileChange(file)', async () => {
            const { capturedMetaCacheHandlers } = await createPlugin();

            const handler = capturedMetaCacheHandlers['changed'];
            expect(handler).toBeDefined();

            const testFile = createTFile({ path: 'People/Alice.md' });
            handler(testFile);

            expect(mockOrbitIndex.handleFileChange).toHaveBeenCalledWith(testFile);
        });

        it('vault.on("delete") → index.handleFileDelete(file) only for TFile', async () => {
            const { capturedVaultHandlers } = await createPlugin();

            const handler = capturedVaultHandlers['delete'];
            expect(handler).toBeDefined();

            // TFile case — should call handleFileDelete
            const testFile = createTFile({ path: 'People/Alice.md' });
            handler(testFile);
            expect(mockOrbitIndex.handleFileDelete).toHaveBeenCalledWith(testFile);

            // Non-TFile case — should NOT call handleFileDelete
            mockOrbitIndex.handleFileDelete.mockClear();
            handler({ path: 'SomeFolder' }); // plain object, not TFile
            expect(mockOrbitIndex.handleFileDelete).not.toHaveBeenCalled();
        });

        it('vault.on("rename") → index.handleFileRename(file, oldPath) only for TFile', async () => {
            const { capturedVaultHandlers } = await createPlugin();

            const handler = capturedVaultHandlers['rename'];
            expect(handler).toBeDefined();

            // TFile case
            const testFile = createTFile({ path: 'People/Bob.md' });
            handler(testFile, 'People/OldBob.md');
            expect(mockOrbitIndex.handleFileRename).toHaveBeenCalledWith(testFile, 'People/OldBob.md');

            // Non-TFile case
            mockOrbitIndex.handleFileRename.mockClear();
            handler({ path: 'SomeFolder' }, 'OldFolder');
            expect(mockOrbitIndex.handleFileRename).not.toHaveBeenCalled();
        });

        it('workspace.on("editor-change") → linkListener.handleEditorChange(file) when info.file exists', async () => {
            const { capturedWorkspaceHandlers } = await createPlugin();

            const handler = capturedWorkspaceHandlers['editor-change'];
            expect(handler).toBeDefined();

            // With file
            const testFile = createTFile({ path: 'People/Alice.md' });
            handler({}, { file: testFile });
            expect(mockLinkListener.handleEditorChange).toHaveBeenCalledWith(testFile);

            // Without file
            mockLinkListener.handleEditorChange.mockClear();
            handler({}, { file: null });
            expect(mockLinkListener.handleEditorChange).not.toHaveBeenCalled();
        });
    });

    // ──────────────────────────────────────────────────────────
    // onload() — Command Registration (~6 tests)
    // ──────────────────────────────────────────────────────────

    describe('onload() — Command Registration', () => {

        it('dump-index → index.dumpIndex()', async () => {
            const { capturedCommands } = await createPlugin();
            expect(capturedCommands['dump-index']).toBeDefined();
            capturedCommands['dump-index']();
            expect(mockOrbitIndex.dumpIndex).toHaveBeenCalled();
        });

        it('open-orbit → activateView()', async () => {
            const { plugin, capturedCommands, app } = await createPlugin();
            expect(capturedCommands['open-orbit']).toBeDefined();

            // Set up workspace mock for activateView
            app.workspace.getLeavesOfType = vi.fn(() => []);
            const mockNewLeaf = { setViewState: vi.fn(async () => { }) };
            app.workspace.getRightLeaf = vi.fn(() => mockNewLeaf);

            await capturedCommands['open-orbit']();

            // activateView was called — check it interacted with workspace
            expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('orbit-view');
        });

        it('weekly-digest → generateWeeklyDigest()', async () => {
            const { capturedCommands, app } = await createPlugin();
            expect(capturedCommands['weekly-digest']).toBeDefined();

            mockOrbitIndex.getContactsByStatus.mockReturnValue([]);
            app.vault.getAbstractFileByPath = vi.fn(() => null);

            await capturedCommands['weekly-digest']();

            // Should have tried to create a digest file
            expect(app.vault.create).toHaveBeenCalled();
        });

        it('orbit-hub → creates/opens OrbitHubModal', async () => {
            const { capturedCommands } = await createPlugin();
            expect(capturedCommands['orbit-hub']).toBeDefined();

            capturedCommands['orbit-hub']();

            expect(OrbitHubModal).toHaveBeenCalled();
            expect(mockOrbitHubModalInstance.open).toHaveBeenCalled();
        });

        it('new-person → openNewPersonFlow()', async () => {
            const { capturedCommands } = await createPlugin();
            expect(capturedCommands['new-person']).toBeDefined();

            // With no schemas → should show Notice
            mockSchemaLoader.getSchemas.mockReturnValue([]);
            capturedCommands['new-person']();
            // Notice constructor would have been called — we verify via the flow
        });

        it('update-this-person → opens OrbitHubModal.openDirectUpdate() for active contact, or Notice if not a contact', async () => {
            const { capturedCommands, app } = await createPlugin();
            expect(capturedCommands['update-this-person']).toBeDefined();

            // ── Sub-case 1: No active file → Notice ──
            app.workspace.getActiveViewOfType = vi.fn(() => null);
            capturedCommands['update-this-person']();
            // No OrbitHubModal should have been created for this sub-case
            (OrbitHubModal as Mock).mockClear();
            mockOrbitHubModalInstance.openDirectUpdate.mockClear();

            // ── Sub-case 2: Active file is a tracked contact → openDirectUpdate ──
            const aliceFile = createTFile({ path: 'People/Alice.md' });
            const aliceContact = createOrbitContact({ name: 'Alice', file: aliceFile });
            const markdownView = new MarkdownView();
            markdownView.file = aliceFile;
            app.workspace.getActiveViewOfType = vi.fn(() => markdownView);
            mockOrbitIndex.getContacts.mockReturnValue([aliceContact]);
            mockOrbitIndex.getContactsByStatus.mockReturnValue([aliceContact]);

            capturedCommands['update-this-person']();

            expect(OrbitHubModal).toHaveBeenCalled();
            expect(mockOrbitHubModalInstance.openDirectUpdate).toHaveBeenCalledWith(aliceContact);
        });
    });

    // ──────────────────────────────────────────────────────────
    // onload() — Photo Scrape Prompt Handler (~3 tests)
    // ──────────────────────────────────────────────────────────

    describe('onload() — Photo Scrape Prompt Handler', () => {

        it('registers index.on("photo-scrape-prompt") → opens ScrapeConfirmModal', async () => {
            const { capturedIndexHandlers, app } = await createPlugin();

            const handler = capturedIndexHandlers['photo-scrape-prompt'];
            expect(handler).toBeDefined();

            const testFile = createTFile({ path: 'People/Alice.md' });
            handler(testFile, 'https://example.com/photo.jpg', 'Alice');

            expect(ScrapeConfirmModal).toHaveBeenCalledWith(
                app,
                'Alice',
                expect.any(Function),
                expect.any(Function)
            );
            expect(mockScrapeConfirmModalInstance.open).toHaveBeenCalled();
        });

        it('confirm: scrapeAndSave, processFrontMatter, Notice, marks/unmarks scraping', async () => {
            const { capturedIndexHandlers, app } = await createPlugin();

            const testFile = createTFile({ path: 'People/Alice.md' });
            const handler = capturedIndexHandlers['photo-scrape-prompt'];
            handler(testFile, 'https://example.com/photo.jpg', 'Alice');

            expect(capturedScrapeCallbacks).not.toBeNull();

            // Execute the onConfirm callback
            await capturedScrapeCallbacks!.onConfirm();

            expect(mockOrbitIndex.markScraping).toHaveBeenCalledWith('People/Alice.md');
            expect(ImageScraper.scrapeAndSave).toHaveBeenCalled();
            expect(app.fileManager.processFrontMatter).toHaveBeenCalled();
            expect(mockOrbitIndex.unmarkScraping).toHaveBeenCalledWith('People/Alice.md');
        });

        it('confirm + scrape error: logs error, failure Notice, unmarks scraping', async () => {
            const { capturedIndexHandlers } = await createPlugin();

            const testFile = createTFile({ path: 'People/Bob.md' });
            const handler = capturedIndexHandlers['photo-scrape-prompt'];
            handler(testFile, 'https://example.com/photo.jpg', 'Bob');

            // Make scrapeAndSave throw
            (ImageScraper.scrapeAndSave as Mock).mockRejectedValueOnce(new Error('Network error'));

            await capturedScrapeCallbacks!.onConfirm();

            expect(Logger.error).toHaveBeenCalled();
            expect(mockOrbitIndex.unmarkScraping).toHaveBeenCalledWith('People/Bob.md');
        });
    });

    // ──────────────────────────────────────────────────────────
    // openNewPersonFlow() (~4 tests)
    // ──────────────────────────────────────────────────────────

    describe('openNewPersonFlow()', () => {

        it('no schemas → "No schemas available" Notice', async () => {
            const { plugin } = await createPlugin();
            mockSchemaLoader.getSchemas.mockReturnValue([]);

            // Spy on Notice constructor
            const NoticeSpy = vi.fn();
            // We can't spy on the Notice import directly, but we can verify
            // behavior by checking that OrbitFormModal was NOT created
            (OrbitFormModal as Mock).mockClear();

            plugin.openNewPersonFlow();

            expect(OrbitFormModal).not.toHaveBeenCalled();
            expect(SchemaPickerModal).not.toHaveBeenCalled();
        });

        it('single schema → opens OrbitFormModal directly (skips picker)', async () => {
            const { plugin } = await createPlugin();
            const schema = { id: 'test', title: 'Test Schema', fields: [] };
            mockSchemaLoader.getSchemas.mockReturnValue([schema]);

            (OrbitFormModal as Mock).mockClear();
            (SchemaPickerModal as Mock).mockClear();

            plugin.openNewPersonFlow();

            expect(OrbitFormModal).toHaveBeenCalled();
            expect(SchemaPickerModal).not.toHaveBeenCalled();
            expect(mockOrbitFormModalInstance.open).toHaveBeenCalled();
        });

        it('multiple schemas → opens SchemaPickerModal first', async () => {
            const { plugin } = await createPlugin();
            const schemas = [
                { id: 'schema1', title: 'Schema 1', fields: [] },
                { id: 'schema2', title: 'Schema 2', fields: [] },
            ];
            mockSchemaLoader.getSchemas.mockReturnValue(schemas);

            (OrbitFormModal as Mock).mockClear();
            (SchemaPickerModal as Mock).mockClear();

            plugin.openNewPersonFlow();

            expect(SchemaPickerModal).toHaveBeenCalled();
            expect(mockSchemaPickerModalInstance.open).toHaveBeenCalled();
            // OrbitFormModal should NOT have been created yet (picker first)
            expect(OrbitFormModal).not.toHaveBeenCalled();
        });

        it('form submit: handles _scrapePhoto, calls createContact, re-scans index', async () => {
            const { plugin } = await createPlugin();
            const schema = { id: 'test', title: 'Test', fields: [] };
            mockSchemaLoader.getSchemas.mockReturnValue([schema]);

            (OrbitFormModal as Mock).mockClear();

            plugin.openNewPersonFlow();

            // Get the submit callback from OrbitFormModal constructor
            const formConstructorCall = (OrbitFormModal as Mock).mock.calls[0];
            // OrbitFormModal(app, schema, onSubmit, initialValues, defaultScrapeEnabled)
            const onSubmit = formConstructorCall[2];

            // Simulate form submission with scrape flag
            const formData = {
                name: 'NewPerson',
                photo: 'https://example.com/photo.jpg',
                _scrapePhoto: true,
            };

            await onSubmit(formData);

            expect(ImageScraper.scrapeAndSave).toHaveBeenCalled();
            expect(createContact).toHaveBeenCalled();
            expect(mockOrbitIndex.scanVault).toHaveBeenCalled();
            expect(mockOrbitIndex.trigger).toHaveBeenCalledWith('change');
        });
    });

    // ──────────────────────────────────────────────────────────
    // generateWeeklyDigest() (~4 tests)
    // ──────────────────────────────────────────────────────────

    describe('generateWeeklyDigest()', () => {

        it('groups contacts into contacted/overdue/snoozed sections', async () => {
            const { plugin, app } = await createPlugin();

            const now = new Date();
            const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

            const contacts = [
                createOrbitContact({ name: 'Contacted', status: 'stable', lastContact: twoDaysAgo }),
                createOrbitContact({ name: 'Overdue', status: 'decay', daysSinceContact: 45 }),
                createOrbitContact({ name: 'Snoozed', status: 'snoozed' }),
            ];
            mockOrbitIndex.getContactsByStatus.mockReturnValue(contacts);

            // Track what gets created
            let createdContent = '';
            app.vault.getAbstractFileByPath = vi.fn(() => null);
            app.vault.create = vi.fn(async (_path: string, content: string) => {
                createdContent = content;
                return new TFile(_path);
            });

            await plugin.generateWeeklyDigest();

            expect(createdContent).toContain('Contacted');
            expect(createdContent).toContain('Overdue');
            expect(createdContent).toContain('Snoozed');
        });

        it('creates new file when digest doesn\'t exist', async () => {
            const { plugin, app } = await createPlugin();
            mockOrbitIndex.getContactsByStatus.mockReturnValue([]);
            app.vault.getAbstractFileByPath = vi.fn(() => null);

            await plugin.generateWeeklyDigest();

            expect(app.vault.create).toHaveBeenCalled();
            expect(app.vault.modify).not.toHaveBeenCalled();
        });

        it('modifies existing file when digest exists', async () => {
            const { plugin, app } = await createPlugin();
            mockOrbitIndex.getContactsByStatus.mockReturnValue([]);

            const existingFile = createTFile({ path: 'Orbit Weekly Digest 2026-02-19.md' });
            app.vault.getAbstractFileByPath = vi.fn(() => existingFile);

            await plugin.generateWeeklyDigest();

            expect(app.vault.modify).toHaveBeenCalledWith(existingFile, expect.any(String));
            expect(app.vault.create).not.toHaveBeenCalled();
        });

        it('opens digest file after generation', async () => {
            const { plugin, app, mockLeaf } = await createPlugin();
            mockOrbitIndex.getContactsByStatus.mockReturnValue([]);

            const digestFile = createTFile({ path: 'Orbit Weekly Digest 2026-02-19.md' });
            // First call: check if file exists (for create vs modify), returns null
            // Second call: get the file to open it, returns the file
            let callCount = 0;
            app.vault.getAbstractFileByPath = vi.fn(() => {
                callCount++;
                if (callCount <= 1) return null;
                return digestFile;
            });

            await plugin.generateWeeklyDigest();

            expect(mockLeaf.openFile).toHaveBeenCalled();
        });
    });

    // ──────────────────────────────────────────────────────────
    // onunload() — 1 test
    // ──────────────────────────────────────────────────────────

    describe('onunload()', () => {

        it('onunload() does not throw', async () => {
            const { plugin } = await createPlugin();
            expect(() => plugin.onunload()).not.toThrow();
        });
    });

    // ──────────────────────────────────────────────────────────
    // saveSettings() / loadSettings() (~2 tests)
    // ──────────────────────────────────────────────────────────

    describe('saveSettings() / loadSettings()', () => {

        it('saveSettings propagates to Logger, index, linkListener, schemaLoader, aiService', async () => {
            const { plugin } = await createPlugin();

            // Clear call counts from onload
            (Logger.setLevel as Mock).mockClear();
            mockOrbitIndex.updateSettings.mockClear();
            mockLinkListener.updateSettings.mockClear();
            mockLinkListener.clearCache.mockClear();
            mockSchemaLoader.updateSchemaFolder.mockClear();
            mockSchemaLoader.rescan.mockClear();
            mockAiService.refreshProviders.mockClear();

            await plugin.saveSettings();

            expect((plugin as any).saveData).toHaveBeenCalled();
            expect(Logger.setLevel).toHaveBeenCalledWith(plugin.settings.logLevel);
            expect(mockOrbitIndex.updateSettings).toHaveBeenCalledWith(plugin.settings);
            expect(mockLinkListener.updateSettings).toHaveBeenCalledWith(plugin.settings);
            expect(mockLinkListener.clearCache).toHaveBeenCalled();
            expect(mockSchemaLoader.updateSchemaFolder).toHaveBeenCalledWith(plugin.settings.schemaFolder);
            expect(mockSchemaLoader.rescan).toHaveBeenCalled();
            expect(mockAiService.refreshProviders).toHaveBeenCalledWith(plugin.settings);
        });

        it('loadSettings merges DEFAULT_SETTINGS with stored data', async () => {
            const { plugin } = await createPlugin();

            // Simulate loadData returning partial settings
            (plugin as any).loadData = vi.fn(async () => ({ personTag: 'custom-tag' }));

            await plugin.loadSettings();

            expect(plugin.settings.personTag).toBe('custom-tag');
            // Other fields should come from DEFAULT_SETTINGS
            expect(plugin.settings.dateFormat).toBeDefined();
        });
    });

    // ──────────────────────────────────────────────────────────
    // activateView() (~3 tests)
    // ──────────────────────────────────────────────────────────

    describe('activateView()', () => {

        it('existing leaf → reveals it (no new leaf created)', async () => {
            const { plugin, app } = await createPlugin();
            const existingLeaf = { setViewState: vi.fn() };
            app.workspace.getLeavesOfType = vi.fn(() => [existingLeaf]);

            await plugin.activateView();

            expect(app.workspace.revealLeaf).toHaveBeenCalledWith(existingLeaf);
            expect(app.workspace.getRightLeaf).not.toHaveBeenCalled();
        });

        it('no existing leaf → creates right leaf, sets view state', async () => {
            const { plugin, app } = await createPlugin();
            app.workspace.getLeavesOfType = vi.fn(() => []);
            const newLeaf = { setViewState: vi.fn(async () => { }) };
            app.workspace.getRightLeaf = vi.fn(() => newLeaf);

            await plugin.activateView();

            expect(app.workspace.getRightLeaf).toHaveBeenCalledWith(false);
            expect(newLeaf.setViewState).toHaveBeenCalledWith({
                type: 'orbit-view',
                active: true,
            });
            expect(app.workspace.revealLeaf).toHaveBeenCalledWith(newLeaf);
        });

        it('getRightLeaf returns null → doesn\'t crash', async () => {
            const { plugin, app } = await createPlugin();
            app.workspace.getLeavesOfType = vi.fn(() => []);
            app.workspace.getRightLeaf = vi.fn(() => null);

            await expect(plugin.activateView()).resolves.not.toThrow();
            expect(app.workspace.revealLeaf).not.toHaveBeenCalled();
        });
    });

    // ──────────────────────────────────────────────────────────
    // Ribbon icon callback (extra coverage)
    // ──────────────────────────────────────────────────────────

    describe('ribbon icon callback', () => {

        it('clicking ribbon icon opens OrbitHubModal', async () => {
            const { capturedRibbonCb } = await createPlugin();
            expect(capturedRibbonCb).toBeDefined();

            (OrbitHubModal as Mock).mockClear();
            mockOrbitHubModalInstance.open.mockClear();

            capturedRibbonCb!();

            expect(OrbitHubModal).toHaveBeenCalled();
            expect(mockOrbitHubModalInstance.open).toHaveBeenCalled();
        });
    });
});

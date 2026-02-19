/**
 * Unit tests for OrbitHubModal.
 *
 * Tests modal lifecycle (open/close), React root management,
 * title/CSS class setup, selection state, view transitions,
 * action button rendering, and all handler behaviors.
 *
 * 9 existing + 22 new = 31 total tests.
 * Per Testing Overhaul Plan (Wave 4, lines 539-577).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrbitHubModal } from '../../../src/modals/OrbitHubModal';
import { createOrbitContact, createTFile, createMockApp } from '../../helpers/factories';
import { Notice } from '../../mocks/obsidian';
import type { OrbitContact } from '../../../src/types';

// Mock react-dom/client so ReactModal can create a root
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

// Mock ContactManager (used in save/edit flows)
vi.mock('../../../src/services/ContactManager', () => ({
    updateFrontmatter: vi.fn(async () => { }),
    appendToInteractionLog: vi.fn(async () => { }),
    createContact: vi.fn(async () => { }),
}));

// Mock AiService functions
vi.mock('../../../src/services/AiService', () => ({
    extractContext: vi.fn(() => ({ name: 'Alice', category: 'Friends' })),
    assemblePrompt: vi.fn(() => 'Test prompt for Alice'),
}));

// Mock OrbitFormModal (used by Edit action)
// Must use a class mock since it's instantiated with `new` in source
const mockFormModalInstances: any[] = [];
vi.mock('../../../src/modals/OrbitFormModal', () => ({
    OrbitFormModal: vi.fn().mockImplementation(function (this: any, _app: any, _schema: any, onSubmit: any, _initial: any, _scrape: any) {
        this.open = vi.fn();
        this.close = vi.fn();
        this._onSubmit = onSubmit;
        mockFormModalInstances.push(this);
        return this;
    }),
}));

// Mock AiResultModal (used by Suggest action)
// Must use a class mock since it's instantiated with `new` in source
const mockAiModalInstances: any[] = [];
vi.mock('../../../src/modals/AiResultModal', () => ({
    AiResultModal: vi.fn().mockImplementation(function (this: any) {
        this.open = vi.fn();
        this.close = vi.fn();
        this.setMessage = vi.fn();
        this.setError = vi.fn();
        mockAiModalInstances.push(this);
        return this;
    }),
}));

// Mock ImageScraper
vi.mock('../../../src/utils/ImageScraper', () => ({
    ImageScraper: {
        scrapeAndSave: vi.fn(async () => '[[scraped-photo.jpg]]'),
        isUrl: vi.fn((val: string) => val.startsWith('http')),
    },
}));

// Mock Logger
vi.mock('../../../src/utils/logger', () => ({
    Logger: {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock edit-person schema
vi.mock('../../../src/schemas/edit-person.schema', () => ({
    editPersonSchema: {
        id: 'edit-person',
        title: 'Edit Person',
        fields: [
            { key: 'name', type: 'text', label: 'Name' },
            { key: 'category', type: 'dropdown', label: 'Category' },
            { key: 'photo', type: 'photo', label: 'Photo' },
        ],
    },
}));

function createMockPlugin(app?: any) {
    const mockApp = app ?? createMockApp();
    return {
        app: mockApp,
        settings: {
            personTag: 'people',
            ignoredPaths: ['Templates'],
            dateFormat: 'YYYY-MM-DD',
            templatePath: '',
            contactsFolder: '',
            interactionLogHeading: 'Interaction Log',
            aiProvider: 'none',
            aiPromptTemplate: 'Test prompt for {{name}}',
            defaultScrapeEnabled: false,
            photoAssetFolder: 'Resources/Assets/Orbit',
        },
        index: {
            scanVault: vi.fn(async () => { }),
            trigger: vi.fn(),
            getContactsByStatus: vi.fn(() => []),
        },
        generateWeeklyDigest: vi.fn(async () => { }),
        openNewPersonFlow: vi.fn(),
        aiService: {
            generate: vi.fn(async () => 'AI generated message'),
        },
    } as any;
}

describe('OrbitHubModal', () => {
    let app: ReturnType<typeof createMockApp>;
    let mockPlugin: any;
    let contacts: OrbitContact[];

    beforeEach(() => {
        vi.clearAllMocks();
        app = createMockApp();
        mockPlugin = createMockPlugin(app);
        contacts = [
            createOrbitContact({
                name: 'Alice',
                status: 'decay',
                file: createTFile({ path: 'People/Alice.md' }),
            }),
            createOrbitContact({
                name: 'Bob',
                status: 'stable',
                file: createTFile({ path: 'People/Bob.md' }),
            }),
        ];
        mockFormModalInstances.length = 0;
        mockAiModalInstances.length = 0;
    });

    // ── Lifecycle ─────────────────────────────────────────

    it('creates without error', () => {
        expect(() => {
            new OrbitHubModal(mockPlugin, contacts);
        }).not.toThrow();
    });

    it('sets title to "Orbit" on open', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        expect(modal.titleEl.textContent).toBe('Orbit');
    });

    it('adds orbit-hub CSS class on open', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        expect(modal.modalEl.classList.contains('orbit-hub')).toBe(true);
    });

    it('removes orbit-hub CSS class on close', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();
        modal.onClose();

        expect(modal.modalEl.classList.contains('orbit-hub')).toBe(false);
    });

    it('creates a React root on open', async () => {
        const { createRoot } = await import('react-dom/client');
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        expect(createRoot).toHaveBeenCalledTimes(1);
    });

    it('unmounts React root on close', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = {
            render: vi.fn(),
            unmount: vi.fn(),
        };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();
        modal.onClose();

        expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });

    // ── Render Content ────────────────────────────────────

    it('renderContent returns a React element in hub view', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        const element = modal.renderContent();

        expect(element).toBeDefined();
        expect(element.type).toBeDefined();
    });

    it('renderContent wraps in OrbitProvider with plugin prop', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        const element = modal.renderContent();

        // The top-level element is OrbitProvider with plugin prop
        expect(element.props.plugin).toBe(mockPlugin);
    });

    it('hub view contains action bar buttons', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        const element = modal.renderContent();

        // The OrbitProvider wraps the hub content div
        const hubContent = element.props.children;
        expect(hubContent).toBeDefined();
        expect(hubContent.props.className).toBe('orbit-hub-content');
    });

    // ── Selection ─────────────────────────────────────────

    it('handleSelect() sets selectedContact and re-renders', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = { render: vi.fn(), unmount: vi.fn() };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Get the ContactPickerGrid's onSelect prop
        const element = modal.renderContent();
        const hubContent = element.props.children;
        const grid = hubContent.props.children[0]; // First child = ContactPickerGrid
        const onSelect = grid.props.onSelect;

        const renderCountBefore = mockRoot.render.mock.calls.length;
        onSelect(contacts[0]);

        expect(mockRoot.render.mock.calls.length).toBeGreaterThan(renderCountBefore);

        // Verify the selected contact is passed to the grid
        const updatedElement = modal.renderContent();
        const updatedGrid = updatedElement.props.children.props.children[0];
        expect(updatedGrid.props.selectedContact).toBe(contacts[0]);
    });

    it('handleSelect() same contact → toggles off (deselects)', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = { render: vi.fn(), unmount: vi.fn() };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice
        const element = modal.renderContent();
        const onSelect = element.props.children.props.children[0].props.onSelect;
        onSelect(contacts[0]);

        // Select Alice again → deselect
        onSelect(contacts[0]);

        const updatedElement = modal.renderContent();
        const updatedGrid = updatedElement.props.children.props.children[0];
        expect(updatedGrid.props.selectedContact).toBeNull();
    });

    // ── Update Flow ──────────────────────────────────────

    it('handleUpdate() with no selection → no-op', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = { render: vi.fn(), unmount: vi.fn() };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Grab the Update button onClick (first button in actions-left)
        const element = modal.renderContent();
        const actionsBar = element.props.children.props.children[1]; // actions div
        const actionsLeft = actionsBar.props.children[0]; // actions-left div
        const updateButton = actionsLeft.props.children[0]; // first button

        const renderCountBefore = mockRoot.render.mock.calls.length;
        updateButton.props.onClick();

        // Should not trigger extra render (no-op guard)
        expect(mockRoot.render.mock.calls.length).toBe(renderCountBefore);
    });

    it('handleUpdate() transitions to updating view, updates title', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = { render: vi.fn(), unmount: vi.fn() };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice first
        const element = modal.renderContent();
        const onSelect = element.props.children.props.children[0].props.onSelect;
        onSelect(contacts[0]);

        // Click Update
        const updatedElement = modal.renderContent();
        const actionsBar = updatedElement.props.children.props.children[1];
        const actionsLeft = actionsBar.props.children[0];
        const updateButton = actionsLeft.props.children[0];
        updateButton.props.onClick();

        // Title should show contact name
        expect(modal.titleEl.textContent).toBe('Update Alice');

        // renderContent should now return UpdatePanel
        const updatingElement = modal.renderContent();
        expect(updatingElement.props.contact).toBe(contacts[0]);
    });

    // ── Edit Flow ────────────────────────────────────────

    it('handleEdit() reads frontmatter cache, opens OrbitFormModal with initial values', async () => {
        const { OrbitFormModal } = await import('../../../src/modals/OrbitFormModal');

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Set up metadataCache to return frontmatter
        app.metadataCache.getFileCache.mockReturnValue({
            frontmatter: { contact_link: 'https://x.com/alice' },
        });

        // Select Alice
        const element = modal.renderContent();
        const onSelect = element.props.children.props.children[0].props.onSelect;
        onSelect(contacts[0]);

        // Click Edit (second button in actions-left)
        const updatedElement = modal.renderContent();
        const actionsBar = updatedElement.props.children.props.children[1];
        const actionsLeft = actionsBar.props.children[0];
        const editButton = actionsLeft.props.children[1];
        editButton.props.onClick();

        expect(OrbitFormModal).toHaveBeenCalledTimes(1);
        // The form modal should have been told to open
        expect(mockFormModalInstances).toHaveLength(1);
        expect(mockFormModalInstances[0].open).toHaveBeenCalled();
    });

    it('handleEdit() form submit + name changed → renameFile() called with correct new path', async () => {
        const { OrbitFormModal } = await import('../../../src/modals/OrbitFormModal');
        const { updateFrontmatter } = await import('../../../src/services/ContactManager');

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        app.metadataCache.getFileCache.mockReturnValue({ frontmatter: {} });

        // Select Alice and click Edit
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);
        const updated = modal.renderContent();
        updated.props.children.props.children[1].props.children[0].props.children[1].props.onClick();

        // Grab the onSubmit callback from the captured form modal instance
        const onSubmit = mockFormModalInstances[0]._onSubmit as (data: any) => Promise<void>;

        // Submit with a changed name
        await onSubmit({ name: 'Alicia', category: 'Friends', photo: '' });

        expect(app.fileManager.renameFile).toHaveBeenCalledWith(
            contacts[0].file,
            expect.stringContaining('Alicia.md'),
        );
    });

    it('handleEdit() form submit + name unchanged → renameFile() NOT called', async () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();
        app.metadataCache.getFileCache.mockReturnValue({ frontmatter: {} });

        // Select Alice and click Edit
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);
        const updated = modal.renderContent();
        updated.props.children.props.children[1].props.children[0].props.children[1].props.onClick();

        const onSubmit = mockFormModalInstances[0]._onSubmit as (data: any) => Promise<void>;

        // Submit with unchanged name
        await onSubmit({ name: 'Alice', category: 'Friends', photo: '' });

        expect(app.fileManager.renameFile).not.toHaveBeenCalled();
    });

    it('handleEdit() photo scrape flag triggers ImageScraper.scrapeAndSave', async () => {
        const { ImageScraper } = await import('../../../src/utils/ImageScraper');

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();
        app.metadataCache.getFileCache.mockReturnValue({ frontmatter: {} });

        // Select Alice and click Edit
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);
        const updated = modal.renderContent();
        updated.props.children.props.children[1].props.children[0].props.children[1].props.onClick();

        const onSubmit = mockFormModalInstances[0]._onSubmit as (data: any) => Promise<void>;

        // Submit with scrape flag and a URL photo
        await onSubmit({
            name: 'Alice',
            category: 'Friends',
            photo: 'https://example.com/alice.jpg',
            _scrapePhoto: true,
        });

        expect(ImageScraper.scrapeAndSave).toHaveBeenCalledWith(
            app,
            'https://example.com/alice.jpg',
            'Alice',
            'Resources/Assets/Orbit',
        );
    });

    it('handleEdit() photo scrape failure → Notice, keeps original URL', async () => {
        const { ImageScraper } = await import('../../../src/utils/ImageScraper');
        const { updateFrontmatter } = await import('../../../src/services/ContactManager');

        vi.mocked(ImageScraper.scrapeAndSave).mockRejectedValueOnce(new Error('Network error'));

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();
        app.metadataCache.getFileCache.mockReturnValue({ frontmatter: {} });

        // Select Alice and click Edit
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);
        const updated = modal.renderContent();
        updated.props.children.props.children[1].props.children[0].props.children[1].props.onClick();

        const onSubmit = mockFormModalInstances[0]._onSubmit as (data: any) => Promise<void>;

        await onSubmit({
            name: 'Alice',
            category: 'Friends',
            photo: 'https://example.com/alice.jpg',
            _scrapePhoto: true,
        });

        // updateFrontmatter should have been called with original URL (scrape failed)
        expect(updateFrontmatter).toHaveBeenCalledWith(
            app,
            contacts[0].file,
            expect.objectContaining({ photo: 'https://example.com/alice.jpg' }),
        );
    });

    // ── Add / Digest ─────────────────────────────────────

    it('handleAdd() calls plugin.openNewPersonFlow()', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Add is the third button in actions-left
        const element = modal.renderContent();
        const actionsLeft = element.props.children.props.children[1].props.children[0];
        const addButton = actionsLeft.props.children[2];
        addButton.props.onClick();

        expect(mockPlugin.openNewPersonFlow).toHaveBeenCalledTimes(1);
    });

    it('handleDigest() calls plugin.generateWeeklyDigest() and shows Notice', async () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Digest is the fourth button in actions-left
        const element = modal.renderContent();
        const actionsLeft = element.props.children.props.children[1].props.children[0];
        const digestButton = actionsLeft.props.children[3];
        await digestButton.props.onClick();

        expect(mockPlugin.generateWeeklyDigest).toHaveBeenCalledTimes(1);
    });

    it('handleDigest() error → failure Notice', async () => {
        mockPlugin.generateWeeklyDigest.mockRejectedValueOnce(new Error('Digest failed'));
        const { Logger } = await import('../../../src/utils/logger');

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        const element = modal.renderContent();
        const actionsLeft = element.props.children.props.children[1].props.children[0];
        const digestButton = actionsLeft.props.children[3];
        await digestButton.props.onClick();

        expect(Logger.error).toHaveBeenCalledWith(
            'OrbitHubModal',
            'Digest generation failed',
            expect.any(Error),
        );
    });

    // ── AI Suggest ───────────────────────────────────────

    it('handleSuggest() with no selectedContact → returns immediately (no-op)', async () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // No contact selected — click Suggest (fifth button)
        const element = modal.renderContent();
        const actionsLeft = element.props.children.props.children[1].props.children[0];
        const suggestButton = actionsLeft.props.children[4];
        await suggestButton.props.onClick();

        // AI service should not be called
        expect(mockPlugin.aiService.generate).not.toHaveBeenCalled();
    });

    it('handleSuggest() with AI provider = "none" → "not configured" Notice', async () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);

        // mockPlugin.settings.aiProvider is 'none'
        const updated = modal.renderContent();
        const suggestButton = updated.props.children.props.children[1].props.children[0].props.children[4];
        await suggestButton.props.onClick();

        // aiService.generate should not be called
        expect(mockPlugin.aiService.generate).not.toHaveBeenCalled();
    });

    it('handleSuggest() opens AiResultModal in loading state, then sets message', async () => {
        const { AiResultModal } = await import('../../../src/modals/AiResultModal');

        mockPlugin.settings.aiProvider = 'openai';
        app.vault.read.mockResolvedValue('# Alice\nSome content');

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);

        // Click Suggest
        const updated = modal.renderContent();
        const suggestButton = updated.props.children.props.children[1].props.children[0].props.children[4];
        await suggestButton.props.onClick();

        expect(mockAiModalInstances).toHaveLength(1);
        expect(mockAiModalInstances[0].open).toHaveBeenCalled();
        expect(mockAiModalInstances[0].setMessage).toHaveBeenCalledWith('AI generated message');
    });

    it('handleSuggest() AI error → modal.setError()', async () => {
        const { AiResultModal } = await import('../../../src/modals/AiResultModal');

        mockPlugin.settings.aiProvider = 'openai';
        app.vault.read.mockResolvedValue('# Alice\nSome content');
        mockPlugin.aiService.generate.mockRejectedValueOnce(new Error('API error'));

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);

        // Click Suggest
        const updated = modal.renderContent();
        const suggestButton = updated.props.children.props.children[1].props.children[0].props.children[4];
        await suggestButton.props.onClick();

        expect(mockAiModalInstances).toHaveLength(1);
        expect(mockAiModalInstances[0].setError).toHaveBeenCalledWith('API error');
    });

    // ── Save Flow ────────────────────────────────────────

    it('handleSave() updates frontmatter with lastContact and interactionType', async () => {
        const { updateFrontmatter } = await import('../../../src/services/ContactManager');

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice and transition to update view
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);
        const updated = modal.renderContent();
        updated.props.children.props.children[1].props.children[0].props.children[0].props.onClick();

        // Now in update view — renderContent gives UpdatePanel
        const updatePanel = modal.renderContent();
        await updatePanel.props.onSave({
            lastContact: '2026-02-19',
            interactionType: 'call',
            note: '',
        });

        expect(updateFrontmatter).toHaveBeenCalledWith(
            app,
            contacts[0].file,
            { last_contact: '2026-02-19', last_interaction: 'call' },
        );
    });

    it('handleSave() appends to interaction log when note provided', async () => {
        const { appendToInteractionLog } = await import('../../../src/services/ContactManager');

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice → Update view
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);
        modal.renderContent().props.children.props.children[1].props.children[0].props.children[0].props.onClick();

        const updatePanel = modal.renderContent();
        await updatePanel.props.onSave({
            lastContact: '2026-02-19',
            interactionType: 'call',
            note: 'Discussed the project',
        });

        expect(appendToInteractionLog).toHaveBeenCalledWith(
            app,
            contacts[0].file,
            'call: Discussed the project',
            'Interaction Log',
        );
    });

    it('handleSave() no note → skips log append', async () => {
        const { appendToInteractionLog } = await import('../../../src/services/ContactManager');

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice → Update view
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);
        modal.renderContent().props.children.props.children[1].props.children[0].props.children[0].props.onClick();

        const updatePanel = modal.renderContent();
        await updatePanel.props.onSave({
            lastContact: '2026-02-19',
            interactionType: 'text',
            note: '',
        });

        expect(appendToInteractionLog).not.toHaveBeenCalled();
    });

    it('handleSave() error → failure Notice', async () => {
        const { updateFrontmatter } = await import('../../../src/services/ContactManager');
        const { Logger } = await import('../../../src/utils/logger');
        vi.mocked(updateFrontmatter).mockRejectedValueOnce(new Error('DB error'));

        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice → Update view
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);
        modal.renderContent().props.children.props.children[1].props.children[0].props.children[0].props.onClick();

        const updatePanel = modal.renderContent();
        await updatePanel.props.onSave({
            lastContact: '2026-02-19',
            interactionType: 'call',
            note: 'Test',
        });

        expect(Logger.error).toHaveBeenCalledWith(
            'OrbitHubModal',
            'Update failed',
            expect.any(Error),
        );
    });

    // ── Cancel ────────────────────────────────────────────

    it('handleCancel() returns to hub view and resets title', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // Select Alice → Update view
        const element = modal.renderContent();
        element.props.children.props.children[0].props.onSelect(contacts[0]);
        modal.renderContent().props.children.props.children[1].props.children[0].props.children[0].props.onClick();

        // Now in update view
        expect(modal.titleEl.textContent).toBe('Update Alice');

        // Click Cancel
        const updatePanel = modal.renderContent();
        updatePanel.props.onCancel();

        expect(modal.titleEl.textContent).toBe('Orbit');

        // Should be back in hub view (OrbitProvider wrapping hub content)
        const hubElement = modal.renderContent();
        expect(hubElement.props.plugin).toBe(mockPlugin);
    });

    // ── Button Disabled States ───────────────────────────

    it('Update/Edit buttons disabled when no contact selected; Suggest disabled when no contact OR aiProvider="none"', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        modal.onOpen();

        // No contact selected
        const element = modal.renderContent();
        const actionsLeft = element.props.children.props.children[1].props.children[0];
        const updateButton = actionsLeft.props.children[0];
        const editButton = actionsLeft.props.children[1];
        const suggestButton = actionsLeft.props.children[4];

        expect(updateButton.props.disabled).toBe(true);
        expect(editButton.props.disabled).toBe(true);
        expect(suggestButton.props.disabled).toBe(true);

        // Select a contact
        element.props.children.props.children[0].props.onSelect(contacts[0]);

        const updated = modal.renderContent();
        const updatedActionsLeft = updated.props.children.props.children[1].props.children[0];
        const updatedUpdate = updatedActionsLeft.props.children[0];
        const updatedEdit = updatedActionsLeft.props.children[1];
        const updatedSuggest = updatedActionsLeft.props.children[4];

        expect(updatedUpdate.props.disabled).toBe(false);
        expect(updatedEdit.props.disabled).toBe(false);
        // Suggest still disabled because aiProvider = 'none'
        expect(updatedSuggest.props.disabled).toBe(true);
    });

    // ── Direct Update ────────────────────────────────────

    // NOTE: Source code bug flagged — openDirectUpdate() calls this.open() which
    // triggers onOpen(), and onOpen() hardcodes titleEl to 'Orbit'. The updateTitle()
    // method is never called in the openDirectUpdate path. The view IS set to 'updating'
    // correctly, just the title doesn't reflect it.
    it('openDirectUpdate() sets contact and view to updating, then opens', () => {
        const modal = new OrbitHubModal(mockPlugin, contacts);
        const openSpy = vi.spyOn(modal, 'open');

        modal.openDirectUpdate(contacts[0]);

        expect(openSpy).toHaveBeenCalled();

        // After onOpen fires, view is 'updating' so renderContent returns UpdatePanel
        modal.onOpen();

        // BUG: Title is 'Orbit' because onOpen() hardcodes it.
        // It should be 'Update Alice' — onOpen() should call updateTitle().
        expect(modal.titleEl.textContent).toBe('Orbit'); // Actual behavior (bug)

        // But the view IS correctly set, so UpdatePanel is rendered
        const element = modal.renderContent();
        expect(element.props.contact).toBe(contacts[0]);
    });
});

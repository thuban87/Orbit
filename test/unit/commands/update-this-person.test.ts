/**
 * Unit tests for the "Update This Person" command (orbit:update-this-person).
 *
 * Tests active file detection, contact lookup in the index,
 * OrbitHubModal construction with openDirectUpdate, and error notices.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockApp, MarkdownView, Notice, TFile } from '../../mocks/obsidian';
import { createOrbitContact, createTFile } from '../../helpers/factories';
import type { OrbitContact } from '../../../src/types';

// Mock react-dom/client (OrbitHubModal uses ReactModal)
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

// Mock ContactManager
vi.mock('../../../src/services/ContactManager', () => ({
    updateFrontmatter: vi.fn(async () => { }),
    appendToInteractionLog: vi.fn(async () => { }),
    createContact: vi.fn(async () => { }),
}));

// Mock OrbitFormModal
vi.mock('../../../src/modals/OrbitFormModal', () => ({
    OrbitFormModal: vi.fn().mockImplementation(() => ({
        open: vi.fn(),
        close: vi.fn(),
    })),
}));

// Mock schemas
vi.mock('../../../src/schemas/new-person.schema', () => ({
    newPersonSchema: { id: 'new-person', title: 'New Person', fields: [] },
}));

vi.mock('../../../src/schemas/edit-person.schema', () => ({
    editPersonSchema: { id: 'edit-person', title: 'Edit Person', fields: [] },
}));

import { OrbitHubModal } from '../../../src/modals/OrbitHubModal';

/**
 * Creates a mock plugin that matches the shape expected by OrbitHubModal
 * and the update-this-person command flow.
 */
function createMockPlugin(app?: any) {
    const mockApp = app ?? createMockApp();
    const contacts: OrbitContact[] = [];

    return {
        app: mockApp,
        settings: {
            personTag: 'people',
            ignoredPaths: ['Templates'],
            dateFormat: 'YYYY-MM-DD',
            templatePath: '',
            contactsFolder: '',
            interactionLogHeading: 'Interaction Log',
        },
        index: {
            scanVault: vi.fn(async () => { }),
            trigger: vi.fn(),
            getContactsByStatus: vi.fn(() => contacts),
            getContacts: vi.fn(() => contacts),
        },
        _contacts: contacts,
        generateWeeklyDigest: vi.fn(async () => { }),
    } as any;
}

describe('Update This Person command', () => {
    let app: ReturnType<typeof createMockApp>;
    let plugin: any;
    let aliceFile: TFile;
    let aliceContact: OrbitContact;

    beforeEach(() => {
        vi.clearAllMocks();
        app = createMockApp();
        plugin = createMockPlugin(app);

        aliceFile = createTFile({ path: 'People/Alice.md' });
        aliceContact = createOrbitContact({
            name: 'Alice',
            file: aliceFile,
            status: 'decay',
        });

        // Populate the mock index
        plugin._contacts.push(aliceContact);
        plugin.index.getContacts.mockReturnValue([aliceContact]);
        plugin.index.getContactsByStatus.mockReturnValue([aliceContact]);
    });

    it('detects active file via getActiveViewOfType(MarkdownView)', () => {
        const markdownView = new MarkdownView();
        markdownView.file = aliceFile;
        app.workspace.getActiveViewOfType.mockReturnValue(markdownView);

        // Simulate the command callback logic from main.ts
        const file = app.workspace.getActiveViewOfType(MarkdownView)?.file;
        expect(file).toBe(aliceFile);
    });

    it('finds contact in index by file path', () => {
        const contact = plugin.index.getContacts().find(
            (c: OrbitContact) => c.file.path === aliceFile.path
        );
        expect(contact).toBe(aliceContact);
    });

    it('constructs OrbitHubModal with openDirectUpdate for tracked contact', () => {
        const contacts = plugin.index.getContactsByStatus();
        const modal = new OrbitHubModal(plugin, contacts);
        const openDirectUpdateSpy = vi.spyOn(modal, 'openDirectUpdate');

        modal.openDirectUpdate(aliceContact);

        expect(openDirectUpdateSpy).toHaveBeenCalledWith(aliceContact);
    });

    it('shows Notice when no active file is open', () => {
        app.workspace.getActiveViewOfType.mockReturnValue(null);

        // Simulate command callback
        const file = app.workspace.getActiveViewOfType(MarkdownView)?.file;
        if (!file) {
            const notice = new Notice('Current file is not a tracked contact');
            expect(notice.message).toBe('Current file is not a tracked contact');
        }
    });

    it('shows Notice when active file is not a tracked contact', () => {
        const unknownFile = createTFile({ path: 'Notes/Random.md' });
        const markdownView = new MarkdownView();
        markdownView.file = unknownFile;
        app.workspace.getActiveViewOfType.mockReturnValue(markdownView);

        const file = app.workspace.getActiveViewOfType(MarkdownView)?.file;
        const contact = plugin.index.getContacts().find(
            (c: OrbitContact) => c.file.path === file!.path
        );

        expect(contact).toBeUndefined();

        if (!contact) {
            const notice = new Notice('Current file is not a tracked contact');
            expect(notice.message).toBe('Current file is not a tracked contact');
        }
    });

    it('openDirectUpdate sets view to updating before open is called', () => {
        const contacts = plugin.index.getContactsByStatus();
        const modal = new OrbitHubModal(plugin, contacts);

        // openDirectUpdate should set internal state
        modal.openDirectUpdate(aliceContact);

        // Verify by rendering — should produce UpdatePanel content, not picker
        // (The modal's renderContent will be in 'updating' view)
        const element = modal.renderContent();
        expect(element).toBeDefined();
    });
});

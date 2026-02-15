/**
 * Integration tests for the Edit Person flow.
 *
 * Tests the end-to-end flow: OrbitHubModal → handleEdit() →
 * initialValues built from contact data → OrbitFormModal opened →
 * submit calls updateFrontmatter with merge data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockApp, TFile } from '../mocks/obsidian';
import { createOrbitContact, createTFile, createCachedMetadata } from '../helpers/factories';
import type { OrbitContact } from '../../src/types';

// Mock react-dom/client
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

// Track calls to updateFrontmatter
const mockUpdateFrontmatter = vi.fn(async () => { });
const mockAppendToInteractionLog = vi.fn(async () => { });
const mockCreateContact = vi.fn(async () => { });

vi.mock('../../src/services/ContactManager', () => ({
    updateFrontmatter: (...args: any[]) => mockUpdateFrontmatter(...args),
    appendToInteractionLog: (...args: any[]) => mockAppendToInteractionLog(...args),
    createContact: (...args: any[]) => mockCreateContact(...args),
}));

// Capture OrbitFormModal constructors
const mockFormModalInstances: any[] = [];
vi.mock('../../src/modals/OrbitFormModal', () => ({
    OrbitFormModal: vi.fn().mockImplementation(function (this: any, _app: any, _schema: any, onSubmit: any, initialValues: any) {
        this.app = _app;
        this.schema = _schema;
        this.onSubmit = onSubmit;
        this.initialValues = initialValues;
        this.open = vi.fn();
        this.close = vi.fn();
        mockFormModalInstances.push(this);
    }),
}));

// Mock new-person schema
vi.mock('../../src/schemas/new-person.schema', () => ({
    newPersonSchema: { id: 'new-person', title: 'New Person', fields: [] },
}));

// Mock edit-person schema with real field keys (needed by handleEdit's field iteration)
vi.mock('../../src/schemas/edit-person.schema', () => ({
    editPersonSchema: {
        id: 'edit-person',
        title: 'Edit Person',
        fields: [
            { key: 'name', type: 'text', label: 'Name', required: true },
            { key: 'category', type: 'dropdown', label: 'Category' },
            { key: 'frequency', type: 'dropdown', label: 'Frequency' },
            { key: 'social_battery', type: 'dropdown', label: 'Social Battery' },
            { key: 'birthday', type: 'date', label: 'Birthday' },
            { key: 'photo', type: 'photo', label: 'Photo' },
            { key: 'contact_link', type: 'text', label: 'Contact Link' },
        ],
        submitLabel: 'Save Changes',
    },
}));

import { OrbitHubModal } from '../../src/modals/OrbitHubModal';
import { OrbitFormModal } from '../../src/modals/OrbitFormModal';

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
        },
        index: {
            scanVault: vi.fn(async () => { }),
            trigger: vi.fn(),
            getContactsByStatus: vi.fn(() => []),
            getContacts: vi.fn(() => []),
        },
        generateWeeklyDigest: vi.fn(async () => { }),
    } as any;
}

describe('Edit Person flow', () => {
    let app: ReturnType<typeof createMockApp>;
    let plugin: any;
    let aliceFile: TFile;
    let aliceContact: OrbitContact;

    beforeEach(() => {
        vi.clearAllMocks();
        mockFormModalInstances.length = 0;

        app = createMockApp();

        // Set up cache to return frontmatter with contact_link
        aliceFile = createTFile({ path: 'People/Alice.md' });
        const cache = createCachedMetadata({
            frontmatter: {
                tags: ['people'],
                category: 'Friends',
                frequency: 'Monthly',
                social_battery: 'Charger',
                birthday: '1990-05-15',
                photo: 'https://example.com/alice.jpg',
                contact_link: 'https://contacts.example.com/alice',
                last_contact: '2026-01-15',
                custom_field: 'should be preserved',
            },
        });

        const cacheMap = new Map();
        cacheMap.set(aliceFile, cache);
        app.metadataCache.getFileCache.mockImplementation((file: TFile) =>
            cacheMap.get(file) ?? null
        );

        aliceContact = createOrbitContact({
            name: 'Alice',
            file: aliceFile,
            category: 'Friends',
            frequency: 'Monthly',
            socialBattery: 'Charger',
            birthday: '1990-05-15',
            photo: 'https://example.com/alice.jpg',
            status: 'stable',
        });

        plugin = createMockPlugin(app);
        plugin.index.getContactsByStatus.mockReturnValue([aliceContact]);
    });

    it('handleEdit opens OrbitFormModal with editPersonSchema', () => {
        const modal = new OrbitHubModal(plugin, [aliceContact]);

        // Simulate selection + edit
        (modal as any).selectedContact = aliceContact;
        (modal as any).handleEdit();

        expect(OrbitFormModal).toHaveBeenCalledTimes(1);
        expect(mockFormModalInstances).toHaveLength(1);
        expect(mockFormModalInstances[0].open).toHaveBeenCalled();
    });

    it('builds correct initialValues from contact data', () => {
        const modal = new OrbitHubModal(plugin, [aliceContact]);
        (modal as any).selectedContact = aliceContact;
        (modal as any).handleEdit();

        const formModalCall = vi.mocked(OrbitFormModal).mock.calls[0];
        const initialValues = formModalCall[3]; // 4th argument

        expect(initialValues).toEqual({
            name: 'Alice',
            category: 'Friends',
            frequency: 'Monthly',
            social_battery: 'Charger',
            birthday: '1990-05-15',
            photo: 'https://example.com/alice.jpg',
            contact_link: 'https://contacts.example.com/alice',
        });
    });

    it('reads contact_link from frontmatter (not OrbitContact interface)', () => {
        const modal = new OrbitHubModal(plugin, [aliceContact]);
        (modal as any).selectedContact = aliceContact;
        (modal as any).handleEdit();

        const formModalCall = vi.mocked(OrbitFormModal).mock.calls[0];
        const initialValues = formModalCall[3];

        // contact_link is read from frontmatter, not from OrbitContact
        expect(initialValues.contact_link).toBe('https://contacts.example.com/alice');
    });

    it('handles missing contact_link gracefully', () => {
        // Override cache to have no contact_link
        app.metadataCache.getFileCache.mockReturnValue(
            createCachedMetadata({
                frontmatter: { tags: ['people'], frequency: 'Monthly' },
            })
        );

        const modal = new OrbitHubModal(plugin, [aliceContact]);
        (modal as any).selectedContact = aliceContact;
        (modal as any).handleEdit();

        const formModalCall = vi.mocked(OrbitFormModal).mock.calls[0];
        const initialValues = formModalCall[3];

        expect(initialValues.contact_link).toBe('');
    });

    it('submit calls updateFrontmatter with merged fields (not name)', async () => {
        const modal = new OrbitHubModal(plugin, [aliceContact]);
        (modal as any).selectedContact = aliceContact;
        (modal as any).handleEdit();

        // Get the onSubmit callback
        const formModalCall = vi.mocked(OrbitFormModal).mock.calls[0];
        const onSubmit = formModalCall[2]; // 3rd argument

        // Simulate submit with modified data
        await onSubmit({
            name: 'Alice',
            category: 'Work',         // Changed!
            frequency: 'Weekly',      // Changed!
            social_battery: 'Neutral', // Changed!
            birthday: '1990-05-15',
            photo: 'https://example.com/alice.jpg',
            contact_link: 'https://contacts.example.com/alice',
        });

        // updateFrontmatter should be called with all fields except 'name'
        expect(mockUpdateFrontmatter).toHaveBeenCalledTimes(1);
        const [callApp, callFile, callUpdates] = mockUpdateFrontmatter.mock.calls[0];
        expect(callApp).toBe(app);
        expect(callFile).toBe(aliceFile);
        expect(callUpdates.category).toBe('Work');
        expect(callUpdates.frequency).toBe('Weekly');
        expect(callUpdates.social_battery).toBe('Neutral');
        expect(callUpdates.name).toBeUndefined(); // name is never in updates
    });

    it('triggers file rename when name changes', async () => {
        const modal = new OrbitHubModal(plugin, [aliceContact]);
        (modal as any).selectedContact = aliceContact;
        (modal as any).handleEdit();

        const formModalCall = vi.mocked(OrbitFormModal).mock.calls[0];
        const onSubmit = formModalCall[2];

        await onSubmit({
            name: 'Alice Smith', // Name changed!
            category: 'Friends',
            frequency: 'Monthly',
            social_battery: 'Charger',
            birthday: '1990-05-15',
            photo: 'https://example.com/alice.jpg',
            contact_link: 'https://contacts.example.com/alice',
        });

        expect(app.fileManager.renameFile).toHaveBeenCalledWith(
            aliceFile,
            'People/Alice Smith.md'
        );
    });

    it('does not rename file when name is unchanged', async () => {
        const modal = new OrbitHubModal(plugin, [aliceContact]);
        (modal as any).selectedContact = aliceContact;
        (modal as any).handleEdit();

        const formModalCall = vi.mocked(OrbitFormModal).mock.calls[0];
        const onSubmit = formModalCall[2];

        await onSubmit({
            name: 'Alice', // Same name
            category: 'Work',
            frequency: 'Monthly',
            social_battery: 'Charger',
            birthday: '1990-05-15',
            photo: '',
            contact_link: '',
        });

        expect(app.fileManager.renameFile).not.toHaveBeenCalled();
    });

    it('rescans index after edit submission', async () => {
        const modal = new OrbitHubModal(plugin, [aliceContact]);
        (modal as any).selectedContact = aliceContact;
        (modal as any).handleEdit();

        const formModalCall = vi.mocked(OrbitFormModal).mock.calls[0];
        const onSubmit = formModalCall[2];

        await onSubmit({
            name: 'Alice',
            category: 'Friends',
            frequency: 'Monthly',
            social_battery: '',
            birthday: '',
            photo: '',
            contact_link: '',
        });

        expect(plugin.index.scanVault).toHaveBeenCalled();
        expect(plugin.index.trigger).toHaveBeenCalledWith('change');
    });

    it('does nothing when no contact is selected', () => {
        const modal = new OrbitHubModal(plugin, [aliceContact]);
        (modal as any).selectedContact = null;

        // Should not throw
        expect(() => (modal as any).handleEdit()).not.toThrow();

        // Should not open any form modal
        expect(OrbitFormModal).not.toHaveBeenCalled();
    });
});

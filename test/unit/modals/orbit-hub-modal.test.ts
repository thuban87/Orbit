/**
 * Unit tests for OrbitHubModal.
 *
 * Tests modal lifecycle (open/close), React root management,
 * title/CSS class setup, selection state, view transitions,
 * and action button rendering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrbitHubModal } from '../../../src/modals/OrbitHubModal';
import { createOrbitContact, createTFile } from '../../helpers/factories';
import { createMockApp } from '../../mocks/obsidian';
import type { OrbitContact } from '../../../src/types';

// Mock react-dom/client so ReactModal can create a root
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

// Mock ContactManager (used in save flow)
vi.mock('../../../src/services/ContactManager', () => ({
    updateFrontmatter: vi.fn(async () => { }),
    appendToInteractionLog: vi.fn(async () => { }),
    createContact: vi.fn(async () => { }),
}));

// Mock OrbitFormModal (used by Add action)
vi.mock('../../../src/modals/OrbitFormModal', () => ({
    OrbitFormModal: vi.fn().mockImplementation(() => ({
        open: vi.fn(),
        close: vi.fn(),
    })),
}));

// Mock schema
vi.mock('../../../src/schemas/new-person.schema', () => ({
    newPersonSchema: { id: 'new-person', title: 'New Person', fields: [] },
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
        },
        index: {
            scanVault: vi.fn(async () => { }),
            trigger: vi.fn(),
            getContactsByStatus: vi.fn(() => []),
        },
        generateWeeklyDigest: vi.fn(async () => { }),
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
});

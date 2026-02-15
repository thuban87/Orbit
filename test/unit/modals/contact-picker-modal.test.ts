/**
 * Unit tests for ContactPickerModal.
 *
 * Tests modal lifecycle (open/close), React root management,
 * title/CSS class setup, and onSelect callback wiring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactPickerModal } from '../../../src/modals/ContactPickerModal';
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

describe('ContactPickerModal', () => {
    let app: ReturnType<typeof createMockApp>;
    let mockPlugin: any;
    let contacts: OrbitContact[];
    let onSelect: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        app = createMockApp();
        mockPlugin = { app } as any;
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
        onSelect = vi.fn();
    });

    it('creates without error', () => {
        expect(() => {
            new ContactPickerModal(app, mockPlugin, contacts, onSelect);
        }).not.toThrow();
    });

    it('sets title to "Select contact" on open', () => {
        const modal = new ContactPickerModal(app, mockPlugin, contacts, onSelect);
        modal.onOpen();

        expect(modal.titleEl.textContent).toBe('Select contact');
    });

    it('adds orbit-picker CSS class on open', () => {
        const modal = new ContactPickerModal(app, mockPlugin, contacts, onSelect);
        modal.onOpen();

        expect(modal.modalEl.classList.contains('orbit-picker')).toBe(true);
    });

    it('removes orbit-picker CSS class on close', () => {
        const modal = new ContactPickerModal(app, mockPlugin, contacts, onSelect);
        modal.onOpen();
        modal.onClose();

        expect(modal.modalEl.classList.contains('orbit-picker')).toBe(false);
    });

    it('creates a React root on open', async () => {
        const { createRoot } = await import('react-dom/client');
        const modal = new ContactPickerModal(app, mockPlugin, contacts, onSelect);
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

        const modal = new ContactPickerModal(app, mockPlugin, contacts, onSelect);
        modal.onOpen();
        modal.onClose();

        expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });

    it('renders content via renderContent()', () => {
        const modal = new ContactPickerModal(app, mockPlugin, contacts, onSelect);
        const element = modal.renderContent();

        // renderContent returns OrbitProvider wrapping ContactPickerGrid
        expect(element).toBeDefined();
        // The OrbitProvider wraps ContactPickerGrid, check that props are correct
        expect(element.props.plugin).toBe(mockPlugin);
    });

    it('wraps onSelect to close modal after selection', () => {
        const modal = new ContactPickerModal(app, mockPlugin, contacts, onSelect);
        const closeSpy = vi.spyOn(modal, 'close');
        const element = modal.renderContent();

        // The ContactPickerGrid is the child of OrbitProvider
        const gridElement = element.props.children;
        gridElement.props.onSelect(contacts[0]);

        expect(onSelect).toHaveBeenCalledWith(contacts[0]);
        expect(closeSpy).toHaveBeenCalledTimes(1);
    });
});

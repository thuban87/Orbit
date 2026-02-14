/**
 * Unit tests for src/modals/OrbitFormModal.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { createMockApp } from '../../mocks/obsidian';
import type { SchemaDef } from '../../../src/schemas/types';

// Mock react-dom/client
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

import { OrbitFormModal } from '../../../src/modals/OrbitFormModal';

function createTestSchema(overrides: Partial<SchemaDef> = {}): SchemaDef {
    return {
        id: 'test-schema',
        title: 'Test Schema',
        fields: [
            { key: 'name', type: 'text', label: 'Name', required: true },
        ],
        ...overrides,
    };
}

describe('OrbitFormModal', () => {
    let app: any;

    beforeEach(() => {
        app = createMockApp();
        vi.clearAllMocks();
    });

    it('sets modal title from schema.title on open', () => {
        const schema = createTestSchema({ title: 'Add New Person' });
        const modal = new OrbitFormModal(app, schema, vi.fn());

        modal.onOpen();

        expect(modal.titleEl.textContent).toBe('Add New Person');
    });

    it('applies cssClass to modal container when provided', () => {
        const schema = createTestSchema({ cssClass: 'orbit-custom' });
        const modal = new OrbitFormModal(app, schema, vi.fn());

        const addClassSpy = vi.spyOn(modal.modalEl, 'addClass');
        modal.onOpen();

        expect(addClassSpy).toHaveBeenCalledWith('orbit-custom');
    });

    it('does not apply cssClass when not provided', () => {
        const schema = createTestSchema({ cssClass: undefined });
        const modal = new OrbitFormModal(app, schema, vi.fn());

        const addClassSpy = vi.spyOn(modal.modalEl, 'addClass');
        modal.onOpen();

        expect(addClassSpy).not.toHaveBeenCalled();
    });

    it('removes cssClass on close when it was applied', () => {
        const schema = createTestSchema({ cssClass: 'orbit-custom' });
        const modal = new OrbitFormModal(app, schema, vi.fn());

        modal.onOpen();
        const removeClassSpy = vi.spyOn(modal.modalEl, 'removeClass');
        modal.onClose();

        expect(removeClassSpy).toHaveBeenCalledWith('orbit-custom');
    });

    it('creates React root on open (delegates to ReactModal)', () => {
        const schema = createTestSchema();
        const modal = new OrbitFormModal(app, schema, vi.fn());

        modal.onOpen();

        expect(createRoot).toHaveBeenCalledTimes(1);
    });

    it('calls root.render with FormRenderer element', () => {
        const schema = createTestSchema();
        const modal = new OrbitFormModal(app, schema, vi.fn());

        modal.onOpen();

        const mockRoot = (createRoot as any).mock.results[0].value;
        expect(mockRoot.render).toHaveBeenCalledTimes(1);
    });

    it('unmounts React root on close (delegates to ReactModal)', () => {
        const schema = createTestSchema();
        const modal = new OrbitFormModal(app, schema, vi.fn());

        modal.onOpen();
        const mockRoot = (createRoot as any).mock.results[0].value;
        modal.onClose();

        expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });

    it('passes initialValues to renderContent', () => {
        const schema = createTestSchema();
        const initial = { name: 'Alice' };
        const modal = new OrbitFormModal(app, schema, vi.fn(), initial);

        // renderContent should not throw
        expect(() => modal.renderContent()).not.toThrow();
    });
});

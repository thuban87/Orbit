/**
 * Unit tests for OrbitFormModal pre-population logic.
 *
 * Tests that existing frontmatter values appear correctly in the form,
 * modified values are submitted, and raw dropdown values not in options
 * are preserved.
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
        id: 'test-edit',
        title: 'Edit Test',
        fields: [
            { key: 'name', type: 'text', label: 'Name', required: true },
            { key: 'category', type: 'dropdown', label: 'Category', options: ['Family', 'Friends', 'Work'], required: true },
            { key: 'frequency', type: 'dropdown', label: 'Frequency', options: ['Weekly', 'Monthly', 'Quarterly'], required: true },
            { key: 'notes', type: 'textarea', label: 'Notes' },
            { key: 'active', type: 'toggle', label: 'Active' },
        ],
        submitLabel: 'Save Changes',
        ...overrides,
    };
}

describe('OrbitFormModal — Pre-population', () => {
    let app: any;

    beforeEach(() => {
        app = createMockApp();
        vi.clearAllMocks();
    });

    it('creates without error with initialValues', () => {
        const schema = createTestSchema();
        const initial = { name: 'Alice', category: 'Friends', frequency: 'Monthly' };

        expect(() => {
            new OrbitFormModal(app, schema, vi.fn(), initial);
        }).not.toThrow();
    });

    it('renderContent does not throw with initialValues', () => {
        const schema = createTestSchema();
        const initial = { name: 'Alice', category: 'Friends' };
        const modal = new OrbitFormModal(app, schema, vi.fn(), initial);

        expect(() => modal.renderContent()).not.toThrow();
    });

    it('renderContent produces a React element with pre-filled initialValues', () => {
        const schema = createTestSchema();
        const initial = { name: 'Bob', category: 'Work', frequency: 'Weekly' };
        const modal = new OrbitFormModal(app, schema, vi.fn(), initial);

        const element = modal.renderContent();
        expect(element).toBeDefined();
        expect(element.props.initialValues).toEqual(initial);
    });

    it('passes empty initialValues by default', () => {
        const schema = createTestSchema();
        const modal = new OrbitFormModal(app, schema, vi.fn());

        const element = modal.renderContent();
        expect(element.props.initialValues).toEqual({});
    });

    it('handles partial initialValues (some fields populated, others default)', () => {
        const schema = createTestSchema();
        const initial = { name: 'Alice' }; // only name, rest should get defaults
        const modal = new OrbitFormModal(app, schema, vi.fn(), initial);

        const element = modal.renderContent();
        expect(element.props.initialValues).toEqual(initial);
    });

    it('preserves raw dropdown value not in options list', () => {
        const schema = createTestSchema();
        // Simulate a frontmatter value that doesn't match any predefined option
        const initial = { name: 'Alice', frequency: 'Every Other Day' };
        const modal = new OrbitFormModal(app, schema, vi.fn(), initial);

        const element = modal.renderContent();
        expect(element.props.initialValues.frequency).toBe('Every Other Day');
    });

    it('sets title from schema on open', () => {
        const schema = createTestSchema({ title: 'Edit Person' });
        const initial = { name: 'Alice' };
        const modal = new OrbitFormModal(app, schema, vi.fn(), initial);

        modal.onOpen();
        expect(modal.titleEl.textContent).toBe('Edit Person');
    });

    it('calls onSubmit callback with modified values when triggered', () => {
        const schema = createTestSchema();
        const onSubmit = vi.fn();
        const initial = { name: 'Alice', category: 'Friends' };
        const modal = new OrbitFormModal(app, schema, onSubmit, initial);

        // Simulate what happens when FormRenderer submits
        const element = modal.renderContent();
        const modifiedData = { name: 'Alice Updated', category: 'Work' };
        element.props.onSubmit(modifiedData);

        expect(onSubmit).toHaveBeenCalledWith(modifiedData);
    });

    it('closes modal after submit', () => {
        const schema = createTestSchema();
        const modal = new OrbitFormModal(app, schema, vi.fn(), { name: 'Alice' });
        const closeSpy = vi.spyOn(modal, 'close');

        modal.onOpen();
        const element = modal.renderContent();
        element.props.onSubmit({ name: 'Alice' });

        expect(closeSpy).toHaveBeenCalled();
    });
});

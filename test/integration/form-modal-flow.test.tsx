/**
 * Integration test for the form modal flow.
 *
 * Full flow: instantiate OrbitFormModal with a multi-field schema →
 * simulate onOpen → verify render is called → verify renderContent
 * produces correct React element with expected data flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { createMockApp } from '../mocks/obsidian';
import { OrbitFormModal } from '../../src/modals/OrbitFormModal';
import { FormRenderer } from '../../src/components/FormRenderer';
import type { SchemaDef } from '../../src/schemas/types';

// Mock react-dom/client
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

const multiFieldSchema: SchemaDef = {
    id: 'integration-test',
    title: 'Integration Test Form',
    submitLabel: 'Save Contact',
    fields: [
        { key: 'name', type: 'text', label: 'Full Name', required: true, placeholder: 'Jane Doe' },
        { key: 'category', type: 'dropdown', label: 'Category', options: ['Family', 'Friends', 'Work'], required: true },
        { key: 'frequency', type: 'dropdown', label: 'Frequency', options: ['Daily', 'Weekly', 'Monthly'], default: 'Monthly' },
        { key: 'birthday', type: 'date', label: 'Birthday', layout: 'half-width' },
        { key: 'score', type: 'number', label: 'Score', layout: 'half-width' },
        { key: 'active', type: 'toggle', label: 'Is Active', default: true },
        { key: 'notes', type: 'textarea', label: 'Notes' },
    ],
};

describe('Form Modal Integration Flow', () => {
    let app: any;

    beforeEach(() => {
        app = createMockApp();
        vi.clearAllMocks();
    });

    it('modal open triggers createRoot and renders FormRenderer', () => {
        const onSubmit = vi.fn();
        const modal = new OrbitFormModal(app, multiFieldSchema, onSubmit);

        modal.onOpen();

        // createRoot called on contentEl
        expect(createRoot).toHaveBeenCalledWith(modal.contentEl);

        // root.render called
        const mockRoot = (createRoot as any).mock.results[0].value;
        expect(mockRoot.render).toHaveBeenCalledTimes(1);

        // Title was set
        expect(modal.titleEl.textContent).toBe('Integration Test Form');
    });

    it('renderContent returns a FormRenderer element with correct props', () => {
        const onSubmit = vi.fn();
        const modal = new OrbitFormModal(app, multiFieldSchema, onSubmit);

        const element = modal.renderContent();

        // Should be a React element for FormRenderer
        expect(element).toBeDefined();
        expect(element.type).toBe(FormRenderer);
        expect(element.props.schema).toBe(multiFieldSchema);
        expect(typeof element.props.onSubmit).toBe('function');
        expect(typeof element.props.onCancel).toBe('function');
    });

    it('FormRenderer renders all field types from the schema', () => {
        const onSubmit = vi.fn();
        const { container } = render(
            <FormRenderer
                schema={ multiFieldSchema }
                onSubmit = { onSubmit }
            />
        );

        // All 7 fields should be rendered
        const fields = container.querySelectorAll('.orbit-field');
        expect(fields.length).toBe(7);

        // Check specific fields exist
        expect(document.getElementById('orbit-field-name')).not.toBeNull();
        expect(document.getElementById('orbit-field-category')).not.toBeNull();
        expect(document.getElementById('orbit-field-frequency')).not.toBeNull();
        expect(document.getElementById('orbit-field-birthday')).not.toBeNull();
        expect(document.getElementById('orbit-field-score')).not.toBeNull();
        expect(document.getElementById('orbit-field-active')).not.toBeNull();
        expect(document.getElementById('orbit-field-notes')).not.toBeNull();
    });

    it('filling fields and submitting returns correct data structure', () => {
        const onSubmit = vi.fn();
        render(
            <FormRenderer
                schema={ multiFieldSchema }
                onSubmit = { onSubmit }
            />
        );

        // Fill in fields
        fireEvent.change(document.getElementById('orbit-field-name')!, { target: { value: 'Alice' } });
        fireEvent.change(document.getElementById('orbit-field-category')!, { target: { value: 'Friends' } });
        fireEvent.change(document.getElementById('orbit-field-birthday')!, { target: { value: '2026-06-15' } });
        fireEvent.change(document.getElementById('orbit-field-score')!, { target: { value: '8' } });
        fireEvent.change(document.getElementById('orbit-field-notes')!, { target: { value: 'Met at conference' } });

        // Submit
        const form = document.querySelector('.orbit-form') as HTMLFormElement;
        fireEvent.submit(form);

        expect(onSubmit).toHaveBeenCalledTimes(1);
        const data = onSubmit.mock.calls[0][0];

        expect(data.name).toBe('Alice');
        expect(data.category).toBe('Friends');
        expect(data.frequency).toBe('Monthly'); // default
        expect(data.birthday).toBe('2026-06-15');
        expect(data.score).toBe(8);
        expect(data.active).toBe(true); // default
        expect(data.notes).toBe('Met at conference');
    });

    it('pre-populated form uses initialValues', () => {
        const onSubmit = vi.fn();
        const initialValues = {
            name: 'Bob',
            category: 'Work',
            frequency: 'Weekly',
        };

        render(
            <FormRenderer
                schema={ multiFieldSchema }
                onSubmit = { onSubmit }
                initialValues = { initialValues }
            />
        );

        const nameInput = document.getElementById('orbit-field-name') as HTMLInputElement;
        const categorySelect = document.getElementById('orbit-field-category') as HTMLSelectElement;
        const frequencySelect = document.getElementById('orbit-field-frequency') as HTMLSelectElement;

        expect(nameInput.value).toBe('Bob');
        expect(categorySelect.value).toBe('Work');
        expect(frequencySelect.value).toBe('Weekly');
    });

    it('modal close unmounts React root', () => {
        const modal = new OrbitFormModal(app, multiFieldSchema, vi.fn());
        modal.onOpen();

        const mockRoot = (createRoot as any).mock.results[0].value;
        modal.onClose();

        expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });
});

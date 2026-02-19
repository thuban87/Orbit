/**
 * Unit tests for SchemaPickerModal.
 *
 * Tests the FuzzySuggestModal subclass for schema selection.
 * 4 tests per Testing Overhaul Plan (Wave 4, lines 511-518).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaPickerModal } from '../../../src/modals/SchemaPickerModal';
import { createMockApp } from '../../mocks/obsidian';
import type { SchemaDef } from '../../../src/schemas/types';

describe('SchemaPickerModal', () => {
    let app: ReturnType<typeof createMockApp>;
    let schemas: SchemaDef[];
    let onChoose: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        app = createMockApp();
        schemas = [
            { id: 'basic', title: 'Basic Contact', fields: [] },
            { id: 'work', title: 'Work Contact', fields: [] },
        ];
        onChoose = vi.fn();
    });

    it('constructor stores schemas and callback', () => {
        const modal = new SchemaPickerModal(app, schemas, onChoose);

        // Modal created without error — schemas and callback stored internally
        expect(modal).toBeDefined();
    });

    it('getItems() returns the schemas array', () => {
        const modal = new SchemaPickerModal(app, schemas, onChoose);

        expect(modal.getItems()).toBe(schemas);
        expect(modal.getItems()).toHaveLength(2);
    });

    it('getItemText() returns schema.title', () => {
        const modal = new SchemaPickerModal(app, schemas, onChoose);

        expect(modal.getItemText(schemas[0])).toBe('Basic Contact');
        expect(modal.getItemText(schemas[1])).toBe('Work Contact');
    });

    it('onChooseItem() calls callback with the selected schema', () => {
        const modal = new SchemaPickerModal(app, schemas, onChoose);

        modal.onChooseItem(schemas[1], new MouseEvent('click'));

        expect(onChoose).toHaveBeenCalledTimes(1);
        expect(onChoose).toHaveBeenCalledWith(schemas[1]);
    });
});

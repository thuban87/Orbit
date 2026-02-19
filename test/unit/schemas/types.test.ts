/**
 * Unit tests for src/schemas/types.ts
 */
import { describe, it, expect } from 'vitest';
import { isFieldDef, isSchemaDef } from '../../../src/schemas/types';
import type { FieldDef, SchemaDef } from '../../../src/schemas/types';

describe('isFieldDef', () => {
    it('returns true for a valid minimal FieldDef', () => {
        expect(isFieldDef({ key: 'name', type: 'text', label: 'Name' })).toBe(true);
    });

    it('returns true for a FieldDef with all optional properties', () => {
        const field: FieldDef = {
            key: 'category',
            type: 'dropdown',
            label: 'Category',
            placeholder: 'Select...',
            required: true,
            default: 'Friends',
            options: ['Family', 'Friends', 'Work'],
            layout: 'half-width',
            description: 'Choose a category',
        };
        expect(isFieldDef(field)).toBe(true);
    });

    it('returns true for all valid field types', () => {
        const types = ['text', 'textarea', 'dropdown', 'date', 'toggle', 'number', 'photo'];
        for (const type of types) {
            expect(isFieldDef({ key: 'test', type, label: 'Test' })).toBe(true);
        }
    });

    it('returns false for null', () => {
        expect(isFieldDef(null)).toBe(false);
    });

    it('returns false for undefined', () => {
        expect(isFieldDef(undefined)).toBe(false);
    });

    it('returns false for a string', () => {
        expect(isFieldDef('not a field')).toBe(false);
    });

    it('returns false when key is missing', () => {
        expect(isFieldDef({ type: 'text', label: 'Name' })).toBe(false);
    });

    it('returns false when key is empty string', () => {
        expect(isFieldDef({ key: '', type: 'text', label: 'Name' })).toBe(false);
    });

    it('returns false when type is missing', () => {
        expect(isFieldDef({ key: 'name', label: 'Name' })).toBe(false);
    });

    it('returns false when type is invalid', () => {
        expect(isFieldDef({ key: 'name', type: 'color', label: 'Name' })).toBe(false);
    });

    it('returns false when label is missing', () => {
        expect(isFieldDef({ key: 'name', type: 'text' })).toBe(false);
    });

    it('returns false when label is empty string', () => {
        expect(isFieldDef({ key: 'name', type: 'text', label: '' })).toBe(false);
    });

    it('returns false when key is not a string', () => {
        expect(isFieldDef({ key: 123, type: 'text', label: 'Name' })).toBe(false);
    });
});

describe('isSchemaDef', () => {
    const validField: FieldDef = { key: 'name', type: 'text', label: 'Name' };

    it('returns true for a valid minimal SchemaDef', () => {
        expect(isSchemaDef({ id: 'test', title: 'Test', fields: [validField] })).toBe(true);
    });

    it('returns true for a SchemaDef with all optional properties', () => {
        const schema: SchemaDef = {
            id: 'new-person',
            title: 'New Person',
            cssClass: 'orbit-new-person',
            fields: [validField],
            submitLabel: 'Create',
            output: { path: 'People/{{name}}.md' },
        };
        expect(isSchemaDef(schema)).toBe(true);
    });

    it('returns true for SchemaDef with multiple fields', () => {
        const schema = {
            id: 'multi',
            title: 'Multi-field',
            fields: [
                { key: 'name', type: 'text', label: 'Name' },
                { key: 'age', type: 'number', label: 'Age' },
                { key: 'active', type: 'toggle', label: 'Active' },
            ],
        };
        expect(isSchemaDef(schema)).toBe(true);
    });

    it('returns false for null', () => {
        expect(isSchemaDef(null)).toBe(false);
    });

    it('returns false for undefined', () => {
        expect(isSchemaDef(undefined)).toBe(false);
    });

    it('returns false when id is missing', () => {
        expect(isSchemaDef({ title: 'Test', fields: [validField] })).toBe(false);
    });

    it('returns false when id is empty string', () => {
        expect(isSchemaDef({ id: '', title: 'Test', fields: [validField] })).toBe(false);
    });

    it('returns false when title is missing', () => {
        expect(isSchemaDef({ id: 'test', fields: [validField] })).toBe(false);
    });

    it('returns false when title is empty string', () => {
        expect(isSchemaDef({ id: 'test', title: '', fields: [validField] })).toBe(false);
    });

    it('returns false when fields is not an array', () => {
        expect(isSchemaDef({ id: 'test', title: 'Test', fields: 'not-array' })).toBe(false);
    });

    it('returns false when fields is missing', () => {
        expect(isSchemaDef({ id: 'test', title: 'Test' })).toBe(false);
    });

    it('returns false when any field in the array is invalid', () => {
        expect(isSchemaDef({
            id: 'test',
            title: 'Test',
            fields: [validField, { key: 'bad', type: 'invalid', label: 'Bad' }],
        })).toBe(false);
    });

    it('returns true for empty fields array', () => {
        // A schema with no fields is structurally valid (edge case)
        expect(isSchemaDef({ id: 'test', title: 'Test', fields: [] })).toBe(true);
    });
});

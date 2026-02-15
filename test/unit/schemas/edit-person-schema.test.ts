/**
 * Unit tests for src/schemas/edit-person.schema.ts
 *
 * Validates the built-in Edit Person schema definition against the
 * SchemaDef contract and checks field configuration.
 */
import { describe, it, expect } from 'vitest';
import { editPersonSchema } from '../../../src/schemas/edit-person.schema';
import { newPersonSchema } from '../../../src/schemas/new-person.schema';
import { isSchemaDef, isFieldDef } from '../../../src/schemas/types';

describe('editPersonSchema', () => {
    it('is a valid SchemaDef', () => {
        expect(isSchemaDef(editPersonSchema)).toBe(true);
    });

    it('has the correct id', () => {
        expect(editPersonSchema.id).toBe('edit-person');
    });

    it('has the correct title', () => {
        expect(editPersonSchema.title).toBe('Edit Person');
    });

    it('has submit label "Save Changes"', () => {
        expect(editPersonSchema.submitLabel).toBe('Save Changes');
    });

    it('has no output path (editing, not creating)', () => {
        expect(editPersonSchema.output).toBeUndefined();
    });

    // ── Field Parity ─────────────────────────────────────────

    it('has the same number of fields as newPersonSchema', () => {
        expect(editPersonSchema.fields).toHaveLength(newPersonSchema.fields.length);
    });

    it('has matching field keys with newPersonSchema', () => {
        const editKeys = editPersonSchema.fields.map(f => f.key);
        const newKeys = newPersonSchema.fields.map(f => f.key);
        expect(editKeys).toEqual(newKeys);
    });

    it('has matching field types with newPersonSchema', () => {
        for (const editField of editPersonSchema.fields) {
            const newField = newPersonSchema.fields.find(f => f.key === editField.key);
            expect(newField).toBeDefined();
            expect(editField.type).toBe(newField!.type);
        }
    });

    // ── Key Fields ─────────────────────────────────────────

    it('has a required name field', () => {
        const field = editPersonSchema.fields.find(f => f.key === 'name');
        expect(field).toBeDefined();
        expect(field!.type).toBe('text');
        expect(field!.required).toBe(true);
    });

    it('has a required category dropdown', () => {
        const field = editPersonSchema.fields.find(f => f.key === 'category');
        expect(field).toBeDefined();
        expect(field!.type).toBe('dropdown');
        expect(field!.required).toBe(true);
    });

    it('has a required frequency dropdown', () => {
        const field = editPersonSchema.fields.find(f => f.key === 'frequency');
        expect(field).toBeDefined();
        expect(field!.type).toBe('dropdown');
        expect(field!.required).toBe(true);
    });

    it('has a contact_link text field', () => {
        const field = editPersonSchema.fields.find(f => f.key === 'contact_link');
        expect(field).toBeDefined();
        expect(field!.type).toBe('text');
    });

    // ── All fields are valid ────────────────────────────────

    it('every field passes isFieldDef validation', () => {
        for (const field of editPersonSchema.fields) {
            expect(isFieldDef(field)).toBe(true);
        }
    });
});

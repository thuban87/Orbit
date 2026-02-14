/**
 * Unit tests for src/schemas/new-person.schema.ts
 *
 * Validates the built-in New Person schema definition against the
 * SchemaDef contract and checks field configuration.
 */
import { describe, it, expect } from 'vitest';
import { newPersonSchema } from '../../../src/schemas/new-person.schema';
import { isSchemaDef, isFieldDef } from '../../../src/schemas/types';

describe('newPersonSchema', () => {
    it('is a valid SchemaDef', () => {
        expect(isSchemaDef(newPersonSchema)).toBe(true);
    });

    it('has the correct id', () => {
        expect(newPersonSchema.id).toBe('new-person');
    });

    it('has the correct title', () => {
        expect(newPersonSchema.title).toBe('New Person');
    });

    it('has a submit label', () => {
        expect(newPersonSchema.submitLabel).toBe('Create Contact');
    });

    it('has an output path defined', () => {
        expect(newPersonSchema.output?.path).toBeDefined();
    });

    // ── Required Fields ─────────────────────────────────────────

    it('has a required name field', () => {
        const field = newPersonSchema.fields.find(f => f.key === 'name');
        expect(field).toBeDefined();
        expect(field!.type).toBe('text');
        expect(field!.required).toBe(true);
    });

    it('has a required category dropdown', () => {
        const field = newPersonSchema.fields.find(f => f.key === 'category');
        expect(field).toBeDefined();
        expect(field!.type).toBe('dropdown');
        expect(field!.required).toBe(true);
        expect(field!.options).toBeDefined();
        expect(field!.options!.length).toBeGreaterThanOrEqual(3);
    });

    it('has a required frequency dropdown with Monthly default', () => {
        const field = newPersonSchema.fields.find(f => f.key === 'frequency');
        expect(field).toBeDefined();
        expect(field!.type).toBe('dropdown');
        expect(field!.required).toBe(true);
        expect(field!.default).toBe('Monthly');
    });

    // ── Optional Fields ─────────────────────────────────────────

    it('has an optional social_battery dropdown', () => {
        const field = newPersonSchema.fields.find(f => f.key === 'social_battery');
        expect(field).toBeDefined();
        expect(field!.type).toBe('dropdown');
        expect(field!.required).toBeFalsy();
    });

    it('has an optional birthday date field', () => {
        const field = newPersonSchema.fields.find(f => f.key === 'birthday');
        expect(field).toBeDefined();
        expect(field!.type).toBe('date');
    });

    it('has a photo field', () => {
        const field = newPersonSchema.fields.find(f => f.key === 'photo');
        expect(field).toBeDefined();
        expect(field!.type).toBe('photo');
    });

    it('has a google_contact text field', () => {
        const field = newPersonSchema.fields.find(f => f.key === 'google_contact');
        expect(field).toBeDefined();
        expect(field!.type).toBe('text');
    });

    // ── All fields are valid ────────────────────────────────────

    it('every field passes isFieldDef validation', () => {
        for (const field of newPersonSchema.fields) {
            expect(isFieldDef(field)).toBe(true);
        }
    });

    it('has 7 fields total', () => {
        expect(newPersonSchema.fields).toHaveLength(7);
    });

    // ── Frequency options match valid Frequencies ────────────────

    it('frequency options include standard orbit intervals', () => {
        const field = newPersonSchema.fields.find(f => f.key === 'frequency');
        const options = field!.options!;
        expect(options).toContain('Weekly');
        expect(options).toContain('Monthly');
        expect(options).toContain('Quarterly');
        expect(options).toContain('Yearly');
    });
});

/**
 * Unit tests for UpdatePanel component.
 *
 * Tests rendering, user interactions (date, dropdown, textarea),
 * save callback, and cancel/back navigation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { UpdatePanel } from '../../../src/components/UpdatePanel';
import { createOrbitContact, createTFile } from '../../helpers/factories';
import type { OrbitContact, LastInteractionType } from '../../../src/types';

// Mock OrbitContext (not used by UpdatePanel but imported by ContactCard chain)
vi.mock('../../../src/context/OrbitContext', () => ({
    useOrbitOptional: () => null,
}));

describe('UpdatePanel', () => {
    let contact: OrbitContact;
    let onSave: ReturnType<typeof vi.fn<(data: { lastContact: string; interactionType: LastInteractionType; note: string }) => void>>;
    let onCancel: ReturnType<typeof vi.fn<() => void>>;

    beforeEach(() => {
        vi.clearAllMocks();
        contact = createOrbitContact({
            name: 'Alice Adams',
            status: 'decay',
            photo: 'https://example.com/alice.jpg',
            file: createTFile({ path: 'People/Alice Adams.md' }),
        });
        onSave = vi.fn();
        onCancel = vi.fn();
    });

    // ── Rendering ─────────────────────────────────────────

    it('renders contact name in header', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        const name = container.querySelector('.orbit-update-name');
        expect(name!.textContent).toBe('Alice Adams');
    });

    it('renders status badge', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        const status = container.querySelector('.orbit-update-status');
        expect(status!.textContent).toBe('Decay');
        expect(status!.classList.contains('orbit-update-status--decay')).toBe(true);
    });

    it('renders photo when URL is provided', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        const img = container.querySelector('.orbit-avatar') as HTMLImageElement;
        expect(img).toBeDefined();
        expect(img.src).toBe('https://example.com/alice.jpg');
    });

    it('renders initials fallback when no photo URL', () => {
        const noPhoto = createOrbitContact({
            name: 'Bob Baker',
            status: 'stable',
            photo: undefined,
            file: createTFile({ path: 'People/Bob Baker.md' }),
        });

        const { container } = render(
            <UpdatePanel contact={noPhoto} onSave={onSave} onCancel={onCancel} />
        );

        const fallback = container.querySelector('.orbit-avatar-fallback');
        expect(fallback).toBeDefined();
        expect(fallback!.textContent).toBe('BB');
    });

    it('renders initials fallback for vault-path photo', () => {
        const vaultPhoto = createOrbitContact({
            name: 'Carol Clark',
            status: 'wobble',
            photo: 'attachments/carol.png',
            file: createTFile({ path: 'People/Carol Clark.md' }),
        });

        const { container } = render(
            <UpdatePanel contact={vaultPhoto} onSave={onSave} onCancel={onCancel} />
        );

        // Vault paths are not URLs, so initials should show
        const fallback = container.querySelector('.orbit-avatar-fallback');
        expect(fallback).toBeDefined();
        expect(fallback!.textContent).toBe('CC');
    });

    it('renders date input with today as default', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
        expect(dateInput).toBeDefined();
        // Should be YYYY-MM-DD format
        expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('renders interaction type dropdown with all options', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        const select = container.querySelector('.orbit-field__select') as HTMLSelectElement;
        expect(select).toBeDefined();

        const options = Array.from(select.querySelectorAll('option'));
        const values = options.map(o => o.value);
        expect(values).toEqual(['call', 'text', 'in-person', 'email', 'other']);
    });

    it('renders note textarea', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        const textarea = container.querySelector('.orbit-field__textarea') as HTMLTextAreaElement;
        expect(textarea).toBeDefined();
        expect(textarea.placeholder).toBe('Optional interaction note...');
    });

    it('renders Save and Back buttons', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        const buttons = container.querySelectorAll('button');
        const buttonTexts = Array.from(buttons).map(b => b.textContent);
        expect(buttonTexts).toContain('← Back');
        expect(buttonTexts).toContain('Save');
    });

    // ── Interactions ──────────────────────────────────────

    it('calls onCancel when Back button is clicked', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        const backBtn = Array.from(container.querySelectorAll('button'))
            .find(b => b.textContent === '← Back')!;
        fireEvent.click(backBtn);

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onSave with default values when Save is clicked', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        const saveBtn = Array.from(container.querySelectorAll('button'))
            .find(b => b.textContent === 'Save')!;
        fireEvent.click(saveBtn);

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                lastContact: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                interactionType: 'call',
                note: '',
            })
        );
    });

    it('calls onSave with changed interaction type', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        // Change interaction type to 'text'
        const select = container.querySelector('.orbit-field__select') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'text' } });

        // Click save
        const saveBtn = Array.from(container.querySelectorAll('button'))
            .find(b => b.textContent === 'Save')!;
        fireEvent.click(saveBtn);

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                interactionType: 'text',
            })
        );
    });

    it('calls onSave with note text (trimmed)', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        // Type a note
        const textarea = container.querySelector('.orbit-field__textarea') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '  Had coffee together  ' } });

        // Click save
        const saveBtn = Array.from(container.querySelectorAll('button'))
            .find(b => b.textContent === 'Save')!;
        fireEvent.click(saveBtn);

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                note: 'Had coffee together',
            })
        );
    });

    it('calls onSave with changed date', () => {
        const { container } = render(
            <UpdatePanel contact={contact} onSave={onSave} onCancel={onCancel} />
        );

        // Change date
        const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: '2026-01-15' } });

        // Click save
        const saveBtn = Array.from(container.querySelectorAll('button'))
            .find(b => b.textContent === 'Save')!;
        fireEvent.click(saveBtn);

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                lastContact: '2026-01-15',
            })
        );
    });

    // ── Status Display ────────────────────────────────────

    it('shows correct status label for stable', () => {
        const stableContact = createOrbitContact({
            name: 'Stable Sam',
            status: 'stable',
            file: createTFile({ path: 'People/Sam.md' }),
        });

        const { container } = render(
            <UpdatePanel contact={stableContact} onSave={onSave} onCancel={onCancel} />
        );

        const status = container.querySelector('.orbit-update-status');
        expect(status!.textContent).toBe('Stable');
        expect(status!.classList.contains('orbit-update-status--stable')).toBe(true);
    });

    it('shows correct status label for snoozed', () => {
        const snoozedContact = createOrbitContact({
            name: 'Snoozed Sandy',
            status: 'snoozed',
            file: createTFile({ path: 'People/Sandy.md' }),
        });

        const { container } = render(
            <UpdatePanel contact={snoozedContact} onSave={onSave} onCancel={onCancel} />
        );

        const status = container.querySelector('.orbit-update-status');
        expect(status!.textContent).toBe('Snoozed');
    });
});

/**
 * Unit tests for ContactPickerGrid component.
 *
 * Tests search filtering, status sorting, filters (category, social battery),
 * sort-by-last-contacted, "show decaying only" toggle, empty states,
 * and onSelect callback propagation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ContactPickerGrid } from '../../../src/components/ContactPickerGrid';
import { createOrbitContact, createTFile } from '../../helpers/factories';
import type { OrbitContact } from '../../../src/types';

// Mock OrbitContext (ContactCard uses useOrbitOptional)
vi.mock('../../../src/context/OrbitContext', () => ({
    useOrbitOptional: () => null,
}));

// Mock createPortal (FuelTooltip uses it via ContactCard)
vi.mock('react-dom', async () => {
    const actual = await vi.importActual('react-dom');
    return {
        ...actual,
        createPortal: (children: React.ReactNode) => children,
    };
});

function makeContacts(): OrbitContact[] {
    return [
        createOrbitContact({
            name: 'Alice Adams',
            status: 'stable',
            category: 'Family',
            socialBattery: 'Charger',
            daysSinceContact: 5,
            file: createTFile({ path: 'People/Alice Adams.md' }),
        }),
        createOrbitContact({
            name: 'Bob Baker',
            status: 'decay',
            category: 'Friends',
            socialBattery: 'Neutral',
            daysSinceContact: 30,
            file: createTFile({ path: 'People/Bob Baker.md' }),
        }),
        createOrbitContact({
            name: 'Carol Clark',
            status: 'wobble',
            category: 'Work',
            socialBattery: 'Drain',
            daysSinceContact: 15,
            file: createTFile({ path: 'People/Carol Clark.md' }),
        }),
        createOrbitContact({
            name: 'Dave Davis',
            status: 'snoozed',
            category: 'Family',
            socialBattery: 'Charger',
            daysSinceContact: 60,
            file: createTFile({ path: 'People/Dave Davis.md' }),
        }),
    ];
}

describe('ContactPickerGrid', () => {
    let onSelect: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onSelect = vi.fn();
    });

    // ── Rendering ───────────────────────────────────────

    describe('rendering', () => {
        it('renders all contacts as cards', () => {
            const contacts = makeContacts();
            const { container } = render(
                <ContactPickerGrid contacts={contacts} onSelect={onSelect} />
            );

            const cards = container.querySelectorAll('.orbit-card');
            expect(cards.length).toBe(4);
        });

        it('renders search input', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const search = container.querySelector('.orbit-picker-search') as HTMLInputElement;
            expect(search).not.toBeNull();
            expect(search.placeholder).toBe('Search contacts...');
        });

        it('renders filter dropdowns', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const selects = container.querySelectorAll('.orbit-picker-select');
            expect(selects.length).toBe(3); // category, battery, sort
        });

        it('renders "decaying only" toggle', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const toggle = container.querySelector('.orbit-picker-toggle');
            expect(toggle).not.toBeNull();
            expect(toggle!.textContent).toContain('Decaying only');
        });
    });

    // ── Status Sorting ──────────────────────────────────

    describe('status sorting', () => {
        it('sorts contacts by status: decay → wobble → stable → snoozed', () => {
            const contacts = makeContacts();
            const { container } = render(
                <ContactPickerGrid contacts={contacts} onSelect={onSelect} />
            );

            const names = Array.from(container.querySelectorAll('.orbit-name'))
                .map((el) => el.textContent);

            expect(names).toEqual([
                'Bob Baker',      // decay
                'Carol Clark',    // wobble
                'Alice Adams',    // stable
                'Dave Davis',     // snoozed
            ]);
        });
    });

    // ── Search Filtering ────────────────────────────────

    describe('search filtering', () => {
        it('filters contacts by name (case-insensitive)', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const search = container.querySelector('.orbit-picker-search') as HTMLInputElement;
            fireEvent.change(search, { target: { value: 'alice' } });

            const cards = container.querySelectorAll('.orbit-card');
            expect(cards.length).toBe(1);

            const name = container.querySelector('.orbit-name');
            expect(name!.textContent).toBe('Alice Adams');
        });

        it('shows empty state when search has no matches', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const search = container.querySelector('.orbit-picker-search') as HTMLInputElement;
            fireEvent.change(search, { target: { value: 'zzzzz' } });

            const empty = container.querySelector('.orbit-picker-empty');
            expect(empty).not.toBeNull();
            expect(empty!.textContent).toContain('No contacts match');
        });

        it('trims whitespace from search query', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const search = container.querySelector('.orbit-picker-search') as HTMLInputElement;
            fireEvent.change(search, { target: { value: '  bob  ' } });

            const cards = container.querySelectorAll('.orbit-card');
            expect(cards.length).toBe(1);
        });
    });

    // ── Decaying Only Toggle ────────────────────────────

    describe('show decaying only toggle', () => {
        it('filters to decay + wobble contacts only when checked', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const checkbox = container.querySelector('.orbit-picker-toggle input[type="checkbox"]') as HTMLInputElement;
            fireEvent.click(checkbox);

            const names = Array.from(container.querySelectorAll('.orbit-name'))
                .map((el) => el.textContent);

            expect(names).toEqual(['Bob Baker', 'Carol Clark']);
        });

        it('shows all contacts when toggle is unchecked', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const checkbox = container.querySelector('.orbit-picker-toggle input[type="checkbox"]') as HTMLInputElement;
            fireEvent.click(checkbox);
            fireEvent.click(checkbox);

            const cards = container.querySelectorAll('.orbit-card');
            expect(cards.length).toBe(4);
        });
    });

    // ── Category Filter ─────────────────────────────────

    describe('category filter', () => {
        it('filters contacts by category', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const selects = container.querySelectorAll('.orbit-picker-select');
            const categorySelect = selects[0] as HTMLSelectElement;
            fireEvent.change(categorySelect, { target: { value: 'Family' } });

            const names = Array.from(container.querySelectorAll('.orbit-name'))
                .map((el) => el.textContent);

            expect(names).toContain('Alice Adams');
            expect(names).toContain('Dave Davis');
            expect(names).not.toContain('Bob Baker');
        });
    });

    // ── Social Battery Filter ───────────────────────────

    describe('social battery filter', () => {
        it('filters contacts by social battery', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const selects = container.querySelectorAll('.orbit-picker-select');
            const batterySelect = selects[1] as HTMLSelectElement;
            fireEvent.change(batterySelect, { target: { value: 'Charger' } });

            const names = Array.from(container.querySelectorAll('.orbit-name'))
                .map((el) => el.textContent);

            expect(names).toContain('Alice Adams');
            expect(names).toContain('Dave Davis');
            expect(names).not.toContain('Bob Baker');
            expect(names).not.toContain('Carol Clark');
        });
    });

    // ── Sort by Last Contacted ──────────────────────────

    describe('sort by last contacted', () => {
        it('sorts by least recent first', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const selects = container.querySelectorAll('.orbit-picker-select');
            const sortSelect = selects[2] as HTMLSelectElement;
            fireEvent.change(sortSelect, { target: { value: 'last-asc' } });

            const names = Array.from(container.querySelectorAll('.orbit-name'))
                .map((el) => el.textContent);

            // Dave(60) > Bob(30) > Carol(15) > Alice(5)
            expect(names).toEqual(['Dave Davis', 'Bob Baker', 'Carol Clark', 'Alice Adams']);
        });

        it('sorts by most recent first', () => {
            const { container } = render(
                <ContactPickerGrid contacts={makeContacts()} onSelect={onSelect} />
            );

            const selects = container.querySelectorAll('.orbit-picker-select');
            const sortSelect = selects[2] as HTMLSelectElement;
            fireEvent.change(sortSelect, { target: { value: 'last-desc' } });

            const names = Array.from(container.querySelectorAll('.orbit-name'))
                .map((el) => el.textContent);

            // Alice(5) > Carol(15) > Bob(30) > Dave(60)
            expect(names).toEqual(['Alice Adams', 'Carol Clark', 'Bob Baker', 'Dave Davis']);
        });
    });

    // ── Empty State ─────────────────────────────────────

    describe('empty state', () => {
        it('shows "no contacts found" when contacts array is empty', () => {
            const { container } = render(
                <ContactPickerGrid contacts={[]} onSelect={onSelect} />
            );

            const empty = container.querySelector('.orbit-picker-empty');
            expect(empty).not.toBeNull();
            expect(empty!.textContent).toContain('No contacts found');
        });
    });

    // ── onSelect Callback ───────────────────────────────

    describe('onSelect callback', () => {
        it('fires onSelect with correct contact when card is clicked', () => {
            const contacts = makeContacts();
            const { container } = render(
                <ContactPickerGrid contacts={contacts} onSelect={onSelect} />
            );

            // Click the first card (should be Bob Baker = decay, sorted first)
            const cards = container.querySelectorAll('.orbit-card');
            fireEvent.click(cards[0]);

            expect(onSelect).toHaveBeenCalledTimes(1);
            expect(onSelect).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Bob Baker' })
            );
        });
    });
});

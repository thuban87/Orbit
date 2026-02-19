/**
 * Integration test for the Contact Picker flow.
 *
 * Full flow: render picker grid with test contacts → search → filter → select →
 * verify onSelect fires with the correct contact.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ContactPickerGrid } from '../../src/components/ContactPickerGrid';
import { createOrbitContact, createTFile } from '../helpers/factories';
import type { OrbitContact } from '../../src/types';

// Mock OrbitContext (ContactCard uses useOrbitOptional)
vi.mock('../../src/context/OrbitContext', () => ({
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
        createOrbitContact({
            name: 'Eve Edwards',
            status: 'decay',
            category: 'Friends',
            socialBattery: 'Neutral',
            daysSinceContact: 45,
            file: createTFile({ path: 'People/Eve Edwards.md' }),
        }),
    ];
}

describe('Picker Flow (Integration)', () => {
    let onSelect: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onSelect = vi.fn();
    });

    it('renders grid → searches → selects correct contact', () => {
        const contacts = makeContacts();
        const { container } = render(
            <ContactPickerGrid contacts={contacts} onSelect={onSelect} />
        );

        // 1. All 5 contacts rendered initially
        let cards = container.querySelectorAll('.orbit-card');
        expect(cards.length).toBe(5);

        // 2. Search for "eve"
        const search = container.querySelector('.orbit-picker-search') as HTMLInputElement;
        fireEvent.change(search, { target: { value: 'eve' } });

        // 3. Only Eve Edwards should be visible
        cards = container.querySelectorAll('.orbit-card');
        expect(cards.length).toBe(1);

        const name = container.querySelector('.orbit-name');
        expect(name!.textContent).toBe('Eve Edwards');

        // 4. Click the card
        fireEvent.click(cards[0]);

        // 5. onSelect called with Eve's contact
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Eve Edwards' })
        );
    });

    it('filters to decaying only → selects from filtered set', () => {
        const contacts = makeContacts();
        const { container } = render(
            <ContactPickerGrid contacts={contacts} onSelect={onSelect} />
        );

        // 1. Toggle "decaying only"
        const checkbox = container.querySelector('.orbit-picker-toggle input[type="checkbox"]') as HTMLInputElement;
        fireEvent.click(checkbox);

        // 2. Should show only decay + wobble contacts (Bob, Eve = decay; Carol = wobble)
        const cards = container.querySelectorAll('.orbit-card');
        expect(cards.length).toBe(3);

        const names = Array.from(container.querySelectorAll('.orbit-name'))
            .map((el) => el.textContent);
        expect(names).toContain('Bob Baker');
        expect(names).toContain('Eve Edwards');
        expect(names).toContain('Carol Clark');
        expect(names).not.toContain('Alice Adams');
        expect(names).not.toContain('Dave Davis');

        // 3. Click the first card (should be a decay contact, sorted first)
        fireEvent.click(cards[0]);

        expect(onSelect).toHaveBeenCalledTimes(1);
        const selectedName = onSelect.mock.calls[0][0].name;
        expect(['Bob Baker', 'Eve Edwards']).toContain(selectedName);
    });

    it('search + decaying only filter work together', () => {
        const contacts = makeContacts();
        const { container } = render(
            <ContactPickerGrid contacts={contacts} onSelect={onSelect} />
        );

        // 1. Toggle "decaying only"
        const checkbox = container.querySelector('.orbit-picker-toggle input[type="checkbox"]') as HTMLInputElement;
        fireEvent.click(checkbox);

        // 2. Search for "bob"
        const search = container.querySelector('.orbit-picker-search') as HTMLInputElement;
        fireEvent.change(search, { target: { value: 'bob' } });

        // 3. Only Bob Baker (decay) should match
        const cards = container.querySelectorAll('.orbit-card');
        expect(cards.length).toBe(1);

        const name = container.querySelector('.orbit-name');
        expect(name!.textContent).toBe('Bob Baker');

        // 4. Click and verify
        fireEvent.click(cards[0]);
        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Bob Baker' })
        );
    });

    it('clearing search restores full contact list', () => {
        const contacts = makeContacts();
        const { container } = render(
            <ContactPickerGrid contacts={contacts} onSelect={onSelect} />
        );

        const search = container.querySelector('.orbit-picker-search') as HTMLInputElement;

        fireEvent.change(search, { target: { value: 'eve' } });
        expect(container.querySelectorAll('.orbit-card').length).toBe(1);

        fireEvent.change(search, { target: { value: '' } });
        expect(container.querySelectorAll('.orbit-card').length).toBe(5);
    });

    it('category filter + sort by last contacted', () => {
        const contacts = makeContacts();
        const { container } = render(
            <ContactPickerGrid contacts={contacts} onSelect={onSelect} />
        );

        // Filter to Friends category
        const selects = container.querySelectorAll('.orbit-picker-select');
        fireEvent.change(selects[0], { target: { value: 'Friends' } });

        let names = Array.from(container.querySelectorAll('.orbit-name'))
            .map((el) => el.textContent);
        expect(names).toContain('Bob Baker');
        expect(names).toContain('Eve Edwards');
        expect(names.length).toBe(2);

        // Sort by most recent first
        fireEvent.change(selects[2], { target: { value: 'last-desc' } });

        names = Array.from(container.querySelectorAll('.orbit-name'))
            .map((el) => el.textContent);
        // Bob(30) < Eve(45), so Bob is more recent
        expect(names).toEqual(['Bob Baker', 'Eve Edwards']);
    });
});

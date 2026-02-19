/**
 * Unit tests for src/components/ContactGrid.tsx
 *
 * Wave 2 — Testing Overhaul Plan lines 244-265.
 * Private function getSectionIndex is tested through rendered section headings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { ContactGrid } from '../../../src/components/ContactGrid';
import { createOrbitContact, createTFile } from '../../helpers/factories';
import type { OrbitContact } from '../../../src/types';

// ── Mock OrbitContext ──────────────────────────────────────────
let mockContacts: OrbitContact[] = [];

vi.mock('../../../src/context/OrbitContext', () => ({
    useOrbit: () => ({ contacts: mockContacts }),
}));

// ── Mock ContactCard to avoid deep rendering ──────────────────
vi.mock('../../../src/components/ContactCard', () => ({
    ContactCard: ({ contact }: { contact: OrbitContact }) => (
        <div data-testid={`card-${contact.name}`} className="orbit-card">
            {contact.name}
        </div>
    ),
}));

// ── Helpers ───────────────────────────────────────────────────

function makeContact(name: string, overrides: Partial<OrbitContact> = {}): OrbitContact {
    return createOrbitContact({
        name,
        file: createTFile({ path: `People/${name}.md` }),
        ...overrides,
    });
}

describe('ContactGrid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockContacts = [];
    });

    // ── Empty States ─────────────────────────────────────────

    it('shows "No contacts found" when contacts list is empty', () => {
        mockContacts = [];

        const { container } = render(
            <ContactGrid sortMode="status" filterMode="all" />
        );

        expect(container.querySelector('.orbit-empty h3')?.textContent).toBe('No contacts found');
    });

    it('shows "No contacts match filter" when filtered to 0', () => {
        mockContacts = [
            makeContact('Alice', { socialBattery: 'Neutral' }),
        ];

        const { container } = render(
            <ContactGrid sortMode="status" filterMode="charger" />
        );

        expect(container.querySelector('.orbit-empty h3')?.textContent).toBe('No contacts match filter');
    });

    // ── Category Grouping (exercises getSectionIndex) ────────

    it('places Family contact under "Family & Friends" section', () => {
        mockContacts = [makeContact('Mom', { category: 'Family' })];

        const { container } = render(
            <ContactGrid sortMode="status" filterMode="all" />
        );

        const titles = container.querySelectorAll('.orbit-section-title');
        const titleTexts = Array.from(titles).map(t => t.textContent);
        expect(titleTexts).toContain('Family & Friends');
    });

    it('places Work contact under "Community & Professional" section', () => {
        mockContacts = [makeContact('Boss', { category: 'Work' })];

        const { container } = render(
            <ContactGrid sortMode="status" filterMode="all" />
        );

        const titles = container.querySelectorAll('.orbit-section-title');
        const titleTexts = Array.from(titles).map(t => t.textContent);
        expect(titleTexts).toContain('Community & Professional');
    });

    it('places Service contact under "Service" section', () => {
        mockContacts = [makeContact('Plumber', { category: 'Service' })];

        const { container } = render(
            <ContactGrid sortMode="status" filterMode="all" />
        );

        const titles = container.querySelectorAll('.orbit-section-title');
        const titleTexts = Array.from(titles).map(t => t.textContent);
        expect(titleTexts).toContain('Service');
    });

    it('places uncategorized contact in "Other" section', () => {
        mockContacts = [makeContact('Random', { category: 'Unknown' })];

        const { container } = render(
            <ContactGrid sortMode="status" filterMode="all" />
        );

        const titles = container.querySelectorAll('.orbit-section-title');
        const titleTexts = Array.from(titles).map(t => t.textContent);
        expect(titleTexts).toContain('Other');
    });

    // ── Filtering ────────────────────────────────────────────

    it('filterMode="charger" shows only Charger contacts', () => {
        mockContacts = [
            makeContact('Charger Alice', { socialBattery: 'Charger' }),
            makeContact('Neutral Bob', { socialBattery: 'Neutral' }),
            makeContact('Drain Carol', { socialBattery: 'Drain' }),
        ];

        const { container } = render(
            <ContactGrid sortMode="status" filterMode="charger" />
        );

        const cards = container.querySelectorAll('.orbit-card');
        expect(cards.length).toBe(1);
        expect(cards[0].textContent).toBe('Charger Alice');
    });

    it('filterMode="decay" shows only decay and wobble contacts', () => {
        mockContacts = [
            makeContact('Decay Dave', { status: 'decay' }),
            makeContact('Wobble Eve', { status: 'wobble' }),
            makeContact('Stable Frank', { status: 'stable' }),
            makeContact('Snoozed Grace', { status: 'snoozed' }),
        ];

        const { container } = render(
            <ContactGrid sortMode="status" filterMode="decay" />
        );

        const cards = container.querySelectorAll('.orbit-card');
        expect(cards.length).toBe(2);
        const names = Array.from(cards).map(c => c.textContent);
        expect(names).toContain('Decay Dave');
        expect(names).toContain('Wobble Eve');
    });

    // ── Sorting ──────────────────────────────────────────────

    it('sortMode="name" orders contacts alphabetically', () => {
        // All same category to test sort within a section
        mockContacts = [
            makeContact('Charlie', { category: 'Friends' }),
            makeContact('Alice', { category: 'Friends' }),
            makeContact('Bob', { category: 'Friends' }),
        ];

        const { container } = render(
            <ContactGrid sortMode="name" filterMode="all" />
        );

        const cards = container.querySelectorAll('.orbit-card');
        const names = Array.from(cards).map(c => c.textContent);
        expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sortMode="status" orders decay first, snoozed last', () => {
        mockContacts = [
            makeContact('Stable', { category: 'Friends', status: 'stable' }),
            makeContact('Snoozed', { category: 'Friends', status: 'snoozed' }),
            makeContact('Decay', { category: 'Friends', status: 'decay' }),
            makeContact('Wobble', { category: 'Friends', status: 'wobble' }),
        ];

        const { container } = render(
            <ContactGrid sortMode="status" filterMode="all" />
        );

        const cards = container.querySelectorAll('.orbit-card');
        const names = Array.from(cards).map(c => c.textContent);
        expect(names).toEqual(['Decay', 'Wobble', 'Stable', 'Snoozed']);
    });
});

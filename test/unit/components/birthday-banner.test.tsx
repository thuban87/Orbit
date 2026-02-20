/**
 * Unit tests for src/components/BirthdayBanner.tsx
 *
 * Wave 2 — Testing Overhaul Plan lines 269-299.
 * Private function getDaysUntilBirthday is tested through rendered output.
 *
 * CRITICAL: Uses vi.useFakeTimers() + vi.setSystemTime() pinned to midnight
 * Jan 1 2026 to avoid flaky day-boundary tests caused by Math.ceil().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { BirthdayBanner } from '../../../src/components/BirthdayBanner';
import { createOrbitContact, createTFile } from '../../helpers/factories';
import type { OrbitContact } from '../../../src/types';

// ── Mock OrbitContext ──────────────────────────────────────────
let mockContacts: OrbitContact[] = [];
const mockOpenFile = vi.fn();
const mockGetLeaf = vi.fn(() => ({ openFile: mockOpenFile }));

const mockPlugin = {
    app: {
        workspace: { getLeaf: mockGetLeaf },
    },
};

vi.mock('../../../src/context/OrbitContext', () => ({
    useOrbit: () => ({
        contacts: mockContacts,
        plugin: mockPlugin,
    }),
}));

// ── Helpers ───────────────────────────────────────────────────

function makeContact(name: string, birthday?: string): OrbitContact {
    return createOrbitContact({
        name,
        birthday,
        file: createTFile({ path: `People/${name}.md` }),
    });
}

describe('BirthdayBanner', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Pin to midnight Jan 1 2026 to avoid day-boundary flakiness
        vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
        vi.clearAllMocks();
        mockContacts = [];
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ── Rendering Tests ──────────────────────────────────────

    it('renders nothing when no upcoming birthdays', () => {
        mockContacts = [
            makeContact('Alice', '06-15'),  // June 15 — way out of range
            makeContact('Bob'),              // No birthday
        ];

        const { container } = render(<BirthdayBanner />);
        expect(container.querySelector('.orbit-birthday-banner')).toBeNull();
    });

    it('shows "🎉 Today!" for birthday on Jan 1', () => {
        mockContacts = [makeContact('Alice', '01-01')];

        const { container } = render(<BirthdayBanner />);

        const item = container.querySelector('.orbit-birthday-item')!;
        expect(item).not.toBeNull();
        expect(item.querySelector('strong')?.textContent).toBe('Alice');
        expect(item.querySelector('.orbit-birthday-days')?.textContent).toBe('🎉 Today!');
    });

    it('shows "Tomorrow" for birthday on Jan 2', () => {
        mockContacts = [makeContact('Bob', '01-02')];

        const { container } = render(<BirthdayBanner />);

        const days = container.querySelector('.orbit-birthday-days');
        expect(days?.textContent).toBe('Tomorrow');
    });

    it('shows "in 3 days" for birthday on Jan 4', () => {
        mockContacts = [makeContact('Carol', '01-04')];

        const { container } = render(<BirthdayBanner />);

        const days = container.querySelector('.orbit-birthday-days');
        expect(days?.textContent).toBe('in 3 days');
    });

    it('does not show birthday 8 days away (Jan 9)', () => {
        mockContacts = [makeContact('Dave', '01-09')];

        const { container } = render(<BirthdayBanner />);
        expect(container.querySelector('.orbit-birthday-banner')).toBeNull();
    });

    it('parses MM-DD format correctly', () => {
        mockContacts = [makeContact('Eve', '01-03')];

        const { container } = render(<BirthdayBanner />);

        const days = container.querySelector('.orbit-birthday-days');
        expect(days?.textContent).toBe('in 2 days');
    });

    it('parses YYYY-MM-DD format correctly', () => {
        mockContacts = [makeContact('Frank', '1990-01-03')];

        const { container } = render(<BirthdayBanner />);

        const days = container.querySelector('.orbit-birthday-days');
        expect(days?.textContent).toBe('in 2 days');
    });

    it('ignores invalid birthday format silently', () => {
        mockContacts = [
            makeContact('Invalid', 'not-a-date'),
            makeContact('Good', '01-02'),
        ];

        const { container } = render(<BirthdayBanner />);

        const items = container.querySelectorAll('.orbit-birthday-item');
        expect(items.length).toBe(1);
        expect(items[0].querySelector('strong')?.textContent).toBe('Good');
    });

    it('sorts multiple birthdays by soonest first', () => {
        mockContacts = [
            makeContact('Late', '01-05'),
            makeContact('Early', '01-02'),
            makeContact('Middle', '01-03'),
        ];

        const { container } = render(<BirthdayBanner />);

        const items = container.querySelectorAll('.orbit-birthday-item');
        expect(items.length).toBe(3);
        expect(items[0].querySelector('strong')?.textContent).toBe('Early');
        expect(items[1].querySelector('strong')?.textContent).toBe('Middle');
        expect(items[2].querySelector('strong')?.textContent).toBe('Late');
    });

    it('clicking birthday item opens contact note', () => {
        mockContacts = [makeContact('Alice', '01-01')];

        const { container } = render(<BirthdayBanner />);

        const item = container.querySelector('.orbit-birthday-item')!;
        fireEvent.click(item);

        expect(mockGetLeaf).toHaveBeenCalled();
        expect(mockOpenFile).toHaveBeenCalledWith(mockContacts[0].file);
    });

    // ── Year Rollover Test ───────────────────────────────────

    it('handles year rollover: Dec 25 not shown from Jan 1, shown from Dec 20', () => {
        mockContacts = [makeContact('Xmas', '12-25')];

        // From Jan 1 2026 — Dec 25 is ~359 days away, not shown
        const { container: container1 } = render(<BirthdayBanner />);
        expect(container1.querySelector('.orbit-birthday-banner')).toBeNull();

        // Now move to Dec 20 2026
        vi.setSystemTime(new Date(2026, 11, 20, 0, 0, 0));

        const { container: container2 } = render(<BirthdayBanner />);
        const days = container2.querySelector('.orbit-birthday-days');
        expect(days?.textContent).toBe('in 5 days');
    });
});

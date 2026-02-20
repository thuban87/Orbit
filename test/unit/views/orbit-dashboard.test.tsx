/**
 * Unit tests for src/views/OrbitDashboard.tsx
 *
 * Wave 3 — Testing Overhaul Plan lines 429-444.
 *
 * OrbitDashboard is the root React component wrapping content in OrbitProvider.
 * DashboardContent is unexported — all tests go through OrbitDashboard.
 * Child components are mocked as simple elements that expose their props
 * via data attributes for assertion.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';

// ──────────────────────────────────────────────────────────────────
// Module-level mocks (hoisted before imports)
// ──────────────────────────────────────────────────────────────────

// Track the latest props passed to each child component
let lastHeaderProps: any = {};
let lastGridProps: any = {};

vi.mock('../../../src/context/OrbitContext', () => ({
    OrbitProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="orbit-provider">{children}</div>,
    useOrbit: () => ({
        contacts: [{ name: 'Alice' }, { name: 'Bob' }],
        plugin: {},
        refreshContacts: vi.fn(),
    }),
}));

vi.mock('../../../src/components/ContactGrid', () => ({
    ContactGrid: (props: any) => {
        lastGridProps = props;
        return <div data-testid="contact-grid" data-sort={props.sortMode} data-filter={props.filterMode} />;
    },
}));

vi.mock('../../../src/components/OrbitHeader', () => ({
    OrbitHeader: (props: any) => {
        lastHeaderProps = props;
        return (
            <div data-testid="orbit-header">
                <button data-testid="sort-trigger" onClick={() => props.onSortChange('name')} />
                <button data-testid="filter-trigger" onClick={() => props.onFilterChange('decay')} />
            </div>
        );
    },
    // Re-export types that OrbitDashboard imports
    SortMode: {},
    FilterMode: {},
}));

vi.mock('../../../src/components/BirthdayBanner', () => ({
    BirthdayBanner: () => <div data-testid="birthday-banner" />,
}));

vi.mock('../../../src/main', () => ({
    default: class MockPlugin { },
}));

// ──────────────────────────────────────────────────────────────────
// Imports (resolved after mocks are hoisted)
// ──────────────────────────────────────────────────────────────────

import { OrbitDashboard } from '../../../src/views/OrbitDashboard';

// ──────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────

describe('OrbitDashboard', () => {
    const mockPlugin = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
        lastHeaderProps = {};
        lastGridProps = {};
    });

    it('wraps content in OrbitProvider with plugin prop', () => {
        const { getByTestId } = render(<OrbitDashboard plugin={mockPlugin} />);

        const provider = getByTestId('orbit-provider');
        expect(provider).toBeDefined();

        // Verify child components are inside the provider
        expect(provider.querySelector('[data-testid="orbit-header"]')).not.toBeNull();
        expect(provider.querySelector('[data-testid="contact-grid"]')).not.toBeNull();
    });

    it('renders BirthdayBanner, OrbitHeader, and ContactGrid', () => {
        const { getByTestId } = render(<OrbitDashboard plugin={mockPlugin} />);

        expect(getByTestId('birthday-banner')).toBeDefined();
        expect(getByTestId('orbit-header')).toBeDefined();
        expect(getByTestId('contact-grid')).toBeDefined();
    });

    it('changing sort via OrbitHeader onSortChange updates ContactGrid sortMode', () => {
        const { getByTestId } = render(<OrbitDashboard plugin={mockPlugin} />);

        // Initial state: sortMode should be "status" (default useState)
        expect(lastGridProps.sortMode).toBe('status');

        // Simulate sort change through the mocked OrbitHeader button
        act(() => {
            fireEvent.click(getByTestId('sort-trigger'));
        });

        // ContactGrid should now receive the updated sortMode
        expect(lastGridProps.sortMode).toBe('name');
    });

    it('changing filter via OrbitHeader onFilterChange updates ContactGrid filterMode', () => {
        const { getByTestId } = render(<OrbitDashboard plugin={mockPlugin} />);

        // Initial state: filterMode should be "all" (default useState)
        expect(lastGridProps.filterMode).toBe('all');

        // Simulate filter change through the mocked OrbitHeader button
        act(() => {
            fireEvent.click(getByTestId('filter-trigger'));
        });

        // ContactGrid should now receive the updated filterMode
        expect(lastGridProps.filterMode).toBe('decay');
    });
});

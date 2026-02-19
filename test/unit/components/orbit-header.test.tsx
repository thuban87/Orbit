/**
 * Unit tests for src/components/OrbitHeader.tsx
 *
 * Wave 2 — Testing Overhaul Plan lines 303-324.
 *
 * OrbitHeader is a pure props-driven component. No context mocking needed.
 * The useOrbit import in OrbitHeader.tsx is a dead import (imported but never
 * called in the component body) — flagged as code quality issue per plan L312.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { OrbitHeader } from '../../../src/components/OrbitHeader';

// Mock the dead useOrbit import to prevent errors
vi.mock('../../../src/context/OrbitContext', () => ({
    useOrbit: () => ({ contacts: [], plugin: null }),
}));

describe('OrbitHeader', () => {
    let onSortChange: ReturnType<typeof vi.fn>;
    let onFilterChange: ReturnType<typeof vi.fn>;
    let onRefresh: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onSortChange = vi.fn();
        onFilterChange = vi.fn();
        onRefresh = vi.fn();
    });

    it('renders contact count', () => {
        const { container } = render(
            <OrbitHeader
                sortMode="status"
                filterMode="all"
                onSortChange={onSortChange}
                onFilterChange={onFilterChange}
                onRefresh={onRefresh}
                contactCount={42}
            />
        );

        expect(container.querySelector('.orbit-header-count')?.textContent).toBe('42');
    });

    it('sort dropdown shows current sortMode', () => {
        const { container } = render(
            <OrbitHeader
                sortMode="name"
                filterMode="all"
                onSortChange={onSortChange}
                onFilterChange={onFilterChange}
                onRefresh={onRefresh}
                contactCount={5}
            />
        );

        const sortSelect = container.querySelector('select[title="Sort by"]') as HTMLSelectElement;
        expect(sortSelect).not.toBeNull();
        expect(sortSelect.value).toBe('name');
    });

    it('changing sort dropdown calls onSortChange with new value', () => {
        const { container } = render(
            <OrbitHeader
                sortMode="status"
                filterMode="all"
                onSortChange={onSortChange}
                onFilterChange={onFilterChange}
                onRefresh={onRefresh}
                contactCount={5}
            />
        );

        const sortSelect = container.querySelector('select[title="Sort by"]') as HTMLSelectElement;
        fireEvent.change(sortSelect, { target: { value: 'name' } });

        expect(onSortChange).toHaveBeenCalledWith('name');
    });

    it('filter dropdown shows current filterMode', () => {
        const { container } = render(
            <OrbitHeader
                sortMode="status"
                filterMode="decay"
                onSortChange={onSortChange}
                onFilterChange={onFilterChange}
                onRefresh={onRefresh}
                contactCount={5}
            />
        );

        const filterSelect = container.querySelector('select[title="Filter"]') as HTMLSelectElement;
        expect(filterSelect).not.toBeNull();
        expect(filterSelect.value).toBe('decay');
    });

    it('changing filter dropdown calls onFilterChange with new value', () => {
        const { container } = render(
            <OrbitHeader
                sortMode="status"
                filterMode="all"
                onSortChange={onSortChange}
                onFilterChange={onFilterChange}
                onRefresh={onRefresh}
                contactCount={5}
            />
        );

        const filterSelect = container.querySelector('select[title="Filter"]') as HTMLSelectElement;
        fireEvent.change(filterSelect, { target: { value: 'charger' } });

        expect(onFilterChange).toHaveBeenCalledWith('charger');
    });

    it('refresh button calls onRefresh on click', () => {
        const { container } = render(
            <OrbitHeader
                sortMode="status"
                filterMode="all"
                onSortChange={onSortChange}
                onFilterChange={onFilterChange}
                onRefresh={onRefresh}
                contactCount={5}
            />
        );

        const refreshBtn = container.querySelector('button[title="Refresh contacts"]') as HTMLButtonElement;
        expect(refreshBtn).not.toBeNull();
        fireEvent.click(refreshBtn);

        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('all dropdown options render (status/name for sort; all/charger/decay for filter)', () => {
        const { container } = render(
            <OrbitHeader
                sortMode="status"
                filterMode="all"
                onSortChange={onSortChange}
                onFilterChange={onFilterChange}
                onRefresh={onRefresh}
                contactCount={5}
            />
        );

        // Sort options
        const sortSelect = container.querySelector('select[title="Sort by"]') as HTMLSelectElement;
        const sortOptions = Array.from(sortSelect.options).map(o => o.value);
        expect(sortOptions).toContain('status');
        expect(sortOptions).toContain('name');

        // Filter options
        const filterSelect = container.querySelector('select[title="Filter"]') as HTMLSelectElement;
        const filterOptions = Array.from(filterSelect.options).map(o => o.value);
        expect(filterOptions).toContain('all');
        expect(filterOptions).toContain('charger');
        expect(filterOptions).toContain('decay');
    });
});

/**
 * Unit tests for src/context/OrbitContext.tsx
 *
 * Wave 3 — Testing Overhaul Plan lines 448-468.
 *
 * Tests the OrbitProvider, useOrbit, and useOrbitOptional hooks.
 * Uses a TestConsumer component to access context values for assertion.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { OrbitProvider, useOrbit, useOrbitOptional } from '../../../src/context/OrbitContext';
import { createOrbitContact } from '../../helpers/factories';

// ──────────────────────────────────────────────────────────────────
// Mock Plugin Factory
// ──────────────────────────────────────────────────────────────────

/**
 * Creates a mock plugin with a functional index that supports
 * on/off event subscriptions and getContactsByStatus().
 *
 * Uses a real handler map so tests can trigger events and verify
 * the provider reacts correctly.
 */
function createMockPlugin(initialContacts: any[] = []) {
    const handlers: Map<string, Function[]> = new Map();

    return {
        index: {
            getContactsByStatus: vi.fn(() => initialContacts),
            on: vi.fn((event: string, handler: Function) => {
                const list = handlers.get(event) || [];
                list.push(handler);
                handlers.set(event, list);
            }),
            off: vi.fn((event: string, handler: Function) => {
                const list = handlers.get(event) || [];
                handlers.set(event, list.filter(h => h !== handler));
            }),
        },
        /** Helper: trigger a registered event to simulate index changes */
        _trigger(event: string) {
            const list = handlers.get(event) || [];
            for (const handler of list) {
                handler();
            }
        },
    } as any;
}

// ──────────────────────────────────────────────────────────────────
// Test Consumer Components
// ──────────────────────────────────────────────────────────────────

/** Renders useOrbit() result — will throw if outside provider */
function UseOrbitConsumer({ onRender }: { onRender: (ctx: any) => void }) {
    const ctx = useOrbit();
    onRender(ctx);
    return <div data-testid="consumer">{ctx.contacts.length} contacts</div>;
}

/** Renders useOrbitOptional() result — returns null outside provider */
function UseOrbitOptionalConsumer({ onRender }: { onRender: (ctx: any) => void }) {
    const ctx = useOrbitOptional();
    onRender(ctx);
    return <div data-testid="optional-consumer">{ctx ? ctx.contacts.length : 'null'}</div>;
}

// ──────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────

describe('OrbitContext', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── useOrbit() ──────────────────────────────────────────────

    it('useOrbit() throws when used outside OrbitProvider', () => {
        // Suppress React error boundary console output
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        expect(() => {
            render(<UseOrbitConsumer onRender={() => { }} />);
        }).toThrow('useOrbit must be used within an OrbitProvider');

        consoleSpy.mockRestore();
    });

    it('useOrbit() returns context value inside OrbitProvider', () => {
        const contacts = [createOrbitContact({ name: 'Alice' })];
        const mockPlugin = createMockPlugin(contacts);
        let captured: any = null;

        render(
            <OrbitProvider plugin={mockPlugin}>
                <UseOrbitConsumer onRender={(ctx) => { captured = ctx; }} />
            </OrbitProvider>
        );

        expect(captured).not.toBeNull();
        expect(captured.contacts).toHaveLength(1);
        expect(captured.contacts[0].name).toBe('Alice');
        expect(captured.plugin).toBe(mockPlugin);
        expect(typeof captured.refreshContacts).toBe('function');
    });

    // ── useOrbitOptional() ──────────────────────────────────────

    it('useOrbitOptional() returns null outside OrbitProvider', () => {
        let captured: any = 'unset';

        render(<UseOrbitOptionalConsumer onRender={(ctx) => { captured = ctx; }} />);

        expect(captured).toBeNull();
    });

    it('useOrbitOptional() returns context value inside OrbitProvider', () => {
        const mockPlugin = createMockPlugin([createOrbitContact({ name: 'Bob' })]);
        let captured: any = null;

        render(
            <OrbitProvider plugin={mockPlugin}>
                <UseOrbitOptionalConsumer onRender={(ctx) => { captured = ctx; }} />
            </OrbitProvider>
        );

        expect(captured).not.toBeNull();
        expect(captured.contacts).toHaveLength(1);
        expect(captured.contacts[0].name).toBe('Bob');
    });

    // ── OrbitProvider behavior ──────────────────────────────────

    it('OrbitProvider calls index.getContactsByStatus() on mount', () => {
        const mockPlugin = createMockPlugin();

        render(
            <OrbitProvider plugin={mockPlugin}>
                <div />
            </OrbitProvider>
        );

        expect(mockPlugin.index.getContactsByStatus).toHaveBeenCalled();
    });

    it('OrbitProvider subscribes to index.on("change")', () => {
        const mockPlugin = createMockPlugin();

        render(
            <OrbitProvider plugin={mockPlugin}>
                <div />
            </OrbitProvider>
        );

        expect(mockPlugin.index.on).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('triggering "change" event updates contacts state', () => {
        const initialContacts = [createOrbitContact({ name: 'Alice' })];
        const mockPlugin = createMockPlugin(initialContacts);
        let captured: any = null;

        render(
            <OrbitProvider plugin={mockPlugin}>
                <UseOrbitConsumer onRender={(ctx) => { captured = ctx; }} />
            </OrbitProvider>
        );

        // Initially has 1 contact
        expect(captured.contacts).toHaveLength(1);

        // Update the mock to return 2 contacts, then trigger change
        const updatedContacts = [
            createOrbitContact({ name: 'Alice' }),
            createOrbitContact({ name: 'Bob' }),
        ];
        mockPlugin.index.getContactsByStatus.mockReturnValue(updatedContacts);

        act(() => {
            mockPlugin._trigger('change');
        });

        // Should now reflect the updated contacts
        expect(captured.contacts).toHaveLength(2);
        expect(captured.contacts[1].name).toBe('Bob');

        // Also test refreshContacts() explicitly from the consumer
        const threeContacts = [
            createOrbitContact({ name: 'Alice' }),
            createOrbitContact({ name: 'Bob' }),
            createOrbitContact({ name: 'Charlie' }),
        ];
        mockPlugin.index.getContactsByStatus.mockReturnValue(threeContacts);

        act(() => {
            captured.refreshContacts();
        });

        expect(captured.contacts).toHaveLength(3);
    });

    it('unmounting provider calls index.off("change") to cleanup', () => {
        const mockPlugin = createMockPlugin();

        const { unmount } = render(
            <OrbitProvider plugin={mockPlugin}>
                <div />
            </OrbitProvider>
        );

        // Capture the handler that was registered
        const onCall = mockPlugin.index.on.mock.calls.find(
            (call: any[]) => call[0] === 'change'
        );
        expect(onCall).toBeDefined();
        const registeredHandler = onCall[1];

        // Unmount the provider
        unmount();

        // index.off should have been called with the same handler
        expect(mockPlugin.index.off).toHaveBeenCalledWith('change', registeredHandler);
    });
});

/**
 * Unit tests for src/views/OrbitView.tsx
 *
 * Wave 3 — Testing Overhaul Plan lines 397-425.
 *
 * OrbitView is the Obsidian ItemView shell that hosts the React HUD.
 * Tests verify view metadata, container setup, React root lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { polyfillEl } from '../../mocks/obsidian';

// ──────────────────────────────────────────────────────────────────
// Module-level mocks (hoisted before imports)
// ──────────────────────────────────────────────────────────────────

const { mockRoot, mockCreateRoot } = vi.hoisted(() => {
    const mockRoot = { render: vi.fn(), unmount: vi.fn() };
    const mockCreateRoot = vi.fn(() => mockRoot);
    return { mockRoot, mockCreateRoot };
});

vi.mock('react-dom/client', () => ({
    createRoot: mockCreateRoot,
}));

vi.mock('../../../src/views/OrbitDashboard', () => ({
    OrbitDashboard: () => null,
}));

vi.mock('../../../src/main', () => ({
    default: class MockPlugin { },
}));

// ──────────────────────────────────────────────────────────────────
// Imports (resolved after mocks are hoisted)
// ──────────────────────────────────────────────────────────────────

import { OrbitView, VIEW_TYPE_ORBIT } from '../../../src/views/OrbitView';

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Create an OrbitView instance with a properly structured containerEl.
 *
 * OrbitView.onOpen() accesses `this.containerEl.children[1]` and calls
 * `.empty()` and `.addClass()` on it — Obsidian-specific methods.
 * We build this hierarchy manually and polyfill the child element.
 */
function createView() {
    const mockPlugin = {} as any;

    // Build containerEl with children[0] (nav) and children[1] (content)
    const contentChild = polyfillEl(document.createElement('div'));
    const navChild = document.createElement('div');
    const containerEl = document.createElement('div');
    containerEl.appendChild(navChild);
    containerEl.appendChild(contentChild);

    // Create the view using Object.create to bypass the super(leaf) call
    const view = Object.create(OrbitView.prototype) as OrbitView;
    (view as any).containerEl = containerEl;
    (view as any).plugin = mockPlugin;
    (view as any).root = null;

    return { view, contentChild, mockPlugin };
}

// ──────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────

describe('OrbitView', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getViewType() returns "orbit-view"', () => {
        const { view } = createView();
        expect(view.getViewType()).toBe('orbit-view');
        // Also verify the exported constant matches
        expect(VIEW_TYPE_ORBIT).toBe('orbit-view');
    });

    it('getDisplayText() returns "Orbit"', () => {
        const { view } = createView();
        expect(view.getDisplayText()).toBe('Orbit');
    });

    it('getIcon() returns "users"', () => {
        const { view } = createView();
        expect(view.getIcon()).toBe('users');
    });

    it('onOpen() clears containerEl.children[1] and adds orbit-container class', async () => {
        const { view, contentChild } = createView();

        // Spy on the polyfilled methods
        const emptySpy = vi.spyOn(contentChild as any, 'empty');
        const addClassSpy = vi.spyOn(contentChild as any, 'addClass');

        await view.onOpen();

        expect(emptySpy).toHaveBeenCalled();
        expect(addClassSpy).toHaveBeenCalledWith('orbit-container');
    });

    it('onOpen() creates React root and renders OrbitDashboard inside StrictMode', async () => {
        const { view, contentChild } = createView();

        await view.onOpen();

        // createRoot should have been called with the content container
        expect(mockCreateRoot).toHaveBeenCalledWith(contentChild);

        // root.render should have been called (with StrictMode > OrbitDashboard)
        expect(mockRoot.render).toHaveBeenCalledTimes(1);
    });

    it('onClose() unmounts React root and nulls reference', async () => {
        const { view } = createView();

        // First open to create the root
        await view.onOpen();
        expect((view as any).root).not.toBeNull();

        // Now close
        await view.onClose();

        expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
        expect((view as any).root).toBeNull();
    });
});

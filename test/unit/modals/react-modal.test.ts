/**
 * Unit tests for src/modals/ReactModal.ts
 *
 * Uses the react-dom/client mock to verify createRoot / unmount lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createMockApp } from '../../mocks/obsidian';

// Mock react-dom/client so createRoot returns spied render/unmount
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

// Import after the mock is set up
import { ReactModal } from '../../../src/modals/ReactModal';

/** Concrete subclass for testing the abstract ReactModal */
class TestModal extends ReactModal {
    renderContent(): React.ReactElement {
        return React.createElement('div', null, 'Test content');
    }
}

/** Subclass that throws in renderContent */
class ErrorModal extends ReactModal {
    renderContent(): React.ReactElement {
        throw new Error('Render exploded');
    }
}

describe('ReactModal', () => {
    let app: any;

    beforeEach(() => {
        app = createMockApp();
        vi.clearAllMocks();
    });

    it('calls createRoot on contentEl when opened', () => {
        const modal = new TestModal(app);
        modal.onOpen();

        expect(createRoot).toHaveBeenCalledTimes(1);
        expect(createRoot).toHaveBeenCalledWith(modal.contentEl);
    });

    it('calls root.render with the result of renderContent wrapped in ErrorBoundary', () => {
        const modal = new TestModal(app);
        modal.onOpen();

        const mockRoot = (createRoot as any).mock.results[0].value;
        expect(mockRoot.render).toHaveBeenCalledTimes(1);

        // The arg should be a React element (ModalErrorBoundary wrapping content)
        const renderArg = mockRoot.render.mock.calls[0][0];
        expect(renderArg).toBeDefined();
        // The outer wrapper is the ErrorBoundary, its child is the test div
        expect(renderArg.props.children).toBeDefined();
    });

    it('calls root.unmount on close', () => {
        const modal = new TestModal(app);
        modal.onOpen();

        const mockRoot = (createRoot as any).mock.results[0].value;
        modal.onClose();

        expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });

    it('clears contentEl on open (calls empty)', () => {
        const modal = new TestModal(app);
        const emptySpy = vi.spyOn(modal.contentEl, 'empty');

        modal.onOpen();

        expect(emptySpy).toHaveBeenCalled();
    });

    it('clears contentEl on close (calls empty)', () => {
        const modal = new TestModal(app);
        modal.onOpen();

        const emptySpy = vi.spyOn(modal.contentEl, 'empty');
        modal.onClose();

        expect(emptySpy).toHaveBeenCalled();
    });

    it('sets root to null after close', () => {
        const modal = new TestModal(app);
        modal.onOpen();
        modal.onClose();

        // Opening again should create a new root (not reuse old)
        modal.onOpen();
        expect(createRoot).toHaveBeenCalledTimes(2);
    });

    it('handles close without open gracefully (no crash)', () => {
        const modal = new TestModal(app);
        // Should not throw — root is null
        expect(() => modal.onClose()).not.toThrow();
    });
});

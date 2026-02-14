/**
 * Unit tests for the ModalErrorBoundary component in ReactModal.ts
 *
 * Tests the error boundary behavior directly using React Testing Library
 * (no react-dom/client mock needed).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModalErrorBoundary } from '../../../src/modals/ReactModal';

/** Component that throws on render */
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
    if (shouldThrow) {
        throw new Error('Test render error');
    }
    return React.createElement('div', null, 'Child rendered OK');
}

describe('ModalErrorBoundary', () => {
    beforeEach(() => {
        // Suppress React error boundary console.error noise
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('renders children when no error is thrown', () => {
        const { container } = render(
            <ModalErrorBoundary>
                <div>Normal content</div>
            </ModalErrorBoundary>
        );

        expect(container.textContent).toContain('Normal content');
    });

    it('renders error fallback when child throws', () => {
        const { container } = render(
            <ModalErrorBoundary>
                <ThrowingChild shouldThrow={true} />
            </ModalErrorBoundary>
        );

        expect(container.textContent).toContain('Something went wrong: Test render error');
    });

    it('applies orbit-error class to fallback element', () => {
        const { container } = render(
            <ModalErrorBoundary>
                <ThrowingChild shouldThrow={true} />
            </ModalErrorBoundary>
        );

        const errorDiv = container.querySelector('.orbit-error');
        expect(errorDiv).not.toBeNull();
    });

    it('does not render children when in error state', () => {
        const { container } = render(
            <ModalErrorBoundary>
                <ThrowingChild shouldThrow={true} />
            </ModalErrorBoundary>
        );

        expect(container.textContent).not.toContain('Child rendered OK');
    });
});

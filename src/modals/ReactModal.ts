/**
 * Base modal class for React-rendered modals in Orbit.
 *
 * Handles the React root lifecycle automatically:
 * - onOpen()  → creates container, mounts React root with ErrorBoundary
 * - onClose() → unmounts React root, cleans up container
 *
 * Subclasses implement renderContent() to provide their React tree.
 * All modal subclasses should extend this to prevent memory leaks.
 */
import { Modal, App } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';

/**
 * Error boundary that catches uncaught React errors and displays
 * a friendly message instead of a blank modal.
 * @internal Exported for testing only — not part of the public API.
 */
export class ModalErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
> {
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return React.createElement('div', { className: 'orbit-error' },
                'Something went wrong: ', this.state.error.message
            );
        }
        return this.props.children;
    }
}

export abstract class ReactModal extends Modal {
    protected root: Root | null = null;

    constructor(app: App) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        this.root = createRoot(contentEl);
        this.root.render(
            React.createElement(ModalErrorBoundary, null, this.renderContent())
        );
    }

    onClose(): void {
        this.root?.unmount();
        this.root = null;
        this.contentEl.empty();
    }

    /** Subclasses implement this to provide their React tree. */
    abstract renderContent(): React.ReactElement;
}

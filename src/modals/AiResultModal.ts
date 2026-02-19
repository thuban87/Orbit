/**
 * AiResultModal — Displays AI-generated message suggestions.
 *
 * Opens immediately in loading state, then populates with the generated
 * message. Shows Copy/Regenerate/Dismiss actions.
 *
 * Extends ReactModal for automatic React lifecycle management.
 */
import React from 'react';
import { Notice } from 'obsidian';
import { ReactModal } from './ReactModal';
import { AiResult } from '../components/AiResult';
import type { OrbitContact } from '../types';
import type OrbitPlugin from '../main';

export class AiResultModal extends ReactModal {
    private plugin: OrbitPlugin;
    private contact: OrbitContact;
    private message: string;
    private loading: boolean;
    private resolvedPhotoSrc: string | null;
    private onRegenerateCallback: () => Promise<string>;

    /**
     * @param plugin - OrbitPlugin instance
     * @param contact - The contact the message is being generated for
     * @param onRegenerate - Callback to regenerate the message
     */
    constructor(
        plugin: OrbitPlugin,
        contact: OrbitContact,
        onRegenerate: () => Promise<string>,
    ) {
        super(plugin.app);
        this.plugin = plugin;
        this.contact = contact;
        this.message = '';
        this.loading = true;
        this.resolvedPhotoSrc = this.resolvePhoto();
        this.onRegenerateCallback = onRegenerate;
    }

    onOpen(): void {
        this.titleEl.setText('Suggest message');
        this.modalEl.addClass('orbit-ai-result');
        super.onOpen();
    }

    onClose(): void {
        this.modalEl.removeClass('orbit-ai-result');
        super.onClose();
    }

    /**
     * Resolve the contact's photo to a usable src URL.
     * Handles wikilinks ([[file]]), vault-relative paths, and external URLs.
     */
    private resolvePhoto(): string | null {
        const photo = this.contact.photo;
        if (!photo) return null;

        // External URL — pass through
        if (photo.startsWith('http://') || photo.startsWith('https://')) {
            return photo;
        }

        // Wikilink — strip [[ ]] and resolve via metadataCache
        if (photo.startsWith('[[') && photo.endsWith(']]')) {
            const linkpath = photo.slice(2, -2);
            const resolved = this.plugin.app.metadataCache.getFirstLinkpathDest(
                linkpath,
                this.contact.file.path,
            );
            if (resolved) {
                return this.plugin.app.vault.getResourcePath(resolved);
            }
            return null; // wikilink couldn't resolve
        }

        // Vault-local path — resolve via adapter
        return this.plugin.app.vault.adapter.getResourcePath(photo);
    }

    /** Re-render the React tree after state changes */
    private refresh(): void {
        if (this.root) {
            this.root.render(
                React.createElement(
                    React.StrictMode,
                    null,
                    this.renderContent()
                )
            );
        }
    }

    /** Set the generated message and stop loading */
    setMessage(message: string): void {
        this.message = message;
        this.loading = false;
        this.refresh();
    }

    /** Set an error message and stop loading */
    setError(error: string): void {
        this.message = `Error: ${error}`;
        this.loading = false;
        this.refresh();
    }

    /** Handle the regenerate action */
    private async handleRegenerate(): Promise<void> {
        this.loading = true;
        this.refresh();

        try {
            this.message = await this.onRegenerateCallback();
        } catch (error) {
            this.message = `Error: ${error instanceof Error ? error.message : 'Generation failed'}`;
        }

        this.loading = false;
        this.refresh();
    }

    /** Handle the copy-to-clipboard action */
    private async handleCopy(): Promise<void> {
        await navigator.clipboard.writeText(this.message);
        new Notice('Copied to clipboard');
    }

    renderContent(): React.ReactElement {
        return React.createElement(AiResult, {
            contact: this.contact,
            message: this.message,
            loading: this.loading,
            resolvedPhotoSrc: this.resolvedPhotoSrc,
            onCopy: () => this.handleCopy(),
            onRegenerate: () => this.handleRegenerate(),
            onDismiss: () => this.close(),
        });
    }
}

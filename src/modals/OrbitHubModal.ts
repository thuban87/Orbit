/**
 * OrbitHubModal — Central command modal for contact management.
 *
 * Provides a contact grid with selection + action buttons:
 * - Update: Log a touchpoint for the selected contact
 * - Edit: Edit contact details (Phase 5 — disabled)
 * - Add: Create a new contact
 * - Digest: Generate weekly digest report
 * - Suggest: AI message suggestion (Phase 8 — disabled)
 * - Done: Close the modal
 *
 * Replaces the original ContactPickerModal with an extended hub concept.
 */
import { Notice } from 'obsidian';
import React from 'react';
import { ReactModal } from './ReactModal';
import { OrbitFormModal } from './OrbitFormModal';
import { ContactPickerGrid } from '../components/ContactPickerGrid';
import { UpdatePanel } from '../components/UpdatePanel';
import { OrbitProvider } from '../context/OrbitContext';
import { newPersonSchema } from '../schemas/new-person.schema';
import { editPersonSchema } from '../schemas/edit-person.schema';
import { updateFrontmatter, appendToInteractionLog, createContact } from '../services/ContactManager';
import { Logger } from '../utils/logger';
import type { OrbitContact, LastInteractionType } from '../types';
import type OrbitPlugin from '../main';

type HubView = 'hub' | 'updating';

export class OrbitHubModal extends ReactModal {
    private plugin: OrbitPlugin;
    private contacts: OrbitContact[];
    private view: HubView = 'hub';
    private selectedContact: OrbitContact | null = null;

    /**
     * @param plugin - OrbitPlugin instance (provides app, index, settings)
     * @param contacts - Contacts to display in the grid
     */
    constructor(plugin: OrbitPlugin, contacts: OrbitContact[]) {
        super(plugin.app);
        this.plugin = plugin;
        this.contacts = contacts;
    }

    onOpen(): void {
        this.titleEl.setText('Orbit');
        this.modalEl.addClass('orbit-hub');
        super.onOpen();
    }

    onClose(): void {
        this.modalEl.removeClass('orbit-hub');
        super.onClose();
    }

    /** Re-render the React tree (called after state changes) */
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

    /** Update modal title based on current view */
    private updateTitle(): void {
        if (this.view === 'updating' && this.selectedContact) {
            this.titleEl.setText(`Update ${this.selectedContact.name}`);
        } else {
            this.titleEl.setText('Orbit');
        }
    }

    // ── Action Handlers ────────────────────────────────────────

    /** Handle contact card selection (highlight, don't action) */
    private handleSelect(contact: OrbitContact): void {
        // Toggle off if clicking the same contact
        if (this.selectedContact?.file.path === contact.file.path) {
            this.selectedContact = null;
        } else {
            this.selectedContact = contact;
        }
        this.refresh();
    }

    /** Transition to UpdatePanel for the selected contact */
    private handleUpdate(): void {
        if (!this.selectedContact) return;
        this.view = 'updating';
        this.updateTitle();
        this.refresh();
    }

    /** Open edit form pre-filled with the selected contact's frontmatter */
    private handleEdit(): void {
        if (!this.selectedContact) return;
        const contact = this.selectedContact;

        // Build initial values from contact data + raw frontmatter
        const cache = this.plugin.app.metadataCache.getFileCache(contact.file);
        const fm = cache?.frontmatter ?? {};

        const initialValues: Record<string, any> = {
            name: contact.name,
            category: contact.category ?? '',
            frequency: contact.frequency ?? '',
            social_battery: contact.socialBattery ?? '',
            birthday: contact.birthday ?? '',
            photo: contact.photo ?? '',
            contact_link: fm.contact_link ?? '',
        };

        const modal = new OrbitFormModal(
            this.plugin.app,
            editPersonSchema,
            async (formData) => {
                // Merge only schema-defined fields into frontmatter
                const updates: Record<string, any> = {};
                for (const field of editPersonSchema.fields) {
                    if (field.key === 'name') continue; // name is filename, handled separately
                    updates[field.key] = formData[field.key] ?? '';
                }
                await updateFrontmatter(this.plugin.app, contact.file, updates);

                // Handle name change (rename file)
                if (formData.name && formData.name !== contact.name) {
                    const newPath = contact.file.path.replace(
                        contact.file.name,
                        `${formData.name}.md`
                    );
                    await this.plugin.app.fileManager.renameFile(contact.file, newPath);
                }

                // Refresh index and contacts list
                await this.plugin.index.scanVault();
                this.plugin.index.trigger('change');
                this.contacts = this.plugin.index.getContactsByStatus();
                this.selectedContact = null;
                this.refresh();
                new Notice(`✓ ${formData.name} updated`);
            },
            initialValues,
        );
        modal.open();
    }

    /**
     * Opens the hub directly in update mode for a specific contact.
     * Used by the "Update This Person" command to skip the picker.
     *
     * @param contact - The contact to update
     */
    public openDirectUpdate(contact: OrbitContact): void {
        this.selectedContact = contact;
        this.view = 'updating';
        this.open();
    }

    /** Save an update and return to hub grid */
    private async handleSave(data: {
        lastContact: string;
        interactionType: LastInteractionType;
        note: string;
    }): Promise<void> {
        if (!this.selectedContact) return;

        try {
            // Update frontmatter (merge-only)
            await updateFrontmatter(this.plugin.app, this.selectedContact.file, {
                last_contact: data.lastContact,
                last_interaction: data.interactionType,
            });

            // Append interaction log entry if note provided
            if (data.note) {
                const logEntry = `${data.interactionType}: ${data.note}`;
                await appendToInteractionLog(
                    this.plugin.app,
                    this.selectedContact.file,
                    logEntry,
                    this.plugin.settings.interactionLogHeading
                );
            }

            new Notice(`✓ ${this.selectedContact.name} updated`);
            Logger.debug('OrbitHubModal', `Updated ${this.selectedContact.name}`);

            // Rescan index and refresh contacts list
            await this.plugin.index.scanVault();
            this.plugin.index.trigger('change');
            this.contacts = this.plugin.index.getContactsByStatus();

        } catch (error) {
            new Notice(`Failed to update ${this.selectedContact.name}`);
            Logger.error('OrbitHubModal', 'Update failed', error);
        }

        // Return to hub grid
        this.selectedContact = null;
        this.view = 'hub';
        this.updateTitle();
        this.refresh();
    }

    /** Cancel update and return to hub grid */
    private handleCancel(): void {
        this.view = 'hub';
        this.updateTitle();
        this.refresh();
    }

    /** Open the New Person modal (existing Phase 2 flow) */
    private handleAdd(): void {
        const modal = new OrbitFormModal(
            this.plugin.app,
            newPersonSchema,
            async (formData) => {
                await createContact(
                    this.plugin.app,
                    newPersonSchema,
                    formData,
                    this.plugin.settings
                );
                await this.plugin.index.scanVault();
                this.plugin.index.trigger('change');
                this.contacts = this.plugin.index.getContactsByStatus();
                this.refresh();
                new Notice('✓ Contact created');
            }
        );
        modal.open();
    }

    /** Generate weekly digest (existing functionality) */
    private async handleDigest(): Promise<void> {
        try {
            await this.plugin.generateWeeklyDigest();
            new Notice('✓ Weekly digest generated');
        } catch (error) {
            new Notice('Failed to generate digest');
            Logger.error('OrbitHubModal', 'Digest generation failed', error);
        }
    }

    // ── Render ──────────────────────────────────────────────────

    renderContent(): React.ReactElement {
        if (this.view === 'updating' && this.selectedContact) {
            return React.createElement(UpdatePanel, {
                contact: this.selectedContact,
                onSave: (data) => this.handleSave(data),
                onCancel: () => this.handleCancel(),
            });
        }

        // Hub view: grid + action bar
        const hubContent = React.createElement('div', { className: 'orbit-hub-content' },
            // Contact grid
            React.createElement(ContactPickerGrid, {
                contacts: this.contacts,
                onSelect: (contact: OrbitContact) => this.handleSelect(contact),
                selectedContact: this.selectedContact,
            }),
            // Action bar
            React.createElement('div', { className: 'orbit-hub-actions' },
                React.createElement('div', { className: 'orbit-hub-actions-left' },
                    React.createElement('button', {
                        className: 'orbit-button orbit-button--primary',
                        disabled: !this.selectedContact,
                        onClick: () => this.handleUpdate(),
                        title: this.selectedContact ? `Update ${this.selectedContact.name}` : 'Select a contact first',
                    }, '🔄 Update'),
                    React.createElement('button', {
                        className: 'orbit-button',
                        disabled: !this.selectedContact,
                        onClick: () => this.handleEdit(),
                        title: this.selectedContact ? `Edit ${this.selectedContact.name}` : 'Select a contact first',
                    }, '✏️ Edit'),
                    React.createElement('button', {
                        className: 'orbit-button',
                        onClick: () => this.handleAdd(),
                    }, '➕ Add'),
                    React.createElement('button', {
                        className: 'orbit-button',
                        onClick: () => this.handleDigest(),
                    }, '📊 Digest'),
                    React.createElement('button', {
                        className: 'orbit-button',
                        disabled: true,
                        title: 'Coming in a future update',
                    }, '💬 Suggest'),
                ),
                React.createElement('button', {
                    className: 'orbit-button',
                    onClick: () => this.close(),
                }, 'Done'),
            ),
        );

        return React.createElement(
            OrbitProvider,
            { plugin: this.plugin, children: hubContent },
        );
    }
}

/**
 * ContactPickerModal — Reusable modal for selecting a contact from a card grid.
 *
 * Extends ReactModal to render a ContactPickerGrid component wrapped in
 * an OrbitProvider so that tooltips can read fuel content from the vault.
 *
 * @example
 * const modal = new ContactPickerModal(
 *     this.app,
 *     this,       // plugin instance
 *     contacts,
 *     (contact) => { console.log('Selected:', contact.name); }
 * );
 * modal.open();
 */
import { App } from 'obsidian';
import React from 'react';
import { ReactModal } from './ReactModal';
import { ContactPickerGrid } from '../components/ContactPickerGrid';
import { OrbitProvider } from '../context/OrbitContext';
import type { OrbitContact } from '../types';
import type OrbitPlugin from '../main';

export class ContactPickerModal extends ReactModal {
    private plugin: OrbitPlugin;
    private contacts: OrbitContact[];
    private onSelectCallback: (contact: OrbitContact) => void;

    /**
     * @param app - Obsidian App instance
     * @param plugin - OrbitPlugin instance (for provider context)
     * @param contacts - Contacts to display in the picker grid
     * @param onSelect - Callback invoked when a contact is selected
     */
    constructor(
        app: App,
        plugin: OrbitPlugin,
        contacts: OrbitContact[],
        onSelect: (contact: OrbitContact) => void
    ) {
        super(app);
        this.plugin = plugin;
        this.contacts = contacts;
        this.onSelectCallback = onSelect;
    }

    onOpen(): void {
        this.titleEl.setText('Select contact');
        this.modalEl.addClass('orbit-picker');

        // Delegate to ReactModal for React root lifecycle
        super.onOpen();
    }

    onClose(): void {
        this.modalEl.removeClass('orbit-picker');
        super.onClose();
    }

    renderContent(): React.ReactElement {
        return React.createElement(
            OrbitProvider,
            { plugin: this.plugin },
            React.createElement(ContactPickerGrid, {
                contacts: this.contacts,
                onSelect: (contact: OrbitContact) => {
                    this.onSelectCallback(contact);
                    this.close();
                },
            })
        );
    }
}

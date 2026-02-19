/**
 * Generic schema-driven form modal for Orbit.
 *
 * Extends ReactModal to render a FormRenderer component
 * based on a provided SchemaDef. Used for New Person, Edit Person,
 * and user-defined schemas.
 */
import { App } from 'obsidian';
import React from 'react';
import { ReactModal } from './ReactModal';
import { FormRenderer } from '../components/FormRenderer';
import type { SchemaDef } from '../schemas/types';

export class OrbitFormModal extends ReactModal {
    private schema: SchemaDef;
    private onSubmitCallback: (data: Record<string, any>) => void;
    private initialValues: Record<string, any>;
    private defaultScrapeEnabled: boolean;

    /**
     * @param app - Obsidian App instance
     * @param schema - Schema definition driving the form layout
     * @param onSubmit - Callback invoked with collected form data on submit
     * @param initialValues - Optional pre-populated values for form fields
     * @param defaultScrapeEnabled - Whether the scrape toggle defaults to on
     */
    constructor(
        app: App,
        schema: SchemaDef,
        onSubmit: (data: Record<string, any>) => void,
        initialValues: Record<string, any> = {},
        defaultScrapeEnabled = false
    ) {
        super(app);
        this.schema = schema;
        this.onSubmitCallback = onSubmit;
        this.initialValues = initialValues;
        this.defaultScrapeEnabled = defaultScrapeEnabled;
    }

    onOpen(): void {
        // Set modal title from schema
        this.titleEl.setText(this.schema.title);

        // Apply optional CSS class to the modal container
        if (this.schema.cssClass) {
            this.modalEl.addClass(this.schema.cssClass);
        }

        // Delegate to ReactModal for React root lifecycle
        super.onOpen();
    }

    onClose(): void {
        // Clean up CSS class if it was added
        if (this.schema.cssClass) {
            this.modalEl.removeClass(this.schema.cssClass);
        }

        super.onClose();
    }

    renderContent(): React.ReactElement {
        return React.createElement(FormRenderer, {
            schema: this.schema,
            onSubmit: (data: Record<string, any>) => {
                this.onSubmitCallback(data);
                this.close();
            },
            onCancel: () => this.close(),
            initialValues: this.initialValues,
            app: this.app,
            defaultScrapeEnabled: this.defaultScrapeEnabled,
        });
    }
}


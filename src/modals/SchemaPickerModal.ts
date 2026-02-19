/**
 * SchemaPickerModal — FuzzySuggestModal for selecting a schema from the registry.
 *
 * Used by both the "New person" command and the Orbit Hub "Add" button
 * to let users pick from available schemas (built-in + user-defined).
 */
import { FuzzySuggestModal, App } from 'obsidian';
import type { SchemaDef } from '../schemas/types';

export class SchemaPickerModal extends FuzzySuggestModal<SchemaDef> {
    private schemas: SchemaDef[];
    private onChooseCallback: (schema: SchemaDef) => void;

    constructor(app: App, schemas: SchemaDef[], onChoose: (schema: SchemaDef) => void) {
        super(app);
        this.schemas = schemas;
        this.onChooseCallback = onChoose;
    }

    getItems(): SchemaDef[] {
        return this.schemas;
    }

    getItemText(schema: SchemaDef): string {
        return schema.title;
    }

    onChooseItem(schema: SchemaDef): void {
        this.onChooseCallback(schema);
    }
}

/**
 * FolderSuggest — Autocomplete input for vault folder paths.
 *
 * Extends Obsidian's AbstractInputSuggest to provide type-ahead
 * suggestions for folder paths in settings inputs.
 *
 * Usage in settings:
 *   new FolderSuggest(app, textComponent.inputEl);
 */
import { App, TFolder, AbstractInputSuggest } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<string> {
    private textInput: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.textInput = inputEl;
    }

    /**
     * Get all folder paths that match the current input query.
     */
    getSuggestions(query: string): string[] {
        const lowerQuery = query.toLowerCase();
        const folders: string[] = [];

        // Walk the vault recursively and collect folder paths
        const collectFolders = (folder: TFolder) => {
            // Skip the root folder itself
            if (folder.path) {
                folders.push(folder.path);
            }
            for (const child of folder.children) {
                if (child instanceof TFolder) {
                    collectFolders(child);
                }
            }
        };

        const root = this.app.vault.getRoot();
        collectFolders(root);

        // Filter by query
        if (!lowerQuery) return folders;
        return folders.filter(path => path.toLowerCase().includes(lowerQuery));
    }

    /**
     * Render a single suggestion in the dropdown.
     */
    renderSuggestion(value: string, el: HTMLElement): void {
        el.setText(value);
    }

    /**
     * Handle selection — set the input value and fire change event.
     */
    selectSuggestion(value: string): void {
        this.textInput.value = value;
        this.textInput.dispatchEvent(new Event('input'));
        this.close();
    }
}

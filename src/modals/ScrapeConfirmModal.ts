import { Modal, App, Setting } from 'obsidian';

/**
 * Simple confirmation modal for reactive photo scraping.
 * Shown when a URL is detected in an existing contact's photo field
 * and the user's setting is 'ask'.
 */
export class ScrapeConfirmModal extends Modal {
    private contactName: string;
    private onConfirm: () => void;
    private onSkip: () => void;

    constructor(app: App, contactName: string, onConfirm: () => void, onSkip: () => void) {
        super(app);
        this.contactName = contactName;
        this.onConfirm = onConfirm;
        this.onSkip = onSkip;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h3', { text: 'Download photo?' });
        contentEl.createEl('p', {
            text: `A photo URL was detected for ${this.contactName}. Would you like to download it and save it locally?`,
        });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Download')
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onConfirm();
                    })
            )
            .addButton((btn) =>
                btn
                    .setButtonText('Skip')
                    .onClick(() => {
                        this.close();
                        this.onSkip();
                    })
            );
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

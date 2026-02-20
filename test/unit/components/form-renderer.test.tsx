/**
 * Unit tests for src/components/FormRenderer.tsx
 *
 * Uses @testing-library/react to render FormRenderer with various schemas
 * and verify field rendering, layout classes, and form submission.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormRenderer } from '../../../src/components/FormRenderer';
import type { SchemaDef, FieldDef } from '../../../src/schemas/types';

function makeSchema(fields: FieldDef[], overrides: Partial<SchemaDef> = {}): SchemaDef {
    return {
        id: 'test',
        title: 'Test Form',
        fields,
        ...overrides,
    };
}

describe('FormRenderer', () => {
    let onSubmit: ReturnType<typeof vi.fn>;
    let onCancel: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onSubmit = vi.fn();
        onCancel = vi.fn();
    });

    // ── Field Type Rendering ────────────────────────
    describe('field type rendering', () => {
        it('renders a text input', () => {
            const schema = makeSchema([
                { key: 'name', type: 'text', label: 'Name', placeholder: 'Enter name' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const input = document.getElementById('orbit-field-name') as HTMLInputElement;
            expect(input).not.toBeNull();
            expect(input.type).toBe('text');
            expect(input.placeholder).toBe('Enter name');
        });

        it('renders a textarea', () => {
            const schema = makeSchema([
                { key: 'notes', type: 'textarea', label: 'Notes' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const textarea = document.getElementById('orbit-field-notes') as HTMLTextAreaElement;
            expect(textarea).not.toBeNull();
            expect(textarea.tagName).toBe('TEXTAREA');
        });

        it('renders a dropdown with options', () => {
            const schema = makeSchema([
                { key: 'category', type: 'dropdown', label: 'Category', options: ['A', 'B', 'C'] },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const select = document.getElementById('orbit-field-category') as HTMLSelectElement;
            expect(select).not.toBeNull();
            // Options: "— Select —" + 3 actual options
            expect(select.options.length).toBe(4);
            expect(select.options[1].value).toBe('A');
        });

        it('renders a required dropdown without the "— Select —" placeholder', () => {
            const schema = makeSchema([
                { key: 'cat', type: 'dropdown', label: 'Cat', options: ['X', 'Y'], required: true },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const select = document.getElementById('orbit-field-cat') as HTMLSelectElement;
            expect(select.options.length).toBe(2);
        });

        it('renders a date input', () => {
            const schema = makeSchema([
                { key: 'birthday', type: 'date', label: 'Birthday' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const input = document.getElementById('orbit-field-birthday') as HTMLInputElement;
            expect(input).not.toBeNull();
            expect(input.type).toBe('date');
        });

        it('renders a toggle (checkbox)', () => {
            const schema = makeSchema([
                { key: 'active', type: 'toggle', label: 'Active' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const toggle = document.getElementById('orbit-field-active') as HTMLInputElement;
            expect(toggle).not.toBeNull();
            expect(toggle.type).toBe('checkbox');
        });

        it('renders a number input', () => {
            const schema = makeSchema([
                { key: 'score', type: 'number', label: 'Score' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const input = document.getElementById('orbit-field-score') as HTMLInputElement;
            expect(input).not.toBeNull();
            expect(input.type).toBe('number');
        });

        it('renders a photo input as text type', () => {
            const schema = makeSchema([
                { key: 'photo', type: 'photo', label: 'Photo URL' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const input = document.getElementById('orbit-field-photo') as HTMLInputElement;
            expect(input).not.toBeNull();
            expect(input.type).toBe('text');
        });
    });

    // ── Layout Classes ──────────────────────────────
    describe('layout classes', () => {
        it('applies full-width class by default', () => {
            const schema = makeSchema([
                { key: 'name', type: 'text', label: 'Name' },
            ]);
            const { container } = render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const fieldDiv = container.querySelector('.orbit-field');
            expect(fieldDiv?.classList.contains('orbit-field--full-width')).toBe(true);
        });

        it('applies half-width class when specified', () => {
            const schema = makeSchema([
                { key: 'name', type: 'text', label: 'Name', layout: 'half-width' },
            ]);
            const { container } = render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const fieldDiv = container.querySelector('.orbit-field');
            expect(fieldDiv?.classList.contains('orbit-field--half-width')).toBe(true);
        });

        it('applies inline class when specified', () => {
            const schema = makeSchema([
                { key: 'active', type: 'toggle', label: 'Active', layout: 'inline' },
            ]);
            const { container } = render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const fieldDiv = container.querySelector('.orbit-field');
            expect(fieldDiv?.classList.contains('orbit-field--inline')).toBe(true);
        });

        it('applies required class when field is required', () => {
            const schema = makeSchema([
                { key: 'name', type: 'text', label: 'Name', required: true },
            ]);
            const { container } = render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const fieldDiv = container.querySelector('.orbit-field');
            expect(fieldDiv?.classList.contains('orbit-field--required')).toBe(true);
        });
    });

    // ── Default Values ──────────────────────────────
    describe('default values', () => {
        it('applies default value from FieldDef', () => {
            const schema = makeSchema([
                { key: 'freq', type: 'dropdown', label: 'Frequency', options: ['Daily', 'Monthly'], default: 'Monthly' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const select = document.getElementById('orbit-field-freq') as HTMLSelectElement;
            expect(select.value).toBe('Monthly');
        });

        it('applies initialValues over defaults', () => {
            const schema = makeSchema([
                { key: 'name', type: 'text', label: 'Name', default: 'Default' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} initialValues={{ name: 'Alice' }} />);

            const input = document.getElementById('orbit-field-name') as HTMLInputElement;
            expect(input.value).toBe('Alice');
        });

        it('defaults toggle to false when no default is set', () => {
            const schema = makeSchema([
                { key: 'active', type: 'toggle', label: 'Active' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const toggle = document.getElementById('orbit-field-active') as HTMLInputElement;
            expect(toggle.checked).toBe(false);
        });

        it('applies toggle default value when set', () => {
            const schema = makeSchema([
                { key: 'active', type: 'toggle', label: 'Active', default: true },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const toggle = document.getElementById('orbit-field-active') as HTMLInputElement;
            expect(toggle.checked).toBe(true);
        });
    });

    // ── Description Text ────────────────────────────
    describe('description text', () => {
        it('renders description when provided', () => {
            const schema = makeSchema([
                { key: 'photo', type: 'text', label: 'Photo', description: 'Paste a URL' },
            ]);
            const { container } = render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const desc = container.querySelector('.orbit-field__description');
            expect(desc).not.toBeNull();
            expect(desc?.textContent).toBe('Paste a URL');
        });

        it('does not render description when not provided', () => {
            const schema = makeSchema([
                { key: 'name', type: 'text', label: 'Name' },
            ]);
            const { container } = render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const desc = container.querySelector('.orbit-field__description');
            expect(desc).toBeNull();
        });
    });

    // ── Form Submission ─────────────────────────────
    describe('form submission', () => {
        it('calls onSubmit with collected form data', () => {
            const schema = makeSchema([
                { key: 'name', type: 'text', label: 'Name' },
                { key: 'active', type: 'toggle', label: 'Active', default: true },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            // Fill in name
            const nameInput = document.getElementById('orbit-field-name') as HTMLInputElement;
            fireEvent.change(nameInput, { target: { value: 'Alice' } });

            // Submit the form
            const form = document.querySelector('.orbit-form') as HTMLFormElement;
            fireEvent.submit(form);

            expect(onSubmit).toHaveBeenCalledTimes(1);
            expect(onSubmit).toHaveBeenCalledWith({
                name: 'Alice',
                active: true,
                _scrapePhoto: false,
            });
        });

        it('uses custom submitLabel when provided', () => {
            const schema = makeSchema(
                [{ key: 'name', type: 'text', label: 'Name' }],
                { submitLabel: 'Create Person' }
            );
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const submitBtn = document.querySelector('.orbit-button--primary') as HTMLButtonElement;
            expect(submitBtn.textContent).toBe('Create Person');
        });

        it('uses "Save" as default submitLabel', () => {
            const schema = makeSchema([{ key: 'name', type: 'text', label: 'Name' }]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const submitBtn = document.querySelector('.orbit-button--primary') as HTMLButtonElement;
            expect(submitBtn.textContent).toBe('Save');
        });
    });

    // ── Cancel Button ───────────────────────────────
    describe('cancel button', () => {
        it('renders cancel button when onCancel is provided', () => {
            const schema = makeSchema([{ key: 'name', type: 'text', label: 'Name' }]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} onCancel={onCancel} />);

            const cancelBtn = document.querySelector('.orbit-form__actions .orbit-button:not(.orbit-button--primary)') as HTMLButtonElement;
            expect(cancelBtn).not.toBeNull();
            expect(cancelBtn.textContent).toBe('Cancel');
        });

        it('does not render cancel button when onCancel is not provided', () => {
            const schema = makeSchema([{ key: 'name', type: 'text', label: 'Name' }]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const buttons = document.querySelectorAll('.orbit-form__actions button');
            expect(buttons.length).toBe(1); // Only submit button
        });

        it('calls onCancel when cancel button is clicked', () => {
            const schema = makeSchema([{ key: 'name', type: 'text', label: 'Name' }]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} onCancel={onCancel} />);

            const cancelBtn = document.querySelector('.orbit-form__actions .orbit-button:not(.orbit-button--primary)') as HTMLButtonElement;
            fireEvent.click(cancelBtn);

            expect(onCancel).toHaveBeenCalledTimes(1);
        });
    });

    // ── onChange Updates ─────────────────────────────
    describe('onChange updates', () => {
        it('updates text field value on change', () => {
            const schema = makeSchema([{ key: 'name', type: 'text', label: 'Name' }]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const input = document.getElementById('orbit-field-name') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'Bob' } });

            expect(input.value).toBe('Bob');
        });

        it('updates toggle field value on change', () => {
            const schema = makeSchema([{ key: 'active', type: 'toggle', label: 'Active' }]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const toggle = document.getElementById('orbit-field-active') as HTMLInputElement;
            fireEvent.click(toggle);

            expect(toggle.checked).toBe(true);
        });

        it('includes updated values in submit data', () => {
            const schema = makeSchema([
                { key: 'name', type: 'text', label: 'Name' },
                { key: 'notes', type: 'textarea', label: 'Notes' },
            ]);
            render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

            const nameInput = document.getElementById('orbit-field-name') as HTMLInputElement;
            const notesInput = document.getElementById('orbit-field-notes') as HTMLTextAreaElement;

            fireEvent.change(nameInput, { target: { value: 'Carol' } });
            fireEvent.change(notesInput, { target: { value: 'Met at conf' } });

            const form = document.querySelector('.orbit-form') as HTMLFormElement;
            fireEvent.submit(form);

            expect(onSubmit).toHaveBeenCalledWith({
                name: 'Carol',
                notes: 'Met at conf',
                _scrapePhoto: false,
            });
        });
    });

    // ── Photo Field — resolvePhotoSrc + Scrape Toggle ──
    // Wave 2 — Testing Overhaul Plan lines 374-383
    describe('photo field', () => {
        const photoSchema = makeSchema([
            { key: 'photo', type: 'photo', label: 'Photo', placeholder: 'Enter a URL, local path, or wikilink' },
        ]);

        it('photo field with URL renders <img> preview', () => {
            const { container } = render(
                <FormRenderer
                    schema={photoSchema}
                    onSubmit={onSubmit}
                    initialValues={{ photo: 'https://example.com/pic.jpg' }}
                />
            );

            const img = container.querySelector('.orbit-field__photo-img') as HTMLImageElement;
            expect(img).not.toBeNull();
            expect(img.src).toBe('https://example.com/pic.jpg');
        });

        it('photo field with URL shows scrape toggle', () => {
            const { container } = render(
                <FormRenderer
                    schema={photoSchema}
                    onSubmit={onSubmit}
                    initialValues={{ photo: 'https://example.com/pic.jpg' }}
                />
            );

            const scrapeToggle = container.querySelector('#orbit-field-scrape-photo') as HTMLInputElement;
            expect(scrapeToggle).not.toBeNull();
            expect(scrapeToggle.type).toBe('checkbox');
        });

        it('photo field with non-URL value hides scrape toggle', () => {
            const { container } = render(
                <FormRenderer
                    schema={photoSchema}
                    onSubmit={onSubmit}
                    initialValues={{ photo: 'local/path/pic.jpg' }}
                />
            );

            const scrapeToggle = container.querySelector('#orbit-field-scrape-photo');
            expect(scrapeToggle).toBeNull();
        });

        it('photo field with empty value shows no preview', () => {
            const { container } = render(
                <FormRenderer schema={photoSchema} onSubmit={onSubmit} />
            );

            const preview = container.querySelector('.orbit-field__photo-preview');
            expect(preview).toBeNull();
        });

        it('photo wikilink + App resolves via getFirstLinkpathDest', () => {
            const mockResolved = { path: 'pics/resolved.jpg', name: 'resolved.jpg' };
            const mockApp = {
                metadataCache: {
                    getFirstLinkpathDest: vi.fn(() => mockResolved),
                },
                vault: {
                    getResourcePath: vi.fn(() => 'app://local/resolved.jpg'),
                    adapter: {
                        getResourcePath: vi.fn(),
                    },
                },
            };

            const { container } = render(
                <FormRenderer
                    schema={photoSchema}
                    onSubmit={onSubmit}
                    initialValues={{ photo: '[[avatar.jpg]]' }}
                    app={mockApp as any}
                />
            );

            expect(mockApp.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith('avatar.jpg', '');
            expect(mockApp.vault.getResourcePath).toHaveBeenCalledWith(mockResolved);

            const img = container.querySelector('.orbit-field__photo-img') as HTMLImageElement;
            expect(img).not.toBeNull();
            expect(img.src).toBe('app://local/resolved.jpg');
        });

        it('photo wikilink with null destination shows no preview', () => {
            const mockApp = {
                metadataCache: {
                    getFirstLinkpathDest: vi.fn(() => null),
                },
                vault: {
                    getResourcePath: vi.fn(),
                    adapter: {
                        getResourcePath: vi.fn(),
                    },
                },
            };

            const { container } = render(
                <FormRenderer
                    schema={photoSchema}
                    onSubmit={onSubmit}
                    initialValues={{ photo: '[[missing.jpg]]' }}
                    app={mockApp as any}
                />
            );

            const preview = container.querySelector('.orbit-field__photo-preview');
            expect(preview).toBeNull();
        });

        it('photo vault-local path + App resolves via adapter', () => {
            const mockApp = {
                metadataCache: {
                    getFirstLinkpathDest: vi.fn(),
                },
                vault: {
                    getResourcePath: vi.fn(),
                    adapter: {
                        getResourcePath: vi.fn(() => 'app://local/assets/pic.jpg'),
                    },
                },
            };

            const { container } = render(
                <FormRenderer
                    schema={photoSchema}
                    onSubmit={onSubmit}
                    initialValues={{ photo: 'assets/pic.jpg' }}
                    app={mockApp as any}
                />
            );

            expect(mockApp.vault.adapter.getResourcePath).toHaveBeenCalledWith('assets/pic.jpg');

            const img = container.querySelector('.orbit-field__photo-img') as HTMLImageElement;
            expect(img).not.toBeNull();
        });

        it('photo without App — only URL shows preview', () => {
            // URL should work without App
            const { container: c1 } = render(
                <FormRenderer
                    schema={photoSchema}
                    onSubmit={onSubmit}
                    initialValues={{ photo: 'https://example.com/pic.jpg' }}
                />
            );
            expect(c1.querySelector('.orbit-field__photo-img')).not.toBeNull();

            // Non-URL without App should NOT show preview (resolvePhotoSrc returns null)
            const { container: c2 } = render(
                <FormRenderer
                    schema={photoSchema}
                    onSubmit={onSubmit}
                    initialValues={{ photo: 'local/pic.jpg' }}
                />
            );
            // local path without app → resolvePhotoSrc returns null → no preview? 
            // Actually: resolvePhotoSrc returns null when !app and !isUrl, so no <img>
            // But the photoSrc is truthy (local path passes through if no app check),
            // Let's check: line 71 says if (!app) return null for non-URL
            expect(c2.querySelector('.orbit-field__photo-preview')).toBeNull();
        });

        it('photo onError hides image and shows error span', () => {
            const { container } = render(
                <FormRenderer
                    schema={photoSchema}
                    onSubmit={onSubmit}
                    initialValues={{ photo: 'https://broken.com/pic.jpg' }}
                />
            );

            const img = container.querySelector('.orbit-field__photo-img') as HTMLImageElement;
            expect(img).not.toBeNull();

            // Simulate image load error
            fireEvent.error(img);

            expect(img.style.display).toBe('none');

            const errorSpan = container.querySelector('.orbit-field__photo-error') as HTMLElement;
            expect(errorSpan).not.toBeNull();
            expect(errorSpan.style.display).toBe('block');
        });
    });

    // ── Dropdown Edge Case ──────────────────────────────
    describe('dropdown edge cases', () => {
        it('dropdown with raw value not in options renders that value as an option', () => {
            const schema = makeSchema([
                { key: 'cat', type: 'dropdown', label: 'Category', options: ['A', 'B'] },
            ]);
            render(
                <FormRenderer
                    schema={schema}
                    onSubmit={onSubmit}
                    initialValues={{ cat: 'CustomValue' }}
                />
            );

            const select = document.getElementById('orbit-field-cat') as HTMLSelectElement;
            // Should have: "— Select —" + "CustomValue" (raw) + "A" + "B"
            const optionValues = Array.from(select.options).map(o => o.value);
            expect(optionValues).toContain('CustomValue');
            expect(select.value).toBe('CustomValue');
        });
    });
});

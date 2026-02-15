/**
 * Schema-driven form renderer for Orbit modals.
 *
 * Renders a complete form from a SchemaDef, supporting all field types:
 * text, textarea, dropdown, date, toggle, number, photo.
 *
 * JSX only — no innerHTML or dangerouslySetInnerHTML.
 */
import React, { useState, useCallback, FormEvent } from 'react';
import type { SchemaDef, FieldDef } from '../schemas/types';

interface FormRendererProps {
    /** Schema defining the fields to render */
    schema: SchemaDef;
    /** Callback invoked with collected form data on submit */
    onSubmit: (data: Record<string, any>) => void;
    /** Optional callback invoked when user cancels */
    onCancel?: () => void;
    /** Optional pre-populated values for form fields */
    initialValues?: Record<string, any>;
}

/**
 * Builds initial form state from schema defaults and initialValues.
 */
function buildInitialState(
    fields: FieldDef[],
    initialValues: Record<string, any> = {}
): Record<string, any> {
    const state: Record<string, any> = {};
    for (const field of fields) {
        if (initialValues[field.key] !== undefined) {
            state[field.key] = initialValues[field.key];
        } else if (field.default !== undefined) {
            state[field.key] = field.default;
        } else if (field.type === 'toggle') {
            state[field.key] = false;
        } else {
            state[field.key] = '';
        }
    }
    return state;
}

/**
 * Renders a single form field based on its FieldDef.
 */
function renderField(
    field: FieldDef,
    value: any,
    onChange: (key: string, value: any) => void
): React.ReactElement {
    const fieldId = `orbit-field-${field.key}`;

    switch (field.type) {
        case 'textarea':
            return (
                <textarea
                    id={fieldId}
                    className="orbit-field__textarea"
                    value={value ?? ''}
                    placeholder={field.placeholder ?? ''}
                    required={field.required ?? false}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    rows={4}
                />
            );

        case 'dropdown':
            return (
                <select
                    id={fieldId}
                    className="orbit-field__select"
                    value={value ?? ''}
                    required={field.required ?? false}
                    onChange={(e) => onChange(field.key, e.target.value)}
                >
                    {!field.required && <option value="">— Select —</option>}
                    {value && !(field.options ?? []).includes(String(value)) && (
                        <option key={`raw-${value}`} value={value}>{value}</option>
                    )}
                    {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );

        case 'date':
            return (
                <input
                    id={fieldId}
                    className="orbit-field__input"
                    type="date"
                    value={value ?? ''}
                    required={field.required ?? false}
                    onChange={(e) => onChange(field.key, e.target.value)}
                />
            );

        case 'toggle':
            return (
                <label className="orbit-field__toggle-wrapper" htmlFor={fieldId}>
                    <input
                        id={fieldId}
                        className="orbit-field__toggle"
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(field.key, e.target.checked)}
                    />
                    <span className="orbit-field__toggle-label">
                        {value ? 'On' : 'Off'}
                    </span>
                </label>
            );

        case 'number':
            return (
                <input
                    id={fieldId}
                    className="orbit-field__input"
                    type="number"
                    value={value ?? ''}
                    placeholder={field.placeholder ?? ''}
                    required={field.required ?? false}
                    onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                />
            );

        case 'photo':
            return (
                <div className="orbit-field__photo-container">
                    <input
                        id={fieldId}
                        className="orbit-field__input"
                        type="url"
                        value={value ?? ''}
                        placeholder={field.placeholder ?? 'https://...'}
                        required={field.required ?? false}
                        onChange={(e) => onChange(field.key, e.target.value)}
                    />
                    {value && (
                        <div className="orbit-field__photo-preview">
                            <img
                                src={value}
                                alt="Photo preview"
                                className="orbit-field__photo-img"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const errorEl = (e.target as HTMLImageElement).nextElementSibling;
                                    if (errorEl) (errorEl as HTMLElement).style.display = 'block';
                                }}
                                onLoad={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'block';
                                    const errorEl = (e.target as HTMLImageElement).nextElementSibling;
                                    if (errorEl) (errorEl as HTMLElement).style.display = 'none';
                                }}
                            />
                            <span className="orbit-field__photo-error" style={{ display: 'none' }}>
                                Could not load image
                            </span>
                        </div>
                    )}
                </div>
            );

        case 'text':
        default:
            return (
                <input
                    id={fieldId}
                    className="orbit-field__input"
                    type="text"
                    value={value ?? ''}
                    placeholder={field.placeholder ?? ''}
                    required={field.required ?? false}
                    onChange={(e) => onChange(field.key, e.target.value)}
                />
            );
    }
}

/**
 * FormRenderer — React component that renders a dynamic form from a SchemaDef.
 */
export function FormRenderer({ schema, onSubmit, onCancel, initialValues }: FormRendererProps): React.ReactElement {
    const [formData, setFormData] = useState<Record<string, any>>(() =>
        buildInitialState(schema.fields, initialValues)
    );

    const handleChange = useCallback((key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSubmit = useCallback((e: FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    }, [formData, onSubmit]);

    return (
        <form className="orbit-form" onSubmit={handleSubmit}>
            <div className="orbit-form__fields">
                {schema.fields.map((field) => {
                    const layoutClass = field.layout
                        ? `orbit-field--${field.layout}`
                        : 'orbit-field--full-width';
                    const requiredClass = field.required ? 'orbit-field--required' : '';

                    return (
                        <div
                            key={field.key}
                            className={`orbit-field ${layoutClass} ${requiredClass}`.trim()}
                        >
                            <label
                                className="orbit-field__label"
                                htmlFor={`orbit-field-${field.key}`}
                            >
                                {field.label}
                            </label>
                            {renderField(field, formData[field.key], handleChange)}
                            {field.description && (
                                <span className="orbit-field__description">
                                    {field.description}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="orbit-form__actions">
                {onCancel && (
                    <button
                        type="button"
                        className="orbit-button"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                )}
                <button type="submit" className="orbit-button orbit-button--primary">
                    {schema.submitLabel ?? 'Save'}
                </button>
            </div>
        </form>
    );
}

/**
 * UpdatePanel — Inline form for logging a contact touchpoint.
 *
 * Shows contact info header (name, photo, status) + update fields
 * (date, interaction type, note). Used inside the Orbit Hub modal.
 */
import React, { useState } from 'react';
import type { OrbitContact, LastInteractionType } from '../types';
import { formatLocalDate } from '../utils/dates';

interface UpdatePanelProps {
    /** The contact being updated */
    contact: OrbitContact;
    /** Called when user saves the update */
    onSave: (data: { lastContact: string; interactionType: LastInteractionType; note: string }) => void;
    /** Called when user cancels / clicks back */
    onCancel: () => void;
}

const INTERACTION_TYPES: { value: LastInteractionType; label: string }[] = [
    { value: 'call', label: 'Call' },
    { value: 'text', label: 'Text' },
    { value: 'in-person', label: 'In person' },
    { value: 'email', label: 'Email' },
    { value: 'other', label: 'Other' },
];

const STATUS_LABELS: Record<string, string> = {
    stable: 'Stable',
    wobble: 'Wobble',
    decay: 'Decay',
    snoozed: 'Snoozed',
};

/**
 * UpdatePanel — Inline form for logging a contact touchpoint.
 */
export function UpdatePanel({ contact, onSave, onCancel }: UpdatePanelProps) {
    const [lastContact, setLastContact] = useState(formatLocalDate());
    const [interactionType, setInteractionType] = useState<LastInteractionType>('call');
    const [note, setNote] = useState('');

    const handleSubmit = () => {
        onSave({ lastContact, interactionType, note: note.trim() });
    };

    // Photo resolution (simplified — URL or initials only in modal context)
    const photoSrc = contact.photo &&
        (contact.photo.startsWith('http://') || contact.photo.startsWith('https://'))
        ? contact.photo
        : null;

    const initials = contact.name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="orbit-update-panel">
            {/* Contact header */}
            <div className="orbit-update-header">
                {photoSrc ? (
                    <img
                        src={photoSrc}
                        alt={contact.name}
                        className={`orbit-avatar orbit-avatar--${contact.status}`}
                    />
                ) : (
                    <div className={`orbit-avatar-fallback orbit-avatar--${contact.status}`}>
                        {initials}
                    </div>
                )}
                <div className="orbit-update-header-info">
                    <span className="orbit-update-name">{contact.name}</span>
                    <span className={`orbit-update-status orbit-update-status--${contact.status}`}>
                        {STATUS_LABELS[contact.status] || contact.status}
                    </span>
                </div>
            </div>

            {/* Update fields */}
            <div className="orbit-update-fields">
                <div className="orbit-field">
                    <label className="orbit-field__label">Last contact date</label>
                    <input
                        type="date"
                        className="orbit-field__input"
                        value={lastContact}
                        onChange={(e) => setLastContact(e.target.value)}
                    />
                </div>

                <div className="orbit-field">
                    <label className="orbit-field__label">Interaction type</label>
                    <select
                        className="orbit-field__select"
                        value={interactionType}
                        onChange={(e) => setInteractionType(e.target.value as LastInteractionType)}
                    >
                        {INTERACTION_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                <div className="orbit-field">
                    <label className="orbit-field__label">Note</label>
                    <textarea
                        className="orbit-field__textarea"
                        placeholder="Optional interaction note..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="orbit-form__actions">
                <button
                    className="orbit-button"
                    onClick={onCancel}
                >
                    ← Back
                </button>
                <button
                    className="orbit-button orbit-button--primary"
                    onClick={handleSubmit}
                >
                    Save
                </button>
            </div>
        </div>
    );
}

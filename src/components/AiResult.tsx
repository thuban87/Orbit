/**
 * AiResult — React component for displaying AI-generated message suggestions.
 *
 * Shows contact info header, generated message (plain text with pre-wrap),
 * and action buttons (Copy, Regenerate, Dismiss).
 *
 * JSX only — no dangerouslySetInnerHTML or innerHTML.
 */
import React, { useState } from 'react';
import type { OrbitContact } from '../types';

export interface AiResultProps {
    /** The contact the message was generated for */
    contact: OrbitContact;
    /** The generated message text */
    message: string;
    /** Whether a generation is in progress */
    loading: boolean;
    /** Pre-resolved photo URL (handles wikilinks, vault paths, etc.) */
    resolvedPhotoSrc: string | null;
    /** Copy message to clipboard */
    onCopy: () => void;
    /** Regenerate the message */
    onRegenerate: () => void;
    /** Close the modal */
    onDismiss: () => void;
}

/**
 * Renders the AI-suggested message with contact header and action buttons.
 */
export function AiResult({ contact, message, loading, resolvedPhotoSrc, onCopy, onRegenerate, onDismiss }: AiResultProps) {
    const [imgError, setImgError] = useState(false);

    // Determine avatar content: resolved photo or initials fallback
    const initials = contact.name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const showInitials = !resolvedPhotoSrc || imgError;

    return React.createElement('div', { className: 'orbit-ai-result-content' },
        // Contact header
        React.createElement('div', { className: 'orbit-ai-result-header' },
            showInitials
                ? React.createElement('div', {
                    className: `orbit-avatar orbit-avatar--${contact.status} orbit-avatar--initials`,
                }, initials)
                : React.createElement('img', {
                    className: `orbit-avatar orbit-avatar--${contact.status}`,
                    src: resolvedPhotoSrc,
                    alt: contact.name,
                    onError: () => setImgError(true),
                }),
            React.createElement('div', { className: 'orbit-ai-result-header-info' },
                React.createElement('span', { className: 'orbit-ai-result-name' }, contact.name),
                React.createElement('span', { className: 'orbit-ai-result-meta' },
                    `${contact.category ?? 'Uncategorized'} · ${contact.daysSinceContact === Infinity ? 'Never contacted' : `${contact.daysSinceContact}d ago`}`
                ),
            ),
        ),

        // Message box or loading state
        loading
            ? React.createElement('div', { className: 'orbit-ai-result-loading' },
                React.createElement('span', { className: 'orbit-ai-result-spinner' }),
                'Generating message...'
            )
            : React.createElement('div', { className: 'orbit-ai-result-message' }, message),

        // Action buttons
        React.createElement('div', { className: 'orbit-ai-result-actions' },
            React.createElement('button', {
                className: 'orbit-button orbit-button--primary',
                onClick: onCopy,
                disabled: loading,
            }, '📋 Copy'),
            React.createElement('button', {
                className: 'orbit-button',
                onClick: onRegenerate,
                disabled: loading,
            }, '🔄 Regenerate'),
            React.createElement('button', {
                className: 'orbit-button',
                onClick: onDismiss,
            }, 'Dismiss'),
        ),
    );
}

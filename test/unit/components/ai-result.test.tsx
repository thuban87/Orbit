/**
 * Unit tests for AiResult — React component for AI message suggestions.
 *
 * Tests rendering of contact header, message display, loading state,
 * avatar fallback, and action button callbacks.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiResult } from '../../../src/components/AiResult';
import { createOrbitContact } from '../../helpers/factories';

// ═══════════════════════════════════════════════════════════════
// AiResult Component
// ═══════════════════════════════════════════════════════════════

describe('AiResult', () => {
    const defaultProps = {
        contact: createOrbitContact({
            name: 'Marcus Chen',
            category: 'Friends',
            status: 'wobble' as const,
            daysSinceContact: 14,
            photo: 'https://example.com/photo.jpg',
        }),
        message: 'Hey Marcus! How is DevPulse going?',
        loading: false,
        resolvedPhotoSrc: 'https://example.com/photo.jpg',
        onCopy: vi.fn(),
        onRegenerate: vi.fn(),
        onDismiss: vi.fn(),
    };

    describe('contact header', () => {
        it('should display the contact name', () => {
            render(React.createElement(AiResult, defaultProps));
            expect(screen.getByText('Marcus Chen')).toBeTruthy();
        });

        it('should display category and days since contact', () => {
            render(React.createElement(AiResult, defaultProps));
            expect(screen.getByText('Friends · 14d ago')).toBeTruthy();
        });

        it('should show "Never contacted" for Infinity daysSinceContact', () => {
            const props = {
                ...defaultProps,
                contact: createOrbitContact({
                    name: 'New Contact',
                    daysSinceContact: Infinity,
                }),
            };
            render(React.createElement(AiResult, props));
            expect(screen.getByText(/Never contacted/)).toBeTruthy();
        });

        it('should show "Uncategorized" when category is undefined', () => {
            const contact = createOrbitContact({ name: 'Jane' });
            // Factory defaults category to 'Friends' via ??, so we must explicitly override
            (contact as any).category = undefined;
            const props = {
                ...defaultProps,
                contact,
            };
            render(React.createElement(AiResult, props));
            expect(screen.getByText(/Uncategorized/)).toBeTruthy();
        });
    });

    describe('avatar', () => {
        it('should show photo when resolvedPhotoSrc is provided', () => {
            render(React.createElement(AiResult, defaultProps));
            const img = document.querySelector('img.orbit-avatar');
            expect(img).toBeTruthy();
            expect(img?.getAttribute('src')).toBe('https://example.com/photo.jpg');
        });

        it('should show initials when resolvedPhotoSrc is null', () => {
            const props = { ...defaultProps, resolvedPhotoSrc: null };
            render(React.createElement(AiResult, props));
            const initials = document.querySelector('.orbit-avatar--initials');
            expect(initials).toBeTruthy();
            expect(initials?.textContent).toBe('MC');
        });

        it('should fall back to initials when img fails to load', () => {
            render(React.createElement(AiResult, defaultProps));
            const img = document.querySelector('img.orbit-avatar') as HTMLImageElement;
            expect(img).toBeTruthy();

            // Simulate image load error
            fireEvent.error(img);

            // After error, initials should be shown
            const initials = document.querySelector('.orbit-avatar--initials');
            expect(initials).toBeTruthy();
            expect(initials?.textContent).toBe('MC');
        });

        it('should generate correct initials for single-word name', () => {
            const props = {
                ...defaultProps,
                contact: createOrbitContact({ name: 'Madonna' }),
                resolvedPhotoSrc: null,
            };
            render(React.createElement(AiResult, props));
            const initials = document.querySelector('.orbit-avatar--initials');
            expect(initials?.textContent).toBe('M');
        });
    });

    describe('message display', () => {
        it('should display the generated message', () => {
            render(React.createElement(AiResult, defaultProps));
            expect(screen.getByText('Hey Marcus! How is DevPulse going?')).toBeTruthy();
        });

        it('should show loading spinner when loading is true', () => {
            const props = { ...defaultProps, loading: true, message: '' };
            render(React.createElement(AiResult, props));
            expect(screen.getByText('Generating message...')).toBeTruthy();
            expect(document.querySelector('.orbit-ai-result-spinner')).toBeTruthy();
        });

        it('should not show spinner when loading is false', () => {
            render(React.createElement(AiResult, defaultProps));
            expect(document.querySelector('.orbit-ai-result-spinner')).toBeNull();
        });
    });

    describe('action buttons', () => {
        it('should call onCopy when Copy button is clicked', () => {
            const onCopy = vi.fn();
            render(React.createElement(AiResult, { ...defaultProps, onCopy }));
            fireEvent.click(screen.getByText('📋 Copy'));
            expect(onCopy).toHaveBeenCalledOnce();
        });

        it('should call onRegenerate when Regenerate button is clicked', () => {
            const onRegenerate = vi.fn();
            render(React.createElement(AiResult, { ...defaultProps, onRegenerate }));
            fireEvent.click(screen.getByText('🔄 Regenerate'));
            expect(onRegenerate).toHaveBeenCalledOnce();
        });

        it('should call onDismiss when Dismiss button is clicked', () => {
            const onDismiss = vi.fn();
            render(React.createElement(AiResult, { ...defaultProps, onDismiss }));
            fireEvent.click(screen.getByText('Dismiss'));
            expect(onDismiss).toHaveBeenCalledOnce();
        });

        it('should disable Copy and Regenerate buttons during loading', () => {
            const props = { ...defaultProps, loading: true, message: '' };
            render(React.createElement(AiResult, props));

            const copyBtn = screen.getByText('📋 Copy') as HTMLButtonElement;
            const regenBtn = screen.getByText('🔄 Regenerate') as HTMLButtonElement;
            expect(copyBtn.disabled).toBe(true);
            expect(regenBtn.disabled).toBe(true);
        });

        it('should keep Dismiss button enabled during loading', () => {
            const props = { ...defaultProps, loading: true, message: '' };
            render(React.createElement(AiResult, props));
            const dismissBtn = screen.getByText('Dismiss') as HTMLButtonElement;
            expect(dismissBtn.disabled).toBe(false);
        });
    });
});

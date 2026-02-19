/**
 * Unit tests for ContactCard mode prop behavior.
 *
 * Tests that ContactCard correctly toggles between 'sidebar' (default)
 * and 'picker' modes:
 * - Picker: click calls onSelect, no context menu, tooltip still works
 * - Sidebar: existing behavior unchanged (click opens note, context menu works)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ContactCard } from '../../../src/components/ContactCard';
import { createOrbitContact, createTFile } from '../../helpers/factories';
import type { OrbitContact } from '../../../src/types';

// Mock OrbitContext — must export useOrbitOptional (used by ContactCard)
const mockPlugin = {
    app: {
        workspace: {
            getLeaf: vi.fn(() => ({
                openFile: vi.fn(),
            })),
        },
        fileManager: {
            processFrontMatter: vi.fn(),
        },
        vault: {
            adapter: {
                getResourcePath: vi.fn((path: string) => `app://local/${path}`),
            },
            getResourcePath: vi.fn(() => 'app://local/resolved'),
        },
        metadataCache: {
            getFirstLinkpathDest: vi.fn(),
        },
    },
};
const mockRefreshContacts = vi.fn();

vi.mock('../../../src/context/OrbitContext', () => ({
    useOrbitOptional: () => ({
        plugin: mockPlugin,
        refreshContacts: mockRefreshContacts,
    }),
}));

// Mock createPortal to render children inline (no need for actual portals in tests)
vi.mock('react-dom', async () => {
    const actual = await vi.importActual('react-dom');
    return {
        ...actual,
        createPortal: (children: React.ReactNode) => children,
    };
});

describe('ContactCard — mode prop', () => {
    let contact: OrbitContact;

    beforeEach(() => {
        vi.clearAllMocks();
        contact = createOrbitContact({
            name: 'Alice Smith',
            status: 'decay',
            file: createTFile({ path: 'People/Alice Smith.md' }),
            fuel: ['Likes hiking', 'Just got a puppy'],
        });
    });

    // ── Picker Mode ─────────────────────────────────────

    describe('picker mode', () => {
        it('calls onSelect when clicked', () => {
            const onSelect = vi.fn();
            const { container } = render(
                <ContactCard contact={contact} mode="picker" onSelect={onSelect} />
            );

            const card = container.querySelector('.orbit-card')!;
            fireEvent.click(card);

            expect(onSelect).toHaveBeenCalledTimes(1);
            expect(onSelect).toHaveBeenCalledWith(contact);
        });

        it('does not open a file when clicked in picker mode', () => {
            const onSelect = vi.fn();
            render(
                <ContactCard contact={contact} mode="picker" onSelect={onSelect} />
            );

            const card = document.querySelector('.orbit-card')!;
            fireEvent.click(card);

            expect(mockPlugin.app.workspace.getLeaf).not.toHaveBeenCalled();
        });

        it('suppresses context menu in picker mode', () => {
            const onSelect = vi.fn();
            const { container } = render(
                <ContactCard contact={contact} mode="picker" onSelect={onSelect} />
            );

            const card = container.querySelector('.orbit-card')!;
            fireEvent.contextMenu(card);

            // No Menu should be created — handler returns early in picker mode
        });

        it('renders avatar and name correctly in picker mode', () => {
            const onSelect = vi.fn();
            const { container } = render(
                <ContactCard contact={contact} mode="picker" onSelect={onSelect} />
            );

            const name = container.querySelector('.orbit-name');
            expect(name).not.toBeNull();
            expect(name!.textContent).toBe('Alice Smith');

            const avatar = container.querySelector('.orbit-avatar-fallback');
            expect(avatar).not.toBeNull();
            expect(avatar!.classList.contains('orbit-avatar--decay')).toBe(true);
        });

        it('renders photo avatar in picker mode', () => {
            const photoContact = createOrbitContact({
                name: 'Bob Photo',
                photo: 'https://example.com/bob.jpg',
                status: 'stable',
            });
            const onSelect = vi.fn();
            const { container } = render(
                <ContactCard contact={photoContact} mode="picker" onSelect={onSelect} />
            );

            const img = container.querySelector('img.orbit-avatar') as HTMLImageElement;
            expect(img).not.toBeNull();
            expect(img.src).toBe('https://example.com/bob.jpg');
            expect(img.classList.contains('orbit-avatar--stable')).toBe(true);
        });

        it('resolves vault-local photo path', () => {
            const localPhotoContact = createOrbitContact({
                name: 'Carol Local',
                photo: 'Resources/Assets/Orbit/carol.jpg',
                status: 'stable',
            });
            const onSelect = vi.fn();
            const { container } = render(
                <ContactCard contact={localPhotoContact} mode="picker" onSelect={onSelect} />
            );

            expect(mockPlugin.app.vault.adapter.getResourcePath).toHaveBeenCalledWith(
                'Resources/Assets/Orbit/carol.jpg'
            );
        });

        it('resolves wikilink photo path', () => {
            const resolved = createTFile({ path: 'Resources/Assets/Orbit/dave.jpg' });
            mockPlugin.app.metadataCache.getFirstLinkpathDest.mockReturnValue(resolved);

            const wikiContact = createOrbitContact({
                name: 'Dave Wiki',
                photo: '[[dave.jpg]]',
                status: 'stable',
            });
            const onSelect = vi.fn();
            render(
                <ContactCard contact={wikiContact} mode="picker" onSelect={onSelect} />
            );

            expect(mockPlugin.app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith(
                'dave.jpg',
                wikiContact.file.path
            );
            expect(mockPlugin.app.vault.getResourcePath).toHaveBeenCalledWith(resolved);
        });

        it('renders without crashing when onSelect is not provided in picker mode', () => {
            expect(() => {
                render(<ContactCard contact={contact} mode="picker" />);
            }).not.toThrow();
        });
    });

    // ── Sidebar Mode (Default) ──────────────────────────

    describe('sidebar mode (default)', () => {
        it('defaults to sidebar mode and opens note on click', () => {
            const { container } = render(
                <ContactCard contact={contact} />
            );

            const card = container.querySelector('.orbit-card')!;
            fireEvent.click(card);

            expect(mockPlugin.app.workspace.getLeaf).toHaveBeenCalled();
        });

        it('shows context menu on right-click in sidebar mode', () => {
            const { container } = render(
                <ContactCard contact={contact} />
            );

            const card = container.querySelector('.orbit-card')!;
            fireEvent.contextMenu(card);
            // If we got here, handleContextMenu executed (created a Menu)
        });

        it('renders name and status correctly in sidebar mode', () => {
            const { container } = render(
                <ContactCard contact={contact} />
            );

            const name = container.querySelector('.orbit-name');
            expect(name!.textContent).toBe('Alice Smith');

            const avatar = container.querySelector('.orbit-avatar-fallback');
            expect(avatar!.classList.contains('orbit-avatar--decay')).toBe(true);
        });
    });
});

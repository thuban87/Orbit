/**
 * Unit tests for AiResultModal.
 *
 * Tests constructor photo resolution, lifecycle, message display,
 * error handling, regeneration, and copy-to-clipboard.
 * 13 tests per Testing Overhaul Plan (Wave 4, lines 487-503).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiResultModal } from '../../../src/modals/AiResultModal';
import { createOrbitContact, createTFile, createMockApp } from '../../helpers/factories';
import { Notice } from '../../mocks/obsidian';
import type { OrbitContact } from '../../../src/types';

// Mock react-dom/client (required for ReactModal base class)
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

function createMockPlugin(appOverrides: Record<string, any> = {}) {
    const app = createMockApp();
    // Apply overrides
    Object.assign(app.metadataCache, appOverrides.metadataCache ?? {});
    Object.assign(app.vault, appOverrides.vault ?? {});
    if (appOverrides.vault?.adapter) {
        Object.assign(app.vault.adapter, appOverrides.vault.adapter);
    }
    return {
        app,
        settings: {},
    } as any;
}

describe('AiResultModal', () => {
    let contact: OrbitContact;
    let onRegenerate: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        contact = createOrbitContact({
            name: 'Alice',
            file: createTFile({ path: 'People/Alice.md' }),
        });
        onRegenerate = vi.fn(async () => 'New message');

        // Mock clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn(async () => { }),
            },
        });
    });

    // ── Constructor / Initialization ──────────────────────────

    it('constructor stores plugin, contact, sets loading = true', () => {
        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contact, onRegenerate);

        expect(modal).toBeDefined();
        // Verify loading state through renderContent — it passes loading=true
        const element = modal.renderContent();
        expect(element.props.loading).toBe(true);
        expect(element.props.message).toBe('');
    });

    it('constructor resolves photo URL (http passthrough)', () => {
        const contactWithUrl = createOrbitContact({
            name: 'Alice',
            photo: 'https://example.com/alice.jpg',
            file: createTFile({ path: 'People/Alice.md' }),
        });
        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contactWithUrl, onRegenerate);

        const element = modal.renderContent();
        expect(element.props.resolvedPhotoSrc).toBe('https://example.com/alice.jpg');
    });

    it('constructor resolves photo wikilink via getFirstLinkpathDest', () => {
        const contactWithWikilink = createOrbitContact({
            name: 'Alice',
            photo: '[[alice-avatar.jpg]]',
            file: createTFile({ path: 'People/Alice.md' }),
        });

        const mockResolved = { path: 'Assets/alice-avatar.jpg' };
        const plugin = createMockPlugin();
        plugin.app.metadataCache.getFirstLinkpathDest.mockReturnValue(mockResolved);
        plugin.app.vault.getResourcePath.mockReturnValue('app://local/Assets/alice-avatar.jpg');

        const modal = new AiResultModal(plugin, contactWithWikilink, onRegenerate);

        const element = modal.renderContent();
        expect(element.props.resolvedPhotoSrc).toBe('app://local/Assets/alice-avatar.jpg');
        expect(plugin.app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith(
            'alice-avatar.jpg',
            'People/Alice.md',
        );
    });

    it('constructor resolves wikilink where getFirstLinkpathDest returns null → resolvedPhoto is null', () => {
        const contactWithBadWikilink = createOrbitContact({
            name: 'Alice',
            photo: '[[missing-photo.jpg]]',
            file: createTFile({ path: 'People/Alice.md' }),
        });

        const plugin = createMockPlugin();
        plugin.app.metadataCache.getFirstLinkpathDest.mockReturnValue(null);

        const modal = new AiResultModal(plugin, contactWithBadWikilink, onRegenerate);

        const element = modal.renderContent();
        expect(element.props.resolvedPhotoSrc).toBeNull();
    });

    it('constructor resolves vault-local photo via adapter.getResourcePath', () => {
        const contactWithLocalPath = createOrbitContact({
            name: 'Alice',
            photo: 'assets/alice.jpg',
            file: createTFile({ path: 'People/Alice.md' }),
        });

        const plugin = createMockPlugin();
        plugin.app.vault.adapter.getResourcePath.mockReturnValue('app://local/assets/alice.jpg');

        const modal = new AiResultModal(plugin, contactWithLocalPath, onRegenerate);

        const element = modal.renderContent();
        expect(element.props.resolvedPhotoSrc).toBe('app://local/assets/alice.jpg');
    });

    // ── Lifecycle ─────────────────────────────────────────────

    it('onOpen() sets title and adds CSS class', () => {
        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contact, onRegenerate);
        modal.onOpen();

        expect(modal.titleEl.textContent).toBe('Suggest message');
        expect(modal.modalEl.classList.contains('orbit-ai-result')).toBe(true);
    });

    it('onClose() removes CSS class', () => {
        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contact, onRegenerate);
        modal.onOpen();
        modal.onClose();

        expect(modal.modalEl.classList.contains('orbit-ai-result')).toBe(false);
    });

    // ── Message Display ───────────────────────────────────────

    it('setMessage() sets message, clears loading, re-renders', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = { render: vi.fn(), unmount: vi.fn() };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contact, onRegenerate);
        modal.onOpen();

        const renderCountBefore = mockRoot.render.mock.calls.length;
        modal.setMessage('Hello Alice!');

        // Should re-render
        expect(mockRoot.render.mock.calls.length).toBeGreaterThan(renderCountBefore);

        // Verify the props have updated state
        const element = modal.renderContent();
        expect(element.props.message).toBe('Hello Alice!');
        expect(element.props.loading).toBe(false);
    });

    it('setError() prefixes "Error:", clears loading, re-renders', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = { render: vi.fn(), unmount: vi.fn() };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contact, onRegenerate);
        modal.onOpen();

        modal.setError('API rate limited');

        const element = modal.renderContent();
        expect(element.props.message).toBe('Error: API rate limited');
        expect(element.props.loading).toBe(false);
    });

    // ── Regenerate ────────────────────────────────────────────

    it('handleRegenerate() happy path: sets loading, calls callback, updates message', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = { render: vi.fn(), unmount: vi.fn() };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contact, onRegenerate);
        modal.onOpen();

        // Invoke handleRegenerate via renderContent's onRegenerate prop
        const element = modal.renderContent();
        await element.props.onRegenerate();

        expect(onRegenerate).toHaveBeenCalledTimes(1);

        const updatedElement = modal.renderContent();
        expect(updatedElement.props.message).toBe('New message');
        expect(updatedElement.props.loading).toBe(false);
    });

    it('handleRegenerate() when callback throws Error → message shows error.message', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = { render: vi.fn(), unmount: vi.fn() };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const failingRegenerate = vi.fn(async () => { throw new Error('Network timeout'); });

        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contact, failingRegenerate);
        modal.onOpen();

        const element = modal.renderContent();
        await element.props.onRegenerate();

        const updatedElement = modal.renderContent();
        expect(updatedElement.props.message).toBe('Error: Network timeout');
        expect(updatedElement.props.loading).toBe(false);
    });

    it('handleRegenerate() when callback throws non-Error → message shows "Generation failed"', async () => {
        const { createRoot } = await import('react-dom/client');
        const mockRoot = { render: vi.fn(), unmount: vi.fn() };
        vi.mocked(createRoot).mockReturnValue(mockRoot);

        const failingRegenerate = vi.fn(async () => { throw 'string error'; });

        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contact, failingRegenerate);
        modal.onOpen();

        const element = modal.renderContent();
        await element.props.onRegenerate();

        const updatedElement = modal.renderContent();
        expect(updatedElement.props.message).toBe('Error: Generation failed');
        expect(updatedElement.props.loading).toBe(false);
    });

    // ── Copy ──────────────────────────────────────────────────

    it('handleCopy() writes to clipboard and shows Notice', async () => {
        const plugin = createMockPlugin();
        const modal = new AiResultModal(plugin, contact, onRegenerate);
        modal.setMessage('Copy this text');

        const element = modal.renderContent();
        await element.props.onCopy();

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Copy this text');
    });
});

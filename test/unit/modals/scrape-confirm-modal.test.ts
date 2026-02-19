/**
 * Unit tests for ScrapeConfirmModal.
 *
 * Tests the photo scrape confirmation dialog lifecycle and button actions.
 * 6 tests per Testing Overhaul Plan (Wave 4, lines 528-535).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrapeConfirmModal } from '../../../src/modals/ScrapeConfirmModal';
import { Setting, createMockApp } from '../../mocks/obsidian';

// Capture button onClick handlers registered via Setting.addButton
let capturedButtonHandlers: Array<() => void>;

vi.spyOn(Setting.prototype, 'addButton').mockImplementation(function (this: Setting, cb: (btn: any) => void) {
    const handler = { fn: () => { } };
    const btn = {
        setButtonText: vi.fn().mockReturnThis(),
        setCta: vi.fn().mockReturnThis(),
        onClick: vi.fn((clickFn: () => void) => {
            handler.fn = clickFn;
            return btn;
        }),
        buttonEl: document.createElement('button'),
    };
    cb(btn);
    capturedButtonHandlers.push(handler.fn);
    return this;
});

describe('ScrapeConfirmModal', () => {
    let app: ReturnType<typeof createMockApp>;
    let onConfirm: ReturnType<typeof vi.fn>;
    let onSkip: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        app = createMockApp();
        onConfirm = vi.fn();
        onSkip = vi.fn();
        capturedButtonHandlers = [];
    });

    it('constructor stores contact name, confirm, and skip callbacks', () => {
        const modal = new ScrapeConfirmModal(app, 'Alice', onConfirm, onSkip);
        expect(modal).toBeDefined();
    });

    it('onOpen() creates heading "Download photo?"', () => {
        const modal = new ScrapeConfirmModal(app, 'Alice', onConfirm, onSkip);
        modal.onOpen();

        const heading = modal.contentEl.querySelector('h3');
        expect(heading).not.toBeNull();
        expect(heading!.textContent).toBe('Download photo?');
    });

    it('onOpen() shows contact name in description text', () => {
        const modal = new ScrapeConfirmModal(app, 'Alice', onConfirm, onSkip);
        modal.onOpen();

        const paragraph = modal.contentEl.querySelector('p');
        expect(paragraph).not.toBeNull();
        expect(paragraph!.textContent).toContain('Alice');
    });

    it('Download button calls close() then onConfirm()', () => {
        const modal = new ScrapeConfirmModal(app, 'Alice', onConfirm, onSkip);
        const closeSpy = vi.spyOn(modal, 'close');
        modal.onOpen();

        // First addButton = Download, second = Skip
        expect(capturedButtonHandlers).toHaveLength(2);

        capturedButtonHandlers[0](); // Click Download

        expect(closeSpy).toHaveBeenCalled();
        expect(onConfirm).toHaveBeenCalled();
    });

    it('Skip button calls close() then onSkip()', () => {
        const modal = new ScrapeConfirmModal(app, 'Alice', onConfirm, onSkip);
        const closeSpy = vi.spyOn(modal, 'close');
        modal.onOpen();

        expect(capturedButtonHandlers).toHaveLength(2);

        capturedButtonHandlers[1](); // Click Skip

        expect(closeSpy).toHaveBeenCalled();
        expect(onSkip).toHaveBeenCalled();
    });

    it('onClose() empties content element', () => {
        const modal = new ScrapeConfirmModal(app, 'Alice', onConfirm, onSkip);
        modal.onOpen();

        // contentEl should have children after open
        expect(modal.contentEl.children.length).toBeGreaterThan(0);

        modal.onClose();

        // contentEl should be empty after close
        expect(modal.contentEl.children.length).toBe(0);
    });
});

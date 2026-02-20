/**
 * Unit tests for src/components/FuelTooltip.tsx
 *
 * Wave 2 — Testing Overhaul Plan lines 207-240.
 * All private functions (parseFuelSection, parseFuelLines, renderInline)
 * are tested indirectly through rendered component output via RTL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { FuelTooltip } from '../../../src/components/FuelTooltip';
import { createOrbitContact, createTFile } from '../../helpers/factories';
import type { OrbitContact } from '../../../src/types';

// ── Mock OrbitContext ──────────────────────────────────────────
let mockPlugin: any = null;

vi.mock('../../../src/context/OrbitContext', () => ({
    useOrbitOptional: () => (mockPlugin ? { plugin: mockPlugin } : null),
}));

// ── Mock Logger to suppress error output ──────────────────────
vi.mock('../../../src/utils/logger', () => ({
    Logger: {
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
    },
}));

// ── Helpers ───────────────────────────────────────────────────

/** Creates a mock anchor element with a bounding rect. */
function createAnchorEl(overrides: Partial<DOMRect> = {}): HTMLElement {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({
        top: 100,
        left: 400,
        right: 450,
        bottom: 150,
        width: 50,
        height: 50,
        x: 400,
        y: 100,
        toJSON: () => ({}),
        ...overrides,
    });
    return el;
}

function makeContact(overrides: Partial<OrbitContact> = {}): OrbitContact {
    return createOrbitContact({
        name: 'Alice',
        status: 'stable',
        file: createTFile({ path: 'People/Alice.md' }),
        ...overrides,
    });
}

describe('FuelTooltip', () => {
    let anchorEl: HTMLElement;

    beforeEach(() => {
        vi.clearAllMocks();
        anchorEl = createAnchorEl();
        mockPlugin = null; // default: no plugin (picker mode)
    });

    // ── Rendering Tests ──────────────────────────────────────

    describe('rendering', () => {
        it('shows "Loading..." spinner initially', () => {
            // Plugin mode with a vault.read that never resolves
            mockPlugin = {
                app: {
                    vault: {
                        read: vi.fn(() => new Promise(() => { })), // forever pending
                    },
                },
            };
            const contact = makeContact();

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            expect(container.querySelector('.orbit-tooltip-loading')?.textContent).toBe('Loading...');
        });

        it('shows instruction text when no fuel found', async () => {
            // Plugin returns empty content (no fuel section)
            mockPlugin = {
                app: {
                    vault: {
                        read: vi.fn(async () => '# Alice\nSome random content'),
                    },
                },
            };
            const contact = makeContact();

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('.orbit-tooltip-empty')).not.toBeNull();
            });

            const emptyEl = container.querySelector('.orbit-tooltip-empty')!;
            expect(emptyEl.textContent).toContain('No conversational fuel found');
            expect(emptyEl.textContent).toContain('Conversational Fuel');
        });

        it('shows contact name and status badge in header', async () => {
            mockPlugin = {
                app: {
                    vault: {
                        read: vi.fn(async () => '## Conversational Fuel\n- Item one'),
                    },
                },
            };
            const contact = makeContact({ name: 'Bob Jones', status: 'wobble' });

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('.orbit-tooltip-header')).not.toBeNull();
            });

            const header = container.querySelector('.orbit-tooltip-header')!;
            expect(header.querySelector('strong')?.textContent).toBe('Bob Jones');
            expect(header.querySelector('.orbit-tooltip-status--wobble')).not.toBeNull();
        });

        it('renders list items as <li> elements from vault content', async () => {
            mockPlugin = {
                app: {
                    vault: {
                        read: vi.fn(async () =>
                            '## Conversational Fuel\n- Likes hiking\n- Just got a puppy\n- Moved to Austin'
                        ),
                    },
                },
            };
            const contact = makeContact();

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('.orbit-tooltip-content')).not.toBeNull();
            });

            const listItems = container.querySelectorAll('li');
            expect(listItems.length).toBe(3);
            expect(listItems[0].textContent).toBe('Likes hiking');
            expect(listItems[1].textContent).toBe('Just got a puppy');
            expect(listItems[2].textContent).toBe('Moved to Austin');
        });

        it('renders fuel items from emoji header variant (🗣️)', async () => {
            mockPlugin = {
                app: {
                    vault: {
                        read: vi.fn(async () =>
                            '## 🗣️ Conversational Fuel\n- Topic A\n- Topic B'
                        ),
                    },
                },
            };
            const contact = makeContact();

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('.orbit-tooltip-content')).not.toBeNull();
            });

            const listItems = container.querySelectorAll('li');
            expect(listItems.length).toBe(2);
            expect(listItems[0].textContent).toBe('Topic A');
        });

        it('renders bold subheader as <strong> in .orbit-fuel-subheader', async () => {
            mockPlugin = {
                app: {
                    vault: {
                        read: vi.fn(async () =>
                            '## Conversational Fuel\n**Work Topics**\n- Project Alpha'
                        ),
                    },
                },
            };
            const contact = makeContact();

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('.orbit-fuel-subheader')).not.toBeNull();
            });

            const subheader = container.querySelector('.orbit-fuel-subheader')!;
            expect(subheader.querySelector('strong')?.textContent).toBe('Work Topics');
        });

        it('renders inline **bold** text as <strong> tags', async () => {
            mockPlugin = {
                app: {
                    vault: {
                        read: vi.fn(async () =>
                            '## Conversational Fuel\n- Loves **hiking** and **camping**'
                        ),
                    },
                },
            };
            const contact = makeContact();

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('li')).not.toBeNull();
            });

            const li = container.querySelector('li')!;
            const strongs = li.querySelectorAll('strong');
            expect(strongs.length).toBe(2);
            expect(strongs[0].textContent).toBe('hiking');
            expect(strongs[1].textContent).toBe('camping');
        });

        it('stops parsing at next heading (section boundary)', async () => {
            mockPlugin = {
                app: {
                    vault: {
                        read: vi.fn(async () =>
                            '## Conversational Fuel\n- Fuel item\n## Other Section\n- Should not appear'
                        ),
                    },
                },
            };
            const contact = makeContact();

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('.orbit-tooltip-content')).not.toBeNull();
            });

            const listItems = container.querySelectorAll('li');
            expect(listItems.length).toBe(1);
            expect(listItems[0].textContent).toBe('Fuel item');
        });

        it('positions tooltip to the left of anchor by default', async () => {
            // Anchor at x=400, plenty of space on left
            const contact = makeContact({ fuel: ['item'] });

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            const tooltip = container.querySelector('.orbit-tooltip') as HTMLElement;
            expect(tooltip).not.toBeNull();
            // tooltip width = 280, left = 400 - 280 - 10 = 110
            expect(tooltip.style.left).toBe('110px');
        });

        it('falls back to right side when no space on left', async () => {
            // Anchor at x=50, not enough space on left (50 - 280 - 10 = -240 < 10)
            const narrowAnchor = createAnchorEl({ left: 50, right: 100 });
            const contact = makeContact({ fuel: ['item'] });

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={narrowAnchor}
                    onClose={vi.fn()}
                />
            );

            const tooltip = container.querySelector('.orbit-tooltip') as HTMLElement;
            expect(tooltip).not.toBeNull();
            // Falls back to right: right + 10 = 110
            expect(tooltip.style.left).toBe('110px');
        });
    });

    // ── Context Mode Tests ───────────────────────────────────

    describe('context mode', () => {
        it('with plugin available → reads fuel from vault.read()', async () => {
            const readFn = vi.fn(async () => '## Conversational Fuel\n- From vault');
            mockPlugin = {
                app: { vault: { read: readFn } },
            };
            const contact = makeContact();

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('.orbit-tooltip-content')).not.toBeNull();
            });

            expect(readFn).toHaveBeenCalledWith(contact.file);
            expect(container.querySelector('li')?.textContent).toBe('From vault');
        });

        it('without plugin (null context) → uses cached contact.fuel array', async () => {
            mockPlugin = null; // no plugin
            const contact = makeContact({
                fuel: ['- Cached item one', '- Cached item two'],
            });

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('.orbit-tooltip-content')).not.toBeNull();
            });

            const listItems = container.querySelectorAll('li');
            expect(listItems.length).toBe(2);
            expect(listItems[0].textContent).toBe('Cached item one');
            expect(listItems[1].textContent).toBe('Cached item two');
        });

        it('vault read error → shows empty state gracefully', async () => {
            mockPlugin = {
                app: {
                    vault: {
                        read: vi.fn(async () => { throw new Error('read failed'); }),
                    },
                },
            };
            const contact = makeContact();

            const { container } = render(
                <FuelTooltip
                    contact={contact}
                    anchorEl={anchorEl}
                    onClose={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(container.querySelector('.orbit-tooltip-empty')).not.toBeNull();
            });

            expect(container.querySelector('.orbit-tooltip-empty')?.textContent).toContain('No conversational fuel found');
        });
    });
});
